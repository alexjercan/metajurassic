# Decision: make lint strict with `--max-warnings=0`, not by promoting rules to `error`

- STATUS: ACCEPTED
- DATE: 2026-07-30
- TASK: 20260729-092419

## Context

`npm run ci` chained `format:check`, `lint`, `test:pipeline`, `test:coverage`
and `test:e2e` with `&&`, so a failing step already stopped the gate. What it
did NOT do was fail on a lint WARNING. `eslint.config.mjs` configures three
rules at `warn` severity (`@typescript-eslint/no-unused-vars`,
`@typescript-eslint/no-explicit-any`, `no-console`), and
`tseslint.configs.recommendedTypeChecked` contributes further warn-level rules
the repo never wrote itself. Any of them could fire and the gate would still
exit 0, which is the "warning drift" this task is named for.

At the time of the decision the repo happened to be clean: the
`src/ui/treeVisualizer.ts` unused catch binding named in the original story had
already been fixed to a bindingless `} catch {`, and `npm run lint` produced no
output at all. So this is not a cleanup - it is about making today's clean state
an enforced invariant instead of a coincidence.

## Options considered

1. **`--max-warnings=0` on the `lint` npm script.** Any warning from any rule -
   repo-configured, inherited from a shared config, or added by a future
   dependency bump - exits non-zero.
2. **Promote the repo's three `warn` rules to `error` in `eslint.config.mjs`.**
   Hardens only what this repo explicitly configures. A dependency bump can
   never surprise the gate.
3. **Both.**

These are not interchangeable, and the constraint that makes them mutually
exclusive is *which* warnings become fatal:

- Option 2 leaves every warn-level rule inherited from
  `recommendedTypeChecked` non-fatal. The exact failure mode this task exists
  to kill - "a green check hiding warnings in the output" - can return through
  a rule the repo did not author. It also does not literally satisfy the
  story's "no lint warning output", because a warning can still be printed on a
  passing run.
- Option 1 makes the inherited set fatal too, at the cost that a dependency
  bump introducing a new warn-level rule can redden the gate until someone
  either satisfies it or turns it off deliberately.

## Decision

Option 1: add `--max-warnings=0` to the `lint` script. The user chose this
explicitly at the plan gate after both trade-offs were named.

Two supporting choices:

- **`lint:fix` is deliberately left unflagged.** It is the developer's autofix
  iterate loop, not the gate; making it exit non-zero on warnings that its own
  `--fix` pass could not resolve would just add noise to a command whose job is
  to mutate files, not to judge them. `.github/workflows/ci.yml` runs
  `npm run lint`, so the strict flag reaches CI with no workflow edit.
- **The cost is accepted, not hidden.** The consequence of option 1 - that a new
  inherited warn-level rule reddens the gate - is documented in AGENTS.md's
  Conventions section so the next person meets a stated policy ("satisfy it or
  disable it in `eslint.config.mjs`, never leave it to drift") rather than a
  mysterious CI failure.

## Consequence

`warn` is now effectively a synonym for `error` in this repo's lint runs. The
severities are kept as-is anyway, because they still carry the authoring
signal - a `warn` rule is one the config author considered advisory - and
because collapsing them into `error` would be a second mechanism expressing the
one bar (option 3), which was rejected as redundant.
