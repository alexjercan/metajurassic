# Practice and seeds

The practice page deals a random dinosaur as often as you like. It is kept
apart from the daily puzzle everywhere: its own saved rounds, its own stats, its
own share label. Practice cannot inflate a daily streak.

Page wiring is
[`src/practice.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/practice.ts);
the whole round lifecycle underneath it is
[`src/practiceSession.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/practiceSession.ts),
which is storage-only - no DOM, no game data - so every rule below is
unit-testable against a fake storage and a fake rng.

## Reproducible rounds with `?seed=`

Add `?seed=42` to the practice page and you get that exact round, every time,
on every device. A runnable walkthrough of a fixed seeded round is
[`e2e/seed.spec.ts`](https://github.com/alexjercan/metajurassic/blob/master/e2e/seed.spec.ts).

Seeds are folded through `seed mod PUZZLE_ID_MODULUS` - the modulus is `100000`,
defined in
[`src/puzzleKey.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/puzzleKey.ts)
as ten to the power of the key's padding width. So `?seed=100042` is the same
round as `?seed=42`, and a negative seed normalizes to a non-negative residue
rather than being rejected.

The fold is not cosmetic. A storage key folds a seed through
`PUZZLE_ID_MODULUS`, but the _target_ is picked with `seed mod species.length` -
two different moduli. Without normalizing at the boundary, `?seed=42` and
`?seed=100042` would share one storage key while naming different dinosaurs.
Folding on the way in makes seed, key and target agree, and it is the identity
on `[0, PUZZLE_ID_MODULUS)`, so every seed already written down in the docs, the
E2E fixtures and the playtests is unaffected. See
[`tasks/20260729-101754/DECISION.md`](https://github.com/alexjercan/metajurassic/blob/master/tasks/20260729-101754/DECISION.md)
section 4.

A seed in the query string is used for that load and **never persisted**. The
daily page ignores `seed` entirely.

## Which round a load plays

`resolvePracticeSeed` decides, in this order:

1. `?seed=N` from the query string, folded through `normalizePracticeSeed`.
2. Otherwise the round the `practice-current` pointer names, unless that round
   has already finished. A pointer with **no saved entry behind it is still
   resumed**: that is a round started but not yet guessed in, and re-rolling it
   would make a reload-before-the-first-guess lose the round all over again.
3. Otherwise a new round is started.

So practice rounds resume, seeded ones included. Returning to a seed you have
played brings that round back rather than dealing it fresh.

## Starting, abandoning and keeping rounds

**New game** claims a fresh round explicitly rather than leaving it to the next
load's fallback. Abandoning a `?seed=N` round would otherwise leave an older
`practice-current` pointer standing, and the fallback would hand back that
half-played round.

What happens to the round you leave depends on whether it finished:

| Round state | On abandon                        |
| ----------- | --------------------------------- |
| Unfinished  | Deleted                           |
| Finished    | Kept; only the pointer is dropped |

Both halves are load-bearing. Finished rounds _are_ the practice stats the
profile page reads, and "I won, now New game" is the normal end of every round -
so discarding them would quietly empty the profile. An unparseable or absent
entry is not a stat worth keeping, so it goes.

Finishing a round clears the pointer, which is what makes the next load start
something new instead of re-opening a game that is already over. The pointer is
only cleared when it actually names the seed being finished, so completing a
`?seed=N` round never evicts the unseeded round in progress underneath it.

## Storage and retention

| Key                                  | Holds                                       |
| ------------------------------------ | ------------------------------------------- |
| `gameState-dinosaur-#NNNNN`          | A daily round                               |
| `gameState-practice-dinosaur-#NNNNN` | A practice round                            |
| `practice-current`                   | The seed of the practice round being played |

Key formatting and parsing are exact inverses over the residue ring, in
[`src/puzzleKey.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/puzzleKey.ts).

Practice entries are capped at `MAX_PRACTICE_ENTRIES` and pruned oldest-first.
Pruning runs only when a new round starts and always takes the oldest entries,
so the round you just played can never be the victim. New seeds are drawn from
`[0, PUZZLE_ID_MODULUS)` so that seed and storage key are a bijection; a
bounded re-draw handles the sub-0.1% chance of landing on a key already taken.

Design records for all of the above:
[`tasks/20260729-101754/DECISION.md`](https://github.com/alexjercan/metajurassic/blob/master/tasks/20260729-101754/DECISION.md)
and
[`tasks/20260729-101819/DECISION.md`](https://github.com/alexjercan/metajurassic/blob/master/tasks/20260729-101819/DECISION.md).
