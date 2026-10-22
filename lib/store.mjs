// Where reazon keeps things. Personal data (level, concept lessons, chore passes)
// lives in ~/.reazon; project data (decision files) lives in the project.
// REAZON_HOME overrides the personal folder, which keeps tests off the real one.

import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const LEVELS = ["beginner", "intermediate", "advanced"];
export const DEFAULT_DECISIONS_DIR = "docs/decisions";

export function home() {
  return process.env.REAZON_HOME || path.join(os.homedir(), ".reazon");
}

// The project is the nearest folder with .git (a directory, or a file in a
// worktree). Without Git, the starting folder is the project.
export function projectRoot(cwd) {
  // Resolve links (macOS /tmp is /private/tmp) so every caller keys the same root.
  const start = fs.realpathSync(path.resolve(cwd));
  let dir = start;
  for (;;) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

// Write to a temp file and rename, so a crash never leaves half a profile.
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  fs.renameSync(temp, file);
}

const profilePath = () => path.join(home(), "profile.json");

export function loadProfile() {
  const profile = readJson(profilePath(), {});
  const clean = { level: LEVELS.includes(profile.level) ? profile.level : null, projects: {} };
  if (profile.projects && typeof profile.projects === "object") {
    for (const [root, settings] of Object.entries(profile.projects)) {
      if (settings && typeof settings === "object") clean.projects[root] = settings;
    }
  }
  return clean;
}

export function saveProfile(profile) {
  writeJson(profilePath(), profile);
}

export function projectSettings(profile, root) {
  return profile.projects[root] || {};
}

export function updateProject(root, changes) {
  const profile = loadProfile();
  const next = { ...projectSettings(profile, root), ...changes };
  for (const key of Object.keys(next)) if (next[key] === undefined) delete next[key];
  profile.projects[root] = next;
  saveProfile(profile);
  return next;
}

// A project-specific level ("I'm new to Rust") wins over the personal level.
export function effectiveLevel(profile, root) {
  const override = projectSettings(profile, root).level;
  if (LEVELS.includes(override)) return { level: override, source: "project" };
  if (profile.level) return { level: profile.level, source: "personal" };
  return { level: null, source: "unset" };
}

export function isEnabled(profile, root) {
  return projectSettings(profile, root).enabled === true;
}

export function decisionsDir(profile, root) {
  const custom = projectSettings(profile, root).decisionsDir;
  const relative = typeof custom === "string" && custom ? custom : DEFAULT_DECISIONS_DIR;
  const dir = path.resolve(root, relative);
  // A configured folder must stay inside the project.
  if (dir !== root && !dir.startsWith(root + path.sep)) {
    return path.join(root, DEFAULT_DECISIONS_DIR);
  }
  return dir;
}

export function conceptsDir() {
  return path.join(home(), "concepts");
}

export function listConcepts() {
  try {
    return fs
      .readdirSync(conceptsDir())
      .filter((name) => name.endsWith(".md"))
      .map((name) => name.slice(0, -3))
      .sort();
  } catch {
    return [];
  }
}

// Chore passes are keyed by project so the Stop hook, which knows only the
// working folder, can find and remove them.
function passPath(root) {
  const key = createHash("sha256").update(root).digest("hex").slice(0, 16);
  return path.join(home(), "sessions", `${key}.json`);
}

export function grantChore(root, reason) {
  const pass = { root, reason, granted: new Date().toISOString() };
  writeJson(passPath(root), pass);
  return pass;
}

export function activeChore(root) {
  const pass = readJson(passPath(root), null);
  return pass && pass.root === root ? pass : null;
}

export function clearChore(root) {
  try {
    fs.unlinkSync(passPath(root));
    return true;
  } catch {
    return false;
  }
}
