# Notes: Delete or wire up the dead markdownLoader

Goal in one line: delete `src/markdownLoader.ts` and the now-dead `.md` half of
the webpack asset rule, leaving `src/jsonLoader.ts` as the single content
loader, and correct the `src/frontMatter.ts` comment that points here.

## What changes

Nothing user-visible. No shipped code path imports `markdownLoader`, so the
bundle, the pages, and the content graph are byte-identical before and after.

What changes for a reader of `src/`:

| Before | After |
|--------|-------|
| Two modules export `loadGameData`; only one is reachable | One, `jsonLoader.ts` |
| `frontMatter.ts` reads as a shipped browser parser | Reads as what it is: a test-only mirror of the Python parser |
| Webpack emits `.md` through `asset/resource` for a caller that does not exist | Rule covers `.json` only |

The decision is already made in `TASK.md` Notes: markdown is the authoring
format, `scripts/markdown_to_json.py` is the one-way pipeline, `index.json` is
what the browser fetches. Delete.

## Surfaces

| File | Why |
|------|-----|
| `src/markdownLoader.ts` | Deleted. The whole module. |
| `webpack.config.js` (rule at :176) | `test: /\.(md|json)$/i` -> `/\.json$/i`; `markdownLoader`'s `require.context` was the only `.md` importer. |
| `src/frontMatter.ts` (header comment) | Holds `NOTE: 20260730-120401`. The marker is this task; it goes, and the comment restates that both exports are test-only. |

Untouched and checked: `src/jsonLoader.ts`, the four pages
(`game/index.ts`, `clades.ts`, `species.ts`, `profile/index.ts`),
`scripts/playtest/{difficulty,hint}.ts` (they import `buildGameData`, not the
fetch), `test/contentSource.test.ts`, `test/dataIntegrity.test.ts`,
`jest.config.js`, `tsconfig.json`, `index.d.ts`.

## Data and interfaces

Removed, nothing else references them:

```ts
// src/markdownLoader.ts - all deleted
type WebpackContext = { keys: () => string[]; (id: string): string };
type WebpackRequire = typeof require & { context: (...) => WebpackContext };
const loadMarkdown: <T>(ctx: WebpackContext, map: ...) => Promise<T[]>;
export async function loadGameData(): Promise<GameData>;
```

Unchanged signatures: `jsonLoader.loadGameData(): Promise<GameData>`,
`jsonLoader.buildGameData(raw: RawGameData): GameData`,
`frontMatter.parseFrontMatter(text: string): FrontMatter`,
`frontMatter.isSerializedCollection(value: string): boolean`.

Importer count after the change: `parseFrontMatter` 1 (`test/contentSource`),
`isSerializedCollection` 2 (`test/contentSource`, `test/dataIntegrity`), both
under `test/`.

## Sketches

Illustrative, not the patch.

```diff
- src/markdownLoader.ts   (86 lines, deleted whole)
```

```diff
  // webpack.config.js
- test: /\.(md|json)$/i,
+ test: /\.json$/i,
```

```diff
  // src/frontMatter.ts
- // NOTE: 20260730-120401 - `src/markdownLoader.ts` is the only other importer
- // and nothing imports IT, so no shipped browser path parses frontmatter. That
- // task decides whether the loader is deleted or wired up.
+ // No shipped browser path parses frontmatter: the browser fetches the
+ // generated `src/jurassic/index.json`. Both exports here are test-only,
+ // kept in `src/` because they are the TypeScript mirror of the Python
+ // parser the round-trip test compares against.
```

## Shape

```
authoring                pipeline                  runtime

src/jurassic/*.md  --markdown_to_json.py-->  src/jurassic/index.json
        |                                            |
        |                                     require + fetch
        |                                            v
        |                                    jsonLoader.loadGameData()
        |                                            |
        |                                       GameData
        |                                            |
        |                            game / clades / species / profile
        |
        +--parseFrontMatter (test only)--> contentSource.test.ts
                                           compares both sides

  DELETED:  markdownLoader.loadGameData()  -- require.context('*.md') -> fetch
            (no importer since 2026-03-12)
```

## Why both existed

`markdownLoader.ts` landed 2026-03-09 (`0f66e7a`) as the original loader.
`jsonLoader.ts` landed 2026-03-12 (`10d93f7`, "feat: use JSON to make it
faster") and the pages moved over. The markdown one was never removed; it has
been unreachable for about five months. `20260729-092352` rewired it onto the
shared `src/frontMatter.ts` rather than deleting it, because deleting a module
was outside that task's scope - which is why it still parses cleanly and looks
maintained.

## The coverage blind spot

Task step 4 asked why `markdownLoader.ts` never appears in the coverage report.
Answer, verified empirically:

- `jest.config.js` sets `roots: ["<rootDir>/test"]`. Jest's untested-file pass
  matches `collectCoverageFrom` globs against the haste file system, which only
  contains files under `roots`. No `src/` file is in it, so the globs match
  nothing.
- Result: only files a test actually imports are reported. Nothing about
  `markdownLoader` is special; `require.context` does not break instrumentation.
- Proof: `npx jest --coverage --roots test --roots src -t 'zzz'` reports
  `markdownLoader.ts` at 0% with lines 2-86 uncovered, alongside `clades.ts`,
  `faq.ts`, `practice.ts`, `species.ts`, all of `src/game/` and all of
  `src/profile/` - every one of them absent from the normal run.
- Consequence beyond this task: with the extra root, global statements fall
  from 95.39% to 16.22%. The committed thresholds (94/78/98/97) are measured
  over imported files only, so `collectCoverageFrom`'s exclusions
  (`!src/ui/**`, `!src/index.ts`) are inert, and adding an untested `src/` file
  can never move the gate.

Deleting `markdownLoader.ts` therefore moves no coverage number.

## Consequences and open questions

- Cost: the markdown-at-runtime option goes away. Recovering it means writing
  the loader again, but it is 86 lines and recoverable from git.
- Forecloses: nothing shipped. The authoring markdown stays canonical; only the
  browser-side path to it is removed.
- `src/frontMatter.ts` becomes test-only code living in `src/`. Assumption
  taken: leave it there. It is the deliberate TypeScript mirror of
  `scripts/markdown_to_json.py`, and moving it to `test/` or `scripts/` would
  churn three files' comments for no behavioural gain. Flagging it because the
  alternative is defensible; the comment fix must at least stop calling it
  shipped.
- Open, and deliberately not this task: the coverage-roots finding above is a
  real gate weakness. It wants its own task (add `src` to `roots`, or point
  `collectCoverageFrom` at a discovered file list, then re-floor the thresholds
  honestly). Doing it here would swamp a deletion in a threshold renegotiation.
- Risk check on the webpack rule: if any `.md` import were left, the build would
  fail loudly with "no loader configured", not degrade silently. `grep` finds
  none outside `markdownLoader.ts`. `npm run build` is the proof.

## Done criteria this supports

- `grep -rn "loadGameData" src/ --include=*.ts` shows one definition
  (`jsonLoader.ts`) plus its four page importers.
- `npm run ci` passes; `npm run build` passes (the webpack rule edit is not
  covered by `ci`, so the build check is not optional here).
