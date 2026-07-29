# Lessons

The compressed memory of mistakes this repo has already paid for. One or two
lines per lesson; `/compound` appends here after a task's retro. Grep this for
your area before starting work. At 3+ occurrences a lesson moves to the
Pending promotions section at the bottom; the user decides whether it gets
promoted into AGENTS.md, a skill, or the tooling itself.

Metajurassic is a TypeScript/Vite daily dinosaur-guessing game (a Metazooa
clone). Source lives in `src/`, tests are Jest under `test/`, the check gate is
`npm run ci`, and the Jurassic content graph is generated from markdown
frontmatter in `src/jurassic/` into `src/jurassic/index.json`.

## Process / flow

- `close-a-task-with-its-review-and-retro-not-just-the-status` (x1): the first
  tracked task here (`20260331-154614`, graph scaling) was set CLOSED with no
  `REVIEW.md` and no `RETRO.md`, so `tatr check` went red and the reasoning
  behind the fix survived only in the commit diff. A task is not done when its
  STATUS flips to CLOSED; it is done when the verdict and the retro are on disk
  next to it. Run the work -> review -> compound sequence and let the squash-land
  fold all three records into the one commit. 20260729-092239.
- `backfilled-records-must-say-so` (x1): when reconstructing a REVIEW/RETRO for a
  task that was closed without one, label it a BACKFILL and date it to now, and
  do not invent a `PLAN STATUS: APPROVED` marker or an out-of-context round that
  never happened. The trail is append-only history: record honestly what can be
  verified from the diff today and what was missing at the original closeout,
  rather than pretending the flow gate occurred. 20260729-092239.
- `sprout-worktrees-have-no-node_modules-dont-git-add-all` (x1): a fresh sprout
  worktree has no `node_modules`, so the convenient fix is to symlink the main
  checkout's. But `git add -A` then STAGES that symlink: `.gitignore` lists
  `node_modules/` with a trailing slash, which matches a directory, not a symlink
  named `node_modules`. It rode into the first branch commit and had to be
  `git rm --cached`ed. In a worktree with a symlinked `node_modules`, stage
  explicit paths (never `git add -A`) and eyeball the commit stat for a stray
  `node_modules` before moving on. 20260729-101740.
- `document-env-facts-by-dogfooding-not-paraphrase` (x1): writing AGENTS.md, the
  risk in a docs task is a plausible-but-wrong claim. Each pipeline/command claim
  was verified by reading the actual `scripts/*.py` `__main__` blocks (conversion
  direction), `.gitignore` (which of data.csv/index.json/commontree is tracked),
  and both workflows - then the "cold session can run tests" DoD was proven by
  actually running `nix develop -c npm run ci` (122 pass, exit 0), not by trusting
  package.json. Pin a doc's runnable claims to an executed command, not a read
  one. 20260729-101744.
- `metajurassic-js-toolchain-lives-in-the-nix-devshell` (x1): `node`/`npm` are
  not on PATH in this environment; the JS toolchain comes from the `flake.nix`
  devShell (`pkgs.nodejs`). To run `npm run ci` without building the Python venv,
  use a nix-store `nodejs` bin directly (e.g. `/nix/store/*-nodejs-*/bin`) plus a
  `node_modules` symlink into the worktree, or `nix develop -c <cmd>`. Establish
  this up front instead of re-deriving it each session. 20260729-101740.

## Testing

- `test-must-cross-the-format-parse-seam-not-assert-each-side` (x1): unit tests
  that assert `parse` and `format` in isolation can encode the very bug they
  should catch. `parseGameStateKey` did not invert `gameStateKey` (an off-by-one
  from a +1 display offset), yet 114 tests stayed green because none round-tripped
  `parse(format(seed))`. When two functions are meant to be inverses, test the
  round-trip over a range (including the modulo edge), not each side alone; the
  bug lived at the seam the isolated tests never crossed. 20260729-101747.
- `mock-fixtures-hide-real-data-defects-test-the-real-payload` (x2): tests built
  on small hand-written mock datasets validated the loader's happy path while ALL
  150 real species `icon` fields were stringified Python lists
  (`['https://.../x.svg']`) straight from the markdown frontmatter, undetected.
  For content-integrity guarantees, run at least one test over the REAL served
  payload (`src/jurassic/index.json`) and, better, over the frontmatter source it
  is generated from, so defects are caught where they are authored - mock data
  proves the code shape, never the content. 20260729-092352. Second hit
  (20260729-101740): the daily-shuffle salt's zero-adjacency/full-coverage
  guarantee was proven only on a same-sized dummy list. The property is
  positional (species count + salt), so the dummy proved the algorithm, but the
  PRODUCTION invariant (it holds for the real count) stayed unpinned until a test
  built `GameData` from the real `index.json` and asserted `length === 150` plus
  adjacency/coverage. When a claim is "holds for the shipped data", pin it
  against the real payload so a data resize fails CI, not just a fixture.

## Pending promotions (3+ occurrences, user decides)

(none yet)
