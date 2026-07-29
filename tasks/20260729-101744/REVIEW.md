# Review - Write AGENTS.md

## Round 1 (out-of-context reviewer) - 2026-07-29

Scope: factual accuracy of the new root `AGENTS.md` against the worktree.
The reviewer read package.json, the three `scripts/*.py`, `.gitignore`,
`flake.nix`, both `.github/workflows/*`, `webpack.config.js`, and the `src/`
layout, and cross-checked every concrete claim.

Findings: none (no BLOCKER / MAJOR / MINOR). One NIT noted and dismissed: the
doc says CI runs "npm ci then npm run ci" while the workflow runs the three
sub-steps (format:check, lint, test:coverage) individually rather than the `ci`
script literally - identical in effect, not misleading, left as-is.

All claims verified:
- npm scripts (serve/build/test/test:coverage/lint/format/format:check/ci) match.
- Pipeline direction and stdlib-only nature of the three Python scripts match.
- File/path and gitignore claims (index.json tracked; csv + commontree ignored) match.
- Nix devShell provides nodejs/uv/python venv; CI uses no nix, Node matrix 20/22.
- gh-pages deploy: PUBLIC_PATH=/metajurassic/, Node 18, dist -> Pages on master.
- Dev server port 8080.

Also independently dogfooded during /work: `nix develop -c npm run ci` passed
(122 tests, format clean, 1 pre-existing lint warning, exit 0), confirming the
documented commands run as written.

VERDICT: APPROVE
