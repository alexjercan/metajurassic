# Retro - Write AGENTS.md (2026-07-29)

## What shipped

A root `AGENTS.md` orienting a cold session: project summary, nix devShell as
the only source of the JS toolchain, the npm build/test/ci commands, the
markdown -> index.json content pipeline, the CI-vs-nix drift, the gh-pages
deploy, conventions, and where flow records live. Modeled on the scufris
AGENTS.md.

## What went well

- The problem was already understood: the task's Review Findings and `LESSONS.md`
  had done the discovery. The two most load-bearing facts (JS toolchain lives in
  the nix devShell; sprout worktrees need explicit staging) came straight from
  the ledger, so the doc records them with lesson slugs rather than re-deriving.
- Dogfooding the doc: ran `nix develop -c npm run ci` following the documented
  path (with a node_modules symlink per the ledger). 122 tests passed, format
  clean, exit 0 - proving the DoD "a cold session can run the suite following
  only AGENTS.md" rather than asserting it.
- The out-of-context reviewer verified every concrete claim against the actual
  files and found nothing wrong - the payoff of reading `package.json`, the
  scripts, `.gitignore`, `flake.nix`, and both workflows before writing, instead
  of paraphrasing from memory.

## What was hard / notable

- For a docs task the real risk is a plausible-but-wrong claim. Mitigation was
  to read each script's `__main__` block to pin the conversion DIRECTION
  (`markdown_to_json` writes index.json; `json_to_markdown` is the reverse) and
  to confirm via `.gitignore` which of data.csv / index.json / commontree is
  actually tracked. The reviewer's clean pass confirms this was the right spend.
- One NIT surfaced and was consciously left: the doc says CI runs "npm ci then
  npm run ci" while the workflow runs the three sub-steps individually. Identical
  in effect; not worth a less-accurate-but-more-literal rewrite.

## What to do differently

- Nothing structural. For future doc tasks in this repo, the pattern held:
  mine `LESSONS.md` for the load-bearing environment facts first, read the
  actual config/scripts for every claim, then dogfood at least one documented
  command end to end before review.

## Lesson candidate

- `document-env-facts-by-dogfooding-not-paraphrase` - a doc that claims "you can
  run X" is only proven when you actually run X the documented way. Here that
  meant `nix develop -c npm run ci` with the node_modules symlink, not just
  trusting package.json. Pin doc DoDs to an executed command, not a read one.
