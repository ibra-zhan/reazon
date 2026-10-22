// Every test gets its own temp project and its own REAZON_HOME, so nothing
// touches the real ~/.reazon.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function sandbox(t) {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "reazon-test-")));
  const home = path.join(base, "home");
  const project = path.join(base, "my project");
  fs.mkdirSync(path.join(project, ".git"), { recursive: true });
  const previous = process.env.REAZON_HOME;
  process.env.REAZON_HOME = home;
  t.after(() => {
    if (previous === undefined) delete process.env.REAZON_HOME;
    else process.env.REAZON_HOME = previous;
    fs.rmSync(base, { recursive: true, force: true });
  });
  return { base, home, project };
}

export function cli(box, ...args) {
  const result = spawnSync(process.execPath, [path.join(ROOT, "bin/reazon.mjs"), ...args, "--cwd", box.project], {
    encoding: "utf8",
    env: { PATH: process.env.PATH, REAZON_HOME: box.home },
  });
  return { code: result.status, json: JSON.parse(result.stdout), stderr: result.stderr };
}

export function hook(box, script, event) {
  const result = spawnSync(process.execPath, [path.join(ROOT, "hooks", script)], {
    encoding: "utf8",
    input: typeof event === "string" ? event : JSON.stringify(event),
    env: { PATH: process.env.PATH, REAZON_HOME: box.home },
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

// Fill a decision's sections the way Claude would, by editing the file.
export function fill(file, sections) {
  let text = fs.readFileSync(file, "utf8");
  for (const [heading, body] of Object.entries(sections)) {
    const pattern = new RegExp(`(^## ${heading.replace(/[()]/g, "\\$&")}\\n)<!--[^\\n]*-->`, "m");
    if (!pattern.test(text)) throw new Error(`No section ${heading}`);
    text = text.replace(pattern, `$1${body}`);
  }
  fs.writeFileSync(file, text);
}

export const ALL_SECTIONS = {
  Problem: "Notes vanish when the app closes.",
  Forces: "- Survive restarts\n- Survive a crash mid-save",
  "Your first idea (your words)": "> save everything to a file every time I type",
  Options: "1. JSON file (your idea)\n2. SQLite",
  Decision: "> SQLite",
  "Why (your words)": "> rewriting one big file is slow and breaks on a crash",
  Outcome: "Added src/db.js; 3 tests pass.",
};

// Move a new decision all the way to the given stage.
export function walkTo(box, stage) {
  const id = cli(box, "new", "--title", "Where notes are stored").json.decision.id;
  const file = cli(box, "status").json.decisions.find((d) => d.id === id).file;
  fill(file, ALL_SECTIONS);
  for (const next of ["attempt", "options", "accepted", "built"]) {
    if (["framing", "attempt", "options", "accepted", "built"].indexOf(next) >
        ["framing", "attempt", "options", "accepted", "built"].indexOf(stage)) break;
    const result = cli(box, "advance", "--id", id, "--to", next);
    if (result.code !== 0) throw new Error(result.json.error);
  }
  return { id, file };
}
