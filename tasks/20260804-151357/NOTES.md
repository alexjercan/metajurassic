# Notes: Ship the v1.0.0 release - CHANGELOG, quickstart README, refreshed FAQ

Goal in one line: make the repo and the site read as a released v1.0.0 by adding
a CHANGELOG, cutting README back to a quickstart, and growing the FAQ to cover
every surface that actually shipped.

Docs-and-copy only. No gameplay module changes; the only executable additions
are E2E assertions over FAQ copy.

## What changes

| Surface | Before | After |
|-|-|-|
| `CHANGELOG.md` | absent | Keep a Changelog file: `## [Unreleased]` plus one dated `## [1.0.0]` section describing what the game does, grouped Added/Changed/Fixed |
| `README.md` | 60 lines mixing quickstart, seed-mode essay, and the Nix/Playwright procedure | ~40-line quickstart: what the game is, install/serve, build, test one-liners, pointers to `AGENTS.md` and `e2e/seed.spec.ts` |
| `src/faq.html` | 5 daily-only answers plus an archive block | those 5 plus answers for practice/seeds, the archives, profile/stats, the rank ladder, hints, sharing, and the daily reset time |
| `e2e/faq.spec.ts` | one assertion (guess budget agrees with the board) | that, plus at least one new answer asserted against the behavior it describes |
| `pyproject.toml` | `version = "0.1.0"`, `description = "Add your description here"` | description fixed; version decided in planning |
| `git tag` | none | `v1.0.0` on master, after the branch lands |

A player visiting `/faq/` today is told about the daily game only. Half the app
- practice, archives, profile, hints, share - is reachable from the header and
undocumented. After: every route the header offers has an answer explaining it.

## Surfaces

Written:

| File | Why |
|-|-|
| `CHANGELOG.md` (new) | the release statement; nothing in the repo currently marks 1.0.0 except `package.json` |
| `README.md` | trim to quickstart; the seed-mode and Nix/Playwright prose duplicates `AGENTS.md` |
| `src/faq.html` | the player-facing gap; new `.faq-item` blocks |
| `e2e/faq.spec.ts` | one new answer needs a behavioral assertion |
| `pyproject.toml` | placeholder `description`; version call deferred to planning |

Read, not written (they are what the new FAQ prose must describe accurately):

| File | What it fixes about the copy |
|-|-|
| `src/constants.ts` | `MAX_GUESSES = 25`, `HINT_COST = 3`, `MAX_HINTS = -1` (uncapped). No number from here may be typed into `src/faq.html`. |
| `src/faqCopy.ts` | `guessBudgetAnswer()` - the only number-bearing FAQ fragment today |
| `src/faq.ts` | mounts it into `#faq-guess-budget`; throws if the span is missing |
| `src/hintRule.ts` | a hint reveals the shallowest unrevealed clade in the target's lineage that halves the remaining field; falls back to the deepest unrevealed clade; never gives the answer |
| `src/rankLadder.ts` | the round summary card: rows are revealed clades, root first, each carrying the guesses that revealed it. It stops at the deepest REVEALED clade - it never shows remaining depth. |
| `src/shareText.ts` | share grid: one cell per guess by closeness tier, `🦖` for the answer, `💡` per hint. Practice shares are labelled "Practice", never masquerade as the daily. Stats with no data behind them are dropped, not printed as zero. |
| `src/countdown.ts` | next puzzle at the next LOCAL midnight, `HH:MM:SS` |
| `src/gameStats.ts` | daily and practice stats kept separate; streaks, win rate, average guesses, distribution, dinosaurs discovered |
| `src/rollingAverage.ts`, `src/profile/` | profile page: daily/practice tabs, stat panel, discovery progress bar, 7-window rolling-average chart |
| `src/practiceSession.ts`, `src/practice.ts` | `?seed=N` reproducible rounds, `seed mod 100000`, resume-on-revisit, **New game** starts an unseeded round |
| `src/closeness.ts` | tier scale shared by node colours and share squares |
| `webpack.config.js` | the six routes: `/`, `/practice/`, `/faq/`, `/species/`, `/clades/`, `/profile/` |
| `src/partials/faq.css` | `.faq-item` / `.faq-question` / `.faq-answer` / `.faq-archive` / `.archive-links` / `.faq-back` - the only classes available; no new CSS needed |
| `test/markupConstants.test.ts` | CI guard: no page template may contain `\b25\b` or `\b3 [Gg]uesses\b` |

## Data and interfaces

No new runtime types. Existing signatures the work touches or must not break:

```ts
// src/faqCopy.ts - already present
export function guessBudgetAnswer(): string;
```

If a second FAQ answer needs a constant (the hint price, `HINT_COST = 3`), it
takes the same shape - a new exported fragment here plus an empty `<span
id="faq-...">` in the template, filled by `src/faq.ts`:

```ts
export function hintCostAnswer(): string;   // only if the FAQ states the price
```

`test/markupConstants.test.ts` already forbids `"3 guesses"` as a literal in any
`.html`, so an FAQ answer that names the hint price MUST go through `faqCopy.ts`.
Answers with no number in them (practice, archives, profile, sharing, ladder)
stay entirely in the template.

