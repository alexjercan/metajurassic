# Epic: KISS pass over every module - smaller files, comments that earn their place

- PRIORITY: 72
- TAGS: goal, refactor, docs
- KIND: EPIC
- ACTIVITY: COMPOUNDING
- GATES: PLAN
- RESOLUTION: DONE

## Story

As a maintainer, I want every module read as small and comment-lean, so that a
file fits in an agent's working context and the comments that remain are ones a
reader must not skip.

## Epic

A KISS pass over the whole codebase, module cluster by module cluster. Two
levers, applied together per cluster so each file is touched once:

1. **Size.** Split files that carry several unrelated jobs. Smaller files are
   cheaper context and make the seams explicit. No new abstraction for a single
   caller - move code, do not generalize it (KISS, YAGNI).
2. **Comments.** Keep only comments that a reader cannot recover from the code.

### Comment rules this epic applies

| Keep | Form |
|------|------|
| Public API docs | docstring above the exported symbol |
| Non-obvious constraint or guard ("do not change this", browser quirk, ordering) | one compact line or short block at the site |
| Live tracker link | `NOTE:` / `FIXME:` / `TODO:` / `BUG:` with the tatr ID |

| Discard | Why |
|---------|-----|
| Narration of what the code plainly does | code says it |
| "task `<HUID>` wanted me to..." framing | archaeology, not a constraint; the record holds it |
| Rationale essays reproducing a `DECISION.md` | compact to one line plus the record pointer |
| Stale references to behaviour that no longer ships | actively misleading |

A comment that is partly load-bearing gets compacted, not deleted: keep the
constraint, drop the story. When the rationale is genuinely needed and long, it
belongs in the task record, with a one-line pointer in the code.

### Measured starting point (2026-07-31)

19,800 lines across `src/`, `test/`, `e2e/`, `scripts/`. Largest and
comment-heaviest:

| File | Lines | Comment lines |
|------|-------|---------------|
| `src/style.css` | 2403 | - |
| `e2e/helpers.ts` | 1409 | 430 |
| `test/gameStats.test.ts` | 1112 | 67 |
| `e2e/mobile.spec.ts` | 894 | 248 |
| `test/treeBuilder.test.ts` | 875 | 182 |
| `scripts/playtest/hint.ts` | 830 | 117 |
| `scripts/playtest/difficulty.ts` | 571 | 112 |
| `src/profile.ts` | 538 | - |
| `src/treeBuilder.ts` | 443 | 102 |
| `src/gameState.ts` | 440 | 70 |
| `src/gameStats.ts` | 394 | - |
| `src/game.ts` | 381 | 60 |
| `src/ui/treeVisualizer.ts` | 358 | 101 |
| `src/practiceSession.ts` | 282 | 98 |

37 comments across the tree name a task ID inline. Each is a decision one way
or the other, not a blanket delete.

Superseded by measurement. `tasks/20260731-212557/NOTES.md` re-counts the
population with the TypeScript parser rather than a line grep: 837 comments
over 3103 lines, bucketed 620 keep / 73 compact / 144 discard, and 75 comments
naming a task ID across 38 files (not 37). The table above stays as the
starting picture; the NOTES figures are what the children measure against.

## Done Means

- Every child task is CLOSED and landed. (cmd: `tatr frontier <epic-id>`)
- No source file mixes unrelated jobs at a size that forces a reader to page
  through it; each child records its own before/after line counts.
  (cmd: per-child `wc -l` table in the task record)
- No comment in `src/`, `test/`, `e2e/`, `scripts/` narrates the code beside
  it or recounts which task authored it. Surviving task references are either a
  one-line record pointer or a live `NOTE:`/`FIXME:`/`TODO:`/`BUG:`.
  (cmd: `grep -rnE '//.*(2026[0-9]{4}-[0-9]{6}|tasks/)' src scripts e2e test`,
  each hit justified in a child record)
- Behaviour is unchanged throughout: this epic ships no functional change.
  Every child proves it with a green gate on an unmodified test suite, and any
  test file it edits is edited for comments only, never for assertions.
  (cmd: `npm run ci` per child)
- The comment rules above are written into `AGENTS.md` so the pass does not
  regress. (test: child 1)

## Decisions

- Comment policy and file-size conventions: child 1's `DECISION.md`.
- Per-cluster split boundaries: each child's `DECISION.md`.
- `src/style.css` splits, proven by whitespace-normalised compiled CSS rather
  than byte-identity: `20260731-212617/DECISION.md`, from spike
  `20260801-113802`.

## Fog

- ~~Whether `src/style.css` (2403 lines) should be split into imported partials
  at all.~~ Settled by spike `20260801-113802`: `@import` partials preserve
  cascade order exactly; `@tailwindcss/postcss` only reserializes whitespace.
  What remains open is whether the surfaces are contiguous enough in file order
  to move as whole blocks - answered inside `20260731-212617`, which may still
  close as "not worth it".
- Whether `test/` and `e2e/` comment density is a problem or a feature: those
  comments often record why an assertion is the assertion, which is exactly the
  keep case. Expect a much lighter touch there than in `src/`.

## Out of Scope

- Any behaviour change, bug fix, or new feature. A bug found while reading gets
  its own task; it is not fixed inline.
- Test assertion changes. Comment edits only in `test/` and `e2e/`, plus the
  `e2e/helpers.ts` split, which moves helpers without changing what they check.
- `src/jurassic/**` content and the generated `index.json`.
- Renaming exported symbols, changing public module boundaries beyond moving
  code, or introducing abstractions with one caller.

## Manual Acceptance

- Read a sample of each cluster's post-pass files and confirm they read better,
  not merely shorter.

## Child Tasks

Working order comes from `tatr frontier 20260731-212345`; the table is the map.
Every cluster child depends on `20260731-212557`, which fixes the rules they
all apply.

| ID | Pri | Repo | Title | Landed |
|----|-----|------|-------|--------|
| 20260731-212557 | 71 | metajurassic | Write the comment and file-size policy into AGENTS.md | landed |
| 20260731-212610 | 70 | metajurassic | KISS pass: core game loop (game.ts, gameState.ts, share text) | landed |
| 20260731-212611 | 68 | metajurassic | KISS pass: tree pipeline (treeBuilder, treeVisualizer, treeLayout) | landed |
| 20260731-212612 | 66 | metajurassic | KISS pass: profile page and stats maths | landed |
| 20260731-212613 | 64 | metajurassic | KISS pass: practice session, storage, and content loaders | landed |
| 20260731-212614 | 62 | metajurassic | KISS pass: src/ui widget family | landed |
| 20260731-212615 | 60 | metajurassic | Split e2e/helpers.ts into focused helper modules | landed |
| 20260731-212616 | 58 | metajurassic | KISS pass: Jest suites and playtest rigs | landed |
| 20260731-212617 | 50 | metajurassic | Decide and, if safe, split src/style.css by surface | landed |
