# Reazon

**Learn software design for real, while Claude builds your project.**

AI can build you an app in an afternoon. What it can't do is make you understand
it. You end up with code you can't explain, design choices you didn't make, and
the same blank stare the next time you start from scratch.

Reazon is a Claude Code plugin that changes the order. Before Claude writes code
for a feature, you go through a short learning loop: you learn the problem, take
your own shot at solving it, see exactly where your idea holds up and where it
breaks, and defend the choice you make. Then Claude builds it and shows how the
code follows your reasoning.

You don't just approve what Claude does. You understand why it's built that way,
because you worked it out first.

## The learning loop

Every meaningful change in your project goes through five steps:

**1. Understand the problem.** Claude lays out the *forces*: what has to be true
and what could go wrong ("notes must survive a restart; what if the app crashes
halfway through saving?"). Any concept you haven't met yet gets a short lesson.
The lesson explains the problem, never the answer.

**2. Take your shot.** You say how you'd do it, before seeing any options. A guess
is always required, even "no idea, maybe a file?". Wrong guesses are welcome.
That's where the learning starts.

**3. See where it breaks.** Your idea goes on the table next to the real options
and is evaluated honestly: what it gets right, and which force it misses. When your
idea is the best fit, Reazon says so.

**4. Defend your choice.** You pick an option and explain why in your own words.
"Because it's simpler" doesn't count. Reazon pushes back until your reason
points at a real tradeoff in *your* project.

**5. Watch it get built.** Claude writes the code, runs the checks, and connects
what it built to your Why.

Code stays locked until steps 1 to 4 are done. That's enforced by a hook, not
just a promise.

## Why it works

The loop is built on well-studied learning effects:

- **Trying before being taught.** Attempting a problem before you're shown the
  answer makes the explanation stick better, even when your attempt is wrong.
  This is known as the pretesting effect and "productive failure".
- **Explaining in your own words.** Putting reasoning into your own sentences
  shows you what you actually understand and what you don't. This is the
  self-explanation effect.
- **Learning on your own problem.** Every lesson is anchored in a feature you
  care about, not a textbook example.

Asking AI to "explain the code" after the fact skips all three. You read along,
nod, and forget.

## What it looks like

You ask for a feature like you normally would. Reazon takes it from there.

> **You:** Make my notes survive closing the app.

> **0001 · Where notes are stored**
> framing → **attempt** → options → accepted → built
>
> **◇ Forces**
> - Notes must still be there after you close the app and restart the computer.
> - One bad save shouldn't wipe out everything already written.
>
> **◇ Concept: memory vs disk** · *new, saved to your concepts*
>
> Your app's variables live in memory, which is fast but cleared when the app closes. Anything that must survive has to make the trip to disk.
>
> **▶ Your turn**
>
> How would you make notes survive? A guess is fine.

> **You:** maybe save them in a text file every time I add one?

> **0001 · Where notes are stored**
> framing → attempt → **options** → accepted → built
>
> **✓ Recorded as your first idea**
> > maybe save them in a text file every time I add one?
>
> **◇ Options**
>
> | | How it works | Good at | Costs |
> |---|---|---|---|
> | **1. Line-per-note text file** *(your idea)* | Append one line per note | Simple; nothing lost on a crash | Breaks if a note contains a line break |
> | **2. Rewrite as JSON** | Write the whole list on every change | Any text works | Slower as notes grow; a crash mid-write can corrupt the file |
>
> **▶ Your turn**
>
> Which one, and why?

> **You:** the first one, because it's simpler

> **◇ Pushback**
>
> "Simpler" is true, but both options keep notes after closing. Option 1 breaks on multi-line notes; option 2 risks the file on a crash. Which of those matters more for your app?

> **You:** option 1, because my notes are short one-liners and I care more about not losing a note if it crashes than about multi-line notes

> **✓ Recorded as your Why** · **✓ Unlocked**
>
> Claude builds it, verifies notes survive a restart, and explains how the code follows your reasoning.

That exchange taught three things: why data disappears, what a crash does to a
file, and how to weigh a tradeoff against your actual use case. Months later,
when you want multi-line notes, `/reazon:revisit` brings back that exact
decision and your Why, so you can see what changed.

## What you walk away with

- **A project you can explain.** Every feature has a decision file in
  `docs/decisions/` with the problem, your first guess, the options, and your
  reasoning in your own words. It's a record of how your thinking grew, and
  something you can show anyone who asks why it's built that way.
- **A concept glossary that's yours.** Each lesson is saved to
  `~/.reazon/concepts/`, written from examples in your own projects. Concepts you
  already know get a one-line reminder instead of a full lesson, in every project.
- **Teaching that grows with you.** Reazon adapts depth to your level and
  suggests leveling up when your answers show it.

## Who it's for

- Beginners building their first real app with AI who want to come out the
  other side as engineers, not just prompt-writers.
- Developers moving into a new stack or domain who want to understand the
  design choices, not just collect working code.
- Anyone who has shipped something with AI and couldn't explain how it works.

## Levels

The first time, Reazon asks your level:

- **Beginner**: I can write small programs but haven't built a full app.
- **Intermediate**: I've built apps, but I'm not confident about architecture choices.
- **Advanced**: I design systems; challenge my assumptions instead of explaining.

Your level changes the depth, not the loop:

| | Beginner | Intermediate | Advanced |
|---|---|---|---|
| Forces | 2-3, everyday language | 3-4, how parts interact | Edge cases, failure modes, scale |
| Concepts | Full lesson with an analogy | Short definition | Only if niche |
| Options | 2, plain words | 3, tradeoff table | 3+, including operational costs |
| Pushback | Gentle, one point at a time | Points to the gap | Challenges the premise |
| Your guess | Required | Required | Required |

Your level follows you to every project. Use `/reazon:level` to set a different
level for one project when you're newer (or stronger) in its stack. Reazon may
suggest a level change, but never makes one without asking.

## How every message is structured

Reazon messages always have the same shape, so you know where you are and what's
expected of you:

- **Stage strip**: the decision and where it is in the loop.
- **◇ blocks**: Forces, Concept, Options, Pushback, Built.
- **✓ blocks**: something saved or unlocked. Every time your words are written to
  a file, you see exactly what was recorded.
- **■ Gate**: Claude tried to edit code before a decision was ready.
- **▶ Your turn**: one question, always last.

## Commands

| Command | What it does |
|---|---|
| `/reazon:decide` | Start or continue the learning loop. Claude also starts it on its own when you ask for a feature in a Reazon project. |
| `/reazon:status` | Your level, every decision and its stage, whether code is unlocked, concepts learned. |
| `/reazon:revisit` | An old decision no longer fits: reason through a new one that replaces it, with your old Why in view. |
| `/reazon:chore` | One-off pass for a small fix with no design choice (typo, rename). Ends when Claude's reply ends. Only you can grant it. |
| `/reazon:level` | See or change your level, everywhere or for this project. |
| `/reazon:off` | Turn Reazon off for this project. Your decisions are kept. `/reazon:decide` turns it back on. |

## Install

Requires Claude Code and Node.js 18.13 or newer. No packages to install.

Try it for one session:

```sh
claude --plugin-dir /absolute/path/to/reazon
```

Or install it as a marketplace. In Claude Code, run these one at a time:

```text
/plugin marketplace add /absolute/path/to/reazon
```

```text
/plugin install reazon@reazon
```

Restart Claude Code in your project and run `/reazon:decide`, or just ask for a
feature after your first decision.

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

When Reazon is on for a project, the gate blocks Claude's Edit, Write, MultiEdit,
and NotebookEdit tools on project files unless a decision is accepted *and* has
your first idea, your choice, and your Why recorded. Hand-editing a decision's
status doesn't get around that check.

Always editable: decision files, Markdown docs, lockfiles, `.gitignore`, and
anything outside the project.

The gate doesn't cover shell commands. Claude is instructed not to write code
through the shell while code is locked, but that relies on Claude following the
instruction. Think of the gate as a guardrail, not a lock. Reazon is only on in
projects where you've started a decision. Installing it doesn't affect your other
projects.

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
- `skills/` holds the commands. `skills/decide/SKILL.md` defines the learning loop, and `skills/decide/format.md` defines the message format and the depth for each level.

Tests use a temporary `REAZON_HOME`, so they never touch your real `~/.reazon`.

## License

[MIT](LICENSE)
