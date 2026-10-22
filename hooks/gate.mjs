// PreToolUse hook: blocks Claude's file-edit tools until a decision is accepted.
// If anything goes wrong here, it allows the edit: a broken gate shouldn't
// stop someone from working.

import { check } from "../lib/gate.mjs";
import { readEvent, usableCwd } from "./read-event.mjs";

try {
  const event = await readEvent();
  const cwd = usableCwd(event);
  const input = (event && event.tool_input) || {};
  const filePath = input.file_path || input.notebook_path;
  if (cwd && typeof filePath === "string") {
    const result = check({ cwd, filePath });
    if (!result.allow) {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason: result.reason,
          },
        })
      );
    }
  }
} catch {
  // Allow on internal errors.
}
