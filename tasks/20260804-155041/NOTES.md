# Notes: Pluralize HINT_COST and MAX_GUESSES prose off the constant

Goal in one line: no sentence that interpolates a game constant may hardcode
its noun's plural, so a reprice to 1 cannot ship "costs 1 guesses".

## What changes

Nothing changes on screen today. `MAX_GUESSES` is 25 and `HINT_COST` is 3, so
every hardcoded plural currently reads correctly. The change is entirely about
what happens when either constant becomes 1:

| Surface | Today | After a reprice to 1, before | After a reprice to 1, after |
|-|-|-|-|
| FAQ hint price | `A hint costs 3 guesses.` | `A hint costs 1 guesses.` | `A hint costs 1 guess.` |
| FAQ budget | `You have 25 attempts...` | `You have 1 attempts...` | `You have 1 attempt...` |
| Hint chip | `Spend 3 guesses to reveal a clade` | `Spend 1 guesses...` | `Spend 1 guess...` |
| Brief budget | `You have 25 guesses.` | `You have 1 guesses.` | `You have 1 guess.` |
| How-to-play card (x2) | `25 guesses. A name...` / `A hint spends 3 guesses...` | `1 guesses` / `1 guesses` | `1 guess` / `1 guess` |
| Loss share text | `I couldn't figure it out in 25 guesses.` | `...in 1 guesses.` | `...in 1 guess.` |
| Game-over win/loss summary | `Solved in 4 / 25 guesses` / `You used all 25 guesses` | `1 / 1 guesses` / `all 1 guesses` | `1 / 1 guess` / `all 1 guess` |

Second, smaller change: four sites already pluralize correctly but each
reimplements the same ternary inline. They route through the one helper
instead. No output changes at any count.

### Scope is nine sites, not the three TASK.md lists

TASK.md's Context enumerates `src/faqCopy.ts:24` and `src/ui/onboarding.ts:27,132`
only - all three `HINT_COST`. Reading the tree found six more, all `MAX_GUESSES`.
`tasks/20260804-151357/REVIEW.md` R2.3 raises the same under-scoping
independently. TASK.md's own argument ("fixing one surface and not the others
is worse than fixing none") applies to the sites it omitted exactly as it does
to the ones it named, so this brief takes the title's scope over the Context's
list. Two further corrections to TASK.md prose, both already in R2.3: `HINT_COST`
is 3, not 2, and `shareText.ts` is only half a good example - line 108 is the
pattern to copy, but line 124 in the same function is one of the defects.

Assumption recorded rather than asked: in `Solved in ${guessCount} / ${MAX_GUESSES} guesses`
the noun is agreed against `MAX_GUESSES`, the denominator, not `guessCount`.
At `MAX_GUESSES` 1 the only reachable numerator is 1, so the two agree anyway;
the choice is only visible in the code.

## Surfaces

| File | Why |
|-|-|
| `src/plural.ts` | New. Home for the `plural()` helper, currently module-private in `gameOverCopy.ts`. |
| `src/gameOverCopy.ts` | `plural()` moves out; `winSummary`/`lossSummary` agree their nouns with `MAX_GUESSES`. |
| `src/faqCopy.ts` | Both answers: "guesses" (l.24) and "attempts" (l.17). |
| `src/ui/onboarding.ts` | Four sites: hint chip (l.27), brief budget (l.55), card budget (l.127), card hint (l.132). |
| `src/shareText.ts` | Loss line (l.124) hardcodes the plural; win line (l.108) and hint count (l.114) drop their inline ternaries for the helper. |
| `src/ui/ladderCard.ts` | Two inline ternaries (l.17, l.19) fold into the helper. No constant involved; included so one helper owns every plural. |
| `test/plural.test.ts` | New. Exhaustive unit test of the helper: 0, 1, 2. |
| `test/constantRepricing.test.ts` | New. The actual guard - re-imports the copy modules under `HINT_COST`/`MAX_GUESSES` of 1 and asserts no "1 guesses"/"1 attempts". |
| `test/faqCopy.test.ts`, `test/onboarding.test.ts`, `test/gameOverCopy.test.ts`, `test/share.test.ts` | Untouched if they stay green; they assert the shipped values, which do not move. |

`src/*.html` needs no change: `test/markupConstants.test.ts` already forbids a
game constant as a literal in any page template, so all this prose is in `.ts`
by construction.

## Data and interfaces

New module, one export, lifted verbatim from `src/gameOverCopy.ts:11-13`:

```ts
// src/plural.ts
export function plural(count: number, one: string, many: string): string;
```

