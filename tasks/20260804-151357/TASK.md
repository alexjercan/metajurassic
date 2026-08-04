# Ship the v1.0.0 release: CHANGELOG, quickstart README, refreshed FAQ

- PRIORITY: 90
- TAGS: docs, release
- KIND: TASK
- ACTIVITY: WORKING
- GATES: PLAN
- RESOLUTION: -

## Story

As someone landing on the repo or the site for the first time, I want a stated
v1.0.0 with a CHANGELOG, a quickstart README, and an FAQ that matches the game
that actually shipped, so that the project reads as released rather than as a
running work-in-progress.

## Context

`package.json` already says `version: 1.0.0`, but nothing else marks a release:
no `git tag`, no `CHANGELOG.md`, and 268 commits of history behind it. The
README has drifted into a mixed quickstart/seed-mode/testing document, and
`src/faq.html` still describes only the daily game (5 questions: what it is,
how to play, the tree, the info panel, daily rotation).

Surfaces that shipped since the FAQ was written and are unmentioned there:
practice mode and `?seed=`, the species and clades archives (linked but not
explained), the profile/stats page (`src/profile/`, `gameStats.ts`,
`rollingAverage.ts`), the rank ladder (`rankLadder.ts`), hints
(`hintRule.ts`), share text (`shareText.ts`), and the daily countdown
(`countdown.ts`).

Two constraints on the FAQ edit:

- `#faq-guess-budget` is filled at runtime from `guessBudgetAnswer()` in
  `src/faqCopy.ts`, which reads `MAX_GUESSES`. Never hardcode a guess count in
  `src/faq.html`. `e2e/faq.spec.ts` fails if the two surfaces disagree.
- New FAQ prose goes in the template; only number-bearing fragments belong in
  `faqCopy.ts`. See `tasks/20260729-212757/DECISION.md` for why the FAQ does
  not reuse the onboarding copy.

Out of scope: the docs site (separate task) and any gameplay change.

## Steps

- [ ] Write `CHANGELOG.md`: Keep a Changelog headings, an empty
      `## [Unreleased]`, and one `## [1.0.0] - 2026-08-04` section carrying
      `### Added` only - one bullet per shipped surface (daily game, tree and
      closeness colours, info panel, guess budget, hints, practice + `?seed=`,
      species and clades archives, profile/stats with the rolling average,
      round-summary ladder, share text, daily countdown, onboarding), written
      from `src/` and the `tasks/` records, not from commit subjects. Close
      with a link section holding the `v1.0.0` tag URL. No `Changed`/`Fixed`:
      a first release has no prior release to differ from (DECISION.md, fork
      1).
- [ ] Trim `README.md` to a quickstart: what the game is, `npm install` /
      `npm run serve` / `npm run build`, the three test one-liners, and links
      to `CHANGELOG.md`, `AGENTS.md`, and `e2e/seed.spec.ts`. Delete the
      `### Seed mode` section and the Nix/Playwright procedure - both already
      live in `AGENTS.md` (`## Deterministic practice games`,
      `## Environment and commands`). Prettier does not cover `*.md`, so
      format by hand.
- [ ] Add `hintCostAnswer()` to `src/faqCopy.ts` beside `guessBudgetAnswer()`,
      reading `HINT_COST`, and cover it in `test/faqCopy.test.ts` with the two
      cases the budget fragment has (contains the constant; carries no other
      integer). The exported function is in the coverage gate's scope, so it
      needs a test in this change.
- [ ] Extend `src/faq.html` with new `.faq-item` blocks for: playing more than
      once a day (practice + `?seed=N`, `seed mod 100000`, seeded rounds
      resume, **New game** deals unseeded), hints (reveals the shallowest
      unrevealed clade in the answer's lineage, never the answer; price via an
      empty `<span id="faq-hint-cost">`), the round summary ladder (revealed
      clades root-first with the guesses that revealed them; it never shows
      remaining depth), sharing (one square per guess by closeness tier, a bulb
      per hint, practice shares labelled Practice), the profile page (daily and
      practice stats kept separate; streaks, win rate, distribution, discovery
      progress, rolling average), and the archives (fold the existing
      `.faq-archive` block's prose into an answer or leave the block and say
      what the two archives hold). Rewrite the "new puzzle every day" answer to
      state the reset is local midnight with a live countdown. Only existing
      `src/partials/faq.css` classes; no new CSS.
