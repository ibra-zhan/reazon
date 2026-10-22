---
name: revisit
description: Reopen an earlier decision that no longer fits, by reasoning through a new decision that supersedes it.
disable-model-invocation: true
---

# Reazon revisit

A past decision stays as history. Revisiting creates a new decision that
replaces it once accepted, so the record shows how the thinking changed.

The helper is `node "${CLAUDE_PLUGIN_ROOT}/bin/reazon.mjs" <command> --cwd "<absolute project folder>"`,
written below as `reazon <command>`. Quote paths. It prints JSON; on `"ok": false`,
explain the error and stop. Don't edit Reazon files by hand as a fallback.

1. Run `reazon status`. If the user didn't name a decision, show the accepted
   and built ones (number, title) and ask which one with AskUserQuestion
   (header `Revisit`, `multiSelect: false`, up to four options).
2. Read the old decision file in full.
3. In chat, show the old decision's Problem, choice, and the learner's Why as a
   short recap. Then ask, as ▶ Your turn: what changed that makes this decision
   not fit anymore? Wait.
4. Run `reazon new --title "<question>" --supersedes <old id>` and follow the
   decide guide from Framing. The forces must include what changed. The old
   choice is one of the options, evaluated against the new forces.
5. When the new decision is accepted, the helper marks the old one superseded
   and links both. Mention that in the ✓ Unlocked block.
