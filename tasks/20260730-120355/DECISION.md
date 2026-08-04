# Decision: Enforce sorted graph output with a pipeline test, land the reorder alone

- DATE: 20260804-121609
- STATUS: ACCEPTED
- TASK: 20260730-120355
- TAGS: content, tooling, testing

## Context

NOTES.md left one question open for planning: once `load_directory` sorts,
nothing fails if a future edit reintroduces unordered output. Sortedness would
be enforced only by convention. The obvious guard - regenerate, then
`git diff --exit-code src/jurassic/index.json` - is not part of `npm run ci`.

Two other choices are load-bearing enough to record: the one-time daily-answer
shift the reorder causes, and the commit shape.

## Decision

Guard the invariant with one test in the existing
`scripts/test_content_pipeline.py` (`MarkdownToJsonTest`), which `npm run ci`
already runs via `npm run test:pipeline`. It generates into a tmpdir from files
created in non-alphabetical order and asserts sorted output keys.

Accept the daily-answer shift rather than working around it. Land in two
commits: code, test and comment first; `src/jurassic/index.json` alone second.

## Alternatives considered

Adding regenerate-then-`git diff --exit-code` to `npm run ci`. Rejected: it
mutates the working tree during a check, depends on git state, and fails for
any legitimately uncommitted content edit. It also tests staleness of the
committed payload, which `test/contentSource.test.ts` already covers
structurally - the invariant actually at risk here is ordering, and the unit
test guards it at the source.

Pinning runtime order independently by sorting ids in `buildGameData` instead
of in the generator. Rejected: it shifts every answer once anyway, so it buys
nothing, and it leaves the generated file non-deterministic.

One combined commit. Rejected: a ~1900-line reorder with anything riding along
is unreviewable, which is why the attempt in `20260729-092352` was reverted.

## Consequences

The daily target is `species[permutation[seed mod n]]` over `Object.entries` of
index.json key order (`src/jsonLoader.ts:42` -> `src/gameData.ts:139-160`), so
reordering re-points every past and future puzzle number once. This is not a
property the project holds today: adding or removing a species changes `n` and
re-points everything the same way. A player mid-round on deploy day gets a
target swap; their saved guesses persist.

No test asserts a seed-to-species mapping - `test/seedMode.test.ts:94,125`
derive the target through `speciesIndexForDate` - so the shift breaks no test.

The regeneration commit is a pure movement diff of ~1900 lines. Verification is
by parsed content equality plus key-order inequality against master, never by
eye; `git diff --stat` proves nothing here.
