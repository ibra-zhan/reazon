// Shared by the hooks: read Claude Code's JSON event from stdin.
// Hooks must never break a session, so bad input just means "do nothing".

export async function readEvent() {
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > 1_000_000) return null; // Far larger than any real event.
    chunks.push(chunk);
  }
  try {
    const event = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return event && typeof event === "object" && !Array.isArray(event) ? event : null;
  } catch {
    return null;
  }
}

export function usableCwd(event) {
  const cwd = event && event.cwd;
  return typeof cwd === "string" && cwd.startsWith("/") ? cwd : null;
}
