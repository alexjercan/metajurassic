# Decision: where the core game loop splits

- DATE: 20260731
- STATUS: ACCEPTED
- TASK: 20260731-212610
- TAGS: refactor, gameplay

## Context

`src/gameState.ts` (440 lines) and `src/game.ts` (381) are the two files the
epic named first. Both are the `## File size` case: several unrelated jobs in
one file, not one long job.

`gameState.ts` holds three. Puzzle key and seed arithmetic (`puzzleResidue`
through `parseGameStateKey`, lines 7-97). The round itself - the saved shape,
load/save, the `GameState` class, `consistentCandidates` (99-323). The share
text - emoji cell tables, grid, stats line, message (325-440). The third
shares nothing with the second but the `GameState` type; the first shares
nothing with either but is what the storage key is built from.

`game.ts` is one 337-line `initGame` closure doing element lookup, guess
submission, the hint chip and its purchase, the onboarding brief mount, the
tree render, and the share button.

Four choices have to be made before any code moves, because each one decides
whether the split stays a MOVE (which `## File size` requires) or turns into a
redesign.

## Decision

### 1. `gameState.ts` sheds two files, keeping the round

`src/puzzleKey.ts` takes `PADDING_LENGTH`, `PUZZLE_ID_MODULUS`,
`puzzleResidue`, `getTodaySeed`, `parseSeedParam`, `formatPuzzleId`,
`gameStateKey`, `parseGameStateKey`.

`src/shareText.ts` takes `ShareContext`, `ShareStats`, `SHARE_URL`,
`CLOSENESS_CELLS`, `CORRECT_CELL`, `HINT_CELL`, `buildShareGrid`,
`formatStatsLine`, `shareMessage`, `formatGameStateForSharing`.

`gameState.ts` keeps `SavedGameState`, `isRoundOver`, `createNewGameState`,
`loadGameState`, `saveGameState`, the `GameState` class, and
`consistentCandidates`.

The boundary is drawn where the DEPENDENCY is one-way. `puzzleKey.ts` imports
nothing from `gameState.ts`; `shareText.ts` imports the `GameState` type and
`formatPuzzleId`. Nothing points back. `formatPuzzleId` becomes exported for
that reason and for no other - it is the only symbol whose visibility changes,
and it is a move across a file boundary, not a new API.

`src/ui/share.ts` is untouched. It is the transport (the native sheet, the
clipboard fallback); `shareText.ts` is what to say. Those were already
separate and stay separate.

### 2. No barrel re-exports from `gameState.ts`

Every importer of a moved symbol is updated to import from the new file.
`gameState.ts` does not re-export what it no longer owns.

A re-export would have cost zero edits and is the tempting answer, because it
keeps the diff inside this cluster. It is rejected: a file that still exports
the share formatter is, to every reader and to every grep, still the file that
holds the share formatter. The epic's goal is that a reader opening
`gameState.ts` finds one job, and a facade defeats it exactly. The `## File
size` rule says a split MOVES code; a move that leaves a forwarding address
has not moved.

The cost is import-line edits in files two sibling tasks own -
`src/practiceSession.ts` (20260731-212613) and `src/gameStats.ts`
(20260731-212612) - plus a comment reference in `src/closeness.ts` and six
`test/` import blocks. These are accepted as mechanical fallout of the split,
not as work in a sibling's cluster: the line changes, nothing around it does,
and the children land one at a time so there is nothing to conflict with.

### 3. `consistentCandidates` stays in `gameState.ts`

It is pure deduction over a `GameState` and could argue for its own file. It
does not get one. Moving it would edit the import block of
`src/treeBuilder.ts`, which is the FIRST file of sibling 20260731-212611, and
that sibling may well decide the deduction belongs with the tree code it
feeds. Leaving it costs `gameState.ts` 36 lines and costs the sibling nothing.

This is the one place where the cluster boundary, not the code, decides.
Recorded so 20260731-212611 can revisit it rather than assume it was settled
on the merits.

### 4. `src/game.ts` becomes `src/game/`, and `updateUI` is passed in

`src/game.ts` -> `src/game/index.ts`, which keeps `loadData`, `GameOptions`,
`initGame`, the element lookup, `updateUI`, `submitGuess` and the
input-error pair, and the wiring. Extracted alongside it:

| File | Takes |
|------|-------|
| `src/game/hintChip.ts` | `updateHintButton` and the hint-purchase click |
| `src/game/onboardingBrief.ts` | `syncOnboardingBrief` |
| `src/game/shareButton.ts` | the modal share handler and its stats read |

A directory, not four sibling `gameX.ts` files, so that `src/index.ts` and
`src/practice.ts` keep `import { loadData, initGame } from "./game"`
unchanged. They are the only two importers of the module; neither line moves.

`submitGuess` and the input-error pair stay in `index.ts` deliberately. They
are the core loop, and they are mutually recursive with `updateUI` -
`submitGuess` calls it, and it clears the error `submitGuess` then re-shows in
its `finally`. Splitting that pair would mean threading two callbacks in both
directions to separate the two halves of one behaviour.

The three extracted units take `updateUI` (and `save`, and `state`) as
parameters. That is a seam, and `## File size` says a split does not
"introduce a parameter, hook, or config knob on the way". The distinction
drawn here: a parameter that exists because moved code needs a value it used
to close over is part of the move; a parameter that exists so a future caller
could vary the behaviour is the thing the rule forbids. These are the former -
each unit takes exactly what its old closure read, no option arguments, no
defaults, no injection points, and each has exactly one caller in
`index.ts`. If a unit needed anything beyond what it already closed over, that
would be a redesign and would stop being this task.

## Alternatives considered

**Re-export the moved symbols from `gameState.ts`.** Rejected as case 2, on
the epic's own goal.

**Leave `gameState.ts` whole and only compact its comments.** Rejected: 440
lines is not itself the problem, but three unrelated jobs is exactly the
`## File size` trigger, and the seams here are unusually clean (the dependency
runs one way with no cycles to break).

**Split the puzzle-key arithmetic into `puzzleId.ts` and a separate
`seed.ts`.** Rejected as over-splitting. `getTodaySeed`, `parseSeedParam` and
the key format are one job - turning a seed into the string a round is stored
under - and each half would have had two or three functions.

**Extract `submitGuess` into `src/game/guessInput.ts` too.** Rejected as case
4: the `finally`-ordering behaviour spans `submitGuess` and `updateUI`, and
separating them would need callbacks in both directions to express one rule.

**Give the extracted units a shared context object** (`{state, data, save,
updateUI}`) instead of individual parameters. Rejected as the abstraction the
epic forbids: it is a type that exists for three callers inside one module and
would have to grow a field every time a unit needs one more value.

## Consequences

- `formatPuzzleId` becomes exported. It is the only visibility change in the
  cluster, and `shareText.ts` is its only outside caller.
- Two sibling-owned files (`src/practiceSession.ts`, `src/gameStats.ts`) and
  six `test/` files get import-line edits. `NOTES.md` lists every one, and the
  `test/` diff is import lines only - no assertion moves.
- 20260731-212611 inherits an open question, not a settled one: whether
  `consistentCandidates` belongs with `treeBuilder.ts`.
- `src/**/*.ts` already covers Prettier, ESLint and tsconfig, so the new
  directory needs no glob work - the `AGENTS.md` "new source directory" rule
  is satisfied by the existing globs, which `src/ui/` already relies on.
