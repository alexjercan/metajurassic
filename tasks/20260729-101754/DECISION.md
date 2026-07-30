# Decision: practice-session lifecycle and its new-game control

- STATUS: ACCEPTED
- DATE: 2026-07-30

Fixing the resume bug removes the mechanism the practice page currently uses to
start a new round (a reload re-randomizes), so the replacement control and the
fate of an abandoned round are both load-bearing forks. Confirmed with the user
before any code was written.

## 1. The new-game control: a hidden `#new-game-btn` in the SHARED template

The constraint that makes the candidates mutually exclusive: **the daily page
and the practice page render the same HTML file.** `webpack.config.js` registers
`src/index.html` twice (once as `index.html`, once as `practice/index.html`);
there is no `src/practice.html`. So a practice-only on-screen control cannot
simply be "added to the page" -- it must either be present-but-hidden on the
daily page, or the template must split. Both cannot hold.

Decision: add `<button id="new-game-btn" hidden>` to the `.top-bar` in
`src/index.html`. `src/practice.ts` unhides and wires it; `src/index.ts` is not
modified, so the daily page ships the element inert and behaves identically. The
DoD pins that with an E2E assertion (hidden on `/`) and a `git diff` proof that
`src/index.ts` is untouched.

Rejected: **a dedicated `src/practice.html`** -- it duplicates ~140 lines of
board, panel, modal and input markup that would drift from `index.html` on every
future board change, which is a permanent cost paid for one button. Rejected:
**modal-only, retargeting the existing `Practice` anchor** -- the action would
then exist only AFTER a round ends, leaving a player mid-round with no way to
abandon a round they no longer want, which is exactly what the task's step 2
asks for. The modal anchor is still retargeted on the practice page, but as an
addition to the top-bar button, not instead of it.

### 1a. On a phone the label sheds " game" (added after review round 1)

`.top-bar` is pinned to ONE row on phones, so the button's width comes out of
the hint chip's flex share, and past a point the chip's sentence wraps and the
BAR grows - the vertical space the tree can least spare, and the exact shape
`tasks/20260729-092327/DECISION.md` rejected. Measured on `/practice/` against
`/` at the three pinned widths:

| label      | 393px   | 360px    | 320px    |
| ---------- | ------- | -------- | -------- |
| "New game" | 68 -> 79 | 79 -> 107 | 79 -> 107 |
| "New"      | 68 -> 79 | 79 -> 79  | 79 -> 107 |

Decision (confirmed with the user): full "New game" on desktop, a 41px "New"
below 768px via `.new-game-word { display: none }`. That buys back the whole
28px at 360px. At 320px the bar still grows a row's worth; that is accepted, not
hidden. The accessible name comes from the button's `aria-label`, so it does not
change with the viewport. `e2e/mobile.spec.ts` now runs its top-bar and
hint-chip cases over `/practice/` as well as `/`, so this bar is measured rather
than assumed.

Rejected: keeping the full label everywhere (+28px at both 360px and 320px, chip
squeezed to 50px wide); hiding the button below 360px (no growth, but a 320px
player could not abandon a round mid-way).

## 2. Retention: abandoned rounds are DELETED, finished rounds are KEPT

Three candidates: delete the abandoned entry, record it as a loss, or leave it
for the cap to reap.

Decision: an explicit "New game" deletes the in-progress round's
`gameState-practice-*` entry and clears the `practice-current` pointer. This is
consistent with `loadAllGames`, which already skips games where
`!state.isGameOver()` -- so an abandoned round contributes nothing to profile
stats whether it is deleted or not, and deleting it bounds storage at the source
rather than leaning entirely on the cap. Finished rounds are kept: they ARE the
practice stats that `computeGameStats` and the profile page read.

**Both halves of that are enforced in `abandonPracticeRound`, not just the first
one.** The initial implementation deleted unconditionally, which review round 1
caught: "I won -> New game" is the end of EVERY round and runs through the same
function, so it erased the round the player had just finished from their own
stats -- exactly backwards from the decision above. The function now re-reads
the entry and keeps it when `isRoundOver` says the round finished, dropping only
the pointer. An unparseable entry is not a stat worth keeping and still goes.