Documentation formats, not code:

- `CHANGELOG.md`: Keep a Changelog 1.1.0 headings, `## [1.0.0] - 2026-08-04`,
  subsections Added / Changed / Fixed, plus a link section at the bottom
  carrying the `v1.0.0` compare/tag URLs.

## Sketches

Illustrative only.

`src/faq.html` - a numberless answer, template-only:

```diff
+                <div class="faq-item">
+                    <h2 class="faq-question">Can I play more than once a day?</h2>
+                    <p class="faq-answer">
+                        Yes - practice mode deals a fresh random dinosaur
+                        whenever you want one. Add <code>?seed=42</code> to the
+                        practice URL to play a specific, repeatable round...
+                    </p>
+                </div>
```

`src/faq.html` - a number-bearing answer, if the hint price is stated:

```diff
+                    <p class="faq-answer">
+                        Stuck? The hint button reveals the next group the
+                        mystery species belongs to.
+                        <span id="faq-hint-cost"></span>
+                    </p>
```

```diff
 // src/faqCopy.ts
+export function hintCostAnswer(): string {
+    return `Each hint costs ${HINT_COST} guesses from your budget.`;
+}
```

`e2e/faq.spec.ts` - the new assertion in the existing style, deriving the number
from the board rather than typing it:

```diff
+test("the FAQ's practice answer names a route that exists", async ({ page }) => {
+    await page.goto("/faq/");
+    await expect(page.locator(".faq-answer")).toContainText(/practice/i);
+    await page.goto("/practice/?seed=42");
+    // ... the behavior the answer describes actually happens
+});
```

`README.md` - what leaves:

```diff
-### Seed mode (reproducible practice rounds)
-
-The practice page accepts a `?seed=` query param that ... [~20 lines]
+Reproducible practice rounds, the Nix dev shell, and the Playwright rules live
+in `AGENTS.md`. `e2e/seed.spec.ts` is a runnable seeded round.
```

## Shape

```
  repo entry                          site entry
  ----------                          ----------
  README.md  --- pointer --->  AGENTS.md         src/faq.html
   quickstart                   (Nix, Playwright,   |
   install/serve/build           seeds, pipeline)   |  prose: practice, archives,
   test one-liners                                  |  profile, ladder, hints,
   link: CHANGELOG                                  |  sharing, daily reset
        |                                           |
        v                                           +-- <span id="faq-*"> <--- src/faq.ts
  CHANGELOG.md                                                                    |
   [Unreleased]                                                                   v
   [1.0.0] - 2026-08-04                                                    src/faqCopy.ts
        |                                                                         |
        v                                                                         v
   git tag v1.0.0  (master, after land)                                  src/constants.ts
                                                                          MAX_GUESSES, HINT_COST

  guards
  ------
  test/markupConstants.test.ts  ->  no constant is a literal in any src/*.html
  e2e/faq.spec.ts               ->  FAQ copy agrees with the shipped behavior
```

## Consequences and open questions

Costs and what it forecloses:

- The FAQ roughly doubles in length. It is a single flat scroll with no
  accordion; ~12 items is near the limit of that form. A later grouping or
  collapse pass becomes likely, but is not this task.
- Moving seed-mode prose out of README makes `AGENTS.md` the only home for it.
  A reader who never opens `AGENTS.md` loses the seed explanation; the pointer
  plus `e2e/seed.spec.ts` is the mitigation.
- Every FAQ sentence is now a claim CI does not check. Only one new answer gets
  an assertion per the Steps, so the rest can rot exactly the way the current
  daily-only FAQ did. Worth naming in the retro.
- A dated 1.0.0 section fixes the release date; re-cutting it later means
  editing history in the file.

Open questions - assumptions recorded, none blocking:

1. **`pyproject.toml` version.** TASK.md defers to planning. Assumption: the
   release covers the game, not the Python content pipeline, so leave
   `version = "0.1.0"` and fix only the placeholder `description`. Planning
   confirms or overturns.
2. **The `v1.0.0` tag versus the DoD.** Steps say tag master *after the branch
   lands*, but DoD carries `(cmd: git tag --list v1.0.0)`. That proof cannot be
   green on the branch at the WORK_DONE gate. Assumption: it is a landing-time
   check, satisfied between LAND_READY approval and DONE. Planning should either
   mark it as such or move it out of the cmd-proof list.
3. **Changelog granularity.** 269 commits, 87 `fix:` and 62 `feat:`. Assumption:
   1.0.0 reads as "what the game does" - one Added bullet per shipped surface
   (daily game, tree, info panel, practice/seeds, archives, profile, ladder,
   hints, sharing, countdown, onboarding), with Changed/Fixed reserved for
   things a player would have noticed changing. No commit dump.
4. **Release date.** Assumption: `2026-08-04`, today and the date of the most
   recent commit.
5. **Hint price in the FAQ.** Stating "costs 3 guesses" requires a new
   `faqCopy.ts` fragment and a new span; omitting the number keeps the FAQ
   template-only. Assumption: state it, via `faqCopy.ts` - a hint's cost is the
   thing a player most needs to know before pressing the button.
