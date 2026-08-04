# Review: Drive the guess budget in markup from MAX_GUESSES

- TASK: 20260729-212757
- BRANCH: chore/max-guesses-markup

## Round 1

- REVIEWER: out-of-context
- VERDICT: REQUEST_CHANGES

- [x] R1.1 (MAJOR) e2e/faq.spec.ts:22 - `toContainText(budget)` is a substring
  match, so the spec stays green on the exact defect it exists to kill. Reprice
  `MAX_GUESSES` to 5 and a re-hardcoded "You have 25 attempts" still *contains*
  "5", so the assertion passes while the two surfaces disagree. Digit-substring
  collisions are the common case, not the corner: 25/5, 25/2, 12/1. DoD proof 2
  states its criterion as "asserting the board and the FAQ agree on a number
  neither test hardcodes"; a substring match does not assert agreement, so the
  proof does not pass on its own stated criterion. Assert the whole shape, e.g.
  `toContainText(new RegExp(\`You have ${budget} attempts\`))`.
  - Response: fixed - `e2e/faq.spec.ts:28` now matches
    ``new RegExp(`You have ${budget} attempts`)``. Falsified with
    `MAX_GUESSES = 5`
    and a re-hardcoded "You have 25 attempts": the old assertion passes that,
    the new one fails. Agreed on the DoD point - a substring match was not
    asserting agreement.

- [x] R1.2 (MINOR) src/index.html:27 - TASK.md justifies the now-empty
  `#stat-box` with "`.stat-box` is a fixed-size chip
  (`src/partials/game-shell.css:40`)", and that rule sets only
  padding/font/border/radius/shadow - no width, min-width or height. The chip is
  content-sized, so the pre-hydration frame paints a collapsed ~40px box that
  jumps to full width on hydration, and `.top-bar` is
  `justify-content: space-around`, so the hint chip shifts with it. The
  `#hint-text` precedent does not transfer: `.hint-box` carries
  `min-height: 52px` (`src/partials/game-shell.css:100`), which is why emptying
  it shifted nothing. Either give `.stat-box` a `min-width` sized to
  "Guesses Left: NN", mirroring that guard, or correct the assumption in TASK.md
  and accept the shift explicitly.
  - Response: fixed - premise confirmed by measurement, not argument: the
    empty chip is 42px against 196px filled at 1280 and 26px against 141px at
    393. `.stat-box` now carries `min-width: 8em`, the measured content width of
    "Guesses Left: 25" at both the 1.2rem and 0.9rem sizes (8.02em / 7.99em), so
    one value serves both breakpoints and never exceeds the hydrated width. New
    `e2e/topBarChip.spec.ts` guards it at 1280/393/320px and fails on all three
    with the floor removed. The wrong assumption in TASK.md is corrected in
    place rather than deleted.

- [x] R1.3 (MINOR) tasks/20260729-212757/TASK.md:57 - the branch ships no
  standing guard that a budget literal cannot reappear in a page template; the
  DoD's grep is a one-shot check that never runs in CI. NOTES.md:134-146
  designed exactly that guard (`test/markupConstants.test.ts`, enumerated over a
  real `readdirSync` of `src/*.html` with the list asserted non-empty, regex
  built from `MAX_GUESSES`) and NOTES.md:182 argued for it on
  `a-guard-no-test-can-fail-is-a-comment` grounds, citing `test/lintGate.test.ts`
  as precedent. The Steps dropped it for the hand-run grep with no recorded
  reason, and the drop is independent of the build-time-vs-hydration fork that
  DECISION.md settled - the guard reads the templates either way. Add the test,
  or record the drop and its reason in TASK.md.
  - Response: fixed - `test/markupConstants.test.ts` added as NOTES.md designed:
    `readdirSync` over `src/*.html` with the list asserted non-empty, regexes
    built from `MAX_GUESSES` and `HINT_COST`. 17 tests, eight templates.
    Falsified by restoring the literal in `src/faq.html` - that file fails, the
    other seven stay green. No pushback: the drop had no recorded reason
    because there was none.

- [x] R1.4 (NIT) src/faq.ts:6 - `if (budget) budget.textContent = ...` silently
  no-ops if the span is ever removed; the sibling entry points use the
  `if (!el) return;` early-return form (`src/clades.ts:10`). Match the
  convention.
  - Response: fixed - `src/faq.ts` throws on a missing span. `if (!el) return;`
    itself does not transfer: this module has no function body, which is why the
    silent `if (budget)` form appeared. The throw carries the same intent.

Process signals:

- `npm run ci` failed on the out-of-context reviewer's first run with two
  `page.goto` timeouts in `e2e/mobile.spec.ts:457` (mobile-chromium, 360/393px
  on `/`), then passed in isolation and on a full re-run. It was green first-try
  on the recording pass. Reads as dev-server contention under parallel load, not
  a branch defect, but the suite is not reliably green first-try.
- The pre-hydration flash is a real manual check and the work record flags it as
  unresolved, which is honest. The layout argument offered for why it is harmless
  does not hold - see R1.2.

Recording pass (in-session) notes. Re-derived independently rather than
accepted: `.stat-box` in `src/partials/game-shell.css:40-50` sets no sizing
property, confirming R1.2's premise against the record's claim, and
`.hint-box:100` does carry `min-height`. Ran the check suite: `npm run ci`
exit 0, 30 Jest suites and 180 Playwright specs green. Ran DoD proof 1: exit 1
with empty output over all eight `src/*.html` (enumerated: clades, faq,
_footer, _header, _head, index, profile, species). Every ticked Step is present
in the diff and matches its literal text. R1.1 was raised from the round-1
reviewer's MINOR to MAJOR on the recording pass: the weakness is not cosmetic,
it is DoD proof 2 failing its own stated criterion, which puts it in Spec rather
than style.

