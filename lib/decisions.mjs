// Decision files are the source of truth. Each one moves through stages, and
// code is unlocked only by a decision that is accepted AND has the learner's
// first idea, the chosen option, and their Why filled in.

import fs from "node:fs";
import path from "node:path";

export const STAGES = ["framing", "attempt", "options", "accepted", "built"];
export const STATUSES = [...STAGES, "superseded"];

// Sections each stage needs before moving to the next one.
export const REQUIRED_TO_ENTER = {
  attempt: ["problem"],
  options: ["your first idea"],
  accepted: ["options", "decision", "why"],
  built: ["outcome"],
};

const FILE_NAME = /^(\d{4})-[a-z0-9-]+\.md$/;
const FIELD = /^([A-Z][A-Za-z ]+):[ \t]*(.*)$/;

export function slugify(title) {
  return (
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/g, "") || "decision"
  );
}

// Older decision files call "What matters" by its jargon name, "Forces".
const SECTION_ALIASES = { forces: "what matters" };

// "Why (your words)" and "why" are the same section.
function sectionKey(heading) {
  const key = heading.replace(/\(.*?\)/g, "").trim().toLowerCase();
  return SECTION_ALIASES[key] || key;
}

// Template comments are instructions, not content.
function hasContent(text) {
  return text.replace(/<!--[\s\S]*?-->/g, "").trim().length > 0;
}

export function parseDecision(text, file = "") {
  const lines = text.split(/\r?\n/);
  const fields = {};
  const sections = {};
  let title = "";
  let current = null;
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      current = sectionKey(heading[1]);
      sections[current] = "";
      continue;
    }
    if (current) {
      sections[current] += line + "\n";
      continue;
    }
    const top = line.match(/^#\s+(?:\d{4}\s*·\s*)?(.+?)\s*$/);
    if (top && !title) {
      title = top[1];
      continue;
    }
    const field = line.match(FIELD);
    if (field) fields[field[1].toLowerCase()] = field[2].trim();
  }
  const id = (path.basename(file).match(FILE_NAME) || [])[1] || fields.id || "";
  const status = (fields.status || "").toLowerCase();
  const filled = Object.fromEntries(
    Object.entries(sections).map(([key, body]) => [key, hasContent(body)])
  );
  return { id, file, title, status, fields, sections, filled };
}

export function missingFor(decision, stage) {
  return (REQUIRED_TO_ENTER[stage] || []).filter((key) => !decision.filled[key]);
}

// The gate's rule. Checked on every edit, so editing the Status line by hand
// can't unlock code without the learner's words in the file.
export const UNLOCK_SECTIONS = ["your first idea", "decision", "why"];

export function unlocks(decision) {
  return decision.status === "accepted" && UNLOCK_SECTIONS.every((key) => decision.filled[key]);
}

export function listDecisions(dir) {
  let names = [];
  try {
    names = fs.readdirSync(dir).filter((name) => FILE_NAME.test(name)).sort();
  } catch {
    return [];
  }
  const decisions = [];
  for (const name of names) {
    const file = path.join(dir, name);
    try {
      if (!fs.lstatSync(file).isFile()) continue; // Skip links and folders.
      decisions.push(parseDecision(fs.readFileSync(file, "utf8"), file));
    } catch {
      // An unreadable file can't unlock anything; leave it out.
    }
  }
  return decisions;
}

function today() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function template({ id, title, level, supersedes = "" }) {
  return `# ${id} · ${title}

Status: framing
Date: ${today()}
Level: ${level || "not set"}
Concepts:
Supersedes: ${supersedes}
Superseded by:

## What you want (your words)
<!-- Optional: for a big or vague feature, what the learner said it should do. -->

## Problem
<!-- Claude: what needs deciding, in one or two sentences. -->

## What matters
<!-- Optional: only when the choice is a real tradeoff the brief doesn't settle. Cite the brief; mark your own assumptions. -->

## Concepts
<!-- Claude: concept lessons this decision relies on (new or already learned). -->

## Your first idea (your words)
<!-- The learner's guess, recorded from chat before any options were shown. -->

## Options
<!-- Claude: 2-3 options. The learner's idea is one of them, evaluated honestly. -->

## Decision
<!-- The option the learner chose. -->

## Why (your words)
<!-- The learner's reasoning, recorded from chat. Typos fixed, nothing added. -->

## Outcome
<!-- Claude: what was built, where, and how it was verified. -->
`;
}

