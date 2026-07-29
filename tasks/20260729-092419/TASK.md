# Tighten CI signal and remove warning drift

- STATUS: OPEN
- PRIORITY: 65
- TAGS: ci,testing,lint

## Story

As a developer, I want `npm run ci` to have a clean and strict signal, so that a green check means there are no lint warnings hiding in the output.

## Review Findings

- `npm run ci` passed, but ESLint emitted one warning for an unused catch binding in `src/ui/treeVisualizer.ts`.
- Passing with warnings makes CI output easier to ignore and weakens confidence in future review gates.
- The repo's current `ci` script runs format, lint, and Jest coverage, but not browser tests yet.

## Steps

- [ ] Remove the current lint warning without changing behavior.
- [ ] Configure lint or CI to fail on warnings if that matches the repo's desired quality bar.
- [ ] Add browser E2E tests to the main verification command once the browser harness task lands.
- [ ] Make sure the CI command still exits with the underlying failing command's status and does not mask failures.
- [ ] Document any expected non-fatal warnings if strict warning failure is not adopted.

## Definition of Done

- `npm run lint` produces no warnings. (cmd: `npm run lint`)
- `npm run ci` exits 0 with no lint warning output. (cmd: `npm run ci`)
- Browser tests are included in CI once available, or this task records why that is deferred. (cmd: `rg -n "e2e|playwright|browser" package.json README.md`)

## Notes

- The known warning is in `src/ui/treeVisualizer.ts` around the catch binding.
- Do not use shell pipelines that hide failing exit codes when updating scripts.
- CI runs npm directly on ubuntu while local dev needs the nix shell; record that drift in AGENTS.md (`20260729-101744`) rather than papering over it here.
