---
name: level
description: See or change your Reazon level (beginner, intermediate, advanced), for you personally or just for this project.
disable-model-invocation: true
---

# Reazon level

The helper is `node "${CLAUDE_PLUGIN_ROOT}/bin/reazon.mjs" <command> --cwd "<absolute project folder>"`,
written below as `reazon <command>`. Quote paths. It prints JSON; on `"ok": false`,
explain the error and stop. Don't edit Reazon files by hand as a fallback.

1. Run `reazon level` to see the current level and its source.
2. Ask with AskUserQuestion (header `Level`, `multiSelect: false`):
   - **Beginner**: "I can write small programs but haven't built a full app."
   - **Intermediate**: "I've built apps, but I'm not confident about architecture choices."
   - **Advanced**: "I design systems; challenge my assumptions instead of explaining."
3. Then ask, also with AskUserQuestion (header `Applies to`): **Everywhere**
   (your personal level) or **Just this project** (for a stack you're newer or
   stronger in). If a project override exists, add **Remove project override**.
4. Run `reazon level --set <level>` (add `--project` for this project only),
   or `reazon level --clear-project` to remove the override.
5. Confirm in one line what changed. Existing decisions keep the level they were
   written at; new ones use the new level.
