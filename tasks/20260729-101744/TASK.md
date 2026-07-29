# Write AGENTS.md with build, test, and data pipeline orientation

- STATUS: OPEN
- PRIORITY: 96
- TAGS: docs,process,flow

## Story

As an agent or contributor starting a cold session, I want a repo AGENTS.md that records how to build, test, and regenerate content, so that sessions do not rediscover environment facts the hard way.

## Review Findings

- The repo has no AGENTS.md and the README is 12 lines; neither mentions tests, the nix dev shell, or the content pipeline.
- `node`/`npx` are not on PATH outside `nix develop`; the out-of-context review hit this immediately when trying to run Jest.
- The data pipeline is undocumented: `data.csv` is gitignored, the markdown files under `src/jurassic/` are the source of truth, and `scripts/*.py` convert between CSV, markdown, and the served `index.json`.
- CI runs npm directly on ubuntu while local dev requires the nix shell; the drift is workable but recorded nowhere.
- The scufris AGENTS.md is the model: what the project is, layout, build/test commands, conventions, and where flow records live.

## Steps

- [ ] Write AGENTS.md covering: project summary, dev environment (`nix develop`, npm scripts), running tests and CI locally, the content pipeline (markdown source of truth, scripts, regeneration commands), deploy (gh-pages workflow), and where flow records live (tasks/, LESSONS.md).
- [ ] Record the CI-vs-nix drift explicitly.
- [ ] Keep it short and factual; player-facing documentation stays in the FAQ and README.

## Definition of Done

- AGENTS.md exists and covers environment, tests, pipeline, and records. (cmd: `test -s AGENTS.md`)
- A cold session can run the test suite following only AGENTS.md. (manual: follow the doc verbatim in a fresh shell)

## Notes

- Pairs with `20260729-092239` (flow conformance restore); they can land together, but keep the records separate.
