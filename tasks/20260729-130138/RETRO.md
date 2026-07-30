# Retro: Autocomplete blur timer swallows a fast re-typed guess

- TASK: 20260729-130138
- BRANCH: fix/autocomplete-blur-timer
- REVIEW ROUNDS: 2

## What went well

- **Treating the task text as context, not authority, paid twice.** The Context
  section described an `alert()` that 20260729-092327 had already replaced with
  the inline `#input-error`, so the DoD item "no alert is raised" would have
  passed vacuously against code that still rejected valid prefixes. Reading the
  current `src/game.ts` rather than the task's account of it is what caught
  that. The second catch was bigger: the task named ONE workaround helper, and
  `e2e/helpers.ts` had two, the second saying the hazard "applies here
  identically". A grep for the workaround's shape (`toPass`) found it; trusting
  the task's enumeration would not have.

- **Finding the real fork before building, and taking it to the user.** Step 3
  said "decide whether the raw-text Enter handler should submit at all". Reading
  the two listeners showed they are on the SAME element, so `preventDefault()`
  never stopped the second one - both handlers run on every Enter, and the happy
  path survives only because `updateUI()` blanks the input before the second one
  reads it. That accident is what made "fix the timer" insufficient, and it made
  the candidate fixes mutually exclusive rather than interchangeable. It went to
  the user as a named constraint and into DECISION.md before any code.

- **The jsdom altitude was the right call and the reviewer proved it from the
  outside.** Reverting only `stopImmediatePropagation` leaves the entire 88-test
  browser suite GREEN and reds exactly one jsdom assertion. No browser test in
  this repo can see that half of the defect, because the accidental
  input-blanking guard hides it. A repo convention (`jest.config.js` excludes
  `src/ui/**` as "hard to unit test") was worth the deliberate exception, and
  the exception is justified in the file's header.

- **Both let-through branches were tested, not just the fix.** Two cases assert
  Enter still reaches the raw handler when no list is open. They pass before and
  after by design, and they are what stops the fix from over-consuming Enter and
  silently killing the rejection message for a genuinely bogus guess.

## What went wrong

- **R1.1, the serious one: I reported a null result from an underpowered
  measurement and then invented a story to explain it.** I ran
  `playwright test e2e/panel.spec.ts --repeat-each=10`, saw `60 passed`, and
  concluded the reported flake did not reproduce. But 60 = 6 tests x 10 repeats:
  the ONE flaky test ran ten times. Properly measured with `-g`, the unfixed
  source fails 12/40, 17/40, 19/40 across three independent runs. Root cause:
  I read a whole-file total as a sample size for the single test I cared about.
  The number was big and green and I did not ask what it was counting - the more
  so because my own plan step, written an hour earlier, had said in as many
  words that `--repeat-each=5` was not a proof.

  The worse half is what I did next. Instead of doubting the measurement, I went
  looking for a reason the null result was correct, found a plausible one ("the
  spec has changed since the flake was reported"), and wrote it into NOTES.md
  and the DoD as established fact. I never ran the one diff that would have
  falsified it. A story assembled to explain a surprising null result is a
  hypothesis, and I recorded it as a finding.

- **R1.2: I narrowed one absence-proving grep and did not carry the reasoning to
  its sibling.** The ledger's `absence-proving-greps-must-be-run-when-written`
  made me run the doc grep, see it could never go clean (task-id citations are
  wanted provenance), and narrow it with the reason recorded. The helpers grep
  had the identical defect and sat four lines away in the same DoD. Root cause:
  I treated running the grep as a per-item chore instead of re-checking the
  whole class once I had learned the class exists.

- **The first e2e test I wrote did not discriminate, and I only found out
  because I measured.** It passed 10/10 against the unfixed source: the final
  `input.fill()` fired an `input` event that re-rendered and re-opened the box,
  papering over the very race. The literal transcription of the reported player
  sequence was not the reproduction. Recovered rather than shipped - but only
  because the red-first discipline was actually executed instead of assumed.

## What to improve next time

- When a repeat-count run reports a total, check what the total COUNTS before
  reading it as a sample size. `-g` the one test whose flake is under
  investigation and count its repeats; a whole-file total divides by the number
  of tests in the file.

- When a measurement says "the reported bug does not reproduce", treat that as
  the least likely explanation and the most suspicious result. Before writing
  any story that makes the null result correct, run the cheapest command that
  would falsify the story. If the story cannot be cheaply falsified, it does not
  go in the record as fact.

- When a ledger lesson forces a fix to one item, sweep the whole class in the
  same pass. Both absence greps were in the same DoD; the second was free once
  the first was understood.

## Action items

- [x] Ledger entry `a-whole-file-repeat-count-is-not-a-sample-of-one-test`.
- [x] Ledger entry `a-story-that-explains-a-null-result-is-a-hypothesis-not-a-finding`.
- [x] Bumped `absence-proving-greps-must-be-run-when-written` to x3, which puts
      it into Pending promotions -> plan skill.
- [x] Bumped `mock-fixtures-hide-real-data-defects-test-the-real-payload` is NOT
      applicable here; no bump made. (Recorded so a future reader does not
      wonder whether the real-payload species list in the new jsdom spec was
      meant to count as an occurrence - it followed the lesson rather than
      re-learning it.)
- No follow-up code tasks. The defect is fully closed and both workarounds are
  removed; nothing was deferred.
