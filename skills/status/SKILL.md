---
name: status
description: Show reazon's state for this project — your level, every decision and its stage, whether code is unlocked, and concepts learned.
disable-model-invocation: true
---

# reazon status

Read-only. Don't change files.

The helper is `node "${CLAUDE_PLUGIN_ROOT}/bin/reazon.mjs" <command> --cwd "<absolute project folder>"`,
written below as `reazon <command>`. Quote paths. It prints JSON; on `"ok": false`,
explain the error and stop. Don't edit reazon files by hand as a fallback.

Run `reazon status`, then reply with no stage strip and these blocks, each with
its bold label line, separated by `---` dividers:

- **◇ Project**: whether reazon is on, the level and where it comes from
  (`levelSource`: "personal" means set for the learner everywhere; "project" means
  an override for this project only), and whether code is locked or unlocked (and by
  which decision). Mention an active chore pass if there is one.
- **◇ Decisions**: a table of number, title, and stage, newest first. Mark
  superseded ones and what replaced them. Skip the table if there are none.
- **◇ Concepts learned**: the names, comma-separated. Skip if none.

End with one line pointing to the next useful command: `/reazon:decide` to
continue an open decision or start one, or `/reazon:revisit` if an old decision
no longer fits. No question.
