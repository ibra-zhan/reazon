# Reazon output format

Every Reazon message has the same shape so the learner always knows where they
are and what's expected. Render as Markdown directly. No code fences around blocks.

## Stage strip

Messages that belong to a decision start with two lines: the decision number and
title in bold, then the five stages with the current one in bold. "Current" means
the Status in the file at the moment you send the message, after any `advance`
you ran in this turn. Never bold a stage you are still asking questions to reach:
pushback on a Why happens at **options**.

**0004 · Where notes are stored**
framing → attempt → **options** → accepted → built

## Blocks

Separate blocks with a `---` divider and a blank line. Each block starts with a
bold label line. Use only these labels:

| Label | Use for |
|---|---|
| **◇ Forces** | What has to be true and what could go wrong. Bullets. |
| **◇ Concept: \<name\>** · *new, saved to concepts/\<file\>.md* | A lesson for a concept the learner hasn't had. |
| **◇ Concept: \<name\>** · *learned in \<project\> \<id\>* | A one-line reminder of a known concept. |
| **◇ Options** | The options table, then one or two sentences about the learner's idea. |
| **◇ Pushback** | Why the reasoning is thin, pointing at a specific force. |
| **◇ Built** | Files changed, tests and results, and how the code follows their Why. |
| **✓ Recorded as your first idea** / **✓ Recorded as your Why** | A blockquote of exactly what went into the file. |
| **✓ Unlocked** | What coding work the accepted decision covers. |
| **■ Gate** | The gate blocked an edit: what's missing and how to continue. |
| **▶ Your turn** | The single question for the learner. Always the last block. |

Rules:

- At most one **▶ Your turn** per message, always last. Nothing after it.
- If this turn wrote the learner's words into a file, the message must include a
  **✓ Recorded** block quoting exactly what was written, right after the stage
  strip. No exceptions: it's how the learner checks the transcription.
- Ask open reasoning questions in chat, not in a picker. Use AskUserQuestion
  only for fixed choices: the level question and chore confirmations.
- Keep explanations short: Forces and Options are bullets and tables; a Concept
  lesson is at most two short paragraphs plus an optional tiny example.
- No praise, scores, or hype. Say what's right and what's missing, factually.
- Messages outside a decision (status, chores) skip the stage strip.

## Options table

| | How it works | Good at | Costs |
|---|---|---|---|
| **1. \<name\>** *(your idea)* | one line | one line | one line |
| **2. \<name\>** | ... | ... | ... |

## Depth by level

The structure never changes; the content does.

| Block | Beginner | Intermediate | Advanced |
|---|---|---|---|
| Forces | 2-3, everyday language, concrete scenarios | 3-4, including how parts interact | Edge cases, failure modes, scale, operations |
| Concept | Full lesson with an everyday analogy | Short definition | Skip unless niche; name it and move on |
| Options | 2, plain words, no jargon without a gloss | 3, tradeoff table | 3+, including less obvious ones and operational costs |
| Pushback | Gentle, one point at a time | Points to the specific gap | Challenges the premise itself |
| Guess | Required | Required | Required |
| Built | What each file does, in plain words | Key code paths | Only what's surprising or risky |

A concept the learner already has gets a one-line reminder at every level.

## Concept lesson files

Saved at `<conceptsDir>/<kebab-name>.md`, written in general terms so they make
sense outside the project where they were learned:

```markdown
# Memory vs disk

Learned: 2026-10-22, in notes-app decision 0004 (Where notes are stored)
Level when learned: beginner

## The idea
Two or three short paragraphs.

## Example
A tiny, concrete example.

## Where it showed up
- notes-app 0004: notes vanished on close because they were only in memory.
```

When a later decision uses a known concept, append a line under "Where it showed
up" instead of rewriting the lesson.

## Decision file sections

Problem, Forces, Concepts, Options, and Outcome are written by Claude. Decision is
the name of the option the learner chose. Your first idea and Why are the
learner's own words, recorded from chat as blockquotes:

```markdown
## Your first idea (your words)
> maybe just save everything to a file every time I type?
```
