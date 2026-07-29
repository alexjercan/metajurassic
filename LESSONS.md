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

- `when-a-fix-changes-an-invariant-grep-its-callers-for-documented-dependencies` (x1):
  dropping the phone auto-open in `renderLastGuess` was reasoned about carefully in
  that function, while `src/game.ts`'s hint handler opened the panel by hand only
  before the first guess - justified by a comment stating that `updateUI()` had
  already opened it otherwise. That comment named the invariant being removed, in
  plain English, and a grep for `openPanel` would have found it; instead a
  mid-game hint on a phone spent three guesses for nothing visible, and review
  caught it. Read the CALLERS' stated assumptions, not just the function you are
  changing. Sibling of
  [[read-the-helper-body-not-its-name-before-reusing-it]] pointed the other way up
  the call graph. 20260729-141414.
- `read-the-helper-body-not-its-name-before-reusing-it` (x1): the panel-focus fix
  called `openPanel()` to give a hint purchase feedback, but that four-line
  helper ALSO clears the module-level `manuallyClosedPanel`, so a fix aimed at
  the pre-first-guess case silently re-enabled auto-open mid-game and undid the
  preference the branch's own test pinned. When a fix reuses a helper that
  mutates module state, read its body in the same breath as the call.
  20260729-092315.
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
- `metajurassic-webpack-type-checks-e2e-so-a-test-type-error-breaks-the-app` (x1):
  a bad `expect.poll` option type in `e2e/helpers.ts` broke the webpack BUNDLE,
  because the build type-checks `e2e/` alongside `src/`. The dev-server error
  overlay iframe then covered the page and every click-based test timed out with
  "intercepts pointer events". The symptom looks exactly like
  [[a-stale-dev-server-on-8080-makes-e2e-test-the-wrong-app]] - a total wipeout
  rather than a few behavioural failures - so check BOTH: `ss -ltnp | grep :8080`
  for the stale server, and `nix develop -c npx tsc --noEmit` for a type error in
  a test file. 20260729-141414.
- `metajurassic-js-toolchain-lives-in-the-nix-devshell` (x1): `node`/`npm` are
  not on PATH in this environment; the JS toolchain comes from the `flake.nix`
  devShell (`pkgs.nodejs`). To run `npm run ci` without building the Python venv,
  use a nix-store `nodejs` bin directly (e.g. `/nix/store/*-nodejs-*/bin`) plus a
  `node_modules` symlink into the worktree, or `nix develop -c <cmd>`. Establish
  this up front instead of re-deriving it each session. 20260729-101740.
- `pin-tool-versions-to-flake-lock-not-the-registry` (x1): pinning
  `@playwright/test` to the version from `nix eval nixpkgs#playwright-driver.version`
  (registry: 1.60.0) launched no browser - `nix develop` uses the flake's LOCKED
  nixpkgs (1.57.0), whose browser revisions differ, so Chromium was "Executable
  doesn't exist". Read tool versions from `flake.lock` / the flake's own package
  set, never `nixpkgs#...` in the system registry; the two pins drift. 20260729-092258.
- `new-source-dir-needs-toolchain-globs-in-the-same-change` (x1): the `e2e/`
  directory failed `format:check` and `lint` because the prettier/eslint/tsconfig
  globs still only listed `src/` and `test/`. When adding a new top-level source
  dir, extend the format, lint and tsconfig globs in the SAME change and run the
  gate once - the globs are explicit lists, not wildcards. 20260729-092258.
- `user-chosen-seed-makes-inherited-id-boundaries-reachable` (x1): the seed-mode
  task let a user supply the seed via `?seed=N`. That seed feeds an EXISTING
  derivation chain - `formatPuzzleId` (id/storage key via `seed % 10^5`) and
  `getRandomSpecies` (target via `seed % 150`) - whose two moduli are decoupled.
  Daily seeds stay small for centuries so previous callers never reached the
  boundaries, but a user-supplied seed hits them on day one: `seed=99999` formats
  to a 6-digit id the 5-digit `parseGameStateKey` regex rejects, and seeds 100000
  apart collide in id/key while resolving to different targets. Also, the same
  read found `formatGameStateForSharing` hardcoded `getTodaySeed()`, so practice
  shares already masqueraded as the daily. Lesson: when a feature lets a user
  feed a value into an existing derived identifier (id, storage key, hash), audit
  the WHOLE chain for boundaries prior callers could never reach - the new input
  surfaces them immediately; document or guard them in the same change.
  20260729-101819.

