# Core game loop: before/after measurements

## The rig

Same method as `tasks/20260731-212557/NOTES.md` `## How the population was
counted`: the TypeScript PARSER (not the scanner, which reads `/\.md$/` as a
comment; not a line grep, which counts a run of `//` lines as N comments
instead of one). Consecutive standalone `//` lines fuse into one comment.

Script lives in this session's scratchpad, not the repo. It needs the repo's
`typescript`:

```sh
NODE_PATH="$PWD/node_modules" node scratchpad/comments.js src/game src/gameState.ts
```

Columns are `file`, `wc -l`, comments, comment lines.

The baseline cross-checks against the epic's own table: `game.ts` 60 comment
lines and `gameState.ts` 70, which is what
`tasks/20260731-212345/TASK.md` recorded independently.

## Before (branch point, 96f50b1)

| File | Lines | Comments | Comment lines |
|------|------:|---------:|--------------:|
| `src/game.ts` | 381 | 13 | 60 |
| `src/gameState.ts` | 440 | 19 | 70 |
| `src/gameData.ts` | 162 | 10 | 29 |
| `src/closeness.ts` | 66 | 5 | 28 |
| `src/constants.ts` | 20 | 2 | 14 |
| **Total** | **1069** | **49** | **201** |

## After

| File | Lines | Comments | Comment lines |
|------|------:|---------:|--------------:|
| `src/game/index.ts` | 219 | 4 | 11 |
| `src/game/hintChip.ts` | 82 | 3 | 12 |
| `src/game/onboardingBrief.ts` | 49 | 3 | 19 |
| `src/game/shareButton.ts` | 50 | 2 | 6 |
| `src/gameState.ts` | 230 | 7 | 24 |
| `src/shareText.ts` | 127 | 7 | 27 |
| `src/puzzleKey.ts` | 85 | 5 | 18 |
| `src/gameData.ts` | 162 | 10 | 29 |
| `src/closeness.ts` | 66 | 5 | 28 |
| `src/constants.ts` | 16 | 2 | 10 |
| **Total** | **1086** | **48** | **184** |

Per cluster:

| Cluster | Before | After | Largest file after |
|---------|-------:|------:|-------------------:|
| `game.ts` -> `game/` | 381 | 400 over 4 files | 219 |
| `gameState.ts` -> 3 files | 440 | 442 over 3 files | 230 |
| Comment lines, whole cluster | 201 | 184 | - |

**The line total went UP by 17, and that is the honest result.** A split buys
seams, not fewer lines: each new file pays for its own import block. What moved
is the size of the biggest thing a reader has to hold - 440 lines down to 230,
and 381 down to 219 - which is what the epic's Story actually asks for. Any
child reporting a net line REDUCTION from a split alone should be read
sceptically.

Comment lines fell 17 (201 -> 184) against 12 planned discards, and the comment
COUNT fell by only one (49 -> 48). Nothing was deleted wholesale; two essays
were compacted and their constraints kept.

## Comment decisions worth naming

- **`gameData.ts` is unchanged: 10 comments, 29 lines, all keeps.** The
  `DAILY_SHUFFLE_SALT` block is the policy's case 2 verbatim - no record holds
  it, so it stays in full. The DST/`localDayIndex` block is a constraint. Even
  `// January 1, 2026` on `new Date(2026, 0, 1)` stays: it guards against
  misreading a 0-based month.
- **The brief-mount essay was KEPT IN FULL, against the plan.** The plan said
  compact it to a constraint line plus a pointer. The rationale IS recorded -
  `tasks/20260729-092327/TASK.md:110-117` holds the flex-sibling mount, the
  `overflow: auto` competition, and the 1440x660 / 1366x600 / 1280x720
  measurements - but it is recorded in a TASK.md CLOSE-OUT, and `AGENTS.md`
  `## Comments` names `DECISION.md`, `SPIKE.md` or `NOTES.md` as the record
  kinds a comment may be compacted towards. A close-out is not one of them, so
  the comment stays in full. Its first line did carry dead framing ("the band
  that 20260729-141414 left empty"), which went.

  **Siblings: search `tasks/` whole, not `DECISION.md` alone.** The first pass
  here grepped only the two `DECISION.md` files the comment itself pointed at,
  found nothing, and concluded no record existed - which was wrong, and review
  caught it (`REVIEW.md` R1.2). The right question is "does any record hold
  this", asked over the whole tree; the follow-up question is whether that
  record is one the policy accepts as a compaction target.
- **The hint-purchase essay WAS compacted**, 17 lines to 7, because both
  records it names do hold the rationale - checked, not assumed:
  `20260729-092315/DECISION.md:49` covers the before-first-guess branch and
  `20260729-141414/DECISION.md:64` the narrow-viewport one.
- Discarded outright: `// Change the text to "Copied!" for 2 seconds, then
  revert back`, directly above the code that does exactly that.
- `makeGuess`'s comment kept the player-facing constraint and dropped the
  alert() history; `showInputError`'s did the same.

## test/ and e2e/ diff

`e2e/` is untouched - zero files, zero lines. `test/` is 7 files, +15/-11, and
every changed line is an import line or a symbol name inside an import block:

| File | Moved to |
|------|----------|
| `test/closeness.test.ts` | `CLOSENESS_CELLS`, `formatGameStateForSharing` -> `shareText` |
| `test/dailyKeyMirror.test.ts` | `gameStateKey`, `getTodaySeed` -> `puzzleKey` |
| `test/gameState.test.ts` | `parseGameStateKey`, `gameStateKey`, `getTodaySeed` -> `puzzleKey`; `formatGameStateForSharing` -> `shareText` |
| `test/gameStats.test.ts` | `gameStateKey` -> `puzzleKey` |
| `test/practiceSession.test.ts` | `gameStateKey`, `PUZZLE_ID_MODULUS` -> `puzzleKey` |
| `test/seedMode.test.ts` | `parseSeedParam` -> `puzzleKey`; `formatGameStateForSharing` -> `shareText` |
| `test/share.test.ts` | `formatGameStateForSharing` -> `shareText` |

Verified with a filter that strips import lines and bare symbol names from
`git diff master -- test e2e` and shows what is left. What is left is nothing.

`test/gameStats.test.ts` was NOT in the plan's list of six. The plan's grep
excluded any line matching `gameStateKey` while trying to exclude
`SavedGameState`, so it hid one real hit. Jest caught it; a wider grep
(`from ".*gameState"`, no symbol filter) is what should have been run, and was
re-run afterwards to confirm the final list.

## Sibling-owned files touched

Import lines only, per `DECISION.md` case 2:

- `src/practiceSession.ts` (20260731-212613): one import block split in two.
- `src/gameStats.ts` (20260731-212612): one import line split in two.
- `src/closeness.ts`: one word in a docstring, `gameState.ts` -> `shareText.ts`,
  which would otherwise have become a stale pointer.
