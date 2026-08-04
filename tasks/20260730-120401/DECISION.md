# Decision: Delete the dead markdownLoader

- DATE: 20260804-140455
- STATUS: ACCEPTED
- TASK: 20260730-120401
- TAGS: content, loader, cleanup

## Context

`src/` has carried two content loaders since `10d93f7` ("feat: use JSON to
make it faster") added `src/jsonLoader.ts` beside the original
`src/markdownLoader.ts` and moved every page onto the new one without deleting
the old. Both export `loadGameData(): Promise<GameData>`; only `jsonLoader` is
imported anywhere. The markdown loader's one genuine advantage is that it
reads `src/jurassic/*.md` directly, so there is no generated `index.json` to
keep in sync. Against that: it issues one `fetch` per content file through
`require.context` (about 200 requests) where the JSON loader issues one, and
the sync cost it would avoid is already paid - `scripts/markdown_to_json.py`
generates the payload and `test/contentSource.test.ts` reddens if the
committed JSON drifts from the markdown. The user settled the direction
explicitly: markdown is the authoring format, JSON is the runtime format,
delete the loader.

## Decision

Delete `src/markdownLoader.ts`. Knowing what exists now - a generator, a
committed payload, and a round-trip test that gates drift - a fresh build
would fetch one JSON file at runtime and keep markdown as the editing surface.
That is exactly `jsonLoader.ts`, so it is the survivor.

Keep `src/frontMatter.ts` where it is, under `src/`, even though the deletion
leaves it with only test consumers (`test/contentSource.test.ts`,
`test/dataIntegrity.test.ts`). It is the TypeScript re-expression of
`scripts/markdown_to_json.py`'s parser; the round-trip test's whole argument
is that an independently maintained parser agrees with the Python one, and
`scripts/markdown_to_json.py:21` and `scripts/test_content_pipeline.py:68`
both cite it by path. Moving it into `test/` would rewrite those cross
references and reframe it as test scaffolding rather than a mirrored
implementation.

## Alternatives considered

- Adopt `markdownLoader` and retire `jsonLoader`. It works here - the markdown
  ships in the bundle either way - but it trades one request for ~200, deletes
  the payload that `contentSource.test.ts` compares against, and so removes
  the drift gate rather than the duplication. Rejected on runtime cost and
  lost coverage.
- Do nothing, leave both. Costs a permanent trap: a module that reads as the
  content loader, is wired into `frontMatter.ts`, is invisible to the coverage
  gate, and runs in no code path. `20260729-092352` already paid maintenance
  on it once by rewiring it during an unrelated change. Rejected.
- Move `src/frontMatter.ts` into `test/` alongside its remaining consumers.
  Honest about who calls it, but it breaks the two `scripts/*.py` pointers and
  weakens the mirror argument. Rejected; the module comment carries the
  explanation instead.

## Consequences

Easier: `src/` has one content loader, so "how does the app get its data" has
one answer, and `require.context` leaves the codebase entirely.

Harder: the markdown is now reachable at runtime only through the generated
`src/jurassic/index.json`, so anyone editing content must run the generator -
`test/contentSource.test.ts` is the only thing that catches a forgotten run,
and it is now the sole consumer path for `parseFrontMatter`. A module under
`src/` with no shipped caller is itself mildly surprising; the rewritten
header comment on `frontMatter.ts` is what stops the next reader repeating
this task against it.
