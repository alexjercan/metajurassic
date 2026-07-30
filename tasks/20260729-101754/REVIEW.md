# Review: Persist in-progress practice games across reloads

- VERDICT: APPROVE
- ROUNDS: 3 (REQUEST_CHANGES, REQUEST_CHANGES, APPROVE)
- DATE: 2026-07-30

Branch `fix/practice-resume`. Reviews are out-of-context: the reviewer did not
write the code and re-derived the behaviour from the diff, the task and the
ledger.

## Round 1 (2026-07-30) - REQUEST_CHANGES

Reviewed commit `27fb5e4`. Verified green before reviewing (313 Jest, 94
Playwright), and every claim below was checked by mutating the source through a
scratch copy rather than argued from reading.

### What the round confirmed as sound

- The `isRoundOver` extraction is behaviour-preserving: `numberOfGuesses()` is
  exactly `guesses.size + hintClades.size * HINT_COST`, and `isGameOver` now
  delegates with the same operands.
- The resume specs bite: pointing `loadGameState` at `seed + 1`, or reverting to
  `createNewGameState`, fails three of the five practice specs.
- The daily page really is untouched - `src/index.ts` has an empty diff, and
  `.new-game-btn[hidden]` beats `.new-game-btn` on specificity, so no later rule
  can resurrect the button.

### MAJOR - "New game" erased the round the player had just finished

`startAnotherRound` called `abandonPracticeRound` unconditionally, and that
deleted the round's `gameState-practice-*` entry. But "I won -> New game" is how
EVERY round ends, and the branch had also retargeted the game-over modal's
Practice link onto the same action. So the normal end-of-round flow erased the
finished round from `games-played-practice`, the win count, the average, the
guess distribution and `discoveredDinosaurs` - the exact opposite of
`DECISION.md` fork 2 ("finished rounds are kept: they ARE the practice stats").
The reviewer proved it with a throwaway spec that pre-seeded a finished round,
clicked the modal action and found the entry `null` afterwards.

This was a regression the branch introduced: before it, the modal link merely
reloaded and the entry survived.

