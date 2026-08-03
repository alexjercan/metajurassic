# Notes: Fix the duplicated word in the share headline

## What changes

The first line of the pasted share message names the puzzle once.

| | Before | After |
|-|-|-|
| Daily win | `✅ Dinosaur dinosaur-#00211 🦖` | `✅ Dinosaur #211 🦖` |
| Daily loss | `💀 Dinosaur dinosaur-#00211 🦖` | `💀 Dinosaur #211 🦖` |
| Practice win | `✅ Practice Dinosaur dinosaur-#00043 🦖` | `✅ Practice Dinosaur #43 🦖` |

Nothing else in the message moves: sentence, grid, stats line, URL, hashtag
are untouched. Storage keys keep the padded `gameState-[practice-]dinosaur-#NNNNN`
form exactly.

Two sub-decisions, both assumed rather than blocking:

- Drop the `dinosaur-` prefix from the headline rather than from
  `formatPuzzleId`. The prefix is load-bearing inside the key and its parse
  inverse (`20260729-101747`), so only the display form loses it.
- Drop the zero padding too (`#211`, not `#00211`). Padding exists so a key is
  always 5 digits; a headline has no such constraint, and the padded form reads
  like a serial number in public. This matches the example in TASK.md.

## Surfaces

| File | Why |
|-|-|
| `src/puzzleKey.ts` | Add the display formatter next to `formatPuzzleId`, sharing the residue/offset math. No change to `formatPuzzleId`, `gameStateKey`, `parseGameStateKey`. |
| `src/shareText.ts` | `formatGameStateForSharing` calls the new formatter instead of `formatPuzzleId`, and the two headline templates drop their literal `Dinosaur ` duplication source. |
| `test/seedMode.test.ts` | Asserts `Practice Dinosaur` + `dinosaur-#00043` (l.133-134) and the literal `✅ Dinosaur dinosaur-#00002` (l.145). |
| `test/share.test.ts` | Asserts `Practice Dinosaur` (l.268); add the headline-names-it-once case here, since TASK.md's DoD points its proof at this file. |
| `e2e/share.spec.ts` | Asserts `✅ Dinosaur dinosaur-#` (l.138) and `💀 Dinosaur dinosaur-#` (l.267). |

Not touched, and deliberately so: `e2e/dailyKeyMirror.ts` (a hand copy of the
*key* format, still correct), `test/gameState.test.ts` key round-trip block,
`test/rollingAverage.test.ts`, `e2e/seed.spec.ts` - all key-shaped, not headline.

## Data and interfaces

Added in `src/puzzleKey.ts`:

```ts
// Human-facing puzzle number for a headline: "#211". Same 1-based display
// number as formatPuzzleId, without the key's prefix or zero padding.
export function formatPuzzleNumber(seed: number): string
```

Changed in `src/shareText.ts`: `formatGameStateForSharing` keeps its signature;
only the local `puzzleId` binding becomes `puzzleNumber`.

## Sketches

Illustrative only.

```diff
  // src/puzzleKey.ts
+ export function formatPuzzleNumber(seed: number): string {
+     return `#${puzzleDisplayNumber(seed)}`;
+ }
  export function formatPuzzleId(seed: number): string {
-     const display = (puzzleResidue(seed) + 1) % PUZZLE_ID_MODULUS;
+     const display = puzzleDisplayNumber(seed);
      return `dinosaur-#${display.toString().padStart(PADDING_LENGTH, "0")}`;
  }
```

```diff
  // src/shareText.ts
- const puzzleId = formatPuzzleId(context.seed);
+ const puzzleNumber = formatPuzzleNumber(context.seed);
  ...
- `✅ ${label}Dinosaur ${puzzleId} 🦖`,
+ `✅ ${label}Dinosaur ${puzzleNumber} 🦖`,
```

## Shape

```
                    seed (number)
                        |
              puzzleDisplayNumber(seed)   <- residue + 1, wrapped
                   /              \
   formatPuzzleId(seed)        formatPuzzleNumber(seed)
   "dinosaur-#00211"           "#211"
          |                            |
   gameStateKey ---- parseGameStateKey |
          |          (exact inverse)   |
   localStorage / profile dates        |
                                formatGameStateForSharing
                                "✅ Dinosaur #211 🦖"
```

The split is the point: one branch is a machine key with a parse inverse, the
other is prose. They were the same string, which is how the duplication got in.

## Consequences and open questions

- Cost: one more exported formatter, and the seam is now two functions that
  must keep the same display number. The shared helper is what keeps them
  honest; a test asserting the headline number matches the key's digits would
  pin it if we want belt and braces.
- Forecloses: nothing. Keys are untouched, so no migration, no streak or
  profile-date risk.
- Edge case: residue 99999 renders `#0` in the headline (`#00000` in the key),
  because the display number wraps to 0. Pre-existing wrap behavior, ~273 years
  out; noting it, not fixing it.
- Old shares already pasted in public keep the doubled wording. No backfill
  possible and none wanted.
- Open: unpadded `#211` is an assumption, not a confirmed call. If the padded
  `#00211` is preferred in the headline, only `formatPuzzleNumber` changes.
