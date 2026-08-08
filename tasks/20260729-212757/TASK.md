# Drive the guess budget in markup from MAX_GUESSES

- STATUS: CLOSED
- PRIORITY: 40
- TAGS: chore, content

## Story

As a maintainer changing the guess budget, I want every surface that states it
to follow the constant, so that a reprice does not leave the board and the FAQ
telling the player a different number from the one the game enforces.

## Finding

Raised as a pre-existing observation during the out-of-context review of
`20260729-092327` (see that task's `REVIEW.md`, round 1 prose notes). Not a
blocker on that branch: it predates it, and that branch fixed the same family of
defect for `HINT_COST` (deleting the hardcoded `Cost 3 Guesses` from
`src/index.html` and driving the chip from the constant).

Two copies of `MAX_GUESSES` remain typed into markup:

- `src/index.html` - `<div class="stat-box" id="stat-box">Guesses Left: 25</div>`.
  Harmless today because `updateUI()` overwrites it on first render, but it is
  what a reader sees in the template and what shows in the pre-hydration frame.
- `src/faq.html` - "You have 25 attempts to find the target." Nothing overwrites
  this one; it is a static page and would simply go stale.

`20260729-092327` added `src/ui/onboarding.ts`, whose brief copy already builds
its budget line from `MAX_GUESSES`, so the pattern to follow exists.

## Steps

- [x] `src/index.html` - empty the `#stat-box` element the way `#hint-text` was
      emptied, leaving a comment that names `updateUI()` in `src/game/index.ts`
      as the filler and `MAX_GUESSES` as the source. `updateUI()` already runs
      unconditionally at init (`src/game/index.ts:255`), so no wiring changes.
- [x] `src/faqCopy.ts` (new) - pure copy builder
      `guessBudgetAnswer(): string` returning the "How do I play?" answer's
      final sentence built from `MAX_GUESSES`. Pure, no DOM, so Jest can cover
      it; `src/ui/**` is excluded from coverage, this is not under `ui/`.
- [x] `src/faq.html` - replace the literal on line 37 with an empty
      `<span id="faq-guess-budget"></span>` placeholder plus a comment naming
      `src/faq.ts` as the filler.
- [x] `src/faq.ts` - fill `#faq-guess-budget` from `guessBudgetAnswer()` on
      load. Currently the file only imports `style.css`; keep it that thin.
- [x] `test/faqCopy.test.ts` (new) - assert `guessBudgetAnswer()` contains
      `String(MAX_GUESSES)` and no other integer, i.e. the sentence follows the
      constant rather than restating it.
- [x] `e2e/faq.spec.ts` (new) - load `/faq/`, load the board, and assert both
      state the same budget: parse the integer out of `#stat-box` on first
      render and assert `#faq-guess-budget` contains it. No literal `25` in the
      assertion.
- [x] Sweep and record: run
      `grep -rnE '\b25\b|\b3 [Gg]uesses\b' src/*.html`
      and paste the (empty) output into the work record. The glob covers the
      page templates and the `_header`/`_footer`/`_head` partials (verified:
      `ls src/*.html` lists all eight). Narrowed to HTML because those are the
      surfaces no test renders
      against the constant; `.ts` prose comments and E2E fixtures that name 25
      are out of scope and stay.

## Definition of Done

- No page template states the guess budget as a literal. (cmd:
  `grep -rnE '\b25\b|\b3 [Gg]uesses\b' src/*.html` exits 1
  with empty output; red on base - run 2026-08-04, it matches `src/faq.html:37` and
  `src/index.html:24`. Narrowing reason recorded per `LESSONS.md`
  `absence-proving-greps-must-be-run-when-written`.)
- Changing `MAX_GUESSES` changes every surface that states it. (test:
  `npx jest test/faqCopy.test.ts` over the copy builder, plus
  `npx playwright test e2e/faq.spec.ts` asserting the board and the FAQ agree
  on a number neither test hardcodes. Both red on base - neither file exists.)
- `npm run ci` passes, including the existing `#stat-box` E2E specs that read
  "Guesses Left: N" after hydration. (cmd: `npm run ci`)

## Notes

- Discovered: `src/faq.ts` is already a webpack entry (`webpack.config.js`,
  `entry.faq`) chunked into `faq/index.html`, so the FAQ page runs JS today.
  Hydration is available without any build-config change.
- Discovered: `webpack-partials.js` `<%= key %>` substitution runs at
  `beforeEmit` with a fixed var set (basePath, siteUrl, page social copy). It
  is a build-time channel, but feeding it `MAX_GUESSES` means
  `webpack.config.js` (CommonJS) reading `src/constants.ts` (TypeScript) - see
  DECISION.md.
- Corrected (round 2, R1.2): the assumption recorded here was that an empty
  `#stat-box` costs no layout shift because `.stat-box` is a fixed-size chip.
  It is not - that rule set only padding/font/border/radius/shadow, so the chip
  was content-sized and collapsed 196px -> 42px while empty. The `#hint-text`
  precedent did not transfer because `.hint-box` carries `min-height: 52px`.
  `.stat-box` now carries the matching `min-width` floor and
  `e2e/topBarChip.spec.ts` guards it, so the empty frame is genuinely
  shift-free rather than assumed to be.
- Assumption: FAQ text rendered by JS rather than shipped in the HTML is
  acceptable for SEO. The page's crawler-facing copy (title, description,
  og/canonical) comes from `_head.html` and is untouched; one sentence of body
  prose moves behind hydration.
