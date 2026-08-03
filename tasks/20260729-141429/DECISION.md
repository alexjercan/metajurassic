# Decision: Fix the duplicated word in the share headline

- DATE: 20260803-235153
- STATUS: ACCEPTED
- TASK: 20260729-141429
- TAGS: share, content, puzzleKey

## Context

`formatPuzzleId` (`src/puzzleKey.ts`) returns `dinosaur-#00211`. It serves two
callers with opposite needs: `gameStateKey`/`parseGameStateKey`, which require
the prefix and the fixed 5-digit padding as an exact parse inverse (profile
dates and streaks depend on it, `20260729-101747`), and
`formatGameStateForSharing` (`src/shareText.ts`), which prints it after a
literal `Dinosaur ` and produces `✅ Dinosaur dinosaur-#00211 🦖`. One string
was doing a machine job and a prose job; that is how the duplication got in.

## Decision

Split the two jobs. Add `formatPuzzleNumber(seed): string` to
`src/puzzleKey.ts` returning `#211`, sharing the residue/offset math with
`formatPuzzleId` via a private `puzzleDisplayNumber` helper. The share headline
calls it; keys keep calling `formatPuzzleId`, unchanged.

The headline drops both the `dinosaur-` prefix and the zero padding. Padding
exists only so a key is always 5 digits; a headline has no such constraint, and
`#00211` reads like a serial number in the thing players paste in public.

Built from scratch today, the key format and the headline format would be two
functions over one display number, because only one of them has a parse
inverse to honor.

## Alternatives considered

- Strip the prefix inside `formatPuzzleId` itself and re-add it in
  `gameStateKey`. Fewer exports, but it moves the key's shape away from its
  parse inverse and puts the load-bearing string assembly in two files. Loses
  on risk: keys are the one thing this task must not disturb.
- Keep `formatPuzzleId` in the headline and delete the literal `Dinosaur `
  word, yielding `✅ dinosaur-#00211 🦖`. Removes the duplication with a
  one-word edit, but the public first line becomes a lowercase slug. Loses on
  the story: the headline should read deliberately.
- Keep the padding in the headline (`#00211`). Defensible, and it makes the
  headline digits match the key digits exactly. Loses on readability; the
  padding communicates nothing to a reader.
- Do nothing. Costs nothing to build, but the duplication stays on the first
  line of the game's only growth loop.

## Consequences

- Easier: the machine format and the prose format can now diverge without one
  breaking the other.
- Harder: two formatters must keep the same display number. The shared
  `puzzleDisplayNumber` helper is what keeps them honest; the invariant is not
  free.
- Unchanged: storage keys, migrations, streaks, profile dates. No backfill.
- Pre-existing and not fixed: residue 99999 wraps to display 0, so the headline
  would read `#0` (key `#00000`). ~273 years out.
- Shares already pasted in public keep the doubled wording.
