import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { cli, hook, sandbox, walkTo } from "./helpers.mjs";

const edit = (box, file, tool = "Edit") => ({
  hook_event_name: "PreToolUse",
  tool_name: tool,
  cwd: box.project,
  session_id: "s1",
  tool_input: tool === "NotebookEdit" ? { notebook_path: file } : { file_path: file },
});

function denied(result) {
  if (!result.stdout) return null;
  const out = JSON.parse(result.stdout).hookSpecificOutput;
  assert.equal(out.permissionDecision, "deny");
  return out.permissionDecisionReason;
}

test("gate does nothing where reazon is off", (t) => {
  const box = sandbox(t);
  assert.equal(denied(hook(box, "gate.mjs", edit(box, path.join(box.project, "src/app.js")))), null);
});

test("gate blocks code but allows decisions, docs, lockfiles, and outside files", (t) => {
  const box = sandbox(t);
  cli(box, "on");
  const p = (f) => path.join(box.project, f);
  const reason = denied(hook(box, "gate.mjs", edit(box, p("src/app.js"))));
  assert.match(reason, /■ Gate/);
  assert.match(reason, /src\/app\.js/);
  assert.match(denied(hook(box, "gate.mjs", edit(box, "src/app.js"))), /src\/app\.js/);
  assert.ok(denied(hook(box, "gate.mjs", edit(box, p("nb.ipynb"), "NotebookEdit"))));
  for (const ok of ["docs/decisions/0001-x.md", "README.md", "package-lock.json", ".gitignore"]) {
    assert.equal(denied(hook(box, "gate.mjs", edit(box, p(ok)))), null, ok);
  }
  assert.equal(denied(hook(box, "gate.mjs", edit(box, path.join(box.base, "elsewhere.js")))), null);
  assert.equal(denied(hook(box, "gate.mjs", edit(box, path.join(box.home, "concepts/x.md")))), null);
});

test("gate can't be escaped with ../ or a link into the project", (t) => {
  const box = sandbox(t);
  cli(box, "on");
  const sneaky = path.join(box.project, "docs/decisions/../../src/app.js");
  assert.ok(denied(hook(box, "gate.mjs", edit(box, sneaky))));
  fs.mkdirSync(path.join(box.project, "src"));
  fs.symlinkSync(path.join(box.project, "src"), path.join(box.base, "alias"));
  assert.ok(denied(hook(box, "gate.mjs", edit(box, path.join(box.base, "alias/app.js")))));
});

test("an accepted decision unlocks; built locks again", (t) => {
  const box = sandbox(t);
  const target = path.join(box.project, "src/db.js");
  const { id } = walkTo(box, "accepted");
  assert.equal(denied(hook(box, "gate.mjs", edit(box, target))), null);
  cli(box, "advance", "--id", id, "--to", "built");
  assert.ok(denied(hook(box, "gate.mjs", edit(box, target))));
});

test("gate explains an accepted decision with empty learner sections", (t) => {
  const box = sandbox(t);
  const { file } = cli(box, "new", "--title", "x").json.decision;
  fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace("Status: framing", "Status: accepted"));
  const reason = denied(hook(box, "gate.mjs", edit(box, path.join(box.project, "a.js"))));
  assert.match(reason, /0001 says accepted but these sections are empty: your first idea, decision, why/);
});

test("chore pass allows edits until the turn ends", (t) => {
  const box = sandbox(t);
  cli(box, "on");
  const target = path.join(box.project, "src/app.js");
  cli(box, "chore", "--reason", "fix typo");
  assert.equal(denied(hook(box, "gate.mjs", edit(box, target))), null);
  assert.equal(hook(box, "end-turn.mjs", { hook_event_name: "Stop", cwd: box.project }).stdout, "");
  assert.ok(denied(hook(box, "gate.mjs", edit(box, target))));
});

test("chore pass for one project doesn't open another", (t) => {
  const box = sandbox(t);
  const other = path.join(box.base, "other");
  fs.mkdirSync(path.join(other, ".git"), { recursive: true });
  cli(box, "on");
  cli({ ...box, project: other }, "on");
  cli(box, "chore", "--reason", "x");
  const otherBox = { ...box, project: other };
  assert.ok(denied(hook(otherBox, "gate.mjs", edit(otherBox, path.join(other, "a.js")))));
});

test("gate works from a subfolder of the project", (t) => {
  const box = sandbox(t);
  cli(box, "on");
  const sub = path.join(box.project, "src");
  fs.mkdirSync(sub);
  const event = { ...edit(box, "app.js"), cwd: sub };
  assert.match(denied(hook(box, "gate.mjs", event)), /src\/app\.js/);
});

test("hooks stay quiet and exit 0 on bad input", (t) => {
  const box = sandbox(t);
  cli(box, "on");
  for (const script of ["gate.mjs", "session-start.mjs", "end-turn.mjs"]) {
    for (const raw of ["", "{", "[]", "null", '{"cwd":"relative"}', '{"cwd":5}']) {
      const result = hook(box, script, raw);
      assert.equal(result.code, 0, `${script} ${raw}`);
      assert.equal(result.stdout, "", `${script} ${raw}`);
      assert.equal(result.stderr, "", `${script} ${raw}`);
    }
  }
});

test("session start is silent when off and summarizes when on", (t) => {
  const box = sandbox(t);
  const start = { hook_event_name: "SessionStart", source: "startup", cwd: box.project };
  assert.equal(hook(box, "session-start.mjs", start).stdout, "");
  cli(box, "level", "--set", "beginner");
  walkTo(box, "options");
  fs.mkdirSync(path.join(box.home, "concepts"), { recursive: true });
  fs.writeFileSync(path.join(box.home, "concepts", "memory-vs-disk.md"), "#\n");
  const out = JSON.parse(hook(box, "session-start.mjs", start).stdout).hookSpecificOutput;
  assert.equal(out.hookEventName, "SessionStart");
  const context = out.additionalContext;
  assert.match(context, /reazon is on/);
  assert.match(context, /skills\/decide\/SKILL\.md/);
  assert.match(context, /Learner level: beginner \(personal\)/);
  assert.match(context, /0001 · Where notes are stored · stage: options/);
  assert.match(context, /Code is locked/);
  assert.match(context, /memory-vs-disk/);
  // It points at files; it doesn't copy the learner's words.
  assert.doesNotMatch(context, /every time I type/);
});

test("session start asks for a level when none is set", (t) => {
  const box = sandbox(t);
  cli(box, "on");
  const out = JSON.parse(hook(box, "session-start.mjs", { cwd: box.project }).stdout);
  assert.match(out.hookSpecificOutput.additionalContext, /Learner level: not set/);
});

test("hooks.json registers the three hooks with node", () => {
  const config = JSON.parse(fs.readFileSync(new URL("../hooks/hooks.json", import.meta.url), "utf8"));
  assert.deepEqual(Object.keys(config.hooks).sort(), ["PreToolUse", "SessionStart", "Stop"]);
  assert.match(config.hooks.PreToolUse[0].matcher, /Edit\|Write\|MultiEdit\|NotebookEdit/);
  for (const event of Object.values(config.hooks)) {
    assert.match(event[0].hooks[0].command, /^node "\$\{CLAUDE_PLUGIN_ROOT\}\/hooks\/[a-z-]+\.mjs"$/);
  }
});
