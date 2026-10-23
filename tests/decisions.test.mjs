import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  advance,
  createDecision,
  listDecisions,
  parseDecision,
  setField,
  slugify,
  template,
  unlocks,
} from "../lib/decisions.mjs";
import { ALL_SECTIONS, fill, sandbox } from "./helpers.mjs";

test("template parses back with every learner section empty", () => {
  const d = parseDecision(template({ id: "0001", title: "Where notes are stored", level: "beginner" }), "x/0001-a.md");
  assert.equal(d.id, "0001");
  assert.equal(d.title, "Where notes are stored");
  assert.equal(d.status, "framing");
  assert.equal(d.fields.level, "beginner");
  for (const key of ["what you want", "problem", "what matters", "your first idea", "options", "decision", "why", "outcome"]) {
    assert.equal(d.filled[key], false, key);
  }
});

test("slugs are safe file names", () => {
  assert.equal(slugify("Where notes are stored?"), "where-notes-are-stored");
  assert.equal(slugify("../../etc/passwd"), "etc-passwd");
  assert.equal(slugify("!!!"), "decision");
});

test("numbers increase and never overwrite", (t) => {
  const { project } = sandbox(t);
  const dir = path.join(project, "docs/decisions");
  const a = createDecision(dir, { title: "One" });
  const b = createDecision(dir, { title: "Two" });
  assert.deepEqual([a.id, b.id], ["0001", "0002"]);
  assert.equal(listDecisions(dir).length, 2);
});

test("stages move forward one at a time and need their sections", (t) => {
  const { project } = sandbox(t);
  const dir = path.join(project, "docs/decisions");
  const d = createDecision(dir, { title: "Storage" });
  assert.throws(() => advance(dir, d.id, "options"), /next stage is "attempt"/);
  assert.throws(() => advance(dir, d.id, "attempt"), /Empty sections: problem\./);
  // What matters is optional: Problem alone is enough to move on.
  fill(d.file, { Problem: ALL_SECTIONS.Problem });
  assert.equal(advance(dir, d.id, "attempt").status, "attempt");
  assert.throws(() => advance(dir, d.id, "options"), /your first idea/);
  fill(d.file, { "Your first idea (your words)": "> a file" });
  advance(dir, d.id, "options");
  assert.throws(() => advance(dir, d.id, "accepted"), /options, decision, why/);
  fill(d.file, { Options: "1. a", Decision: "> a", "Why (your words)": "> crash safety" });
  const accepted = advance(dir, d.id, "accepted");
  assert.equal(unlocks(accepted), true);
  // Going back is always allowed.
  assert.equal(advance(dir, d.id, "options").status, "options");
});

test("hand-editing Status can't unlock without the learner's words", (t) => {
  const { project } = sandbox(t);
  const dir = path.join(project, "docs/decisions");
  const d = createDecision(dir, { title: "Storage" });
  setField(d.file, "Status", "accepted");
  const parsed = listDecisions(dir)[0];
  assert.equal(parsed.status, "accepted");
  assert.equal(unlocks(parsed), false);
});

test("setField leaves a Status line inside the learner's words alone", (t) => {
  const { project } = sandbox(t);
  const dir = path.join(project, "docs/decisions");
  const d = createDecision(dir, { title: "Storage" });
  fill(d.file, { "Why (your words)": "Status: my own words" });
  setField(d.file, "Status", "attempt");
  const text = fs.readFileSync(d.file, "utf8");
  assert.match(text, /^Status: attempt$/m);
  assert.match(text, /Status: my own words/);
});

test("superseding marks the old decision only once the new one is accepted", (t) => {
  const { project } = sandbox(t);
  const dir = path.join(project, "docs/decisions");
  const old = createDecision(dir, { title: "Storage v1" });
  const next = createDecision(dir, { title: "Storage v2", supersedes: old.id });
  fill(next.file, ALL_SECTIONS);
  for (const stage of ["attempt", "options"]) advance(dir, next.id, stage);
  assert.equal(listDecisions(dir)[0].status, "framing");
  advance(dir, next.id, "accepted");
  const [oldNow] = listDecisions(dir);
  assert.equal(oldNow.status, "superseded");
  assert.equal(oldNow.fields["superseded by"], "0002");
  assert.throws(() => advance(dir, old.id, "attempt"), /superseded/);
});

test("symlinked decision files are ignored", (t) => {
  const { base, project } = sandbox(t);
  const dir = path.join(project, "docs/decisions");
  fs.mkdirSync(dir, { recursive: true });
  const outside = path.join(base, "outside.md");
  fs.writeFileSync(outside, template({ id: "0001", title: "x" }).replace("Status: framing", "Status: accepted"));
  fs.symlinkSync(outside, path.join(dir, "0001-x.md"));
  assert.deepEqual(listDecisions(dir), []);
});

test("older files that say Forces still count as What matters", () => {
  const d = parseDecision("# 0001 · x\n\nStatus: framing\n\n## Forces\n- survive restarts\n", "d/0001-x.md");
  assert.equal(d.filled["what matters"], true);
});