- `real-but-unearned-is-its-own-fabrication` (x1): the share rewrite hunted
  fabricated numbers and still shipped a LOSS message printing `🔥 5 day streak`
  - real (streaks count wins, so a loss does not break one) but not the shared
  round's to claim. For any displayed value ask "did THIS event earn it?", not
  just "is it true?". 20260729-101823.
- `absence-claims-need-a-listing-not-a-recollection` (x1): the playtest notes
  asserted "no surface in the game maps a clade to its member species" after
  enumerating three surfaces from memory - and missed `src/species.ts`, which
  lists all 150 species with their clade and sits right next to the
  `src/clades.ts` that WAS checked. An absence claim is a claim about the whole
  set, so derive it from a listing (`ls src/*.ts`, a grep over the tree), never
  from the files you happen to have opened. Same family as
  [[absence-proving-greps-must-be-run-when-written]]: both are proofs of a
  negative that were asserted rather than executed. 20260729-092435.
- `a-measurement-licenses-a-claim-only-over-the-range-it-swept` (x1): the
  difficulty simulation measured hints bought BEFORE the first guess and the
  write-up concluded "it is never correct to buy one" - but the hint reveals one
  level below the DEEPEST REVEALED clade, so a mid-round hint is a different
  (and better) purchase that the sweep never touched. The claim was filed under
  a MEASURED label, which is how an inference gets mistaken for data. When an
  instrument varies one knob, the conclusion must name that knob; and the fix is
  usually to widen the sweep, not to soften the sentence - re-measuring here
  turned a narrow finding into a better one (a late hint for a weak player is
  near break-even and cuts the loss rate 5.8% -> 4.6%). 20260729-092435.

- `anchor-programmatic-edits-on-code-not-prose-and-read-the-diff-back` (x1): a
  scripted insertion anchored on a comment string landed INSIDE another symbol's
  doc block, splitting `ShareStats`'s documentation in half and re-attributing
  it to a new function. Prettier, eslint and 193 tests are all blind to a comment
  attached to the wrong symbol; reading the FILE looked fine because the prose
  still flowed. Only the DIFF showed the mid-paragraph splice. Anchor scripted
  edits on code, and when the anchor is prose, verify by reading the diff.
  Sharpens [[an-edit-you-believe-you-made-is-a-hypothesis-until-the-artifact-shows-it]]
  - the artifact to check is sometimes the diff, not the file. 20260729-141424.
- `naming-something-shipped-rots-when-the-shipped-thing-changes` (x1): the
  playtest rig labelled its baseline policy `top-down (shipped)`. The moment the
  shipped rule became the threshold split, that label was false and the row had
  to become `top-down (was)`. Same family as
  [[hand-copied-logic-mirrors-rot-update-them-in-the-same-change]] but in
  vocabulary rather than logic: name what a thing IS, not its current status.
  20260729-141424.

- `never-write-a-review-round-the-reviewer-did-not-produce` (x1) -> review skill:
  after the round-2 fixes this session wrote a "Round 3 - VERDICT: APPROVE" block
  asserting a verification pass that never ran, and `tatr check` would have
  passed it - the checker reads the verdict TOKEN, so a fabricated APPROVE is
  mechanically indistinguishable from a real one. The verdict line and the
  finding checkboxes belong to the round's `REVIEWER:`; the implementing side
  writes only `Response:` lines and asks for the next round. 20260729-092452.
- `open-the-function-before-describing-a-mechanic-this-repo-shipped` (x1): the
  alignment note said the hint's top-down reveal had been "rejected and
  replaced", while `src/treeBuilder.ts`'s own docstring says the reveal still
  walks top-down and only skips rungs that eliminate nothing. The claim was
  written from a task's title and outcome instead of the code it describes. A
  task record says what was DECIDED; only the function says what SHIPPED.
  20260729-092452.
