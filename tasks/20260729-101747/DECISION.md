# Decision: canonical puzzle-key format

STATUS: ACCEPTED

## Context

`formatPuzzleId(seed)` and `parseGameStateKey(key)` must be exact inverses so
that a daily game saved under key `format(seed)` is read back as the same seed
and therefore dated `seedToDate(seed)` in the profile. Today they are not:

- `format(seed)` displays `(seed % 1e5) + 1`, so `format(1) = "dinosaur-#00002"`.
- `parse(key)` computes `index = display - 1` then `seed = index + 1 = display`,
  so `parse("dinosaur-#00002") = 2`.

Round-tripping seed 1 yields 2. Every daily profile entry is dated one day late
and the current-streak check treats a two-day-old win as still active.

## Options

1. Keep the `+1` display offset; fix `parse` to invert it (`seed = display - 1`).
2. Drop the `+1` offset from `format` so `parse`'s current `seed = display`
   becomes correct.

## Decision

Option 1. Keep the `+1` display offset and make `parse` its exact inverse.

## Why

The task requires preferring "whichever keeps existing saved keys valid".
Existing localStorage keys were written by the current `format` (with `+1`), so:

- Option 1 (fix `parse`) recovers the original seed from every key already on
  disk. No migration; all saved daily history keeps its correct date.
- Option 2 (drop `+1` from `format`) changes the key string for every seed, so
  every existing saved game would be orphaned or mis-dated and would need a
  migration pass.

Option 1 also leaves the human-facing puzzle number and the share text
unchanged (the first daily puzzle keeps displaying `#00002`, as it already
does in shipped shares).

## Modulus wrap (edge normalization)

Both sides wrap by `PUZZLE_ID_MODULUS = 10^5`:

- `format`: `display = ((seed mod M) + 1) mod M`, so residue 99999 renders as
  `"00000"` instead of the old 6-digit `"100000"` (a latent bug that produced
  keys `parseGameStateKey`'s `\d{5}` regex rejected outright).
- `parse`: `seed = ((display - 1) mod M + M) mod M`.

Negative practice seeds (reachable via `?seed=-N`) normalize into `[0, M)` too.
The returned seed is the residue `seed mod M`; for daily seeds (well below M)
this is the exact seed, which is all the profile dating needs.