Signature is unchanged from the private original, so `gameOverCopy.ts`'s two
existing call sites in `split()` keep working as-is. No other public signature
changes anywhere: every touched function keeps its current parameters and
return type. `guessBudgetAnswer()`, `hintCostAnswer()`, `hintChipCopy()`,
`briefCopy()`, `winSummary()`, `lossSummary()`, `formatGameStateForSharing()`
and the ladder card's formatter are all edited in the body only.

## Sketches

Illustrative, not the patch.

```diff
  // src/faqCopy.ts
- return `You have ${MAX_GUESSES} attempts to find the target.`;
+ return `You have ${plural(MAX_GUESSES, "attempt", "attempts")} to find the target.`;

- return `A hint costs ${HINT_COST} guesses.`;
+ return `A hint costs ${plural(HINT_COST, "guess", "guesses")}.`;
```

```diff
  // src/shareText.ts
- const noun = guessCount === 1 ? "guess" : "guesses";
- `I figured it out in ${guessCount} ${noun}${help}!`
+ `I figured it out in ${plural(guessCount, "guess", "guesses")}${help}!`
  ...
- `I couldn't figure it out in ${MAX_GUESSES} guesses.`
+ `I couldn't figure it out in ${plural(MAX_GUESSES, "guess", "guesses")}.`
```

The guard, following `test/hintCap.test.ts`'s established
`isolateModules` + `doMock` shape for a compile-time constant:

```ts
// test/constantRepricing.test.ts - illustrative
jest.isolateModules(() => {
    jest.doMock("../src/constants", () => ({
        ...jest.requireActual("../src/constants"),
        HINT_COST: 1,
        MAX_GUESSES: 1,
    }));
    const { hintCostAnswer, guessBudgetAnswer } = require("../src/faqCopy");
    expect(hintCostAnswer()).not.toMatch(/\b1 guesses\b/);
    expect(guessBudgetAnswer()).toBe("You have 1 attempt to find the target.");
});
```

## Shape

```
              src/constants.ts
              MAX_GUESSES  HINT_COST
                     |
        +------------+------------+-------------+
        |            |            |             |
   faqCopy.ts   onboarding.ts  shareText.ts  gameOverCopy.ts
        |            |            |             |
        +------------+-----+------+-------------+
                           |             ^
                           v             |
                     src/plural.ts <--- ladderCard.ts
                     plural(n, one, many)   (no constant; joins for
                           |                 the single owner)
                           v
             "1 guess" | "3 guesses" | "0 guesses"

   guard: test/constantRepricing.test.ts
          re-imports the four constant-reading modules with the
          constants forced to 1, asserts no "<1> <plural noun>"
```

## Consequences and open questions

Cost. One new module for one three-line function; `src/plural.ts` is a
deliberately small file rather than a home for future string helpers, per YAGNI.
Eight production files churn for zero visible change today, which makes the diff
read larger than the defect - the guard test is what justifies it.

What it forecloses. Nothing in the code. It does pin an English-only
one/many split: a language with a third form, or a noun whose plural is not a
suffix, would need a different helper. Not a real constraint for this repo.

`src/ui/**` is excluded from Jest coverage (jest.config.js), so the two
onboarding fixes get no coverage credit. `onboarding.ts` splits pure copy from
DOM building precisely so `briefCopy()`/`hintChipCopy()` stay unit-testable, and
both are already imported by `test/onboarding.test.ts` - the new guard imports
them the same way. The card's HTML template literal (l.127, l.132) is the one
site with no unit-test reach; it is covered end to end in `e2e/onboarding.spec.ts`
against the shipped value only, so its singular form will be verified by review
reading, not by a test. Flagging it rather than adding a DOM test that the
repo's own layering says does not belong here.

Open, for planning rather than blocking:

- Should `ladderCard.ts` be in scope? It interpolates no constant, so it cannot
  regress on a reprice - it is in only so one helper owns every plural in the
  repo. Dropping it shrinks the diff by two lines and leaves one inline ternary
  pattern alive. Recommendation: keep it; a helper with an exception is a
  pattern that does not hold.
- Should the guard be one new `test/constantRepricing.test.ts` covering all four
  modules, or a repricing case added to each module's existing test file?
  Recommendation: one file. The invariant is repository-wide, and one file with
  an enumerated module list is the shape `test/markupConstants.test.ts` already
  uses for exactly this kind of cross-surface absence claim.
- `plural()`'s `count === 1` is the only branch; `plural(0, ...)` returns
  "0 guesses" and `plural(-1, ...)` would return "-1 guesses". No caller can
  pass a negative, so no guard is proposed.