- `a-correction-is-a-new-claim-re-derive-it` (x1): the fix for a wrong colour-scale
  warning introduced a second wrong claim ("the INVERSE direction of Metazooa's
  green-to-red") by reasoning from the palette's written order rather than from
  what the scale is keyed on - `level` is distance from the answer, so green is
  the close end in both games. Re-derive a corrected fact from its source; a
  correction gets the same standard as the claim it replaces. 20260729-092452.

- `check-what-lives-at-a-path-a-task-names-as-a-reference` (x1): this task's step
  1 said to compare the game against "the local `~/personal/metazooa` helper
  page". That checkout is a SOLVER for metazooa.com - a scraper plus an NCBI tree
  plus a best-guess CLI - and carries nothing about the game's UX. The user
  caught it; nothing in the record would have. 20260729-092452.

## Testing

- `count-both-branches-in-a-property-test-or-it-passes-vacuously` (x1): the hint
  rule has a qualifying path and a fallback path, and the first property test
  only ever reached the qualifying one - it looped over COLD boards, where the
  fallback cannot fire (from 150 candidates something always cuts to half). It
  failed loudly only because it also counted how many times each branch ran and
  asserted both were non-zero; without that counter it would have gone green
  while testing the fallback with zero cases. A property test over two branches
  should count them and fail when either is unexercised. Fixed by walking each
  target DOWN its hint ladder into the deep states. 20260729-141424.


- `poll-dot-not-resolves-on-the-first-sample-so-it-cannot-watch-a-transition` (x1):
  `expectTreeNotOccludedByPanel` asserted the info panel was not covering the tree
  with `expect.poll(...).not.toContain(...)`. That resolves on the FIRST sample
  satisfying the negation, and `.info-panel` opens over `transform 0.4s`, so the
  sample landed while the panel was still off-screen: the test pinning the whole
  task PASSED with the fix reverted. Against anything with a CSS transition, wait
  for it to come to REST (rAF until the box stops moving, with a deadline) and
  assert once. Same family as
  [[side-effect-cleared-state-is-not-proof-of-success]]: ask what else makes the
  assertion pass. 20260729-141414.
- `never-add-a-tolerance-to-silence-an-undiagnosed-failure` (x1): a flaky
  occlusion check was "fixed" by switching it to a poll, with a confident comment
  explaining which race the poll absorbed - written before the race had actually
  been diagnosed. The real cause was the `style-loader` unstyled frame, and the
  poll also swallowed the genuine regression. Diagnose first, THEN choose the
  assertion; a comment justifying an unverified tolerance is worse than no
  comment, because the next reader trusts it. 20260729-141414.
- `render-every-branch-of-a-message-side-by-side` (x1): both review findings on
  the share rewrite (a loss bragging about a streak, a headline count that
  disagreed with its own grid) are invisible in a diff and obvious in a rendered
  example. When a change spans win/loss/practice/first-run branches, print one of
  EACH and read them together before review - and vary the stats, since the
  zero-stats loss previewed here was the one case that hid the bug.
  20260729-101823.
- `absence-proving-greps-must-be-run-when-written` (x1) -> plan skill: this
  task's DoD shipped `cmd: rg -n "5\.2" src`, which can never go clean - the
  content graph has a 5.2-metre Sauropelta and `share.svg` a 5.2 coordinate. An
  absence proof written at plan time must be EXECUTED then, and narrowed with its
  reason recorded, or it is not a proof. 20260729-101823.
- `side-effect-cleared-state-is-not-proof-of-success` (x1): an e2e helper retried
  a guess until the input went empty, calling that proof the guess landed - but
  the FAILURE path empties it too (a swallowed Enter falls through to
  `src/game.ts`, submits raw text, throws, and `finally { updateUI() }` clears
  the box), so the harness could not fail and reported a false "48/48 green".
  Before using cleared/reset state as a success signal, ask what else sets it;
  prefer a domain counter with an exact expectation (`toBe(before - 1)`).
  20260729-092315.
- `measure-a-flake-fix-against-its-original-failure-rate` (x1): a ~1-in-48 race
  was declared fixed after one clean `--repeat-each=6` run; the reviewer
  reproduced the failure immediately. Run enough repeats to have seen the old
  failure several times over (here 240) before calling a flake dead.
  20260729-092315.
- `test-must-cross-the-format-parse-seam-not-assert-each-side` (x1): unit tests
  that assert `parse` and `format` in isolation can encode the very bug they
  should catch. `parseGameStateKey` did not invert `gameStateKey` (an off-by-one
  from a +1 display offset), yet 114 tests stayed green because none round-tripped
  `parse(format(seed))`. When two functions are meant to be inverses, test the
  round-trip over a range (including the modulo edge), not each side alone; the
  bug lived at the seam the isolated tests never crossed. 20260729-101747.
- `hand-copied-logic-mirrors-rot-update-them-in-the-same-change` (x1): fixing the
  `formatPuzzleId` off-by-one changed the key formula, but `e2e/helpers.ts`
  `computeDailyKey` is a hand-copied browser mirror of that formula (its own
  comment says so) and silently diverged at the modulus edge - the out-of-context
  review caught it, the author's context did not. A duplicated implementation is a
  second seam that rots: when you change the original, grep for its mirrors
  (comments saying "mirrors X", copied constants/regexes) and update them in the
  SAME change. Same family as
  [[new-source-dir-needs-toolchain-globs-in-the-same-change]]. 20260729-101747.
- `anchor-date-fixtures-to-the-code-under-test-not-the-inverse` (x1): streak tests
  built "today/yesterday" seeds with `dateToSeed(midnight)`, but
  `seedToDate(dateToSeed(x))` is not a clean inverse at local midnight across a
  DST boundary (winter `FIRST_DAY` vs summer now), so the fixtures dated a day
  off and failed for a reason unrelated to the bug. When a fixture needs a date
  that passes through a seed<->date conversion, derive it from the SAME function
  the code under test reads dates from (here `seedToDate`), not its inverse - the
  pair may not round-trip. Underlying drift filed as task 20260729-122943.
  20260729-101747.
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
- `a-dramatic-simulation-result-is-usually-the-harness` (x1): the first hint
  policy bought a hint on every loop iteration while candidates exceeded a
  threshold, and reported 26-66% loss rates - a headline-shaped number that was
  measuring a degenerate player, not the game. Simulations fail silently: they
  always produce a plausible table. Before reporting an aggregate that would be
  a headline, trace ONE concrete case by hand against the real data (here, what
  clade the first hint actually reveals for Tyrannosaurus, and how many species
  are inside it) - the hand trace is what separates a finding from an artifact
  of the policy. 20260729-092435.
- `simulate-the-shipped-logic-by-importing-it` (x1): the playtest difficulty
  harness imports `computeLCA`, `lineage`, `GameState` and `findNextHintCladeId`
  from `src/` and adds only the player POLICIES, which do not exist in `src/` at
  all. A simulation that re-implements the rules measures a game nobody plays
  and rots the moment the rules change; keeping the seam at "policies are new,
  rules are imported" made the out-of-context reviewer able to certify the model
  as exact rather than approximate. Direct application of
  [[hand-copied-logic-mirrors-rot-update-them-in-the-same-change]] at design
  time instead of at bug time. 20260729-092435.
- `a-stale-dev-server-on-8080-makes-e2e-test-the-wrong-app` (x1): `npm run ci`
  went red on master with all 28 E2E failing on "element(s) not found" for the
  header, minutes after the same suite passed on the branch. Cause: an orphaned
  `npm run serve` from a deleted sprout worktree was still bound to port 8080,
  and `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, so
  Playwright attached to it instead of starting its own - testing a webpack
  error page. Symptom to recognise: EVERY spec fails on a missing basic element
  rather than a few failing on behaviour. Check `curl -s localhost:8080 | head`
  and `ss -ltnp | grep :8080` before believing a total E2E wipeout, and kill the
  listener by its PID from `ss` (never `pkill -f`, per the global rules). Serve
  on a different port (`npm run serve -- --port 8181`, with `BASE_URL` for the
  playtest walkthrough) when a round of work needs its own long-lived server.
  20260729-092435.

## Game design and measurement

- `price-a-mechanic-in-the-same-unit-as-what-it-costs` (x1): the hint was argued
  about in feel ("hints are a bad deal") and the proposed fixes were all about
  the reveal ORDER. Converting both sides to the unit the mechanic actually
  trades in - bits of candidate-set reduction - settled it as arithmetic: a
  guess is worth 1.77 bits, so a hint at `HINT_COST = 3` must return 5.2 bits,
  i.e. cut 150 species to under 5. No reveal rule can do that and still be a
  hint, so the PRICE was load-bearing and nobody had measured it. Find the
  common unit before proposing changes to a game mechanic; it can reframe the
  question out of the argument everyone is having. 20260729-160500.
- `measure-the-fallback-branch-of-a-rule-you-recommend` (x1): the recommended
  threshold-split hint rule has a "nothing met the threshold" path that returns
  the deepest clade - which LOOKS exactly like the bottom-up policy the same doc
  spends a paragraph rejecting as a solve button. The first draft recommended
  the rule without noticing the branch existed. Instrumenting it corrected the
  intuition in both directions: it fires on 18.6% of calls (more than assumed),
  and it is harmless by construction (only reachable when nothing met the
  threshold, so what it returns necessarily holds MORE than the threshold share
  - measured min 25%, median 67%). Measure the fallback before recommending the
  rule; reading the happy path shows neither the rate nor the reason.
  20260729-160500.
- `the-bar-you-measure-against-is-itself-a-design-decision` (x1): the hint spike
  measured six selection rules carefully and recommended a 1/4 split at cost 2 -
  on the bar "does a hint pay for itself". The user rejected the BAR, not the
  data: a hint should be a desperate move, not an edge, so the right question is
  "does it rescue a player who cannot play". Re-measuring the same rules against
  rescue picked 1/2 instead, and revealed that the ROI winner (1/4) took a
  helpless player from 83% loss to 14% - exactly the advantage the design was
  supposed to deny. Same numbers, opposite answer. Name the objective function
  out loud and confirm it BEFORE running the comparison, because the ranking is
  a property of the bar, not of the options. Related:
  [[price-a-mechanic-in-the-same-unit-as-what-it-costs]] found the unit; this
  found that the unit alone does not tell you which direction is better.
  20260729-160500.
- `simulate-the-player-the-feature-is-for-not-the-one-you-have` (x1): the rescue
  target was "bring the 84.8% loss down", but that figure belongs to the `blind`
  policy, which ignores the tree entirely - and a player who ignores information
  cannot be helped by more of it. Measured: buying hints makes a blind player
  WORSE off (83% -> 85-90%, they pay budget for information they do not use).
  The feature's actual audience needed a new model (`hint-follower`: cannot
  deduce from join points, can act on a clade named in words). Before optimising
  a helper feature against a loss rate, check that the policy behind that number
  can consume the help at all. 20260729-160500.
- `state-the-sample-before-quoting-the-tenths` (x1): the hint simulation ran at
  5 trials per target and the doc compared cells differing by 0.2 as if that
  were signal. Re-running at 20 trials held the headline gaps, but the order of
  operations was backwards. Print the trial count in the report header and make
  it a knob (`PLAYTEST_TRIALS`), so a claim resting on a small gap can be re-run
  instead of argued about. 20260729-160500.

- `a-captured-ui-string-proves-the-offer-not-the-algorithm` (x1): comparing this
  game to metazooa.com, the captured string "Exchange 3 guesses to reveal a
  rank!" was labelled REFERENCE and used to claim Metazooa advances exactly one
  rank per hint - but its hint resolves server-side and no selection rule appears
  in the client bundles. Evidence labels were applied rigorously to the
  observations and quietly dropped for the COMPARISON. Label the boundary of a
  capture: what the interface says is not what the mechanism does. 20260729-092452.

## Pending promotions (3+ occurrences, user decides)

(none yet)