Consequence of the cap, stated rather than left implicit: the profile page's
practice counters (games played, wins, average, distribution, discovered
dinosaurs) are computed by re-reading the surviving entries, so they reflect the
newest `MAX_PRACTICE_ENTRIES` rounds rather than a true lifetime total. Keeping
an unbounded aggregate alongside the pruned entries is a separate change and is
not made here.

Rejected: **counting an abandonment as a loss** -- it fabricates a result the
player never played out, drags the practice win-rate down for quitting, and
would force `GameState`/`loadAllGames` to grow a "forfeited" concept purely to
represent it. Rejected: **leave it until pruned** -- closest to today's leak,
and makes the cap the only thing standing between the player and unbounded
growth.

## 3. Bounding: a cap of 50 practice entries, pruned oldest-first

Finished rounds accumulate forever otherwise. `prunePracticeEntries` enumerates
`gameState-practice-*` keys through `parseGameStateKey`, orders them by the
saved `createdAt` (a missing or unparseable `createdAt` sorts oldest, so a
corrupt entry is reaped first rather than pinned forever), and removes from the
oldest until at most `MAX_PRACTICE_ENTRIES` remain. Pruning runs when a new
round starts, not on every save, so the common path stays a single write.

There is deliberately no "protect the active round" parameter. An earlier draft
had one, and review round 1 pointed out that no shipped caller passed it:
pruning runs at exactly one moment -- as the round being replaced is handed over
-- and always takes the OLDEST entries, so the round just played is the newest
and cannot be a victim. A guard no caller can reach is a comment pretending to
be code (`LESSONS.md: a-guard-no-test-can-fail-is-a-comment`), so the parameter
is gone and a test pins the property that makes it unnecessary instead.

## 4. Practice seeds are drawn from `[0, PUZZLE_ID_MODULUS)`, and re-drawn on collision

`gameStateKey` folds a seed through `formatPuzzleId`, which is `seed mod 10^5`.
Today `src/practice.ts` draws from `[0, 1_000_000)`, a **10:1 fold** -- ten
distinct seeds share one storage key, which is finding 3: a new round can land
on an unrelated saved round's key. Drawing from `[0, PUZZLE_ID_MODULUS)` instead
makes seed <-> key a bijection, so the fold disappears entirely. A draw whose key
is already occupied is re-drawn (bounded retries; if every attempt collides, the
last draw is taken and the entry it would shadow is removed first, so a new
round never silently inherits someone else's guesses).

`?seed=N` is FOLDED into the same residue rather than exempted (changed after
review round 1). The first draft honoured the param verbatim, which left the
collision class wide open on the seed-param side: `gameStateKey` is
`seed mod 100000` but the TARGET is `seed mod 150`, so `?seed=42` and
`?seed=100042` name different dinosaurs while sharing one storage key. Once
practice rounds RESUME, that stops being a quiet overwrite-on-save and becomes
visible: loading `?seed=100042` hands back seed 42's board. The task's own
finding 3 -- "practice seeds can collide modulo the key format, silently
resuming an unrelated saved round" -- is exactly this, so exempting the param
would have left half the reported defect in place.

`normalizePracticeSeed` therefore folds the param, making `?seed=100042` mean
`?seed=42` outright: one seed, one key, one target, and the puzzle id in the
share text finally names the round actually being played (before, two different
targets both shared as "Practice Dinosaur dinosaur-#00043"). The fold is the
IDENTITY on `[0, PUZZLE_ID_MODULUS)`, so every seed in the docs, the E2E
fixtures and the playtests is untouched; only out-of-range and negative seeds
change which dinosaur they name, and those were already the broken ones.

The param is still NOT written to `practice-current` -- the URL already carries
the round, and persisting it would make a one-off repro sticky after the param
is dropped. Because of that, "New game" from a seeded round explicitly CLAIMS a
fresh round before navigating; relying on the next load's fallback resumed
whatever older round the pointer still named, so a button saying "New game"
handed back a half-played one (also review round 1).
