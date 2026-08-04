# Pluralize HINT_COST and MAX_GUESSES prose off the constant

- PRIORITY: 20
- TAGS: docs, polish
- KIND: TASK
- ACTIVITY: WORKING
- GATES: PLAN
- RESOLUTION: -

## Story

As a player reading any surface that quotes a price or a budget, I want the
sentence to agree with the number it interpolates, so that a reprice to 1 does
not ship "costs 1 guesses".

## Context

Raised as R1.3 in `tasks/20260804-151357/REVIEW.md` and deliberately not fixed
there: the finding is about a repository-wide pattern, not that diff.

Every surface that interpolates `HINT_COST` or `MAX_GUESSES` into prose
hardcodes the plural noun:

- `src/faqCopy.ts:24` - `A hint costs ${HINT_COST} guesses.`
- `src/ui/onboarding.ts:27,132` - the same sentence shape, twice.

`src/shareText.ts:108-114` already does this correctly and is the pattern to
copy. The current values (`HINT_COST` 2, `MAX_GUESSES` > 1) mean nothing is
wrong on screen today; the defect is latent and only fires on a reprice.

The tests do not guard it. `test/faqCopy.test.ts` asserts the integer appears,
not the noun agreement, so all three surfaces stay green through a reprice
to 1.

Fixing one surface and not the others is worse than fixing none - the reason
R1.3 was held at NIT - so this task covers all three together.

Scope is nine sites, not the three named above. Reading the tree found six
more, all `MAX_GUESSES`; `tasks/20260804-151357/REVIEW.md` R2.3 raises the same
under-scoping. Two corrections to the list above, both from R2.3: `HINT_COST`
is 3, not 2, and `shareText.ts` is only half a good example - line 108 is the
pattern to copy, line 124 in the same function is one of the defects.

## Steps

- [ ] Add `test/plural.test.ts` covering the helper the next step extracts:
      `plural(1, "guess", "guesses")` is `"1 guess"`, `plural(3, ...)` is
      `"3 guesses"`, `plural(0, ...)` is `"0 guesses"`. Red on the missing
      module.
- [ ] Add `test/constantPlurals.test.ts`, the guard, in two describes. Follow
      `test/markupConstants.test.ts` for the source scan and
      `test/hintCap.test.ts` for the reprice half.
      - *source scan*: recursively walk `src/` for `*.ts` (real readdir, not a
        hardcoded list - `src/ui`, `src/game`, `src/profile` are subdirs), assert
        the file list is non-empty before asserting over it, then assert no file
        matches `/\$\{[^}]*\} (guess|guesses|hint|hints|attempt|attempts)\b/`.
        Assert the matched text, not a boolean, so a failure names the site.
        Exempt nothing; verified to have exactly the nine hits on base and no
        false positive. This is the only guard that reaches the how-to-play
        card template (`onboarding.ts:127,132`), which `testEnvironment: "node"`
        puts out of unit-test reach.
      - *reprice to 1*: `jest.isolateModules` + `jest.doMock("../src/constants",
        ...)` with `HINT_COST: 1, MAX_GUESSES: 1`, then `require` the four
        constant-reading copy modules and assert the exact singular sentences -
        `hintCostAnswer()`, `guessBudgetAnswer()`, `hintChipCopy().detail`,
        `briefCopy().budget`, `winSummary(1, 0)`, `lossSummary(1, 0)`, and the
        loss branch of `formatGameStateForSharing()`.
- [ ] Create `src/plural.ts`: move `plural()` out of `src/gameOverCopy.ts:11-13`
      verbatim and export it, with a doc comment naming why it is its own module
      (DECISION.md). Import it back into `gameOverCopy.ts`; `split()` is
      unchanged.
- [ ] Route the two `gameOverCopy.ts` constant sites through it: `winSummary`
      l.23 `${guessCount} / ${plural(MAX_GUESSES, "guess", "guesses")}` and
      `lossSummary` l.30 `You used all ${plural(MAX_GUESSES, ...)}`. The noun
      agrees with `MAX_GUESSES`, the denominator, not `guessCount` - at
      `MAX_GUESSES` 1 the only reachable numerator is 1, so they agree anyway
      and the choice is only visible in the code.
