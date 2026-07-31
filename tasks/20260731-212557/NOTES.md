# Comment inventory (baseline for epic 20260731-212345)

Measured on `master` at 5775706, before any file in the epic was touched.

## How the population was counted

A grep over `//` and `*` lines is not a comment count. Two reasons, both
observed here:

- A run of consecutive `//` lines is ONE comment, not N.
- The TypeScript *scanner* alone mistakes a regex literal for a comment and
  then swallows the rest of the file. `src/markdownLoader.ts:29`
  (`.replace(/\.md$/, "")`) and `src/ui/onboarding.ts:47` both did this,
  which hid every later comment in `src/ui/treeVisualizer.ts`.

So the count uses the TypeScript PARSER, which resolves regex-vs-divide
correctly, and fuses consecutive standalone `//` lines into one comment. The
script is `scratchpad/comments.js` for this task; it walks `src`, `scripts`,
`test`, `e2e` for `*.ts`, `*.js`, `*.mjs`, collects
`getLeadingCommentRanges` / `getTrailingCommentRanges` over every leaf token,
and dedupes by position.

Cheap reproductions of the two headline numbers, which do not need the script:

```sh
# comment LINES per directory (over-counts: counts `*` continuation lines)
for d in src scripts test e2e; do
  printf '%s %s\n' "$d" "$(grep -rnE '^\s*(//|/\*|\*)' --include='*.ts' --include='*.js' "$d" | wc -l)"
done

# files carrying a task-ID reference inside a comment
grep -rlE '^\s*(//|\*|/\*).*(2026[0-9]{4}-[0-9]{6}|tasks/)' \
  --include='*.ts' --include='*.js' src scripts test e2e
```

## Population

| Dir | Comments | Comment lines | Keep | Compact | Discard | Task-ref |
|-----|---------:|--------------:|-----:|--------:|--------:|---------:|
| src | 223 | 852 | 119 | 26 | 78 | 21 |
| scripts | 87 | 301 | 57 | 23 | 7 | 8 |
| test | 264 | 784 | 207 | 12 | 45 | 12 |
| e2e | 263 | 1166 | 237 | 12 | 14 | 34 |
| **Total** | **837** | **3103** | **620** | **73** | **144** | **75** |

Buckets are per comment, read, not per grep hit. Definitions are the ones
`AGENTS.md` `## Comments` now states.

The epic's "37 inline task-ID references" and this table's 75 count different
things: 37 was a line-grep of `src/` plus a sample, 75 is every *comment*
containing a task ID or a `tasks/` path across all four directories. Sibling
tasks should measure against 75.

## Every file carrying a task-ID comment

38 files, 75 comments. This is the working list for the epic's Done Means
grep; each sibling owns the rows under its own cluster.

| File | Comments |
|------|---------:|
| `e2e/mobile.spec.ts` | 10 |
| `e2e/helpers.ts` | 9 |
| `scripts/playtest/hint.ts` | 5 |
| `e2e/autocomplete.spec.ts` | 3 |
| `src/game.ts` | 3 |
| `src/ui/onboarding.ts` | 3 |
| `src/ui/panel.ts` | 3 |
| `e2e/onboarding.spec.ts` | 2 |
| `e2e/seed.spec.ts` | 2 |
| `scripts/playtest/walkthrough.ts` | 2 |
| `src/practice.ts` | 2 |
| `src/treeBuilder.ts` | 2 |
| `src/ui/autocomplete.ts` | 2 |
| `src/ui/treeVisualizer.ts` | 2 |
| `test/autocompleteBlur.test.ts` | 2 |
| `e2e/closeness.spec.ts` | 1 |
| `e2e/images.spec.ts` | 1 |
| `e2e/modal.spec.ts` | 1 |
| `e2e/panel.spec.ts` | 1 |
| `e2e/postgame.spec.ts` | 1 |
| `e2e/practice.spec.ts` | 1 |
| `e2e/share.spec.ts` | 1 |
| `e2e/tree.spec.ts` | 1 |
| `scripts/playtest/difficulty.ts` | 1 |
| `src/constants.ts` | 1 |
| `src/gameState.ts` | 1 |
| `src/practiceSession.ts` | 1 |
| `src/ui/treeLayout.ts` | 1 |
| `test/cardRendering.test.ts` | 1 |
| `test/contentSource.test.ts` | 1 |
| `test/dataIntegrity.test.ts` | 1 |
| `test/hintCap.test.ts` | 1 |
| `test/hintRule.test.ts` | 1 |
| `test/lintGate.test.ts` | 1 |
| `test/onboarding.test.ts` | 1 |
| `test/practiceSession.test.ts` | 1 |
| `test/setTimeZone.js` | 1 |
| `test/treeLayout.test.ts` | 1 |

