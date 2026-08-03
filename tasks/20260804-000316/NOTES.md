# Notes: Fix the three hint-chip e2e failures on master

## What changes

Nothing user-visible. The app is correct; the specs are not.

Before: three e2e tests fail on master on some calendar days and pass on
others. Today (2026-08-04) they fail; on 2026-07-29, when the same suite ran
twice green inside task 20260729-141429, they passed.

After: those tests play a fixed puzzle, so the suite's verdict depends on the
code under test and not on the day it runs.

## The actual defect

The TASK.md hypothesis (`e846885`, "feat: make the hint chip keyboard
reachable", broke the hint chip) is wrong. Evidence:

- The failures are not "element is not visible" on `#hint-box`. Reproduced
  locally, all three fail earlier, on a DIFFERENT click, with
  `<div id="modal-overlay" class="modal-overlay active"> intercepts pointer
  events`. The page snapshot in `test-results/.../error-context.md` shows the
  win modal: "You found it! The answer was **Ceratosaurus** - Solved in
  1 / 25 guesses".
- `#hint-box` being hidden at that point is correct behavior, not a
  regression: `updateHintButton` hides it and unhides `#hint-practice` once
  `state.isGameOver()`. The round is over because the test won it.

Chain:

1. All three tests call `page.goto("/")` - the DAILY page - with no
   `page.clock.install`, so the round is whatever real-world today seeds.
   `getTodaySeed()` -> `dateToSeed(new Date())` -> today's target.
2. All three then call `guessFirstSuggestion(page, "saurus")`. The first
   suggestion for "saurus" is **Ceratosaurus** (probed: `["Ceratosaurus",
   "Proceratosaurus", "Saltasaurus", "Edmontosaurus", "Pachyrhinosaurus"]`).
3. Today's daily target IS Ceratosaurus. The fixture guess wins the round on
   guess 1, the win modal opens over the arena, and every later click in the
   test is intercepted or aimed at an element the game correctly swapped out.

Confirmed by probe: with the clock pinned to `2026-06-15T12:00:00` (the date
five other specs already use), the same "saurus" guess leaves the round live -
`Guesses Left: 24`, `#modal-overlay` without `active`.

So: a date-dependent fixture, not a hard regression. It will re-fire on every
future date whose target happens to be the top-ranked match for a spec's query
string.

Full suite today: `165 passed, 3 failed` - exactly the three named in TASK.md,
no others. The other five "saurus" call sites survive a game-over because of
what they assert, not because they are pinned.

## Surfaces

| File | Why |
|------|-----|
| `e2e/panel.spec.ts` | 6 `goto("/")`, 4 `"saurus"` guesses, no clock pin. Owns the failing `panel.spec.ts:139`. |
| `e2e/mobile.spec.ts` | 13 `goto("/")`, 4 `"saurus"` guesses, one unrelated clock pin at :785. Owns the failing `mobile.spec.ts:228` and `:271`. |
| `e2e/helpers/` (new or existing module) | Home for the one pinned-day constant and the `beforeEach` helper, so the date is named once. |
| `e2e/onboarding.spec.ts`, `autocomplete.spec.ts`, `images.spec.ts`, `smoke.spec.ts`, `social.spec.ts`, `practice.spec.ts`, `archiveFilter.spec.ts` | Same exposure (unpinned daily page); green today by luck of what they assert. In scope only if the task takes the class, not the three instances. |
| `e2e/modal.spec.ts`, `postgame.spec.ts`, `share.spec.ts`, `hintKeyboard.spec.ts` | Already pin `2026-06-15T12:00:00`, as five separate string literals. Candidates to fold onto the shared constant. |

No `src/` change is expected. If one turns out to be needed, that is a
different defect than the one diagnosed here.

## Data and interfaces

Proposed, small:

```ts
// e2e/helpers/clock.ts
export const PINNED_DAY: string;              // "2026-06-15T12:00:00"
export function pinDailyClock(page: Page): Promise<void>;
```

`pinDailyClock` wraps `page.clock.install({ time: new Date(PINNED_DAY) })`.
Install, not `pauseAt`: time must keep advancing or the autocomplete's 100ms
blur timer and the tree settle waits stall (see the note at
`e2e/postgame.spec.ts:221`).

## Sketches

Illustrative only.

```diff
 // e2e/panel.spec.ts
 test.describe("info panel", () => {
+    // The daily target is a function of the real date, and the fixture below
+    // always guesses Ceratosaurus. Unpinned, this suite wins the round on
+    // guess 1 on any day Ceratosaurus is the answer - it did on 2026-08-04.
+    test.beforeEach(async ({ page }) => {
+        await pinDailyClock(page);
+    });
```

```diff
 // e2e/modal.spec.ts - fold the ad-hoc literal onto the shared constant
-        await page.clock.install({ time: new Date("2026-06-15T12:00:00") });
+        await pinDailyClock(page);
```

## Shape

```
  real clock                     pinned clock
      |                               |
  new Date()                    new Date()  -> 2026-06-15
      |                               |
  dateToSeed  -> seed of the day   dateToSeed -> fixed seed
      |                               |
  daily target = ???              daily target = stable, != Ceratosaurus
      |                               |
  guessFirstSuggestion("saurus")  guessFirstSuggestion("saurus")
      = Ceratosaurus                  = Ceratosaurus
      |                               |
  target hit -> GAME OVER         wrong guess -> round live
      |                               |
  modal-overlay.active            arena clickable
  #hint-box hidden (correct)      #hint-box enabled
      |                               |
  clicks intercepted -> TIMEOUT   assertions run as written
```

## Consequences and open questions

Cost: every pinned spec now tests one puzzle forever. A content change that
moves the 2026-06-15 target changes what these specs play; that is a loud,
deterministic failure rather than a calendar-roulette one, which is the trade
being bought.

Foreclosed: the suite stops incidentally exercising "some arbitrary daily
puzzle". Nothing asserts that today, so nothing is lost that was being
checked - but note that after this, no test covers "the daily page works for
an arbitrary seed". `e2e/seed.spec.ts` covers the seeded practice round, which
is the closer thing.

Open questions for planning:

1. **Scope.** Minimum is the two files that fail today. The defect is a class:
   7 more spec files open the daily page unpinned. Recommendation: pin every
   spec that opens `/` and fold the five existing date literals onto one
   constant - the three instances are not the bug, the unpinned daily page is.
2. **Mechanism.** A `beforeEach` calling a helper (explicit, KISS) versus an
   auto-fixture via `test.extend` (no per-file call, more machinery, and it
   would fight the specs that want their own time). Recommendation: the
   helper.
3. **Fallout.** Pinning changes the date for OTHER assertions in the same
   files - anything reading the puzzle number, archive lists, or streak dates.
   Must be verified by running the suite, not by reading, and any spec that
   was silently depending on "today" needs its own decision.
4. `TASK.md`'s Context section names `e846885` as the prime suspect and asks
   whether this is a hard regression. Both are answered here: not a
   regression, and not `e846885`. The record should be corrected when the task
   advances so a later reader does not re-run the wrong investigation.