- [ ] `src/faqCopy.ts`: l.17 `attempt`/`attempts`, l.24 `guess`/`guesses`.
- [ ] `src/ui/onboarding.ts`, four sites: hint chip l.27, brief budget l.55,
      card budget l.127, card hint l.132. The two card sites are inside the
      `innerHTML` template literal.
- [ ] `src/shareText.ts`: l.124 loss line gains the helper; l.108's `noun`
      local and l.114's inline hint ternary drop for it. Output at the shipped
      values is byte-identical - `test/share.test.ts` must stay green untouched.
- [ ] `src/ui/ladderCard.ts` l.17, l.19: two inline ternaries fold into the
      helper. No constant here, so it cannot regress on a reprice; it is in so
      one helper owns every plural in `src/` (DECISION.md).
- [ ] Verify: `npm run ci` and `npm run build` inside `nix develop`. No existing
      test file should need an edit - they assert the shipped values, which do
      not move.

## Definition of Done

- The helper agrees a noun with its count at 0, 1 and many.
  (test: jest `test/plural.test.ts`)
- No `.ts` file in `src/` interpolates a count and then hardcodes the noun's
  plural, and the scan enumerates a non-empty file list before claiming it.
  (test: jest `test/constantPlurals.test.ts` source scan)
- With `HINT_COST` and `MAX_GUESSES` forced to 1, the FAQ, the board brief, the
  hint chip, the game-over summaries and the loss share text all read "1 guess"
  / "1 attempt". (test: jest `test/constantPlurals.test.ts` reprice to 1)
- Every shipped sentence is unchanged at the current values - this is a latent
  fix, not a copy change. (cmd: `npx jest test/faqCopy test/onboarding
  test/gameOverCopy test/share test/markupConstants`)
- Coverage gate still clears with a new module and two new suites in scope.
  (cmd: `npm run ci`)
- Production bundle builds. (cmd: `npm run build`)
- The how-to-play card reads correctly in the singular. It is the one site with
  no unit-test reach - `src/ui/**` is DOM-built and `e2e/onboarding.spec.ts`
  asserts the shipped value only - so it is verified by reading the diff.
  (manual: user judgement)

## Notes

- Guard shape: one new file, not a reprice case appended to each module's
  existing test. The invariant is repository-wide, and one file with an
  enumerated scope is the shape `test/markupConstants.test.ts` already uses for
  exactly this kind of cross-surface absence claim.
- The source-scan regex was run on base: exactly the nine defect sites, no
  false positive anywhere in `src/`. The already-correct sites
  (`shareText.ts:108,114`, `ladderCard.ts:17,19`) do not match it, because their
  noun sits inside the hole rather than after it - so the scan cannot force
  Step 8, which is why DECISION.md carries that choice instead.
- DoD item 4 is green on base by construction: it is the no-regression claim
  that this is a latent fix, and a criterion that says "nothing visible moved"
  cannot be red first. Every other proof is red on base - items 1-3 on missing
  files, and item 3 would stay red even if the files existed, since the nine
  sites are hardcoded today.
- `src/*.html` needs no change: `test/markupConstants.test.ts` already forbids a
  game constant as a literal in any page template, so all this prose is in `.ts`
  by construction.
- `plural()`'s `count === 1` is the only branch. `plural(0, ...)` returns
  "0 guesses", `plural(-1, ...)` would return "-1 guesses"; no caller can pass a
  negative, so no guard is proposed. `test/plural.test.ts` covers 0 because
  `lossSummary`'s `split()` can legitimately reach it.
- `src/ui/**` is excluded from Jest coverage (jest.config.js), so the two
  onboarding fixes earn no coverage credit; `src/plural.ts` is in scope and is
  fully covered by `test/plural.test.ts`.

## Inspection

```sh
grep -rnE '\$\{[^}]*\} (guess|guesses|hint|hints|attempt|attempts)\b' src/ --include='*.ts'
grep -rn 'plural(' src/            # every agreeing sentence, after
npx jest test/plural test/constantPlurals
git diff master --stat
```
