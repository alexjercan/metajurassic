# Ship the v1.0.0 release: CHANGELOG, quickstart README, refreshed FAQ

- PRIORITY: 90
- TAGS: docs, release
- KIND: TASK
- ACTIVITY: PLANNING
- GATES: -
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

- [ ] Write `CHANGELOG.md` in Keep a Changelog format with a single
      `## [1.0.0] - <date>` section, grouped Added/Changed/Fixed, derived from
      `git log` and the `tasks/` records rather than pasted commit subjects.
      Add an `## [Unreleased]` heading for the next cycle.
- [ ] Trim `README.md` to a quickstart: what the game is, install/serve,
      build, the one-line test commands, and links onward. Move the seed-mode
      and E2E/Nix detail out of it - keep it in `AGENTS.md` (which already
      carries the Nix/Playwright rules) and leave a pointer.
- [ ] Extend `src/faq.html` to cover practice + seeds, the archives, the
      profile/stats page and rank ladder, hints, sharing, and when the daily
      resets. Keep the existing `faq-item` markup shape and `src/partials/faq.css`
      classes.
- [ ] Extend `e2e/faq.spec.ts` (or add a sibling spec) so at least one new
      answer is asserted against the behavior it describes, in the style of the
      existing budget assertion.
- [ ] Verify the release: `npm run ci` and `npm run build` inside `nix develop`.
- [ ] Tag `v1.0.0` on master after the branch lands, and note the tag in
      `CHANGELOG.md`'s link section.

## Definition of Done

- `CHANGELOG.md` exists with a dated 1.0.0 section and an Unreleased heading.
  (manual: user reads it and recognizes the release)
- README is a quickstart under ~40 lines with no duplicated Nix/Playwright
  procedure. (manual: user review)
- The FAQ page describes every shipped surface listed in Context.
  (manual: user opens `/faq/` and finds practice, archive, profile, hints,
  sharing)
- The FAQ still states the enforced guess budget with no hardcoded number.
  (test: e2e `guess budget across surfaces`)
- Full gate green. (cmd: npm run ci)
- Production bundle builds. (cmd: npm run build)
- `git tag` lists `v1.0.0`. (cmd: git tag --list v1.0.0)

## Notes

- Do not bump `package.json`; it is already 1.0.0. Do bump
  `pyproject.toml`'s `version = "0.1.0"` only if the release should cover the
  Python pipeline too - decide in planning, and fix its placeholder
  `description` either way.
- Changelog scope decision belongs in planning: 268 commits is too many to
  list, so 1.0.0 should read as "what the game does", not a commit dump.