- [ ] Mount the new fragment in `src/faq.ts`: look up `#faq-hint-cost` and
      throw with the same shape as the existing `#faq-guess-budget` guard.
- [ ] Extend `e2e/faq.spec.ts` with a hint-price test in the existing style -
      parse the number out of the board's `#hint-text` chip (filled by
      `hintChipCopy()`), then assert `#faq-hint-cost` against a whole-shape
      regex built from it, never a bare substring. Comment why the shape
      matters, as the budget test does.
- [ ] Fix `pyproject.toml`'s placeholder `description`. Leave
      `version = "0.1.0"`: 1.0.0 is the game and the site, not the Python
      content pipeline (DECISION.md, fork 2).
- [ ] Verify: `npm run ci` and `npm run build` inside `nix develop`.
- [ ] Landing only, after the branch is on master: `git tag v1.0.0`. The
      CHANGELOG link section written in step 1 already points at it.

## Definition of Done

- `CHANGELOG.md` exists with an Unreleased heading and a dated 1.0.0 section.
  (cmd: test -f CHANGELOG.md && grep -q '## \[1.0.0\] - 2026-08-04'
  CHANGELOG.md && grep -q '## \[Unreleased\]' CHANGELOG.md)
- The 1.0.0 section reads as what the game does, and a first-time reader
  recognizes the release. (manual: user reads `CHANGELOG.md`)
- README is a quickstart under ~40 lines with no duplicated Nix/Playwright or
  seed-mode procedure. (cmd: test $(wc -l < README.md) -le 40 && ! grep -qi
  'playwright install\|?seed=' README.md)
- The FAQ page describes every shipped surface listed in Context.
  (manual: user opens `/faq/` and finds practice, hints, the ladder, sharing,
  the profile page, the archives, and the reset time)
- The FAQ states the hint price with no hardcoded number, and it agrees with
  the board. (test: e2e `guess budget across surfaces` new hint-price case)
- The FAQ still states the enforced guess budget with no hardcoded number.
  (test: e2e `guess budget across surfaces`)
- No page template carries a constant as a literal.
  (test: jest `test/markupConstants.test.ts`)
- `hintCostAnswer()` follows `HINT_COST`. (test: jest `test/faqCopy.test.ts`)
- `pyproject.toml` has a real description. (cmd: ! grep -q 'Add your
  description here' pyproject.toml)
- Full gate green. (cmd: npm run ci)
- Production bundle builds. (cmd: npm run build)
- LANDING CHECK, not a branch proof - verified between LAND_READY approval and
  DONE, since the tag is cut on master after the merge: `git tag` lists
  `v1.0.0`. (cmd: git tag --list v1.0.0)

## Notes

Planning resolved the four open questions in `NOTES.md`; the two load-bearing
ones are in `DECISION.md`.

- Do not bump `package.json`; it is already 1.0.0.
- Release date `2026-08-04` - today, and the date of the most recent commit.
  Dating the section fixes it: re-cutting 1.0.0 later means editing the file.
- `src/faq.ts` has no function body, so its missing-span guard is a top-level
  `throw`, not the `if (!el) return;` the sibling entry points use. The new
  span follows the same form.
- `test/markupConstants.test.ts` forbids `\b25\b` and `\b3 [Gg]uesses\b` in any
  `src/*.html`. Every number-bearing FAQ sentence must route through
  `faqCopy.ts`; numberless answers stay entirely in the template.
- Prettier covers `src/**/*.html` but not `*.md`, so `npm run format:check`
  will police the FAQ markup and ignore README/CHANGELOG.
- Cost accepted: ~12 flat FAQ items is near the limit of a scroll with no
  accordion, and only one new answer gets a CI assertion - the rest can rot the
  way the daily-only FAQ did. Name both in the retro.

## Inspection

```sh
git log --oneline | wc -l            # 270; the changelog does not list these
grep -rn "HINT_COST" src/            # every surface that must not be hardcoded
npx jest test/markupConstants test/faqCopy
npx playwright test e2e/faq.spec.ts
```
