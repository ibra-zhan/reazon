# reazon

**Decide first. Then Claude builds.**

reazon is a Claude Code plugin for learning software design while AI writes the
code. Every meaningful change starts with a *decision* that you reason through:
Claude teaches the problem, you guess, Claude shows the options (with your guess
among them), and you choose and explain why. Only then does Claude write code.
A hook enforces this: Claude's file edits stay locked until a decision is accepted.

Each decision is saved as a short file in your project, with your first idea and
your reasoning in your own words. Over time, `docs/decisions/` becomes a record of
how your thinking changed, and `~/.reazon/concepts/` becomes your own glossary.

## How a decision works

```
framing    Claude explains the problem: the forces (what must be true, what
           could go wrong) and a short lesson for any concept you haven't seen.
   ↓
attempt    You guess how you'd do it. Always required, even "no idea, maybe a file?"
   ↓
options    2-3 options. Your idea is one of them, evaluated honestly.
   ↓
accepted   You choose and say why. Thin reasons ("it's better") get pushback.
           Code unlocks.
   ↓
built      Claude writes the code, runs the checks, explains how it follows
           your Why. Code locks again.
```

Everything happens in chat. You never edit the files yourself: Claude records
your words, with only typos fixed, and shows you a receipt of exactly what it wrote.

## What it looks like

> **0001 · Where notes are stored**
> framing → attempt → **options** → accepted → built
>
> ---
>
> **✓ Recorded as your first idea**
>
> > maybe save them in a text file every time I add one?
>
> ---
>
> **◇ Options**
>
> | | How it works | Good at | Costs |
> |---|---|---|---|
> | **1. Line-per-note text file** *(your idea)* | Append one line per note | Simple; nothing lost on a crash | Breaks if a note has a newline |
> | **2. Rewrite as JSON** | Write the whole list on every change | Any text works | Slower as notes grow; a crash mid-write can break the file |
>
> ---
>
> **▶ Your turn**
>
> Which one do you want, and why?

Every message uses the same blocks: **◇** for information (Forces, Concept,
Options, Pushback, Built), **✓** for something saved or unlocked, **■** when the
gate blocks an edit, and **▶ Your turn** for the single question, always last.

## Levels

The first time, reazon asks your level:

- **Beginner**: I can write small programs but haven't built a full app.
- **Intermediate**: I've built apps, but I'm not confident about architecture choices.
- **Advanced**: I design systems; challenge my assumptions instead of explaining.

The level changes the depth (how many forces, full lessons or one-liners, two
options or more, gentle or premise-level pushback), never the structure. The
guess is required at every level. Your level follows you to every project; set a
project-only override with `/reazon:level` when you're newer to a stack. Claude
may suggest a level change when your answers point that way, but never changes it
without asking.

## Commands

| Command | What it does |
|---|---|
| `/reazon:decide` | Start or continue a decision. Claude also starts one on its own when you ask for a feature in a reazon project. |
| `/reazon:status` | Your level, every decision and its stage, whether code is unlocked, concepts learned. |
| `/reazon:chore` | One-off pass for a small fix (typo, rename). Ends when Claude's reply ends. Only you can grant it. |
| `/reazon:revisit` | An old decision no longer fits: reason through a new one that supersedes it. |
| `/reazon:level` | See or change your level, everywhere or for this project. |
| `/reazon:off` | Turn the gate off for this project. Decisions are kept. `/reazon:decide` turns it back on. |

## Where things are stored

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
anyone who can see the repo. Claude reads your profile, the relevant concepts and
decisions during a session, so your normal Claude Code data settings apply.

## What the gate does and doesn't do

When reazon is on for a project, the gate blocks Claude's Edit, Write, MultiEdit,
and NotebookEdit tools on project files unless a decision is accepted *and* has
your first idea, the chosen option, and your Why filled in. Hand-editing a
decision's status doesn't get around that check.

Always editable: decision files, Markdown docs, lockfiles, `.gitignore`, and
anything outside the project.

The gate doesn't cover shell commands. Claude is told not to write code through
the shell while code is locked, but that relies on Claude following instructions.
Think of the gate as a guardrail, not a lock. reazon is only on in projects where
you've started a decision or run `reazon on`. Installing it doesn't affect your
other projects.

## Install

Requires Claude Code and Node.js 18 or newer. No packages to install.

Try it for one session:

```sh
claude --plugin-dir /absolute/path/to/reazon
```

Or install it from this folder as a local marketplace. In Claude Code, run these
one at a time:

```text
/plugin marketplace add /absolute/path/to/reazon
```

```text
/plugin install reazon@reazon
```

Restart Claude Code in your project and run `/reazon:decide`, or just ask for a
feature after starting your first decision.

## Development

```sh
npm test
```

```sh
claude plugin validate .
```

- `lib/` stores profile data, parses decision files, and holds the gate rule.
- `bin/reazon.mjs` is the CLI that the skills call.
- `hooks/` holds the three hooks: SessionStart restores context, PreToolUse runs the gate, Stop ends chore passes.
- `skills/` holds the commands. `skills/decide/format.md` defines the output format and the depth for each level.

Tests use a temporary `REAZON_HOME`, so they never touch your real `~/.reazon`.

## License

[MIT](LICENSE)
