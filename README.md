<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.png">
    <img src="assets/logo-light.png" alt="Reazon" width="360">
  </picture>
</h1>

**Learn software design for real, while Claude builds your project.**

A plugin for **Claude Code** that makes sure you actually understand what gets
built. Before Claude writes code for a feature, you go through a short learning
loop: you **learn the problem**, **take your own shot** at solving it, **see
where your idea holds up and where it breaks**, and **defend the choice you
make**. Then Claude builds it and shows how the code follows your reasoning.

AI can build you an app in an afternoon. It can't make you understand it. You end
up with code you can't explain, design choices you didn't make, and the same blank
page the next time you start from scratch. Reazon changes the order, so the
understanding comes first and stays with you.

For beginners building their first real app with AI, developers moving into an
unfamiliar stack, and anyone who has shipped something with AI and couldn't
explain how it works.

## Table of Contents

- [Get started](#get-started)
  - [Requirements](#requirements)
  - [Install](#install)
  - [Your first decision](#your-first-decision)
- [The learning loop](#the-learning-loop)
- [What it feels like](#what-it-feels-like)
- [Why it works](#why-it-works)
- [What you walk away with](#what-you-walk-away-with)
  - [Decision files](#decision-files)
  - [Your concept glossary](#your-concept-glossary)
- [Make it yours](#make-it-yours)
  - [Levels](#levels)
  - [Things you can say](#things-you-can-say)
  - [Small fixes, old decisions, and turning it off](#small-fixes-old-decisions-and-turning-it-off)
- [Commands](#commands)
- [How the gate works](#how-the-gate-works)
- [Where everything is stored](#where-everything-is-stored)
- [FAQ](#faq)
- [Updating](#updating)
- [Development](#development)
- [License](#license)

## Get started

### Requirements

- An up-to-date [Claude Code](https://code.claude.com/docs/en/setup).
- [Node.js](https://nodejs.org/) 18.13 or newer. Reazon uses Node to run its
  hooks and helper; there are no packages to install. Check with `node --version`.

### Install

In Claude Code, run these commands **one at a time**. First, add the marketplace:

```text
/plugin marketplace add ibra-zhan/reazon
```

After it finishes, install the plugin:

```text
/plugin install reazon@reazon
```

Choose an installation scope and confirm. Restart Claude Code in the project you
want to work on.

To get updates automatically, open `/plugin` → **Marketplaces** → **reazon** →
**Enable auto-update**. It's off by default for third-party marketplaces.

<details>
<summary>Alternative: install from a local folder</summary>

If you've cloned the repository, point Claude Code at it instead. Replace the path
with where you cloned it:

```text
/plugin marketplace add /absolute/path/to/reazon
```

```text
/plugin install reazon@reazon
```

To try Reazon for a single session without installing anything:

```sh
claude --plugin-dir /absolute/path/to/reazon
```

</details>

### Your first decision

In your project, run:

```text
/reazon:decide
```

Then ask for whatever you want to build, the way you normally would. Reazon asks
one question first: your level (Beginner, Intermediate, or Advanced). It
remembers your answer for every project. From then on, Reazon runs the learning loop
whenever you ask for a feature that involves a design choice.

Installing Reazon doesn't change anything in your other projects. It only turns
on in a project once you start a decision there.

## The learning loop

Every meaningful change goes through five stages. Each one is recorded in a
decision file, and code stays locked until you've worked through the first four.

| Stage | What happens | What gets recorded |
| --- | --- | --- |
| **Framing** | Claude lays out the *forces*: what has to be true and what could go wrong. Any concept you haven't met yet gets a short lesson that explains the problem, never the answer. | Problem, Forces, Concepts |
| **Attempt** | You say how you'd do it, before seeing any options. A guess is always required. If you're stuck, the question gets smaller until a guess is possible. | Your first idea, in your words |
| **Options** | Your idea goes on the table next to two or three real options and is evaluated honestly: what it gets right, which force it misses. If yours is the best fit, Reazon says so. | Options |
| **Accepted** | You pick and explain why. "Because it's simpler" doesn't count. Reazon pushes back until your reason points at a real tradeoff in your project. Code unlocks. | Decision, and your Why in your words |
| **Built** | Claude writes the code, runs the checks, and explains how the code follows your Why. Code locks again. | Outcome |

You never edit these files yourself. Everything happens in chat. Claude records your
words with only typos fixed, and shows you a receipt of exactly what it wrote.

## What it feels like

You're building a small notes app. Notes live in a JavaScript array, so they
vanish every time the app closes. This walkthrough comes from a real session,
lightly condensed.

**You:**

```text
Make my notes survive closing the app.
```

**Claude:**

```text
0001 · Where notes are stored
framing → attempt → options → accepted → built
          ^^^^^^^

◇ Forces
- A note has to still be there next time the app opens, even after a restart.
- One bad save shouldn't corrupt everything already written.
- addNote and listNotes still need to work the same way for the rest of the app.

◇ Concept: memory vs disk · new, saved to concepts/memory-vs-disk.md
A running program keeps its data in memory. Think of it as a desk: fast,
but cleared the moment you stop. `const notes = []` lives entirely on that
desk. Disk storage is a filing cabinet: slower, but it stays after you
leave the room. To survive closing the app, data has to make that trip.

▶ Your turn
If you had to make notes survive the app closing, where would you keep
them, and when would the saving happen? A guess is fine.
```

**You:**

```text
maybe save them in a text file every time I add one?
```

**Claude:**

```text
0001 · Where notes are stored
framing → attempt → options → accepted → built
                    ^^^^^^^

✓ Recorded as your first idea
> maybe save them in a text file every time I add one?

◇ Options
                         How it works            Good at              Costs
1. Line-per-note file    Append one line per     Simple; a crash      Breaks if a note
   (your idea)           note                    loses nothing        has a line break
2. Rewrite as JSON       Write the whole list    Any text works       Slower as notes grow;
                         on every change                              a crash mid-write
                                                                      can corrupt the file

Your idea is the simpler of the two and works as long as notes are
single lines.

▶ Your turn
Which one do you want, and why?
```

**You:**

```text
the first one, because it's simpler
```

**Claude:**

```text
◇ Pushback
"Simpler" is true, but both options keep notes after closing. The real
tradeoff: option 1 breaks on multi-line notes, option 2 risks the whole
file on a crash.

▶ Your turn
Given that tradeoff, why option 1 for this app specifically?
```

**You:**

```text
option 1, because my notes are short one-liners and I care more about not
losing a note if it crashes than about multi-line notes
```

**Claude:**

```text
0001 · Where notes are stored
framing → attempt → options → accepted → built
                              ^^^^^^^^

✓ Recorded as your Why
> because my notes are short one-liners and I care more about not losing
> a note if it crashes than about multi-line notes

✓ Unlocked
Scope: save and load notes through notes.txt instead of the array.
```

*Claude writes the code and checks it in two separate runs, standing in for an app restart.*

**Claude:**

```text
0001 · Where notes are stored
framing → attempt → options → accepted → built
                                         ^^^^^

◇ Built
- addNote appends the text plus a line break to notes.txt.
- listNotes reads the file and splits it into lines.
- Verified with two separate processes: the second, starting fresh, read
  back both notes the first one wrote.

This follows your Why: notes are one-liners, so line-per-note never hits
its weakness, and each note lands on disk the instant it's added.
```

That one feature taught why data disappears, what a crash does to a file, and how
to weigh a tradeoff against how the app is actually used. In Claude Code, each
message renders with bold labels and a highlighted stage.

**If Claude tries to write code too early**, the gate stops it:

```text
■ Gate: no accepted decision covers editing src/util.js. Start or continue
one with /reazon:decide. For a small fix, the user can grant a one-off pass
with /reazon:chore.
```

**Months later**, you want multi-line notes. `/reazon:revisit` brings back
decision 0001 with your original Why, asks what changed, and starts a new decision
that replaces it. The record shows exactly how your thinking moved.

## Why it works

The loop is built on well-studied effects from learning research:

| Effect | What it means | Where it shows up in Reazon |
| --- | --- | --- |
| **Pretesting / productive failure** | Attempting a problem before being taught makes the explanation stick better, even when the attempt is wrong. | The required guess, before any options. |
| **Self-explanation** | Putting reasoning into your own words shows you what you understand and what you don't. | Your Why, and the pushback on vague answers. |
| **Learning in context** | Ideas stick when they solve a problem you actually care about. | Every lesson and option is about your own project. |
| **Spaced reminders** | Meeting a concept again later strengthens it. | Concepts you already know come back as one-line reminders in later decisions. |

Asking AI to "explain the code" after it's written skips all of this. You read
along, nod, and forget.

## What you walk away with

### Decision files

Every feature gets a file in `docs/decisions/`, committed with your code. Here is
the file from the walkthrough above:

```markdown
# 0001 · Where notes are stored

Status: built
Date: 2026-10-22
Level: beginner
Concepts: memory-vs-disk

## Problem
src/notes.js keeps notes in a plain JavaScript array. When the app closes,
that array is gone.

## Forces
- The note has to still be there the next time the app opens.
- One bad save shouldn't corrupt everything already written.

## Your first idea (your words)
> maybe save them in a text file every time I add one?

## Options
1. Append each note as a line to a text file (your idea) ...
2. Rewrite the whole list to a JSON file on every change ...

## Decision
Option 1: append each note as a line to a text file.

## Why (your words)
> option 1, because my notes are short one-liners and I care more about not
> losing a note if it crashes than about multi-line notes

## Outcome
src/notes.js now writes to notes.txt ... Verified by running two separate
Node processes ...
```

Over time, the folder becomes a record of how your thinking grew. It also gives
you a real answer when someone asks why your project is built the way it is.

### Your concept glossary

Each concept lesson is saved to `~/.reazon/concepts/`, written in general terms
with examples from where you learned it. It belongs to you, not to one project.
When a later decision in any project uses a concept you already have, you get a
one-line reminder instead of the full lesson, and the lesson notes where the
concept showed up again.

```markdown
# Memory vs disk

Learned: 2026-10-22, in notes-app decision 0001 (Where notes are stored)
Level when learned: beginner

## The idea
A running program keeps its data in memory (RAM) ...

## Where it showed up
- notes-app 0001: notes vanished on close because they were only in memory.
```

## Make it yours

### Levels

Your level changes how deep each part goes. The loop stays the same, and the
guess is required at every level.

| | Beginner | Intermediate | Advanced |
| --- | --- | --- | --- |
| **Forces** | 2–3, everyday language, concrete scenarios | 3–4, including how parts interact | Edge cases, failure modes, scale, operations |
| **Concepts** | Full lesson with an everyday analogy | Short definition | Only if niche |
| **Options** | 2, plain words | 3, tradeoff table | 3+, including less obvious ones and operational costs |
| **Pushback** | Gentle, one point at a time | Points to the specific gap | Challenges the premise itself |
| **Built** | What each file does, in plain words | Key code paths | Only what's surprising or risky |
| **Your guess** | Required | Required | Required |

Your level follows you to every project. If you're newer (or stronger) in one
project's stack, set a level for just that project. Reazon may suggest a level
change when several answers in a row show it, but it never changes your level
without asking.

### Things you can say

Talk to it normally. For example:

- "Treat me as advanced."
- "I'm new to Rust, go slower in this project."
- "Explain that concept again, more simply."
- "What would happen if two people saved at once?"
- "Just build it." Reazon records the decision as skipped by you and moves on, without arguing.

### Small fixes, old decisions, and turning it off

- **Small fixes:** a typo or a rename doesn't need a lesson. Run `/reazon:chore`
  to give Claude a one-off pass that ends when its reply does. Only you can grant
  it, and Claude will tell you if your "small fix" is actually a design choice.
- **Old decisions:** when a past choice stops fitting, `/reazon:revisit` starts a
  new decision with the old one in view. The old file stays as history, marked
  as replaced.
- **Turning it off:** `/reazon:off` stops the gate for this project. Your decisions
  and concepts are kept. `/reazon:decide` turns it back on.

## Commands

| Command | What it does |
| --- | --- |
| `/reazon:decide` | Start or continue the learning loop. Claude also starts it on its own when you ask for a feature in a Reazon project. |
| `/reazon:status` | Your level, every decision and its stage, whether code is unlocked, and concepts learned. |
| `/reazon:revisit` | Reason through a new decision that replaces an old one, with your old Why in view. |
| `/reazon:chore` | One-off pass for a small fix with no design choice. Ends when Claude's reply ends. |
| `/reazon:level` | See or change your level, everywhere or for this project. |
| `/reazon:off` | Turn Reazon off for this project. Decisions are kept. |

## How the gate works

When Reazon is on for a project, a hook checks every Edit, Write, MultiEdit, and
NotebookEdit Claude attempts on a project file. The edit goes through only if a
decision is **accepted** *and* has your first idea, your choice, and your Why
recorded. Changing a decision's status line by hand doesn't get around that
check.

Always editable: decision files, Markdown docs, lockfiles, `.gitignore`, and
anything outside the project.

**Limits, honestly:** the gate doesn't cover shell commands. Claude is
instructed not to write code through the shell while code is locked, but that
relies on Claude following its instructions. Think of the gate as a guardrail,
not a lock. Reazon also can't verify that you typed your Why, only that one was
recorded. The receipts are there so you can check that it's really yours.

## Where everything is stored

Everything is local files. There's no server, account, or telemetry.

```
~/.reazon/                       about YOU, shared across projects
├── profile.json                 your level, plus per-project settings
├── concepts/                    every concept lesson you've had
└── sessions/                    temporary chore passes, removed automatically

your-project/docs/decisions/     about the PROJECT, meant to be committed
├── 0001-where-notes-are-stored.md
└── 0002-...
```

Your first ideas and Whys are committed with the code, so they're visible to
anyone who can see the repository. Claude reads your profile, the relevant
concepts, and decisions during a session, so your normal Claude Code data
settings apply to them.

## FAQ

**Do I need to know anything about software design first?**
No. Pick Beginner, and the concept lessons and smaller questions get you to a
guess. Not knowing is where the loop starts.

**What if I really have no idea what to guess?**
"I don't know" isn't accepted as-is, but Reazon won't leave you stuck either. It
makes the question smaller until a guess is possible. A wrong guess teaches you
more than skipping one.

**Does Claude make up my reasoning?**
No. "Your first idea" and "Why" hold only your words from chat, with typos fixed.
Claude writes the Problem, Forces, Options, and Outcome sections. Every time your
words are saved, you see a receipt of exactly what was written.

**Isn't this slower than just letting Claude code?**
A decision takes a few minutes of conversation. That time is the learning.
Small fixes go through `/reazon:chore`, and you can always say "just build it".

**Can my team use it?**
Decision files are committed, so everyone can read the reasoning behind each
choice. Levels and concept lessons are personal and stay on each person's computer.

**Does it work with other AI coding tools?**
Reazon is built for Claude Code. It relies on Claude Code's hooks and skills.

## Updating

In Claude Code, open `/plugin` → **Installed**, select **reazon**, and choose
**Update now**. Or, from your terminal:

```sh
claude plugin marketplace update reazon
```

```sh
claude plugin update reazon@reazon
```

Then restart Claude Code. Your decisions, level, and concepts stay intact.
Run `claude plugin list` to check the installed version.

## Development

```sh
npm test
```

```sh
claude plugin validate .
```

| Path | What's there |
| --- | --- |
| `skills/decide/SKILL.md` | The learning loop: how Claude runs each stage. |
| `skills/decide/format.md` | The message format and the depth rules for each level. |
| `skills/*/SKILL.md` | The other commands: status, chore, revisit, level, off. |
| `hooks/` | SessionStart restores context, PreToolUse runs the gate, Stop ends chore passes. |
| `lib/` | Profile storage, decision-file parsing, and the gate rule. |
| `bin/reazon.mjs` | The helper the skills call: `status`, `new`, `advance`, `level`, `chore`, `link`, `on`, `off`. |
| `tests/` | Node's built-in test runner. Tests use a temporary `REAZON_HOME`, so they never touch your real `~/.reazon`. |

## License

[MIT](LICENSE). You can use, modify, and share this software, including
commercially. Keep the license notice with copies. The software comes without
a warranty.
