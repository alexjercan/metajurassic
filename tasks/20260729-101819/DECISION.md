# DECISION: where the seed param lives and how seeded rounds share

- STATUS: ACCEPTED
- DATE: 2026-07-29

## Fork

The task says: "Support a seed query param on the practice page, and decide
whether daily honors it only in dev builds." Two load-bearing shape choices had
to be pinned before building, because the candidates are mutually exclusive:

### Choice 1 - which page honors `?seed=`

Candidates:

- (a) Practice page only. Daily never reads `?seed=`; it stays clock-derived.
- (b) Daily also honors `?seed=`, but only in dev builds (guarded by a
  webpack `mode !== "production"` / `__DEV__` flag).

CHOSEN: (a) practice-only.

Why: the game already has a dedicated practice page whose whole purpose is
rolling an arbitrary target, so it is the natural home for a *chosen* target.
Making daily honor a seed - even dev-only - introduces a build-mode branch and
a production footgun (a stray `?seed=` on the daily URL either silently does
nothing, which is confusing, or cheats the daily, which corrupts the shared
puzzle). Keeping daily purely clock-derived means the daily target is
uncheatable by construction and there is no dev/prod behavioral drift to reason
about. E2E fixtures and playtests that need a known target load
`/practice/?seed=N`; they do not need to override the daily. This makes (b)'s
extra machinery unnecessary.

Consequence: `src/index.ts` (daily) is left untouched and reads no query param.
Only `src/practice.ts` reads `?seed=`.

### Choice 2 - seed reproduces the MAPPED target, not a raw pick

`createNewGameState(data, seed)` calls `getRandomSpecies(seed)`, which routes
through `speciesIndexForDate` -> the seeded daily permutation. We deliberately
reuse that path unchanged so `?seed=42` reproduces the SAME species the daily
mapping would pick for seed 42 (composing with `20260729-101740`), rather than
a raw `species[42 % n]`. No new selection code is introduced.

## Share-text guard

`formatGameStateForSharing` currently hardcodes `getTodaySeed()` for the puzzle
id regardless of mode, so a practice/seeded win already masquerades as today's
daily. We thread a `ShareContext { mode, seed }` from each entrypoint through
`initGame` into the formatter. Daily output stays byte-identical (context seed
== today's seed). Practice/seeded output is labelled "Practice Dinosaur ..." so
it cannot be mistaken for the daily puzzle. This satisfies the "guard share
text" step and fixes the pre-existing masquerade in one move.

## The puzzle id is a display/storage handle, not a target identity

`formatPuzzleId` reduces the seed by `seed % 10^PADDING_LENGTH` (mod 100000)
while the actual target is chosen by `seed % speciesCount` (mod 150) through the
permutation. These two spaces are deliberately decoupled and inherited from the
daily design; seed mode does not change them. Two consequences a caller of seed
mode should know (surfaced in review, not introduced here):

- The practice puzzle id and its `gameState-practice-...` storage key identify
  the DISPLAYED round, not the target. Seeds that differ by exactly 100000
  (e.g. 42 and 100042) share an id and key but resolve to different dinosaurs.
  Practice never restores saved state (`createNewGameState`, not
  `loadGameState`), so there is no wrong-target load; at worst a prior practice
  round under the same key is overwritten.
- A seed of exactly 99999 formats to `dinosaur-#100000` (six digits), which the
  five-digit `parseGameStateKey` regex does not match, so that one round is
  invisible to practice stats.

Both are pre-existing properties of `formatPuzzleId` that daily never reaches
(daily seeds stay small for centuries). They are acceptable for seed mode's
purpose - fixtures and playtests use small, deliberately chosen seeds - so we
document the boundary here rather than re-architecting the daily id scheme.
