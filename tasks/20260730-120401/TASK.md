# Delete or wire up the dead markdownLoader

- STATUS: OPEN
- PRIORITY: 40
- TAGS: chore,cleanup
- KIND: TASK
- FLOW STEP: BACKLOG
- PLAN STATUS: DRAFT


## Story

As someone reading `src/`, I want no module that looks load-bearing but is never
imported, so that nobody maintains or copies code the app does not run.

## Context

Found while doing `20260729-092352`. `src/markdownLoader.ts` exports a
`loadGameData` that fetches the markdown through `require.context` and builds a
`GameData`, but every page (`game.ts`, `clades.ts`, `species.ts`, `profile.ts`)
imports `loadGameData` from `src/jsonLoader.ts` instead. Nothing imports
`markdownLoader` at all.

It is not dead weight in the coverage report - it does not appear there, which
is itself worth understanding before deleting (an unparsed file is a coverage
blind spot, not an absence of code). `20260729-092352` left it in place and
rewired it to the new shared `src/frontMatter.ts` rather than deleting it,
because deleting a module was not that task's scope.

The real question is which loader the project wants: the JSON payload (one
request, generated file checked in) or the markdown source (no generated file to
keep in sync). Answer that, then either delete `markdownLoader.ts` or make it
the one the pages use.

## Steps

- [ ] Confirm nothing imports it (including webpack config and the playtest
      scripts), and check git history for why both loaders exist.
- [ ] Decide: delete, or adopt it and retire `jsonLoader`.
- [ ] If deleting, check whether `src/frontMatter.ts` still has a runtime
      consumer or becomes test-only, and say so in the module comment.
- [ ] Work out why it is absent from the coverage report and note the finding.

## Definition of Done

- `src/` has exactly one content loader. (cmd: `grep -rn "loadGameData" src/ --include=*.ts`)
- `npm run ci` passes. (cmd: `npm run ci`)
