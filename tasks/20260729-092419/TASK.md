# Tighten CI signal and remove warning drift

- STATUS: CLOSED
- PRIORITY: 65
- TAGS: ci, testing, lint

## Story

As a developer, I want `npm run ci` to have a clean and strict signal, so that a green check means there are no lint warnings hiding in the output.

## Review Findings

- `npm run ci` passed, but ESLint emitted one warning for an unused catch binding in `src/ui/treeVisualizer.ts`.
- Passing with warnings makes CI output easier to ignore and weakens confidence in future review gates.
- The repo's current `ci` script runs format, lint, and Jest coverage, but not browser tests yet.

## Current state (verified 2026-07-30, before any change)

Three of the five original steps were already satisfied by later tasks, so this
cycle is narrower than the story implies:

- The `src/ui/treeVisualizer.ts` warning is gone: line 295 is now a bindingless
  `} catch {`. `nix develop -c npm run lint` exits 0 with no output at all, so
  the repo has NO lint warnings to remove.
- Browser E2E is already in the gate: `ci` is
  `format:check && lint && test:pipeline && test:coverage && test:e2e`, and
  `.github/workflows/ci.yml` runs the same steps individually.
- Nothing masks an exit code: the `ci` script is a plain `&&` chain with no
  pipes or `echo`s.

What is NOT done, and is the whole remaining point of the task: nothing FAILS on
a warning. The three repo rules configured as `warn`
(`no-unused-vars`, `no-explicit-any`, `no-console`) plus every warn-level rule
inherited from `recommendedTypeChecked` can all reappear with the gate staying
green. Today's clean lint is a coincidence of the last cleanup, not an invariant.

## Steps

- [x] Remove the current lint warning without changing behavior. (already gone;
      verified clean above)
- [x] Make lint strict: add `--max-warnings=0` to the `lint` script in
      `package.json` so any warning, from a repo rule or an inherited one, exits
      non-zero. Leave `lint:fix` unflagged - that is the developer's iterate
      loop, not the gate.
- [x] Pin the flag with a test that turns RED if it is deleted. Revised after
      reading `LESSONS.md`: `a-guard-no-test-can-fail-is-a-comment` says a
      hand-run `cmd:` proof is "evidence for one moment, not a guard", and
      deleting `--max-warnings=0` would leave the whole gate green. So add a
      Jest spec asserting the `lint` script carries the flag. It pins the
      repo's DECISION (eslint's own honouring of the flag is upstream's
      contract, not ours to re-test).
- [x] Falsify the new gate by hand as well, since the spec above pins the
      script string rather than eslint's behaviour: plant a deliberate warning,
      confirm `npm run lint` exits non-zero and names it, then revert. Use a
      scratch copy to restore, never `git checkout <file>`
      (`LESSONS.md`: `revert-a-test-mutation-with-a-scratch-copy-not-git-checkout`).
      Record the command and the observed exit code in `RETRO.md`.
- [x] Add browser E2E tests to the main verification command. (already in `ci`)
- [x] Make sure the CI command still exits with the underlying failing
      command's status. (plain `&&` chain, no pipes)
- [x] Document the strict bar: note in `AGENTS.md` (Conventions) that lint runs
      at zero warnings, so a new warn-level rule must be either satisfied or
      deliberately turned off in `eslint.config.mjs` rather than left to drift.
      Also fix the `README.md` gate line, which still omits `test:pipeline`.

## Definition of Done

- The `lint` script is strict. (cmd: `grep -n 'max-warnings' package.json`)
- Deleting the flag turns a test red. (test: `test/lintGate.test.ts`)
- `npm run lint` produces no warnings and exits 0. (cmd: `npm run lint`)
- `npm run ci` exits 0. (cmd: `npm run ci`)
- The strict bar is documented on the live doc surfaces. (cmd: `grep -n 'max-warnings\|zero warnings' AGENTS.md`)
- `README.md`'s gate line matches the real `ci` script. (cmd: `grep -n 'the full gate' README.md`)
- Browser tests are in the gate. (cmd: `grep -n 'test:e2e' package.json`)

## Verification (2026-07-30, on `chore/strict-lint-gate`)

The falsification, run against a deliberate `const unusedProbe = 1;` appended to
`src/gameData.ts` (planted and then restored from a scratch copy in
`/tmp/.../scratchpad/gameData.ts.bak`, never `git checkout`):

| command | exit | output |
|---------|------|--------|
| `npm run lint` (with `--max-warnings=0`) | **1** | `164:7 warning 'unusedProbe' is assigned a value but never used` / `1 problem (0 errors, 1 warning)` |
| `npx eslint <same globs>` (flag removed) | **0** | the SAME `1 problem (0 errors, 1 warning)` |

That pair is the whole point of the task in two lines: identical warning, and
only the flagged run fails. `git diff -- src/` was empty afterwards, confirming
the probe left no residue.

Full gate, green: `E2E_PORT=8181 nix develop -c npm run ci` exited **0** -
21 Jest suites / 322 tests, 104 Playwright tests, and no warning in the lint
step. Port 8181 was used because `playwright.config.ts` has
`reuseExistingServer: !CI` (`LESSONS.md`:
`a-stale-dev-server-on-8080-makes-e2e-test-the-wrong-app`); 8080 was checked
free first with `ss -ltnp` regardless.

## Notes

- Do not use shell pipelines that hide failing exit codes when updating scripts.
- CI runs npm directly on ubuntu while local dev needs the nix shell; that drift
  is recorded in AGENTS.md (`20260729-101744`) rather than papered over here.
  `.github/workflows/ci.yml` calls `npm run lint`, so the strict flag reaches CI
  with no workflow edit.
