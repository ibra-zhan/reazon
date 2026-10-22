// Decides whether Claude may edit a file right now. Pure apart from reading
// the profile, decision files, and chore pass, so it's easy to test.

import fs from "node:fs";
import path from "node:path";
import { listDecisions, UNLOCK_SECTIONS, unlocks } from "./decisions.mjs";
import {
  activeChore,
  decisionsDir,
  isEnabled,
  loadProfile,
  projectRoot,
} from "./store.mjs";

const ALWAYS_EDITABLE = new Set([
  ".gitignore",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "bun.lock",
  "Cargo.lock",
  "poetry.lock",
  "Gemfile.lock",
  "go.sum",
  "composer.lock",
]);
const DOC_EXTENSIONS = new Set([".md", ".mdx"]);

// Resolve links through the nearest existing folder, so a file that doesn't
// exist yet still compares correctly against the project root.
function realTarget(target) {
  let existing = target;
  const rest = [];
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) break;
    rest.unshift(path.basename(existing));
    existing = parent;
  }
  try {
    return path.join(fs.realpathSync(existing), ...rest);
  } catch {
    return target;
  }
}

const inside = (child, parent) => child === parent || child.startsWith(parent + path.sep);

export function check({ cwd, filePath }) {
  const allow = (why) => ({ allow: true, why });
  if (!cwd || !filePath) return allow("nothing to check");
  const root = projectRoot(cwd);
  const profile = loadProfile();
  if (!isEnabled(profile, root)) return allow("Reazon is off for this project");

  const target = realTarget(path.resolve(cwd, filePath));
  if (!inside(target, root)) return allow("outside the project");
  const dir = decisionsDir(profile, root);
  if (inside(target, dir)) return allow("decision file");
  if (ALWAYS_EDITABLE.has(path.basename(target))) return allow("always editable");
  if (DOC_EXTENSIONS.has(path.extname(target).toLowerCase())) return allow("documentation");
  if (activeChore(root)) return allow("chore pass");

  const decisions = listDecisions(dir);
  const open = decisions.find(unlocks);
  if (open) return allow(`decision ${open.id} is accepted`);

  // Explain what's missing when a decision claims to be accepted but isn't complete.
  const incomplete = decisions.find((d) => d.status === "accepted");
  const detail = incomplete
    ? ` Decision ${incomplete.id} says accepted but these sections are empty: ` +
      UNLOCK_SECTIONS.filter((key) => !incomplete.filled[key]).join(", ") +
      "."
    : "";
  return {
    allow: false,
    reason:
      `■ Gate: no accepted decision covers editing ${path.relative(root, target)}.${detail} ` +
      "Start or continue one with /reazon:decide. For a small fix, the user can grant a " +
      "one-off pass with /reazon:chore. Don't work around this with shell commands.",
  };
}
