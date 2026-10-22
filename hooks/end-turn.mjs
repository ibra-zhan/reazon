// Stop hook: a chore pass covers one request, so it ends when Claude's reply does.

import { clearChore, projectRoot } from "../lib/store.mjs";
import { readEvent, usableCwd } from "./read-event.mjs";

try {
  const cwd = usableCwd(await readEvent());
  if (cwd) clearChore(projectRoot(cwd));
} catch {
  // Nothing to clean up.
}
