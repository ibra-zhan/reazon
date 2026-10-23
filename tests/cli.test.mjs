import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { BRIEF_ANSWERS, cli, completeBrief, fill, sandbox, walkTo } from "./helpers.mjs";

test("fresh project: off, no level, nothing written", (t) => {
  const box = sandbox(t);
  const { json } = cli(box, "status");
  assert.equal(json.ok, true);
  assert.equal(json.enabled, false);
  assert.equal(json.level, null);
  assert.deepEqual(json.decisions, []);
  assert.equal(fs.existsSync(box.home), false);
  assert.deepEqual(fs.readdirSync(box.project), [".git"]);
});

test("level is personal, with a per-project override", (t) => {
  const box = sandbox(t);
  assert.equal(cli(box, "level", "--set", "intermediate").json.source, "personal");
  const override = cli(box, "level", "--set", "beginner", "--project").json;
  assert.deepEqual([override.level, override.source], ["beginner", "project"]);
  const cleared = cli(box, "level", "--clear-project").json;
  assert.deepEqual([cleared.level, cleared.source], ["intermediate", "personal"]);
  assert.equal(cli(box, "level", "--set", "expert").code, 1);
  // Personal data stays out of the project.
  assert.deepEqual(fs.readdirSync(box.project), [".git"]);
});

test("new decision turns Reazon on and records the level", (t) => {
  const box = sandbox(t);
  cli(box, "level", "--set", "beginner");
  completeBrief(box);
  const { json } = cli(box, "new", "--title", "Where notes are stored");
  assert.equal(json.decision.id, "0001");
  assert.equal(path.dirname(json.decision.file), path.join(box.project, "docs/decisions"));
  assert.match(fs.readFileSync(json.decision.file, "utf8"), /^Level: beginner$/m);
  assert.equal(cli(box, "status").json.enabled, true);
});

test("full walk unlocks at accepted and locks at built", (t) => {
  const box = sandbox(t);
  walkTo(box, "accepted");
  assert.equal(cli(box, "status").json.unlocked, true);
  const box2 = sandbox(t);
  walkTo(box2, "built");
  assert.equal(cli(box2, "status").json.unlocked, false);
});

test("advance errors are reported as JSON", (t) => {
  const box = sandbox(t);
  completeBrief(box);
  cli(box, "new", "--title", "x");
  const { code, json } = cli(box, "advance", "--id", "1", "--to", "attempt");
  assert.equal(code, 1);
  assert.equal(json.ok, false);
  assert.match(json.error, /Empty sections: problem\./);
  assert.equal(cli(box, "advance", "--id", "9", "--to", "attempt").code, 1);
  assert.equal(cli(box, "bogus").code, 1);
  assert.equal(cli(box, "new").code, 1);
});

test("link records concepts in the header", (t) => {
  const box = sandbox(t);
  completeBrief(box);
  const { file } = cli(box, "new", "--title", "x").json.decision;
  cli(box, "link", "--id", "0001", "--concepts", "memory-vs-disk, transactions");
  assert.match(fs.readFileSync(file, "utf8"), /^Concepts: memory-vs-disk, transactions$/m);
});

test("concepts are listed from the personal folder", (t) => {
  const box = sandbox(t);
  fs.mkdirSync(path.join(box.home, "concepts"), { recursive: true });
  fs.writeFileSync(path.join(box.home, "concepts", "memory-vs-disk.md"), "# Memory vs disk\n");
  assert.deepEqual(cli(box, "status").json.concepts, ["memory-vs-disk"]);
});

test("relative --cwd is rejected", (t) => {
  const box = sandbox(t);
  const result = cli({ ...box, project: "relative" }, "status");
  assert.equal(result.code, 1);
});

test("each stage change tells Claude what to show next", (t) => {
  const box = sandbox(t);
  completeBrief(box);
  assert.match(cli(box, "new", "--title", "x").json.next, /advance to attempt/);
  const box2 = sandbox(t);
  walkTo(box2, "options");
  const accepted = cli(box2, "advance", "--id", "0001", "--to", "accepted").json;
  assert.match(accepted.next, /Before any code edit.*✓ Recorded as your Why.*✓ Unlocked/);
  assert.equal(
    accepted.strip,
    "**0001 · Where notes are stored**\nframing → attempt → options → **accepted** → built"
  );
});

test("no decision can start before the brief is complete", (t) => {
  const box = sandbox(t);
  const none = cli(box, "new", "--title", "x");
  assert.equal(none.code, 1);
  assert.match(none.json.error, /No project brief yet/);

  const created = cli(box, "brief").json;
  assert.equal(created.brief.complete, false);
  assert.equal(path.basename(created.brief.file), "brief.md");
  assert.match(created.next, /who it's for.*what they should be able to do.*what will change/);
  assert.equal(cli(box, "status").json.enabled, true);

  // Two of three answers isn't enough.
  const [first, second] = Object.entries(BRIEF_ANSWERS);
  fill(created.brief.file, Object.fromEntries([first, second]));
  const partial = cli(box, "new", "--title", "x");
  assert.equal(partial.code, 1);
  assert.match(partial.json.error, /Empty sections: what will change over time/);

  fill(created.brief.file, Object.fromEntries([Object.entries(BRIEF_ANSWERS)[2]]));
  assert.equal(cli(box, "new", "--title", "x").code, 0);
  assert.match(cli(box, "brief").json.next, /decision map/);
});

test("brief never overwrites existing answers and isn't listed as a decision", (t) => {
  const box = sandbox(t);
  const file = completeBrief(box);
  const before = fs.readFileSync(file, "utf8");
  cli(box, "brief");
  assert.equal(fs.readFileSync(file, "utf8"), before);
  assert.deepEqual(cli(box, "status").json.decisions, []);
});
