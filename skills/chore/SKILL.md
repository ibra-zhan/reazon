---
name: chore
description: Grant Claude a one-off pass to make a small change without a decision (typo, rename, dependency bump). Ends when Claude finishes its reply.
disable-model-invocation: true
---

# reazon chore pass

Only the user can start this, by running the command. Never run it on your own
initiative, and never suggest a chore for something that involves a design choice.

The helper is `node "${CLAUDE_PLUGIN_ROOT}/bin/reazon.mjs" <command> --cwd "<absolute project folder>"`,
written below as `reazon <command>`. Quote paths. It prints JSON; on `"ok": false`,
explain the error and stop. Don't edit reazon files by hand as a fallback.

1. If the user didn't say what the chore is, ask in one line and wait.
2. If the change involves a design choice (new storage, a new dependency that
   shapes the app, changing how parts talk to each other), say so in one line
   and suggest `/reazon:decide` instead. Grant the pass only if they still want it.
3. Run `reazon chore --reason "<what the chore is, in a few words>"`.
4. Make only that change in this reply. The pass ends automatically when your
   reply ends.
5. Finish with a two-line summary: what changed, and that the pass has ended.
