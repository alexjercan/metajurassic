# Delete the dead markdownLoader

- PRIORITY: 40
- TAGS: chore, cleanup
- KIND: TASK
- ACTIVITY: WORKING
- GATES: PLAN
- RESOLUTION: -

## Story

As someone reading `src/`, I want no module that looks load-bearing but is never
imported, so that nobody maintains or copies code the app does not run.

## Context

Found while doing `20260729-092352`. `src/markdownLoader.ts` exports a
`loadGameData` that fetches the markdown through `require.context` and builds a
`GameData`, but every page imports `loadGameData` from `src/jsonLoader.ts`
instead: `src/clades.ts:2`, `src/species.ts:2`, `src/game/index.ts:9`,
`src/profile/index.ts:4`. Nothing imports `markdownLoader` - confirmed by
`grep -rn markdownLoader src/ test/ scripts/ e2e/`, whose only two hits are the
prose comments at `src/frontMatter.ts:10` and `test/contentSource.test.ts:9`,
and by the absence of any hit in `webpack.config.js` / `webpack-partials.js`.

Git history explains the pair: `0f66e7a` shipped the markdown loader,
`10d93f7` ("feat: use JSON to make it faster") added `jsonLoader.ts` and moved
the pages onto it without deleting the old one. `20260729-092352` then rewired
`markdownLoader` onto the new shared `src/frontMatter.ts` rather than deleting
it, because deleting a module was not that task's scope.

The which-loader question is settled by the pipeline that already exists:
`scripts/markdown_to_json.py` generates `src/jurassic/index.json`, the
generated payload is committed, and `test/contentSource.test.ts` fails if it
drifts from the markdown. So the "generated file to keep in sync" cost the
markdown loader would avoid is already paid and already gated. Delete it - see
DECISION.md.

The coverage-report absence is answered and is NOT a property of this file.
`jest.config.js` sets `roots: ["<rootDir>/test"]`, and jest only discovers
files to instrument inside `roots`, so `collectCoverageFrom: ["src/**/*.ts"]`
never matches a `src/` module no test imports. Re-running with `src` added as
a root grows `coverage/lcov.info` from 19 files to 34, `markdownLoader.ts`
among them. That is a gate-wide blind spot covering `src/clades.ts`,
`src/species.ts`, `src/faq.ts`, `src/practice.ts` and all of `src/game/` and
`src/profile/`; fixing it means re-baselining `coverageThreshold`, so it is
its own task, `20260804-140413`. Here we only record the finding where the
next reader of `jest.config.js` will hit it.

## Steps

- [ ] Delete `src/markdownLoader.ts`. `DECISION.md` is already written and
      binds this: delete rather than adopt it and retire `jsonLoader.ts`, and
      keep `src/frontMatter.ts` under `src/` despite having only test
      consumers.
- [ ] Rewrite the `NOTE:` block at `src/frontMatter.ts:10-12`: no shipped
      browser path parses frontmatter, the module's only consumers are
      `test/contentSource.test.ts` and `test/dataIntegrity.test.ts`, and it
      stays under `src/` as the TypeScript mirror of
      `scripts/markdown_to_json.py` that the round-trip test compares against.
- [ ] Drop the "the same one `markdownLoader` uses" clause at
      `test/contentSource.test.ts:8-9`, keeping the rest of that header intact.
- [ ] Add a comment beside `roots` in `jest.config.js` recording that it scopes
      coverage discovery too, so untested `src/` files are absent rather than
      0%, and citing `20260804-140413`.
- [ ] Run `npm run ci` and confirm `coverage/lcov.info` still lists the same 19
      `src/` files as before (deleting an uninstrumented file must not move any
      threshold).

## Definition of Done

- `src/` declares `loadGameData` in exactly one module. (cmd: `[ "$(grep -rl 'export async function loadGameData' src --include=*.ts)" = "src/jsonLoader.ts" ]`)
- No code or comment still refers to the deleted module. (cmd: `! grep -rn --exclude-dir=tasks --exclude-dir=.git 'markdownLoader' src test scripts e2e webpack.config.js webpack-partials.js jest.config.js`)
- The coverage blind spot is recorded where the config is read. (cmd: `grep -n '20260804-140413' jest.config.js`)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- User decision, recorded verbatim: "I would personally remove this as no
  longer needed we just load json, the markdown is for making it easy to edit
  the file and then using markdown to json script; So decision is: delete it".
- All three greppable DoD proofs were run on the base branch and are red:
  proof 1 exits 1 because `grep -rl` returns two files, proof 2 exits 1 on the
  two prose hits above, proof 3 exits 1 because `jest.config.js` cites only
  `20260729-092352`.
- Deleting the file cannot move coverage numbers, because it was never
  instrumented in the first place - that is the point of the finding above.
- `src/frontMatter.ts` keeps both exports: `parseFrontMatter` used by
  `test/contentSource.test.ts:22`, `isSerializedCollection` by that file and
  `test/dataIntegrity.test.ts:15`. Nothing in it becomes dead with the loader.
- `scripts/markdown_to_json.py:21` and `scripts/test_content_pipeline.py:68`
  point at `src/frontMatter.ts` by path; that stays valid and is a reason not
  to move the module into `test/`.
