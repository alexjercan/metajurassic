# Make the hint chip keyboard reachable

- PRIORITY: 55
- TAGS: a11y, ux
- KIND: TASK
- ACTIVITY: COMPOUNDING
- GATES: PLAN REVIEW RETRO
- RESOLUTION: DONE

## Story

As a keyboard or screen-reader user, I want to buy a hint without a mouse, so
that the rescue mechanic is available to me at all.

## Finding

Raised as a pre-existing observation during the out-of-context review of
`20260729-092327` (see that task's `REVIEW.md`, round 1 prose notes). Not a
blocker on that branch because it predates it and is untouched by it.

`#hint-box` (`src/index.html:25`) is a `<div>` with a click listener
(`src/game/hintChip.ts:58`). It has no `role="button"`, no `tabindex`, and no
keydown handler, so it cannot be focused or activated from the keyboard and is
not announced as a control. `20260729-092327` made the chip finally state what
it does ("Stuck? / Spend 3 guesses to reveal a clade"), which makes it more
obviously worth reaching.

## What changes

The one live-round chip becomes a real `<button>`, and the game-over Practice
route moves out of it into a sibling `<a id="hint-practice">` that occupies the
same slot. Unaffordable becomes native `disabled` instead of the
`.hint-box.disabled` class whose only teeth were `pointer-events: none`.
Appearance, size, position and copy are unchanged in every state. See
`NOTES.md` for the surface survey and `DECISION.md` for the two load-bearing
choices (native `disabled`; two elements rather than a link inside a button).

## Steps

- [x] Write the failing E2E proofs first, in a new `e2e/hintKeyboard.spec.ts`.
      Three tests, all red on this base:
      (a) on `/`, Tab from the document start until `document.activeElement` is
      `#hint-box` within a bounded number of presses, assert it was reached,
      press `Enter`, assert `#stat-box` reads `Guesses Left: 22`;
      (b) the same with `Space` (` `), same assertion, fresh load;
      (c) seed a live daily round with `MAX_GUESSES - HINT_COST + 1` = 23 wrong
      guesses via `seedFinishedDailyGame` from `e2e/helpers/content.ts` (it
      writes state, it does not require the round to be over) plus
      `wrongGuessIds`, reload, assert `#stat-box` reads `Guesses Left: 2` and
      `#hint-box` `toBeDisabled()`, then sweep Tab the same bounded number of
      times asserting focus never lands on `#hint-box` while it DOES land on at
      least one other real control (the delivery guard that the presses ran),
      and assert the counter still reads `Guesses Left: 2`.
- [x] `src/index.html`: `#hint-box` div -> `<button type="button"
      class="hint-box" id="hint-box">`, keeping the `#hint-text` child and the
      existing comment. Add a sibling
      `<a class="hint-box practice" id="hint-practice"
      href="<%= htmlWebpackPlugin.options.basePath %>practice" hidden>` holding
      `<div class="hint-text"><strong>Practice</strong></div>`. `basePath` is
      the template's existing idiom (`src/index.html:194`), and this template is
      registered twice (daily and `/practice/`), so both builds get the same
      correct href.
- [x] `src/partials/game-shell.css`: add `.hint-box[hidden] { display: none; }`
      BEFORE `.hint-box` - `display: flex` otherwise beats the UA `[hidden]`
      rule, the trap already documented at `game-shell.css:53` and
      `panel.css:35`. Add button resets to `.hint-box` (`font: inherit`,
      `color: inherit`, `text-align: left`, `width: auto`) so the `<button>`
      paints as the `<div>` did. Change `.hint-box:hover` to
      `.hint-box:hover:not(:disabled)`. Replace `.hint-box.disabled` with
      `.hint-box:disabled`, dropping `pointer-events: none` for
      `cursor: default`. Add a `.hint-box:focus-visible` ring (amber, per
      DECISION.md). `.hint-box.practice` and `.hint-box.practice a` stay: the
      anchor still carries `.practice`; the inner `a` rule is now dead and is
      removed with it.
- [x] `src/game/hintChip.ts`: `updateHintButton(state, hintBox, hintPractice)`
      and `wireHintPurchase(state, hintBox, ...)` take
      `HTMLButtonElement | null` / `HTMLAnchorElement | null`. Game-over branch
      hides `#hint-box` and unhides `#hint-practice` and returns; the live
      branch does the inverse and sets `hintBox.disabled = !canHint`. All
      `classList` juggling of `disabled`/`practice` goes.
- [x] `src/game/index.ts:59`: cast `#hint-box` to `HTMLButtonElement`, look up
      `#hint-practice` as `HTMLAnchorElement | null`, thread it through the
      `updateHintButton` call at :178. `wireHintPurchase` at :235 is unchanged
      but for the type.
- [x] Migrate the specs that lose their hook, in the same change, or they pass
      vacuously forever: `e2e/panel.spec.ts:78,155` and `e2e/mobile.spec.ts:283`
      `not.toHaveClass(/disabled/)` -> `not.toBeDisabled()`;
      `e2e/postgame.spec.ts:143-166` retargets the practice assertions from
      `#hint-box` / `#hint-text a` to `#hint-practice` (and asserts `#hint-box`
      is now hidden), `:465` `toHaveClass(/practice/)` -> `#hint-practice`
      visible.
- [x] Confirm the chip in a real browser at desktop and at 360px, in all three
      states (affordable, disabled, game over): UA button styling is the
      standing visual risk. `npm run playtest:walkthrough` already drives
      `#hint-box` (`scripts/playtest/walkthrough.ts:134,175`) and shoots the
      board; use it plus a manual look.
- [x] Out of scope, decided: tree nodes (`src/ui/treeVisualizer.ts` `onSelect`,
      a click listener on a plain `div`). Keyboard-operating a rendered
      phylogeny is a roving-`tabindex` / `role="tree"` focus-management design,
      not a chip swap. Seed it as its own task at the end of this one.
      `#open-panel` and `#new-game-btn` are already real buttons.

## Definition of Done

- The hint can be bought with the keyboard alone, with Enter and with Space.
  (test: `e2e/hintKeyboard.spec.ts` `buys a hint with Enter` and
  `buys a hint with Space`)
- An unaffordable hint is inert to the keyboard, not merely to the pointer.
  (test: `e2e/hintKeyboard.spec.ts` `an unaffordable chip is out of the tab
  order and cannot be fired`)
- At game over the Practice route is a real link in the chip's slot, not a link
  nested in a button, and the hint button is gone from the slot. (test:
  `e2e/postgame.spec.ts` `the hint slot has become a standalone practice link`,
  the rewrite of `the hint slot has become the practice route, not a dead hint`;
  it asserts `#hint-practice` is a visible `<a>` and `#hint-box` is hidden, both
  of which fail on this base)
- The `.disabled` class hook is gone everywhere, including the three specs that
  would otherwise assert nothing. (cmd: `grep -rn --exclude-dir=tasks
  --exclude-dir=.git --exclude-dir=node_modules --include='*.ts' --include='*.css'
  --include='*.html' -E 'hint-box\.disabled|classList\.(add|remove|toggle)\("disabled"\)|not\.toHaveClass\(/disabled/\)'
  src e2e scripts test`)
- The chip is visually unchanged at desktop and at 360px in the affordable,
  disabled and game-over states. (manual: user judgement)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Proof colour on this base: the grep above returns 9 hits, exit 0 (red as
  required, verified at plan time);
  one is prose at `e2e/postgame.spec.ts:159` describing `.hint-box.disabled`,
  and that comment sits in the block this task rewrites, so it goes with the
  code rather than surviving as a false match.
- `MAX_HINTS` is `-1` (uncapped, `src/constants.ts`), so budget is the only
  route to a disabled chip today: `canUseHint()` is `guessesLeft() >= 3` and
  `hintsRemaining() > 0`. Step 1(c) therefore seeds 23 spent guesses.
- Playwright's `toBeDisabled()` treats a `<div>` without `aria-disabled` as
  enabled, which is what makes proof (c) red on this base.
- The focus ring is the app's first: nothing else defines `:focus-visible`.
  Amber is chosen to match the chip's own accent; a global focus convention is
  a follow-up, not this task.

## Close-out

### What and why

The hint chip is now a real `<button id="hint-box">` and the game-over practice
route a sibling `<a id="hint-practice" class="hint-box practice">`; the two
share the slot and swap `hidden`. Unaffordable is native `disabled`. Both forks
landed as DECISION.md accepted them, unchanged.

`updateHintButton` lost its `__webpack_public_path__` import and its
`innerHTML` anchor build: the practice link is markup in `src/index.html`, so
the href comes from the template's `basePath` idiom. The build emits
`href="/practice"` on both the daily page and `/practice/`, checked in `dist/`.

CSS: `.hint-box[hidden] { display: none; }` sits before `.hint-box` (the
`display: flex` trap already documented for `.new-game-btn`). `.hint-box` gained
`font`/`color`/`text-align`/`width` resets plus `text-decoration: none` - the
last one because `.hint-box.practice a` was deleted and the anchor itself now
carries `.hint-box`. Hover excludes `:disabled`; `:focus-visible` is the app's
first focus style.

### Alternatives

None reopened. The two rejected in DECISION.md (`role="button"` + `tabindex`;
`aria-disabled` over native `disabled`) stayed rejected, and the `aria-disabled`
variant remains a one-attribute reversal if a playtest asks for it.

### Difficulties and diagnosis

- The worktree had no `node_modules`; `npm install` inside `nix develop` first.
  The repo already serves on 8080, so the run used `E2E_PORT=8181`.
- The visual check needed the disabled and game-over states on a real page. A
  throwaway script seeded them by rewriting the app's OWN daily storage key
  rather than recomputing it - but the app writes that key only after a guess,
  so the script submits one real guess before rewriting the round. Deleted
  after use; the shots are evidence for one pass, not repo content.

### Evidence

- `e2e/hintKeyboard.spec.ts` red first for the intended reasons: (a) and (b)
  `Tab never reached #hint-box in 40 presses`, (c) `locator resolved to <div
  id="hint-box" class="hint-box disabled"> - unexpected value "enabled"`.
- `npm run ci` green: format, lint, pipeline, Jest coverage, 168 Playwright
  tests.
- `npm run build` exit 0; both emitted pages carry `href="/practice"`.
- The DoD grep now returns no hits (exit 1) against the 9 it returned at plan
  time.
- Six `.top-bar` screenshots (desktop and 360px x affordable / disabled /
  game over) plus one focused-chip shot: geometry, copy and colour unchanged,
  greying visible in the disabled state, PRACTICE alone in the slot at game
  over, amber ring on focus. The `manual:` DoD line stays pending - that is the
  user's judgement, not the agent's.

### Reflection

The step list named the `[hidden]`-versus-`display: flex` trap and the UA button
resets up front, and both were exactly the two things that would otherwise have
shipped as visual regressions with green tests. The one thing planning missed is
small: `text-decoration: none` had to move onto `.hint-box` when
`.hint-box.practice a` was deleted, because the plan tracked the rule's deletion
but not the property it was carrying.

Follow-up seeded as planned: `20260803-233105`, keyboard-operable tree nodes.
