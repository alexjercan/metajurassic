# Retro: Persist in-progress practice games across reloads

Task `20260729-101754`, branch `fix/practice-resume`, three review rounds to
APPROVE. Written before the land, so it squashes into the same commit as the
work.

## What shipped

`src/practiceSession.ts` owns the practice-round lifecycle (which round is being
played, when a new one starts, what happens to old ones), storage-only so it is
unit-testable without a DOM. `src/practice.ts` became thin wiring over it, and
now calls `loadGameState` instead of `createNewGameState`. A `#new-game-btn`
ships hidden in the shared `src/index.html` and is revealed only by the practice
page. Practice entries are capped at 50, pruned oldest-first, and practice seeds
are folded into the residue their storage key represents.

## What went well

- **The bug playbook paid off immediately.** The E2E reproduction was written
  first and went red for the right reasons (4 failures: no restore, no button)
  before a line of the fix existed. It stayed the anchor through three rounds of
  churn.
- **The task's own playtest note was load-bearing.** It said any regression test
  must use an UNSEEDED round, because `?seed=N` rebuilds the target from the
  seed and so masks a missing restore. That single sentence is why the specs are
  built around unseeded rounds and why they actually catch the defect - a seeded
  spec would have been green against the broken build.
- **Extracting `isRoundOver` instead of re-deriving it.** `practiceSession`
  needed "is this saved round finished?" without a `GameData`. Pulling the
  predicate out of `GameState.isGameOver` and delegating meant there was never a
  second copy of the rule to drift, which is the
  `hand-copied-logic-mirrors-rot` failure mode avoided by construction.
- **Surfacing the phone-layout fork instead of resolving it.** The measured cost
  (bar 79 -> 107px at 360 and 320px, hint chip squeezed to 50px) went to the
  user with three costed options rather than being absorbed as a silent
  compromise. The chosen compact label bought back the whole 28px at 360px.

## What went wrong

### The MAJOR: my fix inverted the decision I had just written down

`startAnotherRound` called `abandonPracticeRound`, which deleted the round's
storage entry unconditionally. But "I won -> New game" is how EVERY round ends,
and I had also retargeted the game-over modal onto that same action - so the
normal end-of-round flow erased the finished round from the player's practice
stats. `DECISION.md`, written by me hours earlier, said in as many words:
"Finished rounds are kept: they ARE the practice stats."

The decision record was right and the code contradicted it. I never re-read the
decision while implementing the function that implements it. The tell was
available in the diff, too: the retarget of the modal link was a change in what
that link MEANS, and I reasoned about it only as "the link needs a new target",
not as "this link is now on the finished-round path".

### The collision fix covered half its own finding

The task's finding 3 is "practice seeds can collide modulo the key format,
silently resuming an unrelated saved round". I fixed the DRAWN-seed path
(narrowing the range to make seed <-> key a bijection) and wrote a DoD line
claiming the finding was closed. `?seed=N` was still honoured verbatim, so
`?seed=100042` and `?seed=42` still named different dinosaurs while sharing one
storage key - and once rounds RESUME, that stopped being a quiet
overwrite-on-save and became "load either one, get the other's board". Making
rounds resumable made the untouched half WORSE, and I had claimed it fixed.

### Three checks that looked like proof and were not

1. **`toBeHidden` on an element that does not exist passes.** The daily-page
   assertion was green against a template that had never gained the button. I
   caught this one myself and added `toBeAttached` first.
2. **An assertion straight after a click that navigates can match the old
   document.** The seeded new-game spec asserted `Guesses Left: 25` immediately
   after the click; the seeded round also showed 25, so it passed with the fix
   removed. Found while mutation-checking, not while writing.
3. **A mutation that does not reach the branch proves nothing.** I verified the
   retry-delete by forcing `attempt > 0` and reported "1 spec fails without it".
   The reviewer re-ran it: 9/9 green. Under that forcing the accidental round is
   UNFINISHED, so it gets deleted anyway - the mutation never entered the
   finished-round branch the delete exists for. The fix was right; my evidence
   for it was not.

Three variations on one theme: a green or red result was read as confirming the
claim without checking that the mechanism under test was actually exercised.

### A fix in round 1 broke a fix in round 1

Making finished rounds survive "New game" broke the flake-retry added in the
same round: the retry recovered from an accidental win by pressing New game,
which no longer cleared anything, so the next iteration found two saved rounds
and died on the wrong assertion - at ~6% of runs, worse than the ~2% flake it
replaced. The stale comment I left behind ("nothing is worth keeping") was
exactly the assumption that had just been invalidated, sitting in the diff.

## Lessons for the ledger

- `re-read-the-decision-record-while-implementing-the-function-that-implements-it`:
  the DECISION.md written at plan time said finished rounds are kept, and the
  function that decides keep-vs-delete did the opposite. Writing the decision is
  not the same as consulting it. When a function IS the implementation of a
  recorded fork, open the record next to it.
- `a-fix-that-makes-a-latent-defect-observable-owns-the-whole-defect`: the
  seed-key collision was pre-existing and quiet; making practice rounds resume
  turned it into "you get someone else's board". Fixing half of a finding while
  making the other half more visible is a net regression, and the DoD claimed
  otherwise. When a change alters WHEN a known defect surfaces, re-scope the
  finding rather than fixing the path you happened to touch.
- `a-mutation-must-reach-the-branch-it-claims-to-test`: three separate checks on
  this branch went green or red for reasons unrelated to the thing under test
  (`toBeHidden` on a missing element, an assertion matching the pre-navigation
  document, a forced retry that never entered the finished-round path). Read the
  FAILURE, not the count, and confirm the mutated line actually executed.
- `a-stale-comment-is-a-load-bearing-assumption-that-moved`: "nothing is worth
  keeping" in the retry helper was true when written and false two commits
  later, and it described exactly the invariant the other fix had inverted. When
  a change makes a nearby comment untrue, that is the signal to check what else
  depended on it.

## What to do differently next time

- When a branch changes what a shared control MEANS (here: the modal's Practice
  link), enumerate the paths that reach it - especially the end-of-round path -
  before rewiring it. A grep for the class name would have found it in seconds.
- Verify a fix by mutating it and reading the failure text, not the pass/fail
  count, and check the mutated line is on the path the test drives.
- When one review round produces several fixes, re-run the whole suite AND
  re-read the fixes against each other before sending it back; two of them
  collided here and only the reviewer caught it.