Pending user checks: none of the DoD proofs are `manual:`. The work record's own
open question - the pre-hydration frame on both pages - is not a DoD proof; R1.2
converts it into an actionable finding.

## Round 2

- REVIEWER: out-of-context
- VERDICT: APPROVE

- [ ] R2.1 (MINOR) src/partials/game-shell.css:47-49 - the comment records 8em
  as "the MEASURED content width ... (8.02em / 7.99em)" and concludes "the floor
  never exceeds the hydrated width". Both are wrong, and the second is inverted.
  Measured here: "Guesses Left: 25" bold is 153.578px at 19.2px and 115.187px at
  14.4px, i.e. 7.999em at BOTH sizes. So the floor exceeds the natural content by
  0.022px rather than sitting under it - which is what makes
  `expect(emptied).toBe(filled)` in `e2e/topBarChip.spec.ts:40` exact rather than
  off-by-a-subpixel, so the argument's conclusion survives only because its
  stated direction is backwards. 154px and 115px are correct to the pixel; the
  error entered when rounded pixels were divided to get `em`. Replace the two
  figures with "7.999em at both sizes" and the "never exceeds" clause with the
  real headroom (0.022px at 19.2px), which also states plainly how little slack
  the floor has. Same numbers appear at TASK.md:167-170 and REVIEW.md:41-42;
  `tasks/` is append-only, so only the CSS comment and TASK.md are in scope.
  - Response:

- [ ] R2.2 (NIT) test/markupConstants.test.ts:35 - the budget pattern is a bare
  `\b${MAX_GUESSES}\b` over raw markup, so it matches any occurrence of the
  number, not just budget copy: a `content="25"`, a dimension, a date. It is
  built from the constant by design, which means a reprice to a common small
  value turns the guard into a false-positive generator across all eight
  templates - the reprice this test exists to protect is the case that breaks it.
  Narrow it to the copy shapes the branch removed, e.g.
  ``new RegExp(`\\b${MAX_GUESSES} (attempts|guesses)\\b|Guesses Left: ${MAX_GUESSES}\\b`, "i")``.
  - Response:

The round-2 reviewer raised R2.1 as a MAJOR on a different premise: that the
CSS stack `"Segoe UI", Tahoma, sans-serif` (`src/partials/base.css:5`) resolves
through fontconfig's generic `sans-serif`, which on ubuntu-latest is DejaVu Sans
(9.386em for this string), so the 8em floor would under-reserve on CI and take
`e2e/topBarChip.spec.ts` red on all three viewports. Downgraded on the recording
pass because the mechanism is falsified on this machine: `fc-match sans-serif`
here IS `DejaVuSans.ttf`, yet the same browser renders the page stack and a bare
`sans-serif` at 153.578px - identical to `Liberation Sans` and 26.6px narrower
than an explicit `DejaVu Sans`. Chromium does not take fontconfig's generic
here; it resolves its own default family (Arial-metric), and `fc-match Arial`
gives `LiberationSans-Regular.ttf`. Playwright's Ubuntu `--with-deps` set
installs `fonts-liberation`, so CI has the same mapping available. Corroborating:
`master` is green on CI (`gh run list`, five most recent runs), and `master`
already carries font-metric-sensitive assertions that a 17%-wider default would
break first - `e2e/mobile.spec.ts:457` pins the top bar to one row at 320/360/393
with the long hint sentence, and `:363` pins the tree top at 72px. What survives
the downgrade is the measurement error, kept as R2.1.

Process signals:

- The round-1 `e2e/mobile.spec.ts:457` flake did not reproduce: `npm run ci` was
  green first try for both the round-2 reviewer (`E2E_PORT=8181`) and the
  recording pass (`E2E_PORT=8282`). Three of four runs across the two rounds were
  clean, so the round-1 note stands as "not reliably green first-try" rather than
  a known-bad spec.
- Two rounds of findings on this branch were about a measured number rather than
  code: R1.2's layout claim, then R2.1's `em` conversion. Both were written as
  fact from arithmetic rather than read off a rig.

Recording pass (in-session) notes. Re-derived independently rather than
accepted, because R2.1 arrived as a MAJOR resting on a claim about an
environment neither reviewer can run: probed the flake-provided Chromium
directly for the page stack, bare `sans-serif`, `DejaVu Sans` and
`Liberation Sans` at 19.2px bold, giving 153.578 / 153.578 / 180.203 / 153.578px
- the measurement the downgrade above rests on. Also confirmed `.stat-box` has no
`box-sizing: border-box` (only `.top-bar:36` and `.hint-box:110` do), so
`min-width` is a content-box floor and the comment's framing is right on that
point. Ran the check suite: `E2E_PORT=8282 npm run ci` exit 0, 183 Playwright
specs. Ran DoD proof 1: exit 1 with empty output over all eight `src/*.html`.
Ran the two new Jest suites: 19 tests green. Falsified `e2e/topBarChip.spec.ts`
myself by stripping `min-width: 8em` from a scratch copy - 3 failed of 3, 141
against 26 at 393px - and restored the file. Doc sweep: no mention of `stat-box`,
`faq-guess-budget`, `faqCopy` or "25 attempts" in README, AGENTS.md or docs. The
`LESSONS.md` pointers in the new comments are not dangling-by-this-diff -
`src/jsonLoader.ts:39`, `test/lintGate.test.ts:10` and `test/dataIntegrity.test.ts:6`
already use that form, so it is repository convention, not a finding here.
DECISION.md covers both load-bearing forks.

Pending user checks: none. No DoD proof is `manual:`, and R1.2's fix retired the
work record's open pre-hydration question by turning it into
`e2e/topBarChip.spec.ts` rather than leaving it to the eye.
