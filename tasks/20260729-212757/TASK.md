# Drive the guess budget in markup from MAX_GUESSES

- PRIORITY: 40
- TAGS: chore, content
- KIND: TASK
- ACTIVITY: UNDERSTANDING
- GATES: -
- RESOLUTION: -

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

- [ ] Empty the `#stat-box` markup (or seed it from the constant) the way
      `#hint-text` was emptied, so the template holds no number.
- [ ] Decide how the static FAQ gets the number. It is an html-webpack-plugin
      template, so a templated value is possible; otherwise the answer should
      stop naming a number.
- [ ] Sweep for any other copy of the budget or the hint cost in markup and
      docs, and record the grep used.

## Definition of Done

- No page template states the guess budget as a literal. (cmd: an absence grep
  over `src/*.html`, executed and narrowed with its reason recorded per
  `LESSONS.md` `absence-proving-greps-must-be-run-when-written`)
- Changing `MAX_GUESSES` changes every surface that states it. (test: Jest over
  the copy builders, plus browser E2E asserting the board and the FAQ agree)
- `npm run ci` passes. (cmd: `npm run ci`)