**Fixed.** `abandonPracticeRound` re-reads the entry and keeps it when
`isRoundOver` says the round finished, dropping only the pointer; an unparseable
entry is still removed. Pinned by `test/practiceSession.test.ts` ("KEEPS a
finished round", plus the lost-by-budget and unparseable cases) and by the whole
`finished practice rounds` describe in `e2e/practice.spec.ts`, which exercises
the top-bar button AND the modal action after a real win and a real loss.

### MINOR - "New game" from a `?seed=N` round handed back an older round

Abandoning a seeded round correctly leaves any `practice-current` pointer alone
(it names a different seed), so the reload afterwards RESUMED that older
half-played round. A button saying "New game" gave the player a game already in
progress.

**Fixed.** `startAnotherRound` now claims a fresh round explicitly with
`startNewPracticeRound` before navigating.

### MINOR - the collision fix did not cover `?seed=N`

Drawn seeds became a bijection with the storage key, but the param was honoured
verbatim, and `gameStateKey` is `seed mod 100000` while the target is
`seed mod 150`. So `?seed=100042` and `?seed=42` named different dinosaurs while
sharing one entry - and now that rounds RESUME, loading either one hands back
the other's board. That is the task's finding 3 verbatim, so the DoD's claim
that it was fixed was overstated.

**Fixed.** `normalizePracticeSeed` folds the param into the residue its key
represents. The fold is the identity on `[0, PUZZLE_ID_MODULUS)`, so every seed
in the docs, the E2E fixtures and the playtests is unaffected. Recorded in
`DECISION.md` section 4.

### MINOR - the changed seed-mode contract was not documented

`e2e/seed.spec.ts` needed a `localStorage.clear()` precisely because `?seed=N`
no longer deals a fresh round, and AGENTS.md still described seed mode as the
"load a chosen, reproducible target" primitive with no mention that a second
visit returns the saved round. This is LESSONS.md
`when-a-fix-changes-an-invariant-grep-its-callers-for-documented-dependencies`
repeated.

**Fixed.** AGENTS.md gained a "a seeded round RESUMES" warning and a "Practice
round lifecycle" section; README.md gained the same contract note.

### MINOR - the phone top-bar comment claimed something false

The comment said the button's width "comes out of the hint chip's flex share
rather than out of the bar's height". Measured on `/practice/` against `/`:
393px 68 -> 79, 360px 79 -> 107, 320px 79 -> 107, with the chip squeezed to 50px
wide and its sentence wrapping to a fourth line. Nothing was clipped and the bar
did not wrap, so nothing was broken - but the stated invariant was not what
happened. Worse, every top-bar case in `e2e/mobile.spec.ts` loaded `/`, where
the button is hidden, so the bar that actually has three items in it was never
measured (`a-layout-assertion-at-one-viewport-is-a-sample-of-one`).

**Fixed, and escalated to the user** rather than resolved silently, because a
mid-round New game button and "the phone top bar does not grow" could not both
hold. The user chose a compact "New" label below 768px: 393px +11, 360px +0,
320px +28. The comment now carries the measured table, `DECISION.md` gained
section 1a, and the mobile top-bar and hint-chip loops run over `/practice/` as
well as `/`.

### MINOR - `protectedSeed` was a guard no caller could reach

`prunePracticeEntries` took a `protectedSeed` no production call site passed;
only a test exercised it (`a-guard-no-test-can-fail-is-a-comment`).

**Fixed by removal.** Pruning runs at exactly one moment - as the round being
replaced is handed over - and always takes the OLDEST entries, so the round just
played is the newest and cannot be a victim. A test now pins that property
instead of the dead parameter.

### MINOR - the 50-entry cap silently reshapes lifetime stats

The profile page recomputes practice counters from the surviving entries, so
they fall once a player passes 50 rounds.

**Accepted and documented** rather than changed: `DECISION.md` fork 2 now states
the consequence explicitly, and AGENTS.md repeats it. Keeping an unbounded
aggregate alongside the pruned entries is a separate change.

### NIT - a corrupt entry with no `targetId` would resume forever

`isRoundOver(undefined, [], 0)` is false, so such an entry looked like a live
round on every load and the board rebuilt broken with no way out but New game.

**Fixed.** `isResumable` requires a string `targetId` and an array `guesses`.

### NIT - `playOneGuess` could flake about 1 in 150

An unseeded round can have the throwaway guess as its target, ending the round
and leaving the next guess typing into a disabled input.

**Fixed deterministically**, not with a tolerance. `openRoundWithOneGuess`
guesses a known species, reads the target back from the saved round, and retries
via New game if the opening guess WAS the target - free at that point, since one
guess has been made and nothing is worth keeping. Every later guess a spec makes
is chosen against that target, so it can never end a round by accident.

### NIT - `clearCurrentPracticeRound` on game over was unpinned

Deleting it left every suite green, because `resolvePracticeSeed` independently
refuses to resume a finished round.

**Fixed.** `e2e/practice.spec.ts` now plays an UNSEEDED round to a win - the
only kind that owns the pointer - and asserts the pointer is gone. Deleting the
call now fails that spec.

### Found by the implementer while mutation-checking the fixes

The round-1 fix for the seeded New game case did not bite: the spec asserted
`Guesses Left: 25` immediately after the click, which matched the page being
navigated AWAY from (the seeded round also showed 25) and passed vacuously - it
stayed green with the fix removed. The spec now waits for the navigation and
asserts the stale round's guess is absent from the board, which does bite. The
lesson generalises: an assertion made straight after a click that navigates may
be satisfied by the old document.

## Round 2 (2026-07-30) - REQUEST_CHANGES

Reviewed commit `1e83cbd`. The reviewer re-verified the gate independently (313
Jest, 104 Playwright) and re-derived the round-1 fixes rather than taking the
summary on trust: the MAJOR fix was confirmed by mutating
`abandonPracticeRound` back to an unconditional delete and watching both
finished-round E2E specs fail. Every round-1 finding was accepted as closed.

The reviewer also independently re-measured the phone bar (393 68 -> 79, 360
79 -> 79, 320 79 -> 107, button 41px) and confirmed the table committed in
`DECISION.md` is accurate rather than remembered.

Explicitly checked and cleared: the seed fold has no effect on the share text
(`formatPuzzleId` already folded, so the id was always the residue - the fold
merely makes the id name the round actually played), none on pre-existing saved
rounds (already keyed by residue, and no pointer existed before this branch),
and none on `scripts/playtest/*` or the E2E fixtures, whose seeds are all in
range where the fold is the identity.

### MINOR - the flake fix was self-defeating

`openRoundWithOneGuess` recovered from "the opening guess WAS the target" by
pressing New game - but that round is FINISHED, and round 2 had just made
finished rounds survive New game. So the retry left an entry behind, the next
iteration saw two saved rounds, and `readOnlyRound` failed on "expected exactly
one saved practice round" - pointing at the wrong thing entirely. The reviewer
reproduced it with a scratch spec (two keys returned). At ~1/150 per round
opened across the ~9 rounds this file opens, that is ~6% of runs: WORSE than the
~2% flake it replaced.

A fix for one defect reopened by a fix for another, in the same branch. The
comment "nothing is worth keeping" was a leftover from before the keep/delete
split and was itself the tell.

**Fixed.** The retry deletes the accidental round before starting over, and the
comment now says why. Verified by forcing the retry path on every round: with
the delete removed it fails, with it in place all nine specs pass.

### MINOR - the new `/practice/` mobile cases did not assert the button exists

Both parameterised loops measured only `#stat-box` and `#hint-box`. If
`wireNewGame` ever stopped revealing the button, the `/practice/` cases would
silently become duplicates of the `/` cases and stay green - re-opening the very
gap round 1 raised, and the same shape as the vacuous assertion caught at the
end of round 1.

**Fixed.** Each loop now asserts `#new-game-btn` is visible on `/practice/`.
Verified: forcing `newGameBtn.hidden = true` reddens exactly the six
`/practice/` cases and leaves the six `/` cases green.

### NIT - the style comment overclaimed what the tests pin

The measured height table was described as "pinned by e2e/mobile.spec.ts", but
the specs assert the INVARIANTS (one row, chip on screen and unclipped), not the
heights; 393px could drift back to 107px and stay green.

**Fixed by softening the wording**, not by adding a height threshold - the
`.top-bar` comment above records that a height threshold was deliberately
rejected for this check because it conflated two different failures and was
wrong in both directions.

### NIT - the accessible name did not contain the visible label

`aria-label="Start a new practice round"` overrode a visible "New game", so a
speech-input user saying "click New game" had nothing to match (WCAG 2.5.3,
Label in Name).

**Fixed at the root.** The `aria-label` is gone and `.new-game-word` is
visually-hidden (clipped) on phones instead of `display: none`, so the
accessible name stays "New game" at every width while the visible text is still
"New". Verified: accessible name "New game" and a 41px button at 393/360/320,
with the bar heights unchanged.

### NIT - an unrelated whitespace change rode along

Running `prettier --write` over `src/style.css` collapsed two blank lines
elsewhere in the file. `format:check` does not glob CSS, so master is not
prettier-clean there and the reformat was pure noise in the diff
(`unrelated-cleanup-rides-along-at-the-cost-of-the-diff`).

**Fixed.** The blank lines are restored and `src/style.css` is now a pure
addition (71 insertions, 0 deletions).

## Round 3 (2026-07-30) - APPROVE

Reviewed commit `03f484e`. Gate re-run independently: 313 Jest across 20 suites,
104 Playwright. All round-2 findings confirmed closed, each by measurement
rather than by reading the summary:

- the retry now recovers correctly, proved by forcing a retry over a FINISHED
  round (see the correction below);
- both mobile loops assert `#new-game-btn` on the `/practice/` pass, placed
  before the measurement so a failure names its cause;
- `ariaSnapshot` reports `- button "New game"` at 393/360/320px with the
  `aria-label` gone, the visible button still 41px, bar heights still 79/79/107,
  and `document.scrollWidth === clientWidth` at all three widths - so the
  absolutely-positioned clipped span introduces no horizontal overflow;
- `src/style.css` is 71 insertions / 0 deletions, `src/index.html` 16 / 0.

No new findings.

### Correction: my own mutation check did not reach the branch it claimed to

I verified the retry-delete by forcing `if (attempt > 0 && target !== guessed)`
and reported "without the delete 1 spec fails". The reviewer re-ran that variant
with the `removeItem` line stripped and got 9/9 GREEN. Under that forcing the
accidental round is UNFINISHED, so `abandonPracticeRound` deletes it anyway -
the mutation never entered the finished-round branch the delete exists for. The
correct forcing is to guess the TARGET on attempt 0 and then take the retry
branch; done that way the delete is load-bearing and 8 of 9 specs fail without
it.

The fix was right; the evidence I offered for it was not. A mutation has to
reach the branch the code was written for, and "the suite went red" is only
evidence if it went red for the reason claimed - which means reading the
failure, not just the count. This is the third time on this branch that a check
looked like proof and was not (the vacuous post-click assertion in round 1, the
`toBeHidden`-on-a-missing-element assertion caught while writing it, and this
one), which is what the retro takes forward.
