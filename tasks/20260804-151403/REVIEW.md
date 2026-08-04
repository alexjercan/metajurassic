# Review: Publish a VitePress documentation site at /docs

- TASK: 20260804-151403
- BRANCH: feature/vitepress-docs

## Round 1

- REVIEWER: out-of-context
- VERDICT: APPROVE

- [ ] R1.1 (MINOR) AGENTS.md:124 - the `CI and deploy` table still records the
  Pages workflow as `Ubuntu, Node 18`, which this diff changed to `"22"`.
  Update the row to Node 22 and say the build ships the game plus `dist/docs/`.
  - Response:

- [ ] R1.2 (MINOR) AGENTS.md:44 - `npm run build  # dist/` and line 57
  (`separate production-bundle check`) now describe half of what `build` does.
  State that `build` runs webpack then VitePress, webpack first, and that the
  order is pinned by `test/docsGate.test.ts`. `README.md:14`
  (`# production bundle in dist/`) carries the same stale comment.
  - Response:

- [ ] R1.3 (MINOR) AGENTS.md:30 - the repository map gained no `docs/` row even
  though `docs/architecture.md` calls `AGENTS.md` "the authoritative repository
  map". Add a `docs/` row: VitePress site, prettier-formatted only and
  deliberately outside the ESLint and tsconfig globs (DECISION.md 2), so the
  `New source directory: update Prettier, ESLint, and TypeScript globs
  together` convention on line 196 is not silently contradicted.
  - Response:

- [ ] R1.4 (NIT) docs/how-to-play.md:47 - writes a constant's literal value
  (`` `MAX_HINTS` is `-1` ``) in prose. The Step's rule names counts (guess
  budget, hint cost) and `-1` is a sentinel, not a count, so this is at most a
  NIT; the prose already names the constant and cites its comment. Optional:
  replace with "`MAX_HINTS` records that hints are deliberately uncapped".
  - Response:

- [ ] R1.5 (NIT) tasks/20260804-151403/TASK.md:200 - the close-out says the
  `gh-pages.yaml` -> `release.yaml` rename "is uncommitted in the main
  checkout"; it is committed on master as `4ad9d79`, so the sentence is now
  false. Reword to "the rename landed on master after this sprout branched; the
  same two edits apply and merge cleanly onto `release.yaml`".
  - Response:

Re-derived in session, not taken from the reviewer:

- The sprout does not descend from master (`git merge-base --is-ancestor master
  HEAD` is false), so the workflow file really is `gh-pages.yaml` here.
  `git merge-tree --write-tree master HEAD` succeeds and the merged tree holds
  `.github/workflows/release.yaml` with `node-version: "22"` and the
  `Build the game and the docs site` step - rename detection carries both edits.
  The branch's choice of `gh-pages.yaml` is what the Step anticipated.
- `webpack.config.js:86` sets `clean: true`, which is the load-bearing reason
  `test/docsGate.test.ts` exists: webpack second would delete `dist/docs/` with
  every command still exiting 0.

Proofs run in session:

- `npx jest test/docsGate.test.ts` - 4 passed.
- `npm run docs:build` - exit 0.
- `npm run build && test -f dist/docs/index.html` - exit 0.
- `grep -q 'docs/' src/faq.html && grep -q 'docs' README.md` - exit 0.
- `E2E_PORT=8181 npm run ci` - exit 0, 185 Playwright specs, coverage held.

Pending user checks (open `manual:` proofs, non-blocking):

- `npm run docs:dev` serves the site locally. The reviewer reproduced dev-server
  serving of `/docs/` with an inner page and a local-search hit; the item stays
  the user's to confirm.
- The Pages workflow publishes both the game and the docs - user checks the
  deployed `/metajurassic/docs/` URL after the release tag.
