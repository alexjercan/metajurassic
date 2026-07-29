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

## Testing

- `test-must-cross-the-format-parse-seam-not-assert-each-side` (x1): unit tests
  that assert `parse` and `format` in isolation can encode the very bug they
  should catch. `parseGameStateKey` did not invert `gameStateKey` (an off-by-one
  from a +1 display offset), yet 114 tests stayed green because none round-tripped
  `parse(format(seed))`. When two functions are meant to be inverses, test the
  round-trip over a range (including the modulo edge), not each side alone; the
  bug lived at the seam the isolated tests never crossed. 20260729-101747.
- `mock-fixtures-hide-real-data-defects-test-the-real-payload` (x1): tests built
  on small hand-written mock datasets validated the loader's happy path while ALL
  150 real species `icon` fields were stringified Python lists
  (`['https://.../x.svg']`) straight from the markdown frontmatter, undetected.
  For content-integrity guarantees, run at least one test over the REAL served
  payload (`src/jurassic/index.json`) and, better, over the frontmatter source it
  is generated from, so defects are caught where they are authored - mock data
  proves the code shape, never the content. 20260729-092352.

## Pending promotions (3+ occurrences, user decides)

(none yet)
