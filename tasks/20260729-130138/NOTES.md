# Notes: measuring the blur-timer defect

Evidence for the Definition of Done. Every command and number below is pasted
from the run that produced it (`LESSONS.md`:
`quote-the-mutation-not-the-memory-of-it`).

## The first version of the e2e test did not discriminate

Worth recording because it nearly shipped. The first draft reproduced the
reported player sequence literally - tap another control, come back, keep
typing:

```
await input.fill("tyr");
await page.locator("#open-panel").click();
await input.click();
await input.fill("tyrann");     // <- this is the bug in the test
await input.press("ArrowDown");
await input.press("Enter");
```

Run against the UNFIXED source (`git show master:src/ui/autocomplete.ts`
restored over the branch's file):

```
E2E_PORT=8181 npx playwright test e2e/autocomplete.spec.ts --repeat-each=10 --workers=2
  40 passed (27.0s)
```

10/10 green on code that has the defect. The cause is that final `input.fill`:
it fires an `input` event, which re-renders the suggestion list and re-opens the
box. The stale timer had already fired by then, so the test walked straight
through the failure it existed to catch.

The defect needs the LAST render to happen before the timer fires and the
keypress to happen after it. So the query is typed in full BEFORE the blur, and
nothing fires an `input` event afterwards:

```
await input.fill("tyrann");
await page.locator("#open-panel").click();   // blur, timer armed
await input.click();                         // focus re-renders, box open
await page.waitForTimeout(150);              // stale timer's deadline passes
await input.press("ArrowDown");
await input.press("Enter");
```

The 150ms wait makes the test deterministic in both directions rather than
absorbing a race: unfixed, the timer has certainly fired; fixed, it was
cancelled on focus and there is nothing left to fire.

## The discriminating measurement

Unfixed source, corrected test:

```
E2E_PORT=8181 npx playwright test e2e/autocomplete.spec.ts --repeat-each=10 --workers=2 -g "straight after tapping"
  10 failed
```

Failing for the defect itself, not something incidental:

```
Locator: locator('#stat-box')
Expected substring: "Guesses Left: 24"
Received string:    "Guesses Left: 25"
```

The guess was swallowed and the counter never moved.

Fixed source (restored from a scratch copy, per `LESSONS.md`:
`revert-a-test-mutation-with-a-scratch-copy-not-git-checkout` - `git checkout`
would have taken the branch's other changes to that file with it):

```
E2E_PORT=8181 npx playwright test e2e/autocomplete.spec.ts --repeat-each=30 --workers=2 -g "straight after tapping"
  30 passed (24.7s)
```

10/10 fail -> 0/30 fail.

## The reported panel.spec flake DOES reproduce

The task's Context reports the defect was found as an intermittent
`e2e/panel.spec.ts` failure, "2 passes, 1 failure under `--repeat-each=3`", in
the test `a mid-game hint does not resurrect the panel for later guesses`. With
both helper workarounds removed and the source still unfixed:

```
E2E_PORT=8181 npx playwright test e2e/panel.spec.ts -g "resurrect" --repeat-each=40 --workers=2
  12 failed
  28 passed (1.2m)
```

Failing as the defect, not as something incidental:

```
Locator:  locator('#autocomplete-box').locator('.autocomplete-item').first()
Expected: visible
```

The stale timer hid the suggestion box out from under the helper. Same source,
fix applied:

```
E2E_PORT=8181 npx playwright test e2e/panel.spec.ts -g "resurrect" --repeat-each=40 --workers=2
  40 passed (38.4s)
```

12/40 fail -> 0/40. So `panel.spec.ts` is a SECOND discriminating proof, and the
DoD says so.

### The wrong measurement that got written here first

This section originally claimed the flake did not reproduce, on the strength of

```
E2E_PORT=8181 npx playwright test e2e/panel.spec.ts --repeat-each=10 --workers=2
  60 passed (31.0s)
```

That "60" is the whole FILE: 6 tests x 10 repeats. The flaky test therefore ran
ten times, not sixty - a sample far too small for a defect that fails around
30% of the time, and exactly the underpowered measurement this task's own step
warned against ("`--repeat-each=5` is not a proof"). A big-looking total from a
whole-file run is not a big sample of the one test that matters; `-g` the test
and count ITS repeats.

The explanation invented to fit that non-result - "the spec has changed since
the flake was reported" - was also false, and was falsifiable in one command:
`git diff d0b3707 HEAD -- e2e/panel.spec.ts` touches no line of the flaky
test's body. (The file-level diff is not empty - 24 insertions, from the
pull-tab test added in c862ae2 - but no hunk lands in
`a mid-game hint does not resurrect the panel for later guesses`, which is the
claim.) A story assembled to explain a null result deserves more suspicion than
the null result does.

Both errors were caught by the out-of-context reviewer, who re-ran the
measurement properly and diffed the spec. See REVIEW.md R1.1. Across three
independent runs of the same command the unfixed source failed 12/40, 17/40 and
19/40 - a flake rate, not a fixed number, which is why the DoD names the
command rather than a count.

Post-fix, the whole file:

```
E2E_PORT=8181 npx playwright test e2e/panel.spec.ts --repeat-each=30 --workers=2
  180 passed (1.5m)
```

## The jsdom test, red first

```
npx jest test/autocompleteBlur.test.ts
Tests:       4 failed, 4 passed, 8 total
```

The 4 red were the three blur-race cases and the Enter-consumption case. The 4
green were the fixture pin, "still hides the box when focus does not come back",
and the two cases asserting Enter is let THROUGH when no list is open - those
last two pass before and after by design, and are what stops the fix from
over-consuming Enter and killing the rejection message for a genuinely bogus
guess.

After the fix: `Tests: 8 passed, 8 total`.

## The gate

```
E2E_PORT=8181 npm run ci
Test Suites: 19 passed, 19 total
Tests:       287 passed, 287 total
  88 passed (24.9s)
CI exit=0
```

One formatting failure on the way (`prettier --check` flagged `e2e/helpers.ts`
after the retry loop was unwrapped and the indentation changed);
`prettier --write` on that file, then the gate was re-run whole rather than
resumed.
