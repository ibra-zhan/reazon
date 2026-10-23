#!/usr/bin/env node
// The helper Claude runs from the skills. Every command prints one JSON object;
// errors print {"ok": false, "error": "..."} and exit 1.
//
//   reazon status                         where everything stands
//   reazon on | off                       turn the gate on or off for this project
//   reazon level [--set L] [--project]    show or set the level (--clear-project removes the override)
//   reazon brief                          create the project brief if missing; report what's empty
//   reazon new --title T [--supersedes ID] (needs a complete brief)
//   reazon advance --id ID --to STAGE
//   reazon chore --reason R               one-off pass, ends with Claude's reply
//   reazon link --id ID --concepts "a, b"  record concept lessons a decision used
//
// Every command accepts --cwd DIR (default: the current folder).

import path from "node:path";
import {
  advance,
  createBrief,
  createDecision,
  findDecision,
  listDecisions,
  readBrief,
  setField,
  unlocks,
} from "../lib/decisions.mjs";
import {
  activeChore,
  conceptsDir,
  decisionsDir,
  effectiveLevel,
  grantChore,
  home,
  isEnabled,
  LEVELS,
  listConcepts,
  loadProfile,
  projectRoot,
  saveProfile,
  updateProject,
} from "../lib/store.mjs";

function parse(argv) {
  const [command, ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const name = arg.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith("--")) flags[name] = true;
    else flags[name] = rest[++i];
  }
  return { command, flags };
}

function requireText(flags, name) {
  const value = flags[name];
  if (typeof value !== "string" || !value.trim()) throw new Error(`--${name} is required.`);
  return value.trim();
}

// Returned with each stage change, so the reminder arrives at the moment it matters.
const NEXT = {
  framing:
    "Fill Problem, naming the brief line it serves. Add What matters only if the choice is a real " +
    "tradeoff the brief doesn't settle. Teach only the concepts this decision needs, then advance to attempt.",
  attempt: "Ask for the learner's guess now as ▶ Your turn. Don't show or hint at options.",
  options:
    "Your reply must open with the stage strip and a ✓ Recorded as your first idea block " +
    "quoting exactly what you wrote, then the options, then ▶ Your turn asking which and why.",
  accepted:
    "Before any code edit, send a message with the stage strip at accepted, a ✓ Recorded " +
    "as your Why block quoting exactly what you wrote, and a ✓ Unlocked block naming the " +
    "scope. Then build within that scope.",
  built:
    "Final message: stage strip at built, ✓ Recorded as your Why again, and ◇ Built " +
    "connecting the code to their Why. Code is locked again.",
};

// The exact two-line stage strip for chat, so it can't drift from format.md.
function strip(d) {
  const stages = ["framing", "attempt", "options", "accepted", "built"]
    .map((stage) => (stage === d.status ? `**${stage}**` : stage))
    .join(" → ");
  return `**${d.id} · ${d.title}**\n${stages}`;
}

function withNext(d, stage) {
  return { ok: true, decision: summary(d), strip: strip(d), next: `Start the message with \`strip\` exactly. ${NEXT[stage]}` };
}

function summary(d) {
  return { id: d.id, title: d.title, status: d.status, file: d.file, unlocks: unlocks(d) };
}

function status(root) {
  const profile = loadProfile();
  const dir = decisionsDir(profile, root);
  const decisions = listDecisions(dir);
  const { level, source } = effectiveLevel(profile, root);
  return {
    ok: true,
    project: root,
    enabled: isEnabled(profile, root),
    level,
    levelSource: source,
    decisionsDir: dir,
    brief: readBrief(dir),
    decisions: decisions.map(summary),
    unlocked: decisions.some(unlocks),
    chore: activeChore(root),
    home: home(),
    conceptsDir: conceptsDir(),
    concepts: listConcepts(),
  };
}

const commands = {
  status: ({ root }) => status(root),

  brief: ({ root }) => {
    updateProject(root, { enabled: true });
    const brief = createBrief(decisionsDir(loadProfile(), root));
    return {
      ok: true,
      brief,
      next: brief.complete
        ? "The brief is complete. Show the decision map and ask which decision to start with, and why."
        : "Ask the brief questions in one ▶ Your turn (who it's for, what they should be able to do, " +
          "what will change over time), each with a one-line reason it matters. Record the answers " +
          "word for word and show a ✓ Recorded receipt.",
    };
  },

  on: ({ root }) => ({ ok: true, project: root, settings: updateProject(root, { enabled: true }) }),
  off: ({ root }) => ({ ok: true, project: root, settings: updateProject(root, { enabled: false }) }),

  level: ({ root, flags }) => {
    if (flags["clear-project"]) updateProject(root, { level: undefined });
    if (flags.set !== undefined) {
      const level = String(flags.set).toLowerCase();
      if (!LEVELS.includes(level)) throw new Error(`Level must be one of: ${LEVELS.join(", ")}.`);
      if (flags.project) updateProject(root, { level });
      else {
        const profile = loadProfile();
        profile.level = level;
        saveProfile(profile);
      }
    }
    const { level, source } = effectiveLevel(loadProfile(), root);
    return { ok: true, project: root, level, source };
  },

  new: ({ root, flags }) => {
    const title = requireText(flags, "title");
    const profile = loadProfile();
    const dir = decisionsDir(profile, root);
    const brief = readBrief(dir);
    if (!brief.complete) {
      throw new Error(
        brief.exists
          ? `The project brief isn't finished. Empty sections: ${brief.missing.join(", ")}. Ask about those first.`
          : "No project brief yet. Run `brief` and ask the brief questions before starting a decision."
      );
    }
    let supersedes = "";
    if (flags.supersedes !== undefined) {
      const old = findDecision(dir, flags.supersedes);
      if (!old) throw new Error(`No decision ${flags.supersedes} to supersede.`);
      supersedes = old.id;
    }
    // Starting a decision turns Reazon on for this project.
    updateProject(root, { enabled: true });
    const { level } = effectiveLevel(profile, root);
    const decision = createDecision(dir, { title, level, supersedes });
    return withNext(decision, "framing");
  },

  advance: ({ root, flags }) => {
    const id = requireText(flags, "id");
    const to = requireText(flags, "to").toLowerCase();
    const dir = decisionsDir(loadProfile(), root);
    return withNext(advance(dir, id, to), to);
  },

  chore: ({ root, flags }) => {
    const reason = requireText(flags, "reason");
    return { ok: true, chore: grantChore(root, reason), expires: "when Claude finishes this reply" };
  },

  // Record which concept lessons a decision used, in its header.
  link: ({ root, flags }) => {
    const id = requireText(flags, "id");
    const concepts = requireText(flags, "concepts");
    const decision = findDecision(decisionsDir(loadProfile(), root), id);
    if (!decision) throw new Error(`No decision ${id}.`);
    setField(decision.file, "Concepts", concepts);
    return { ok: true, decision: summary(decision), concepts };
  },
};

function main() {
  try {
    const { command, flags } = parse(process.argv.slice(2));
    const run = commands[command];
    if (!run) throw new Error(`Unknown command. Use one of: ${Object.keys(commands).join(", ")}.`);
    const cwd = typeof flags.cwd === "string" ? flags.cwd : process.cwd();
    if (!path.isAbsolute(cwd)) throw new Error("--cwd must be an absolute path.");
    const result = run({ root: projectRoot(cwd), flags });
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } catch (error) {
    process.stdout.write(JSON.stringify({ ok: false, error: error.message }) + "\n");
    process.exitCode = 1;
  }
}

main();
