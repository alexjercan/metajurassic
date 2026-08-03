# Fix the three hint-chip e2e failures on master

- PRIORITY: 60
- TAGS: bug, e2e, ui
- KIND: TASK
- ACTIVITY: PLANNING
- GATES: -
- RESOLUTION: -

## Story

As a maintainer, I want `npm run ci` green on master, so that a branch's own
regressions are visible.

## Context

Reproduced on master (`b821117`) and on the unrelated branch
`fix/share-headline-puzzle-number`; identical failures on both, so this is
master breakage, not branch breakage. Found while reviewing `20260729-141429`,
whose own diff touches only share text.

Failing:

- `e2e/panel.spec.ts:139` - info panel: a mid-game hint does not resurrect the
  panel for later guesses
- `e2e/mobile.spec.ts:228` - the pull tab is on screen, names the revealed
  clade, and opens it
- `e2e/mobile.spec.ts:271` - a mid-game hint on a phone still shows its clade

All three fail clicking `#hint-box`: the locator resolves but Playwright
retries "element is not visible" until timeout. Prime suspect is `e846885`
("feat: make the hint chip keyboard reachable"), which changed the hint chip's
markup/affordance; the specs still drive the old element.

Note: the same suite passed twice earlier in the `20260729-141429` cycle
(168 e2e passed), so confirm whether this is a hard regression or environment
dependent before fixing.