export function createDecision(dir, { title, level, supersedes }) {
  fs.mkdirSync(dir, { recursive: true });
  const existing = listDecisions(dir).map((d) => Number(d.id));
  const next = String((existing.length ? Math.max(...existing) : 0) + 1).padStart(4, "0");
  const file = path.join(dir, `${next}-${slugify(title)}.md`);
  // "wx" refuses to overwrite if another session created the same number.
  fs.writeFileSync(file, template({ id: next, title, level, supersedes }), { flag: "wx" });
  return parseDecision(fs.readFileSync(file, "utf8"), file);
}

export function findDecision(dir, id) {
  const wanted = String(id).padStart(4, "0");
  return listDecisions(dir).find((d) => d.id === wanted) || null;
}

// Replace one header field in place, leaving the learner's sections untouched.
export function setField(file, name, value) {
  const text = fs.readFileSync(file, "utf8");
  // Only touch the header, so a "Status:" line inside the learner's words is safe.
  const split = text.search(/^## /m);
  const head = split === -1 ? text : text.slice(0, split);
  const body = split === -1 ? "" : text.slice(split);
  const pattern = new RegExp(`^${name}:[ \\t]*.*$`, "m");
  const line = `${name}: ${value}`;
  const nextHead = pattern.test(head) ? head.replace(pattern, line) : head.replace(/\n*$/, `\n${line}\n\n`);
  fs.writeFileSync(file, nextHead + body);
}

// Forward moves go one stage at a time and need their sections filled.
// Moving back (reopening a decision) is always allowed.
export function advance(dir, id, to) {
  const decision = findDecision(dir, id);
  if (!decision) throw new Error(`No decision ${id} in ${dir}.`);
  if (!STAGES.includes(to)) throw new Error(`Unknown stage "${to}". Use: ${STAGES.join(", ")}.`);
  if (decision.status === "superseded") throw new Error(`Decision ${decision.id} is superseded.`);
  const from = STAGES.indexOf(decision.status);
  const target = STAGES.indexOf(to);
  if (target > from + 1) {
    throw new Error(`Decision ${decision.id} is at "${decision.status}"; next stage is "${STAGES[from + 1]}".`);
  }
  if (target === from + 1) {
    const missing = missingFor(decision, to);
    if (missing.length) {
      throw new Error(`Can't move to "${to}" yet. Empty sections: ${missing.join(", ")}.`);
    }
  }
  setField(decision.file, "Status", to);
  // A replacement takes over only once it's accepted.
  if (to === "accepted" && decision.fields.supersedes) {
    const old = findDecision(dir, decision.fields.supersedes);
    if (old) {
      setField(old.file, "Status", "superseded");
      setField(old.file, "Superseded by", decision.id);
    }
  }
  return findDecision(dir, decision.id);
}

// The project brief: who the project is for and what it must do, in the
// learner's words. No decision can start until it exists, because the brief
// is where "What matters" comes from.
export const BRIEF_FILE = "brief.md";
export const BRIEF_REQUIRED = ["who it's for", "what they should be able to do", "what will change over time"];

export function briefTemplate() {
  return `# Project brief

Date: ${today()}

<!-- Asked before any decision. The three learner sections hold only the
learner's words from chat. Later decisions cite this file in "What matters". -->

## Who it's for (your words)
<!-- Who will use this, and who matters most. -->

## What they should be able to do (your words)
<!-- What someone should have done, learned, or gotten by the time they leave. -->

## What will change over time (your words)
<!-- Mostly fixed, or will things keep being added? What, and how often? -->

## Other things that matter (your words)
<!-- Optional: deadlines, budget, things the learner already knows or wants to learn. -->

## Decision map
<!-- Claude: the decisions this project needs, one line each, updated as they're made. -->
`;
}

export function readBrief(dir) {
  const file = path.join(dir, BRIEF_FILE);
  let parsed = null;
  try {
    if (fs.lstatSync(file).isFile()) parsed = parseDecision(fs.readFileSync(file, "utf8"), file);
  } catch {
    // Missing or unreadable: no brief.
  }
  const missing = BRIEF_REQUIRED.filter((key) => !(parsed && parsed.filled[key]));
  return { file, exists: Boolean(parsed), complete: Boolean(parsed) && missing.length === 0, missing };
}

export function createBrief(dir) {
  const existing = readBrief(dir);
  if (existing.exists) return existing;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, BRIEF_FILE), briefTemplate(), { flag: "wx" });
  return readBrief(dir);
}