Two files hold a quarter of them. `e2e/mobile.spec.ts` and `e2e/helpers.ts`
are both dense with playtest-finding and review-round references, and both are
already the largest files in their cluster - the same reading that makes
20260731-212615 a split task.

A task reference is not a discard on sight. Of these 75, most are the one-line
record pointers `DECISION.md` case 1 keeps; the archaeology is the minority
counted under `## Where the compacts are`.

## Where the discards are

144 of the 837 comments narrate the code beside them, and they are not spread
evenly - they cluster in five files. That clustering is the useful finding:
most of this codebase already comments well.

| File | Discard | What they are |
|------|--------:|---------------|
| `src/profile.ts` | 30 | `// Draw line`, `// Create scales`, `// Y-axis label` |
| `src/gameStats.ts` | 24 | `// Sort by date`, `// Only count wins`, `// Convert to averages` |
| `src/treeBuilder.ts` | 15 | `// Recurse into child clades`, `// Add hint-revealed clades` |
| `test/gameStats.test.ts` | 30 | `// Two games on the same day`, `// Should have 2 separate data points` |
| `test/treeBuilder.test.ts` | 11 | `// Find CladeE somewhere in the tree` |
| everything else | 34 | scattered singles |

`src/ui/modal.ts` (4 of its 4) and `src/ui/card.ts` (2 of 7) are small but
wholly narrative.

## Where the keeps are

`e2e/` is 237 keep against 14 discard, and `test/` 207 against 45. The epic's
Fog asked whether test comment density is a problem or a feature: it is a
feature. These comments overwhelmingly record why an assertion is the
assertion, which is the strongest keep case in the rules - see
`e2e/postgame.spec.ts:75`, which explains why an assertion is NOT made in one
place and is made in another.

`e2e/helpers.ts` alone holds 66 comments over 1409 lines, nearly all
load-bearing. Task 20260731-212615 splits that file; it should carry the
comments across intact rather than treat their density as the problem.

## Where the compacts are

73 comments keep a constraint but bury it in narrative. Two recurring shapes:

- **Review archaeology.** `Found in review, R1.4`, `See REVIEW.md round 1,
  MAJOR`, `(REVIEW.md round 1, third MINOR)`. 12 in all, found with
  `/[Rr]eview\b|REVIEW\.md|\bR[0-9]\.[0-9]/` over the inventory: 6 in `e2e/`
  (`helpers.ts:967`, `mobile.spec.ts:240,295,661`,
  `onboarding.spec.ts:66,143`), 4 in `test/` (`lintGate.test.ts:44,53,80` and
  `closeness.test.ts:108`), 1 in `src/` (`closeness.ts:3`) and 1 in
  `scripts/` (`hint.ts:132`). The constraint stays; the round number goes to
  the record.
- **Section banners.** 21 pure dividers in `scripts/playtest/` and 6 in
  `test/treeBuilder.test.ts` - `// ---- Policies ----`, `// ==== EDGE CASES
  ====`. A banner is a file boundary that has not happened yet. These belong
  to 20260731-212616, and are the clearest evidence for the file-size rule.

  Counted as dividers, not as banner-shaped comments. A rule search finds 26
  in `scripts/playtest/` (`difficulty.ts` 11, `hint.ts` 9, `walkthrough.ts` 6)
  and one in `e2e/helpers.ts`; the 6 not counted here carry substance under
  the rule and are bucketed keep, so the split takes the heading and the prose
  goes with the code it introduces.

## Tracker markers

Two in the whole tree, both in `scripts/playtest/`:

- `scripts/playtest/walkthrough.ts:337` - `BUG:` in a printed report string,
  not a code comment. The playtest rig reporting a finding to its reader.
- `scripts/playtest/difficulty.ts:291` - `NOTE:` on how to read the stats.

Neither carries a tatr ID. Both are fine as they stand; the marker+ID form the
rules now define is for new ones.