- Out of scope: E2E specs and code comments that spell 25 or 3 in prose
  (`e2e/postgame.spec.ts:318`, `src/ui/onboarding.ts:15-21`,
  `src/partials/responsive.css:5`, `src/gameOverCopy.ts:8`). Those are
  narrative about a past state or fixture expectations, not player-facing copy.

## Work record

### What and why

Both hardcoded budgets are gone. `#stat-box` in `src/index.html` ships empty
with a comment naming `updateUI()` as its filler, exactly as `#hint-text` does
one element over. The FAQ's sentence moved to a new `src/faqCopy.ts`
(`guessBudgetAnswer()`) that interpolates `MAX_GUESSES`, with `src/faq.ts`
filling an empty `<span id="faq-guess-budget">` on load. Plan followed as
written; no Step contradicted the code.

### Alternatives

None reopened. The two forks (runtime hydration over build-time substitution, a
new builder over reusing `briefCopy()`) were settled in DECISION.md before work
started and the code confirmed both premises: `entry.faq` already chunks JS into
`faq/index.html`, and `briefCopy()` does sit beside DOM builders that would have
come along.

### Difficulties and diagnosis

- Lint rejected `budget as string` in `e2e/faq.spec.ts`
  (`no-unnecessary-type-assertion`). Replaced by narrowing the regex to
  `/Guesses Left: (\d+)/` with a `?? ""` fallback, which removes the assertion
  and also makes the spec fail loudly if the board's label ever changes shape
  rather than silently matching some other digit on the page.
- The worktree had no `node_modules`; `npm ci` first.

### Evidence

- `grep -rnE '\b25\b|\b3 [Gg]uesses\b' src/*.html` - red on base (matched
  `src/faq.html:37` and `src/index.html:24`), now exits 1 with EMPTY output:

  ```
  ```

- `npx jest test/faqCopy.test.ts` - 2 passed. Red on base with
  `TS2307: Cannot find module '../src/faqCopy'`.
- `npx playwright test e2e/faq.spec.ts` - 1 passed. Falsified deliberately by
  hardcoding `99 attempts` in `guessBudgetAnswer()`: the spec failed at the
  `#faq-guess-budget` assertion, so it is not vacuous. Reverted.
- `npm run ci` - green end to end (format, lint at `--max-warnings=0`, pipeline,
  coverage, 180 e2e passed), including the existing `#stat-box` specs in
  `smoke`, `practice`, `autocomplete` and `onboarding` that read
  "Guesses Left: N" after hydration.
- Doc sweep over `README.md`, `AGENTS.md`, `docs/` for `25 attempts`,
  `25 guesses`, `stat-box`, `faq.ts` - no matches, nothing stale to fix.

### Round 2 - review feedback

All four round-1 findings addressed; nothing pushed back on.

- R1.1 `e2e/faq.spec.ts` now asserts
  `new RegExp("You have ${budget} attempts")` instead of
  `toContainText(budget)`. The substring form survived the defect it guards:
  budgets collide as substrings (25/5, 25/2, 12/1). Falsified by setting
  `MAX_GUESSES = 5` and re-hardcoding "You have 25 attempts" in the span - the
  old assertion passes that, the new one fails at line 28. Reverted.
- R1.2 `.stat-box` gains `min-width: 8em`. 8em is measured, not guessed: the
  filled chip's content box is 154px at 19.2px font (desktop) and 115px at
  14.4px (mobile), i.e. 8.02em and 7.99em, so one `em` value serves both
  breakpoints and the floor never exceeds the hydrated width. New
  `e2e/topBarChip.spec.ts` asserts the empty chip keeps the filled width at
  1280/393/320px; with the floor removed all three fail (196 -> 42px,
  141 -> 26px). That retires the open `manual:` question below rather than
  leaving it to a reviewer's eye.
- R1.3 `test/markupConstants.test.ts` added, as NOTES.md:134-146 designed:
  templates enumerated from a real `readdirSync` of `src/*.html` with the list
  asserted non-empty, regexes built from `MAX_GUESSES` and `HINT_COST` so a
  reprice moves the guard. 17 tests over eight templates. Falsified by putting
  "You have 25 attempts" back into `src/faq.html` - `faq.html` fails, the other
  seven stay green. The DoD's hand-run grep stays as the one-shot record; this
  is the standing version.
- R1.4 `src/faq.ts` throws instead of silently no-opping. The literal
  convention asked for (`if (!el) return;`, `src/clades.ts:10`) needs a
  function body and this module has none, so the loud form carries the same
  intent: a missing span is a bug, not a no-op.

Re-verified whole, not just near the fixes: `npm run ci` exit 0, and the DoD
grep still exits 1 with empty output.

### Reflection

Two guards this branch shipped only under review pressure - the markup literal
test and the chip-width spec - were both foreseen at understanding time and
dropped at plan time for a hand-run check. The plan is where a designed guard
gets lost, and neither drop had a recorded reason. The layout assumption failed
the same way: it was written as fact from a CSS rule that was never read
closely, and one measurement settled what a paragraph of reasoning got wrong.
