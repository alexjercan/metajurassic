# Decision: what v1.0.0 declares, and what it leaves at 0.1.0

- DATE: 20260804-151357
- STATUS: ACCEPTED
- TASK: 20260804-151357
- TAGS: docs, release

## Context

`package.json` already says `1.0.0`, but nothing else in the repo marks a
release: no tag, no `CHANGELOG.md`, and 270 commits behind it (87 `fix:`, 62
`feat:`). Two questions had to be settled before the changelog could be
written, both left open by `TASK.md` and assumed one way in `NOTES.md`.

First, what the 1.0.0 section contains. 270 commits is far too many to list,
and `TASK.md` asked for Added/Changed/Fixed grouping without saying what
Changed and Fixed would be relative to.

Second, whether the release covers `scripts/*.py`. `pyproject.toml` carries
`version = "0.1.0"` and a placeholder `description = "Add your description
here"`, so a reader cannot tell whether the pipeline is pre-1.0 on purpose or
simply forgotten.

## Decision

The 1.0.0 section carries `### Added` only, one bullet per shipped surface -
daily game, tree and closeness colours, info panel, guess budget, hints,
practice and `?seed=`, the species and clades archives, profile/stats with the
rolling average, the round-summary ladder, share text, the daily countdown,
onboarding. Bullets are written from `src/` and the `tasks/` records, not from
commit subjects. `## [Unreleased]` ships empty above it. The section is dated
`2026-08-04`.

`pyproject.toml` stays at `version = "0.1.0"`. Only its placeholder
`description` is fixed.

## Alternatives considered

| Changelog shape | Why not |
|-|-|
| Commit dump | 270 lines nobody reads, restating a `git log` that is already in the repo |
| Added/Changed/Fixed as `TASK.md` first wrote it | Changed and Fixed are relative to a previous release, and there is none. Both sections would be empty, or a diff against unreleased intermediate states no reader ever ran |

Keep a Changelog's own guidance for a first release is that everything is
Added, and the audience for 1.0.0 has never seen the project.

For the Python pipeline, bumping it to 1.0.0 alongside the game was the
alternative. Rejected: `scripts/*.py` is an authoring tool that regenerates
`src/jurassic/index.json`. It is never installed, never published, and has no
consumer whose expectations a version number would set, so 1.0.0 there would
claim a stability guarantee for a script whose interface is "we run it when we
edit content". The release being announced is the game and the site.

A third, smaller fork - whether the FAQ states the hint price - is settled in
`TASK.md` rather than here: stating it reuses the number-bearing-fragment route
`tasks/20260729-212757/DECISION.md` already established (`faqCopy.ts` export
plus an empty span, guarded by `test/markupConstants.test.ts`,
`test/faqCopy.test.ts`, and `e2e/faq.spec.ts`), so it is a use of an existing
decision, not a new one.

## Consequences

The changelog cannot later document pre-1.0.0 development history without
re-cutting the section, and the dated heading fixes the release date the same
way. Accepted: that history lives in `git log` and in `tasks/`, both of which
outlive the file.

Changed/Fixed grouping starts being meaningful at 1.0.1, written into the
empty `## [Unreleased]` heading.

`pyproject.toml` staying at 0.1.0 means the repo carries two version numbers
that disagree. That is the honest state - they version different things - and
if the pipeline ever ships as a package it takes its own version line then,
which is what a separate number is for.
