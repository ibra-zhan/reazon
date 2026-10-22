---
name: off
description: Turn Reazon off for this project. Decisions stay; the gate stops blocking edits. /reazon:decide turns it back on.
disable-model-invocation: true
---

# Reazon off

The helper is `node "${CLAUDE_PLUGIN_ROOT}/bin/reazon.mjs" <command> --cwd "<absolute project folder>"`,
written below as `reazon <command>`. Quote paths. It prints JSON; on `"ok": false`,
explain the error and stop. Don't edit Reazon files by hand as a fallback.

Run `reazon off`. Confirm in one line that the gate is off for the reported
project, that decision files and concept lessons are kept, and that
`/reazon:decide` turns it back on. Then continue normally.
