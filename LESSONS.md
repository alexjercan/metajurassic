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

- `a-guard-no-test-can-fail-is-a-comment` (x2): the content pipeline gained a
  Python `validate_attributes` that refuses a malformed frontmatter value, and
  nothing in `npm run ci` exercised it - deleting the call from both sites left
  the whole gate green, because every test asserts over the committed content,
  which is clean. A hand-run `cmd:` proof in the DoD is evidence for one moment,
  not a guard. When a change adds enforcement in a language or layer the suite
  does not reach, the same change adds the test that reaches it: ask "if I
  delete this guard, what turns red?". Caught by the out-of-context reviewer,
  not the implementer. 20260729-092352. Second hit (20260729-092419), in a new
  layer - the BUILD CONFIGURATION: making the lint gate strict is a line in
  `package.json`, invisible to a suite that runs INSIDE the gate, so deleting
  `--max-warnings=0` would have left all 322 tests green. The plan had proposed
  only a hand-run falsification; reading this entry at the start of the work
  phase is what turned it into `test/lintGate.test.ts`. Policy in npm scripts and
  CI workflow files needs a test that reads the config as DATA.
- `enumerate-every-writer-before-guarding-an-invariant` (x1): the same guard
  landed on two of the THREE scripts that write `index.json` - `csv_to_json.py`
  was read during planning, then not revisited when the guard was designed - and
  the docs written afterwards said "both conversion scripts", which read as a
  claim about the pipeline as a whole. Before guarding a data-writing
  invariant, list every writer mechanically (here
  `grep -l 'open(.*index.json.*w'`) and guard the SET; a guard on the paths you
  happened to be editing is a guard with a documentation bug attached.
  20260729-092352.
- `unrelated-cleanup-rides-along-at-the-cost-of-the-diff` (x1): adding `sorted()`
  to the content generator while fixing 150 icon values turned a 150-line repair
  into a 1886-line reshuffle nobody could review. Caught by reading the diff
  stat, not by a test. Reverted and filed as its own task (20260730-120355). A
  "while I am in here" improvement is not free - it spends the reviewability of
  the change it rides along with. 20260729-092352.
- `revert-a-test-mutation-with-a-scratch-copy-not-git-checkout` (x1): undoing a
  deliberate sabotage with `git checkout <file>` also reverted that file's real
  fix, silently restoring one of the 150 broken icons; only a re-grep caught it.
  On any file the branch has already modified, mutate and restore via a scratch
  copy (`cp f /tmp/f.bak` ... `cp /tmp/f.bak f`). 20260729-092352.
- `read-the-helper-body-not-its-name-before-reusing-it` (x1): the panel-focus fix
  called `openPanel()` to give a hint purchase feedback, but that four-line
  helper ALSO clears the module-level `manuallyClosedPanel`, so a fix aimed at
  the pre-first-guess case silently re-enabled auto-open mid-game and undid the
  preference the branch's own test pinned. When a fix reuses a helper that
  mutates module state, read its body in the same breath as the call.
  20260729-092315.
- `close-a-task-with-its-review-and-retro-not-just-the-status` (x3, PENDING
  PROMOTION): the first
  tracked task here (`20260331-154614`, graph scaling) was set CLOSED with no
  `REVIEW.md` and no `RETRO.md`, so `tatr check` went red and the reasoning
  behind the fix survived only in the commit diff. A task is not done when its
  STATUS flips to CLOSED; it is done when the verdict and the retro are on disk
  next to it. Run the work -> review -> compound sequence and let the squash-land
  fold all three records into the one commit. 20260729-092239. Second hit
  (20260729-092339): the branch sat at `FLOW STEP: COMPOUNDING` with STATUS
  CLOSED and no REVIEW.md - the marker is a CLAIM, the artifact is the evidence.
  Running the missing round found two majors, one of them a behavioural
  regression the branch itself had introduced. Third hit (20260729-141427):
  CLOSED at the end of the work phase, caught by the out-of-context reviewer
  running `tatr check` - which the work phase itself never ran, because
  `npm run ci` was treated as "the gate" when it only gates the CODE.
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
- `a-new-devdependency-does-not-reach-the-main-checkout-until-you-install-it`
  (x1): a sprout worktree symlinks the main checkout's `node_modules`, but
  `npm install --save-dev` from inside the worktree updated only the WORKTREE's
  package.json/lock plus its own resolved tree - the main checkout never gained
  `jest-environment-jsdom`. The branch gate was green all cycle and the FIRST
  run on the default branch after landing failed with "Test environment
  jest-environment-jsdom cannot be found". Fixed by `npm install` in the main
  checkout. Lesson: when a branch adds a dependency, the flow Finish gate run on
  the default branch is what catches the un-installed checkout - do not skip it
  because "the same suite was green five minutes ago on the branch".
  20260729-092352.
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
- `absence-claims-need-a-listing-not-a-recollection` (x2): the playtest notes
  asserted "no surface in the game maps a clade to its member species" after
  enumerating three surfaces from memory - and missed `src/species.ts`, which
  lists all 150 species with their clade and sits right next to the
  `src/clades.ts` that WAS checked. An absence claim is a claim about the whole
  set, so derive it from a listing (`ls src/*.ts`, a grep over the tree), never
  from the files you happen to have opened. Same family as
  [[absence-proving-greps-must-be-run-when-written]]: both are proofs of a
  negative that were asserted rather than executed. 20260729-092435.
  Second hit (20260731-212615): a record claimed "no `SPIKE.md` exists for any
  record cited in this file" and NAMED four spike IDs as the listing. None of
  the four exists; `ls tasks/*/SPIKE.md` returns one file. Inventing the
  listing is worse than omitting it, because the fabricated evidence is what
  makes the claim look checked.
- `a-measurement-licenses-a-claim-only-over-the-range-it-swept` (x2): the
  difficulty simulation measured hints bought BEFORE the first guess and the
  write-up concluded "it is never correct to buy one" - but the hint reveals one
  level below the DEEPEST REVEALED clade, so a mid-round hint is a different
  (and better) purchase that the sweep never touched. The claim was filed under
  a MEASURED label, which is how an inference gets mistaken for data. When an
  instrument varies one knob, the conclusion must name that knob; and the fix is
  usually to widen the sweep, not to soften the sentence - re-measuring here
  turned a narrow finding into a better one (a late hint for a weak player is
  near break-even and cuts the loss rate 5.8% -> 4.6%). 20260729-092435.
  Second occurrence, the mirror image: a comment and a Definition of Done said
  "in all five [swept viewports] the overlay has unreachable overflow" after
  measuring most of them, and it was false at the ONE size chosen because it
  fits - which cannot also have unreachable overflow - with the correct numbers
  three lines above in the same table. A sentence quantified over a swept set is
  itself an assertion; check it against every member or scope it to the ones
  measured. 20260730-111003.

- `a-string-replace-that-matches-nothing-is-a-silent-no-op` (x1): the plan for
  this task was written into `TASK.md` in the MAIN checkout, before the sprout was
  cut - so the branch never had it, and the scripted
  `- FLOW STEP: PLANNED` -> `WORKING` edit inside the worktree matched nothing and
  reported success. `head -12` showed the STATUS line it DID change, so the
  missing `## Flow State` section went unnoticed until a later read hit a 38-line
  file. Sprout before planning, or diff the worktree's task file against the main
  checkout right after sprouting; and make scripted replaces assert their match
  count (the mutation script in this same task did, and caught a two-occurrence
  string on the first try). Instance of
  [[an-edit-you-believe-you-made-is-a-hypothesis-until-the-artifact-shows-it]]
  where the artifact was never even written. 20260729-092504.
- `once-a-sprout-exists-run-tatr-inside-it` (x1): `tatr flow` was run from the
  MAIN checkout while the task's TASK.md lived in the sprout worktree, so it
  advanced the stale master copy (PLANNED -> WORKING) while the branch copy sat
  at REVIEWING. It reported success both times; nothing distinguishes the two
  files from the CLI's point of view. Caught by reading FLOW STEP in both trees
  before the next commit and reverted with `git checkout --`. The state a task
  ships with is the one on the branch, so every `tatr` call after `sprout new`
  belongs inside the worktree. Sibling of
  [[a-string-replace-that-matches-nothing-is-a-silent-no-op]] - same root cause,
  two copies of one record, and the wrong one was edited. 20260731-212616.
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
- `a-correction-is-a-new-claim-re-derive-it` (x4, PENDING PROMOTION): the fix
  warning introduced a second wrong claim ("the INVERSE direction of Metazooa's
  green-to-red") by reasoning from the palette's written order rather than from
  what the scale is keyed on - `level` is distance from the answer, so green is
  the close end in both games. Re-derive a corrected fact from its source; a
  correction gets the same standard as the claim it replaces. 20260729-092452.
  Second hit (20260731-212612): a MAJOR finding faulted the METHOD behind a
  record-tree grep and cited two of the eight comments it had mis-cleared. The
  fix re-ran the method for those two and left the other six on the discredited
  pass, so round 2 raised two more findings on the same defect. When a finding
  faults a method, its scope is the method, not the instances it names.
  Third hit (20260731-212615): a compaction made in response to a MAJOR was
  recorded with "so no other figure moves" - reasoned from the fact that the
  file's line count was unchanged, not re-measured. Two figures had moved, and
  correcting those raised a third stale site the round after. A fix that
  changes a measured quantity must RE-RUN the measurement; the blast radius of
  an edit is not something to derive in your head.
  Fourth hit (20260731-212616): a playtest header was rewritten to drop its
  archaeology and, in the same edit, gained "Cross-checks on every run" three
  lines above the `PLAYTEST_ONLY=rescue` flag that skips the cross-check. The
  deletion got all the attention; the replacement prose was treated as a summary
  of code already read rather than as a claim of its own. Running the rig both
  ways - a minute - is what review did to catch it.

- `check-what-lives-at-a-path-a-task-names-as-a-reference` (x1): this task's step
  1 said to compare the game against "the local `~/personal/metazooa` helper
  page". That checkout is a SOLVER for metazooa.com - a scraper plus an NCBI tree
  plus a best-guess CLI - and carries nothing about the game's UX. The user
  caught it; nothing in the record would have. 20260729-092452.

- `restore-a-mutation-experiment-from-a-copy-not-git-checkout` (x1): proving a new
  test bites by reverting the fix and then restoring with `git checkout <file>`
  threw away the UNCOMMITTED real work in that same file - the jest `globalSetup`
  line - leaving the whole time-zone pin inert while the suite stayed green,
  because the machine's own zone happened to be the one the pin selects. Copy the
  file aside and copy it back, and read the staged path list against the step
  list before committing: the missing path was on screen. Sibling of
  [[an-edit-you-believe-you-made-is-a-hypothesis-until-the-artifact-shows-it]].
  20260729-122943.
- `open-a-neighbouring-record-before-writing-a-new-one` (x3, PENDING PROMOTION):
  the closeness task's
  `DECISION.md` was authored from an idea of what a decision record contains, and
  reddened `tatr check` with `bad-decision-status` - the document-level `- STATUS:`
  line the linter parses lived only inside each fork section, while all 13
  existing records carry it in a header block under the H1. It survived a whole
  out-of-context review round and was caught only when a later pass ran
  `tatr check` on the branch AND on master. When a repo has a machine-checked
  artifact convention, read one existing instance instead of reconstructing the
  format, and run the repo's OWN conformance gate (`tatr check`) as part of a
  task's verification - it is a different gate from `npm run ci`, and only the
  code one was being run. 20260729-182255.
  Second occurrence: a plan step said to re-run a previous task's CSS fixes
  "reverted one at a time" and expect each to redden the suite. That task's own
  `REVIEW.md` says in plain words that its single reverts were all GREEN and only
  its full parent CSS reddens - so the step was planned against a claim its
  reference had already refuted. Its `TASK.md` and the comments it left in the
  code had been read; its review had not. The findings are where a task's own
  claims got corrected, so read the REVIEW.md of any task you cite as evidence.
  20260730-111003.
  Third occurrence: this task's `DECISION.md` DID open a neighbour
  (`tasks/20260729-141424/DECISION.md`) and still reddened `tatr check` with six
  `bad-record-schema` errors - the neighbour predates the v2 schema migration
  (053fe72), so it is grandfathered, not canonical. A committed sibling cannot
  tell you which of its properties the linter currently requires; `tatr scaffold`
  can, and prints the template. 20260731-212557.
- `a-regex-over-source-is-not-a-parse` (x2): the comment inventory's first pass
  used `ts.createScanner`, which resolves `/` without parser context and read the
  regex `/\.md$/` in `src/markdownLoader.ts:29` as the start of a comment,
  swallowing the rest of the file - reporting 115 comments in `src/` where there
  are 223. The plan's own baseline had the matching error one level down: a grep
  for `^\s*//` counts comment LINES, and a run of `//` lines is one comment, so
  it makes a well-commented file look badly commented. Both outputs were
  plausible, which is why neither was questioned until an extracted comment ended
  mid-sentence in `/**` garbage. Count source constructs with the language's
  PARSER, and check the result against a number produced outside the session
  before building on it. Sibling of
  [[absence-claims-need-a-listing-not-a-recollection]]. 20260731-212557.
  Second hit (20260731-212615): the parser was used this time, but its walk
  recursed with `forEachChild`, which skips punctuation and keyword tokens, so
  a comment attached to one was never seen - 889 / 1 / 1 against a known
  889 / 10 / 18. The `wc -l` cross-check AGREED, because line counting and
  comment counting fail independently. A counter's cheap proxy is not a check
  on it; validate against a known answer produced outside the session, which
  is the only thing that caught this.
- `tick-a-step-against-its-clauses-not-in-one-bulk-edit` (x1): the seven Steps
  were ticked with a single `- [ ]` -> `- [x]` replace across `TASK.md`. Step 1
  asked for two tables and the record had one; the bulk edit is precisely what
  removed the moment at which any step would have been re-read against what was
  written, and review caught it as a MAJOR. The `work` skill already says to tick
  only after re-reading every clause - a global replace is the shape that skips
  that rule invisibly. Tick one box at a time. Sibling of
  [[anchor-programmatic-edits-on-code-not-prose-and-read-the-diff-back]].
  20260731-212557.
- `derive-every-number-in-a-table-from-the-same-rig` (x3, PENDING PROMOTION):
  `NOTES.md` recorded
  837 comments bucketed 620/73/144 across four directories, every figure from the
  extraction rig - except one prose breakdown, "3 in `test/lintGate.test.ts`, 9
  across `e2e/`", recalled from the reading. Measured, it was 6 in `e2e/` plus 3
  in files the sentence never mentioned, and the sibling `DECISION.md` carried
  the correct total in the same commit, so the two records shipped contradicting
  each other. A hand-counted figure sitting among measured ones inherits their
  authority without earning it. Sibling of
  [[quote-the-mutation-not-the-memory-of-it]]. 20260731-212557. Second hit
  (20260731-212611): "15 narration discards in `treeBuilder.ts`" was measured,
  and agreed with the child-1 inventory - but the inventory counted that file
  BEFORE the split moved 3 of the 15 into `hintRule.ts`, so only 12 remained
  where the record said 15. A figure measured under a different SCOPE is the
  same defect as a hand-counted one: agreement with a pre-split baseline is
  evidence the count is right, never evidence the file attribution is. Third hit
  (20260731-212612): `NOTES.md` and `TASK.md` both said "nine keeps" while the
  rig-derived figure sat four lines away in the same file - 47 discarded, 2
  compacted, 8 kept in full, 10 surviving. Nine was the ROW COUNT of the table
  above, one row of which is a compaction and one of which covers two comments.
  Reading a figure off the shape of a table is the same defect as recalling it:
  the table is a rendering of the measurement, not the measurement.
- `re-read-the-decision-record-while-implementing-the-function-that-implements-it`
  (x1): `DECISION.md` said in as many words "finished rounds are kept: they ARE
  the practice stats", and the function deciding keep-vs-delete
  (`abandonPracticeRound`) deleted unconditionally - so "I won -> New game", the
  way EVERY round ends, erased the player's own record. Written by the same
  session, hours apart, and never re-read while coding. Caught by the
  out-of-context reviewer. When a function IS the implementation of a recorded
  fork, open the record next to it; writing a decision down is not the same as
  consulting it. 20260729-101754.
- `a-fix-that-makes-a-latent-defect-observable-owns-the-whole-defect` (x1): the
  practice storage key is `seed mod 10^5` but the target is `seed mod 150`, so
  colliding seeds were always a quiet overwrite-on-save. Making rounds RESUME
  turned that into "load `?seed=100042`, get seed 42's board" - the untouched
  half got WORSE - while the DoD claimed the finding was closed because the
  drawn-seed path had been narrowed. When a change alters WHEN a known defect
  surfaces, re-scope the whole finding instead of fixing the path you happened
  to be editing. Sibling of
  [[enumerate-every-writer-before-guarding-an-invariant]]. 20260729-101754.
- `a-stale-comment-is-a-load-bearing-assumption-that-moved` (x1): a test helper
  said "nothing is worth keeping, so pressing New game costs nothing" - true
  when written, false two commits later once finished rounds began surviving New
  game, and it described exactly the invariant the other fix in the same review
  round had inverted. The two fixes collided and the retry started failing ~6%
  of runs, worse than the flake it replaced. When a change makes a nearby
  comment untrue, that is the signal to check what else depended on it - and
  when one review round produces several fixes, read them against each other
  before sending it back. 20260729-101754.
- `filter-the-grep-output-by-reading-not-the-pattern-by-guessing` (x1): to
  enumerate every importer of `src/gameState.ts` before splitting it, the grep
  excluded lines matching the symbols that were STAYING - including
  `gameStateKey`, chosen to suppress `SavedGameState` noise. But
  `test/gameStats.test.ts` imports `gameStateKey`, which was MOVING, so the
  filter hid a real call site and the build broke. An exclusion pattern written
  from the stay-behind list cannot tell a symbol that is staying from a string
  that merely contains it. Grep as widely as possible and filter the output by
  reading it. Sibling of [[absence-proving-greps-must-be-run-when-written]].
  20260731-212610.
- `search-the-whole-record-tree-before-declaring-a-rationale-unrecorded` (x4,
  PENDING PROMOTION):
  the comment policy allows compacting a comment only towards an existing
  record, so "is this recorded" decides whether a long comment is cut or kept.
  Asking it became a grep of the two `DECISION.md` files the comment itself
  named; the rationale was recorded all along, in a TASK.md close-out
  (`tasks/20260729-092327/TASK.md:110-117`). The right shape is two questions:
  does ANY record hold this (grep `tasks/` whole), and separately, is that
  record a kind the policy accepts as a compaction target. A comment naming its
  own records tells you where its author looked, not where the fact lives.
  20260731-212610. Second hit (20260731-212612): the grep WAS run over the whole
  tree this time, with terms harvested from the comments' wording - and came
  back empty because a record names the DEFECT while a comment names the GUARD,
  so they share almost no words. Not one of the eight terms could reach a
  `gameStats.ts` keep about streak arithmetic; `tasks/20260729-122943/
  DECISION.md:46` held the spring-forward defect all along. Pick terms from what
  the comment is ABOUT, not from what it says. Third hit (20260731-212613): the
  subject grep was right and its OUTPUT was under-read. `targetId` returned nine
  files; the read stopped at the `DECISION.md` files and skimmed past
  `20260729-101754/REVIEW.md`, which held `isResumable`'s rationale almost
  verbatim - and the literal `grep -rn isResumable tasks/`, one hit, was never
  run. A negative claim needs its own evidence: grep the literal SYMBOL NAME as
  a second pass, and read every record KIND in the folder, not just DECISION.
  Fourth hit (20260731-212615): the comment cited TWO task IDs and only the
  first was chased. `20260331-154614` has no compaction-target record, so the
  comment was cleared as a keep - while the second ID's
  `20260729-092339/DECISION.md` `## Fork 3` restated its first paragraph nearly
  clause for clause. Every ID a comment cites is a separate question; clearing
  it on the first one answers none of the others.
- `inherited-figures-do-not-satisfy-a-sentence-that-says-measured` (x2): a
  DECISION.md paragraph opened "Confirmed against the file rather than inherited
  from the plan" and then quoted the plan's "about 60 lines" for the seam it was
  rejecting; the seam is about 80. The claim of independent measurement is
  itself a claim, and copying the figure from the task record is exactly what it
  denies. Re-measure every number that sits inside a sentence asserting it was
  measured, in the pass that asserts it. 20260731-212613. Second hit
  (20260731-212614): `NOTES.md` said a hint-cost figure was "checked against the
  SPIKE rather than carried from the comment", and the check had matched the
  DIGITS at the right row of a TWO-COLUMN table - `+2.2` is the expert column,
  and the comment was about a tree-reader, who pays `+0.5 to +1.3`. The
  verification really did open the record and really did find the number; what
  it never compared is the axis the claim is indexed on. A figure in a table
  with more than one column is not addressable by its value: cite the row AND
  the column, or quote the table.
- `build-a-what-happened-table-from-the-diff-not-from-the-working-notes` (x1):
  a `NOTES.md` inventory gave one row per comment with a verdict - keep,
  compact, delete - and four rows said `keep` for comments `git diff` shows
  were rewritten, one of them beside the words "already in the target form".
  The same gap made the close-out's compaction counts wrong in both directions
  (17 of 31 survivors rewritten, not 11; 9 of 13 compactions carry a pointer,
  not all of them). The labels were the INTENTIONS formed while reading each
  file, and they were mostly right, which is why nothing re-derived them once
  the edits existed. A table describing what a change did to each item is a
  claim about the diff: extract before and after, compare, then label. Sibling
  of [[quote-the-mutation-not-the-memory-of-it]] and
  [[derive-every-number-in-a-table-from-the-same-rig]], one layer up - those
  two are about numbers, this is about the per-item verdicts the numbers are
  summed from. 20260731-212614.
- `a-set-property-must-be-re-checked-per-member-before-it-is-claimed-of-one`
  (x1): three files travelled together as a landed sibling's cluster and the
  record said all three "carry the directory's highest comment ratios". Two do,
  by a wide margin; the third is 7%, second-lowest of ten. The cluster's
  headline property got borrowed by each member, and the same record's
  `DECISION.md` said "the two highest" correctly four sections away. A
  superlative is measured over a set - restate it per member, or say "two of
  them" and name which. 20260731-212614.
- `a-record-pointer-can-outlive-what-the-record-says` (x1): `focusRect` framed
  the target AND the newest guess and cited "tasks/20260729-092339/DECISION.md
  fork 2" as its backing. Fork 2 chose to centre the target and explicitly
  REJECTED the union, noting it could be adopted later; it was, at review inside
  that same task, and the DECISION was never amended. So the pointer sent a
  reader to a record documenting the opposite of the code. Verifying a record
  EXISTS is a grep; verifying it still says what the comment claims is a read.
  [[search-the-whole-record-tree-before-declaring-a-rationale-unrecorded]]
  answers the first question only. Sibling of
  [[re-read-the-decision-record-while-implementing-the-function-that-implements-it]],
  which is the same disagreement found from the other end. 20260731-212611.
- `a-doc-sweep-for-stale-references-cannot-find-an-incomplete-enumeration`
  (x1): `AGENTS.md`'s repository map lists `src/`'s core modules by name, and
  the sweep after adding `src/hintRule.ts` looked for references that had gone
  STALE - paths that moved or died. It found the two it was looking for and
  missed the map, because a list that is merely missing a member does not match
  a grep for anything. Sweeps need both polarities: what did this task move or
  delete, and what does this task ADD a member to that some doc enumerates.
  Mirror image of the second hit on
  [[when-a-fix-changes-an-invariant-grep-its-callers-for-documented-dependencies]],
  where the miss was a path that ceased to exist. 20260731-212611.
- `a-figure-restated-in-n-places-goes-stale-in-n-minus-one` (x2): one record
  restated the same comment census - before, after, byte-identical, changed - in
  six independent places, with none marked authoritative. Three consecutive
  review rounds each corrected some sites and missed a different one, because
  every re-measure was a manual fan-out. The remedy is structural, not another
  proofreading pass: put the figures in ONE measured block with its reproduction
  command, and have every other site name the group ("the byte-identical keeps")
  instead of the number. Two caveats learned the same round: the block must be
  internally correct, since a wrong single source of truth is worse than the
  duplication it replaces, and its scope must be stated - a per-file table that
  measures a different population, and a REVIEW.md quoting figures as they stood
  when a finding was written, are legitimate and must be named as exceptions
  rather than swept. 20260731-212615.
  Second hit (20260731-212616): the same shape twice in one task. `hint.ts`
  carried two contradicting section numberings - in-file banners numbered 1-7
  against printed headings numbered 0-5 - and the record's line-count figures,
  transcribed into prose in three places, all went stale the moment the review
  fixes changed two files. Fix for the code was to delete the second numbering
  and let the printed headings be the only one.
- `a-split-buys-seams-not-lines` (x1): splitting `game.ts` and `gameState.ts`
  into five files raised the cluster's line total by 17, because every new file
  pays for its own import block. What moved is the largest file a reader must
  hold: 440 lines to 230. Refactors scoped as "make it smaller" should state
  WHICH number they intend to move before starting, and a net line INCREASE
  from a pure split is the expected result, not a warning sign.
  20260731-212610. Confirmed, not a second hit, by 20260731-212611: the tree
  cluster went 973 -> 974 lines (+1) while its largest file went 443 -> 291.
  The count stays at one because the rule was stated up front and held. Confirmed
  again by 20260731-212616: the Jest/playtest cluster went 7711 -> 7710 (-1)
  while its largest file went 1110 -> 603. Three clusters, three flat totals,
  three halved maxima - the pattern is now the expected result of a split.

## Testing

- `a-test-that-reads-a-source-file-breaks-when-that-file-stops-being-the-artifact` (x1):
  `test/closeness.test.ts` guards that every closeness tier has a
  `.node-close-N` rule by reading `src/style.css` as text. Splitting the
  stylesheet into `src/partials/` turned that file into 18 lines of `@import`,
  so the guard went red without a single rule changing - it was asserting over
  the source layout, not the shipped CSS. The fix follows the `@import` list
  rather than globbing `src/partials/*.css`, because a glob passes for a
  partial nobody imports. A check whose input is a source path inherits every
  future decision about where that source lives; prefer the built artifact, and
  where that is impractical, follow the same links the build follows.
  20260731-212617.
- `an-environment-dependent-test-must-assert-its-environment` (x1): the DST
  round-trip specs are meaningless outside a zone that shifts, and CI runs in UTC
  - so they would have gone vacuously green exactly where the gate is. jest also
  hands each spec a COPY of `process.env`, so setting `TZ` inside a test is
  silently inert; the pin belongs in `globalSetup` and the specs call
  `expectPinnedZone()` to prove it held. Same family as
  [[count-both-branches-in-a-property-test-or-it-passes-vacuously]].
  20260729-122943.
- `fix-the-arithmetic-class-not-the-reported-callsite` (x1): the reported bug was
  `seedToDate`/`dateToSeed` dividing elapsed milliseconds by 86400000 across a
  DST night; `calculateStreak` did the identical thing in both its day
  comparisons and nobody had reported it. When a fix replaces a formula, grep for
  the formula, not for the symptom. 20260729-122943.
- `count-both-branches-in-a-property-test-or-it-passes-vacuously` (x1): the hint
  rule has a qualifying path and a fallback path, and the first property test
  only ever reached the qualifying one - it looped over COLD boards, where the
  fallback cannot fire (from 150 candidates something always cuts to half). It
  failed loudly only because it also counted how many times each branch ran and
  asserted both were non-zero; without that counter it would have gone green
  while testing the fallback with zero cases. A property test over two branches
  should count them and fail when either is unexercised. Fixed by walking each
  target DOWN its hint ladder into the deep states. 20260729-141424.
- `assert-the-exact-values-not-a-property-they-happen-to-have` (x1): the tree
  closeness ladder test asserted "five distinct ascending tier values", which
  reads as strong as "the tiers are `[0,1,2,3,4]`" and is not: a uniform drift
  (`guessTier(...) - 1`) yields `[-1,0,1,2,3]`, still five, still ascending, so
  it walked straight through - and the drifted low end has no `.node-close-N`
  rule, i.e. it renders unstyled. The out-of-context reviewer found it by
  mutating. When a test's job is to pin a fixture to a KNOWN scale, assert the
  scale itself; a property the right answer happens to satisfy is satisfied by
  wrong answers too. Sibling of
  [[count-both-branches-in-a-property-test-or-it-passes-vacuously]] - both are
  assertions that look like coverage and are not. 20260729-182255.
- `revert-each-part-of-a-fix-separately-not-the-fix-as-a-whole` (x1): the phone
  modal fix had four independent CSS changes, and "revert the whole file -> all 5
  tests red" was treated as proof they were all load-bearing. The reviewer
  reverted them one at a time: three left the suite GREEN. One-at-a-time reverts
  are N experiments and the whole-file revert is the weakest one; run the N.
  20260729-141428.
- `a-speculative-knob-beside-a-failing-test-is-a-suspect` (x1): a `min-width: 0`
  added to flex items "in case a label gets long" removed the flex floor, so the
  buttons shrank below their own labels instead of spilling off screen - and kept
  every viewport assertion green on the exact layout the task existed to reject.
  A tolerance, `min-width: 0` or `!important` added just-in-case next to a test
  meant to fail: ask what it makes unobservable. Family of
  [[never-add-a-tolerance-to-silence-an-undiagnosed-failure]], but the knob is in
  the PRODUCT here, not the test. 20260729-141428.
- `turn-every-axis-word-in-a-plan-into-a-number-before-ticking-it` (x1): a step
  promising a sweep of "narrow AND short" viewports was ticked with three tall
  portrait sizes, so the vertical half of the new assertion could not fail
  anywhere in the swept set - an untested axis presented as covered. Sibling of
  [[a-layout-assertion-at-one-viewport-is-a-sample-of-one]]. 20260729-141428.
- `quote-the-mutation-not-the-memory-of-it` (x2): a mutation experiment proving a
  new test discriminates was recorded as `guessTier(...) - 1`; what had actually
  been run was `Math.max(0, guessTier(...) - 1)`, and the clamp was the ONLY
  reason the test failed (it collapses two tiers onto one value). So the record
  overstated the suite, invisibly from inside the session - the numbers and test
  names were real, only the mutation string was paraphrased from memory. The
  reviewer reproduced the DESCRIBED mutation, got a different answer, and that
  gap was the finding. Paste the mutation verbatim from the command that produced
  the result; a verification claim is re-runnable only if what was run is written
  down exactly. Sibling of
  [[a-verification-result-expires-when-the-code-it-ran-against-changes]]: that one
  is the result going stale, this one is the write-up describing code that never
  ran. 20260729-182255. Second hit (20260729-141428): the recorded
  "box-sizing only" CSS mutation had quietly KEPT one of the fix's own
  overrides, so the figure was 12px where the described mutation prints 14px -
  again caught by the reviewer re-running the description.


- `a-new-listener-inherits-every-trigger-of-its-event` (x1): a rotation fix added
  `resize` + `orientationchange` + a `ResizeObserver` where the renderer had had
  no listener at all, and the handler re-scrolled unconditionally - so Android
  Chrome's URL bar hiding mid-drag (a height-only resize, which cannot even
  change the width-derived scale) threw the player's scroll away, re-creating the
  "the tree fights my drag" symptom the task existed to remove. Enumerate what
  ELSE fires the event on the target platform before writing the handler, and
  make it idempotent: recompute always, ACT only when the inputs moved.
  20260729-092339.
- `assert-the-promise-not-the-fixture-and-read-the-margin` (x1): an E2E check
  asserted the newest guess is always framed, which the renderer explicitly does
  NOT promise (it frames the pair only when it fits) - and it passed on 5.0px of
  margin decided by text widths, on a font stack CI does not have. Written from
  what the fixture did rather than from what the code guarantees. Print the
  margin before trusting a geometric assertion: a thin one usually means the
  assertion is claiming more than the code does. 20260729-092339.

- `a-layout-assertion-at-one-viewport-is-a-sample-of-one` (x1): the onboarding
  brief passed every check while being sliced at 1440x660 and 1366x600 - the
  suite only ever ran the Playwright project's default 1280x720, where the arena
  happened to have exactly 0px of slack. Zero slack read as a pass. When a change
  introduces a size constraint, sweep the sizes that STRESS it (short, narrow,
  and the transient states like an error message being shown) rather than the
  sizes the harness already had. 20260729-092327.
- `re-render-and-look-after-every-layout-change-not-once-per-task` (x1): the
  first screenshot of this task caught a hint chip clipped off the screen edge
  that no assertion saw. After the next layout fix the screenshots were not
  retaken, and that fix drew the inline error behind the footer - making the
  feedback the task exists to add unreadable on a phone, found only by review.
  The cheap screenshot is the instrument for what geometry assertions cannot
  see; it expires the moment the layout changes. 20260729-092327.
- `a-verification-result-expires-when-the-code-it-ran-against-changes` (x1):
  revert experiments proving four new pins were load-bearing were run, then the
  helper they depended on was rewritten, then the ORIGINAL numbers were written
  into the review record. They were true when produced and false when committed
  (only one pin still failed). Before recording that an experiment passed, check
  it ran against the code being committed - re-run rather than recall. Sibling of
  [[an-edit-you-believe-you-made-is-a-hypothesis-until-the-artifact-shows-it]].
  20260729-092327.
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
- `never-add-a-tolerance-to-silence-an-undiagnosed-failure` (x2): a flaky
  occlusion check was "fixed" by switching it to a poll, with a confident comment
  explaining which race the poll absorbed - written before the race had actually
  been diagnosed. The real cause was the `style-loader` unstyled frame, and the
  poll also swallowed the genuine regression. Diagnose first, THEN choose the
  assertion; a comment justifying an unverified tolerance is worse than no
  comment, because the next reader trusts it. 20260729-141414. Second hit
  (20260729-092339), the fitted variant: a dead-band allowance of
  `max(96px, 8% of the range)` was set against a measured band of 96.25px - a
  threshold read off the number it had to clear, and shaped so a NARROWER honest
  tree would fail it. If a check needs a fudge factor, derive it from the layout
  that produces it; if it cannot be derived, the invariant is not stated right
  yet (here: scroll extent <= painted tree + the arena's own padding, no knob).
- `render-every-branch-of-a-message-side-by-side` (x1): both review findings on
  the share rewrite (a loss bragging about a streak, a headline count that
  disagreed with its own grid) are invisible in a diff and obvious in a rendered
  example. When a change spans win/loss/practice/first-run branches, print one of
  EACH and read them together before review - and vary the stats, since the
  zero-stats loss previewed here was the one case that hid the bug.
  20260729-101823.
- `absence-proving-greps-must-be-run-when-written` (x3, PENDING PROMOTION) -> plan skill: this
  task's DoD shipped `cmd: rg -n "5\.2" src`, which can never go clean - the
  content graph has a 5.2-metre Sauropelta and `share.svg` a 5.2 coordinate. An
  absence proof written at plan time must be EXECUTED then, and narrowed with its
  reason recorded, or it is not a proof. 20260729-101823. Second hit
  (20260729-092327), in a comment rather than a DoD: a replacement E2E assertion
  carried "still fails the original F3.9 layout", reasoned from geometry and
  never run - and it was false, because `renderTree` scrolls the arena, so the
  viewport-relative gap could not tell the two layouts apart. Any claim that a
  check DISCRIMINATES must be produced by running it against the thing it is
  supposed to reject. Third hit (20260729-130138): the class, not the item -
  one of two absence greps four lines apart in the same DoD was run and
  narrowed, the sibling was not. When a grep proves not-runnable, re-check every
  other absence proof in that DoD in the same pass.
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
- `a-whole-file-repeat-count-is-not-a-sample-of-one-test` (x1):
  `playwright test panel.spec.ts --repeat-each=10` printed `60 passed`, which
  was read as a 60-run sample of the flaky test and reported as "the flake does
  not reproduce". 60 was 6 tests x 10 repeats, so the one test that mattered ran
  ten times; `-g "resurrect" --repeat-each=40` fails 12-19 times out of 40. A
  repeat total divides by the number of tests in the file - `-g` the one test
  under investigation and count ITS repeats. Sibling of
  [[measure-a-flake-fix-against-its-original-failure-rate]]: that one is too few
  repeats, this one is a big number that is not the repeats. 20260729-130138.
- `a-story-that-explains-a-null-result-is-a-hypothesis-not-a-finding` (x1):
  after the underpowered run above said the reported flake was gone, a plausible
  mechanism was reasoned out ("the spec has changed since it was reported") and
  written into NOTES.md and the DoD as fact. One `git diff` falsified it - no
  hunk touches the flaky test's body - and it was never run. "The reported bug
  does not reproduce" is the least likely explanation and the most suspicious
  result: before recording any story that makes a null result correct, run the
  cheapest command that would falsify the story. 20260729-130138.
- `enumerate-assertions-not-hunches-when-mutating` (x1): nine mutations were run
  on a test-only branch before review, each recorded verbatim - and the ONE
  assertion that could not fail shipped anyway. It was
  `expect("#autocomplete-box").toBeHidden()`, written on autopilot as the third
  of a three-assertion group whose other two both reddened under mutation, so the
  group read as verified. The pass had been driven by what the author found
  interesting rather than by the list of what the change asserts. Enumerate every
  assertion a change adds and pair each with the mutation that reddens it; any
  left over is either unpinned (say so in the record) or unfalsifiable (delete
  it). The reviewer found it by mutating the line nobody had wondered about.
  Sibling of [[a-guard-no-test-can-fail-is-a-comment]] - that one is a guard with
  no test, this one is a test with no guard behind it. 20260729-092504.
- `test-must-cross-the-format-parse-seam-not-assert-each-side` (x1): unit tests
  that assert `parse` and `format` in isolation can encode the very bug they
  should catch. `parseGameStateKey` did not invert `gameStateKey` (an off-by-one
  from a +1 display offset), yet 114 tests stayed green because none round-tripped
  `parse(format(seed))`. When two functions are meant to be inverses, test the
  round-trip over a range (including the modulo edge), not each side alone; the
  bug lived at the seam the isolated tests never crossed. 20260729-101747.
- `hand-copied-logic-mirrors-rot-update-them-in-the-same-change` (x2): fixing the
  `formatPuzzleId` off-by-one changed the key formula, but `e2e/helpers.ts`
  `computeDailyKey` is a hand-copied browser mirror of that formula (its own
  comment says so) and silently diverged at the modulus edge - the out-of-context
  review caught it, the author's context did not. A duplicated implementation is a
  second seam that rots: when you change the original, grep for its mirrors
  (comments saying "mirrors X", copied constants/regexes) and update them in the
  SAME change. Same family as
  [[new-source-dir-needs-toolchain-globs-in-the-same-change]]. 20260729-101747.
  Second hit (20260729-092339), constant rather than logic: two E2E specs
  restated the shipped `MIN_NODE_FONT_PX` as a literal `10.5`, so the DoD's
  claim "node text never renders below MIN_NODE_FONT_PX" was pinned to nothing -
  lowering the constant left the suite green. Import the constant; a restated
  number proves the behaviour, never the claim about the constant.
- `anchor-date-fixtures-to-the-code-under-test-not-the-inverse` (x1): streak tests
  built "today/yesterday" seeds with `dateToSeed(midnight)`, but
  `seedToDate(dateToSeed(x))` is not a clean inverse at local midnight across a
  DST boundary (winter `FIRST_DAY` vs summer now), so the fixtures dated a day
  off and failed for a reason unrelated to the bug. When a fixture needs a date
  that passes through a seed<->date conversion, derive it from the SAME function
  the code under test reads dates from (here `seedToDate`), not its inverse - the
  pair may not round-trip. The drift itself is fixed (20260729-122943): the pair
  now round-trips in every zone and season, so that particular workaround is
  gone, but the advice stands - derive a fixture from the function the code
  under test reads, not from its inverse. 20260729-101747.
- `mock-fixtures-hide-real-data-defects-test-the-real-payload` (x3, PENDING
  PROMOTION): tests built
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
  Third hit (20260729-092352): the icon defect finally got its real-payload
  suite, and writing the test BEFORE the repair is what made the green mean
  something - 3 of 15 red, exactly the icon assertions.
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

- `css-media-blocks-on-different-axes-are-resolved-by-file-order` (x1): a
  `@media (max-height: 700px)` compaction was written before the
  `@media (max-width: 768px)` block, so at narrow widths the later block won at
  equal specificity and the compaction never applied on ANY phone. It went
  unnoticed because its effect had only been measured at desktop widths - the
  axis where it did work. Verify a media block's EFFECT on both axes it can be
  overridden on, and order height blocks after width blocks. 20260729-092327.

- `converting-a-css-property-between-coordinate-systems-must-be-restated-per-media-block`
  (x1): `.modal`'s `max-width` was converted from a content width to an outer
  width (`box-sizing: border-box`), correctly, at the DESKTOP padding - and the
  `@media (max-width: 768px)` block reads a different padding, so the 520-768px
  band silently gained 48px while the comment claimed nothing had changed. When a
  declaration changes coordinate system, grep that property inside EVERY media
  block before writing what changed. 20260729-141428.
- `a-bare-transition-duration-animates-layout-properties-too` (x1): `.modal-btn`
  carried `transition: 0.2s`, which is `all`, so crossing a breakpoint spent 0.2s
  animating PADDING - three successive samples of one layout read 31.0px, 28.9px
  and 23.9px, a width belonging to neither rule. Name the properties a hover
  transition actually needs, and when a measurement disagrees with itself between
  samples suspect a transition before suspecting a stale bundle. Sibling of
  [[poll-dot-not-resolves-on-the-first-sample-so-it-cannot-watch-a-transition]].
  20260729-141428.
- `a-mutation-must-reach-the-branch-it-claims-to-test` (x1): three checks on one
  branch went green or red for reasons unrelated to the thing under test.
  `toBeHidden` PASSES for an element that does not exist, so the "button hidden
  on the daily page" assertion was green against a template that never gained
  the button. An assertion made straight after a click that NAVIGATES can match
  the document being navigated away from - `Guesses Left: 25` passed with the
  fix removed because the old page showed 25 too. And a forced retry branch
  reported as proof of a delete never entered the finished-round path the delete
  exists for; the reviewer re-ran it and got 9/9 green. Read the FAILURE text,
  not the pass/fail count, and confirm the mutated line is on the path the test
  drives. Sibling of
  [[an-environment-dependent-test-must-assert-its-environment]] and
  [[side-effect-cleared-state-is-not-proof-of-success]]. 20260729-101754.
- `substring-assertions-break-when-a-longer-sibling-name-exists` (x1): a spec
  pinning that `ci` calls the strict lint script used
  `toContain("npm run lint")` - which is also a substring of `npm run lint:fix`,
  the ONE script the same change deliberately left non-strict. The reviewer
  rewired `ci` to `lint:fix` and all 9 specs stayed green while
  `--max-warnings=0` had stopped running entirely; the spec's own comment
  claimed to prevent exactly that. Pin command and script names with a word
  boundary (`new RegExp(\`npm run ${step}(?![:\\w-])\`)`), never `toContain` -
  `lint`/`lint:fix`, `test`/`test:e2e`, `build`/`build:prod` all collide. The
  hole is invisible in the passing direction, which is the argument for
  [[verify-a-guard-fix-with-the-attack-that-defeated-it]]. 20260729-092419.
- `verify-a-guard-fix-with-the-attack-that-defeated-it` (x2): after fixing the
  substring hole above, re-running the suite clean proved nothing about it - the
  suite had ALREADY been green with the hole. What proved the fix was re-running
  the reviewer's exact mutations: `ci` pointing at `lint:fix` went 9-passed ->
  2-failed, and blanking the workflow's `npm run lint` step went nothing-red ->
  1-failed. Also the reason the flag itself was falsified as a PAIR (planted
  warning: exit 1 with the flag, exit 0 without) rather than one run - a single
  red proves a warning fails, only the counterfactual proves the flag is why.
  Mutate in two directions: delete the protected thing, and swap it for a
  plausible near-miss. 20260729-092419. Second hit (20260729-092504), where the
  attack falsified the FIX rather than confirming it: told that
  `expect("#autocomplete-box").toBeHidden()` could not fail, the repair was a new
  test that plays the round's last guess in-page with the suggestion list OPEN -
  which looks exactly like reaching the branch, and passed under the reviewer's
  same mutation. `selectAndSubmit` hides the box before `onSelect` hands the guess
  to the game (`src/ui/autocomplete.ts:67`), and the blur handler covers the
  click-away path (it fires even under `page.clock.install`), so the line is
  unfalsifiable in principle rather than merely untested. Re-running the attack is
  what turned a plausible fix into the right answer - delete the coverage claim,
  record why, keep the test for the path it does pin.

- `a-claim-that-a-test-cannot-cheat-must-be-run-not-written` (x1): a reachability
  check scrolled a control into view and then asserted it was visible, with a
  comment explaining why it could not manufacture its own pass ("where there is
  no scroll container a `scrollTop` assignment is inert"). True of
  `overflow: visible`, FALSE of `overflow: hidden`, which Chromium scrolls
  programmatically while neither touch nor wheel can move it: the reviewer
  changed one keyword and the whole modal suite went green on a modal whose
  actions were clipped 15px below the card and unreachable by any real input. A
  sentence claiming a mechanism cannot produce a false pass is a test plan, not
  documentation - run that mutation in the same sitting, and assert the property
  (here: the computed `overflow-y` permits a USER scroll) separately from
  exercising it. Family of [[a-guard-no-test-can-fail-is-a-comment]] and
  [[a-speculative-knob-beside-a-failing-test-is-a-suspect]], with the knob in the
  test. 20260730-111003.
- `replacing-an-assertion-means-enumerating-what-it-asserted` (x1): a modal
  gaining an internal scroll made "every control is visible" unsatisfiable, so it
  was replaced by "every control is reachable". But the old assertion was doing
  TWO jobs - reachability AND containment inside the modal's own box - and only
  one was replaced, so the state where the buttons are drawn straddling the
  card's bottom border onto the backdrop passed at two of five swept sizes. The
  horizontal axis had kept its containment check the whole time, which is what
  made the asymmetry visible once someone looked. Before swapping an assertion,
  list every property the old one happened to pin. 20260730-111003.

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

- `mock-fixtures-hide-real-data-defects-test-the-real-payload` (x3, PROMOTE 2026-08-01 -> 20260801-113136) -> AGENTS.md
  already carries this rule and it recurred anyway, so prose is not holding it.
  Proposal: name `test/dataIntegrity.test.ts` in AGENTS.md as THE home for any
  "holds for the shipped data" claim, so a new content test has an obvious place
  to go rather than a rule to remember. User decides.
  20260729-092352, 20260729-101740.

- `absence-proving-greps-must-be-run-when-written` (x3, PROMOTE 2026-08-01 -> 20260801-113145) -> plan skill. Three
  times a DoD has shipped a `cmd:` absence proof that could never go clean, and
  the third time (20260729-130138) one of TWO such greps in the same DoD was
  narrowed while its sibling four lines away was not. Prose in the plan skill
  already says "run it when you write it". Proposal: make the plan skill require
  every `cmd:` proof in a Definition of Done to carry its plan-time output
  inline (the count it returned and why that count is expected), so an unrun
  proof is visibly incomplete rather than merely optimistic - and so the check
  is per-DoD rather than per-item. User decides.
  20260729-101823, 20260729-092327, 20260729-130138.

- `open-a-neighbouring-record-before-writing-a-new-one` (x3, PROMOTE 2026-08-01 -> 20260801-113123) -> tatr CLI, not
  prose. The rule itself was FOLLOWED the third time and still failed: the
  neighbour that was opened predates the v2 schema migration, so it taught a
  grandfathered shape. Prose cannot distinguish a canonical sibling from a
  legacy one. Proposal: make `tatr scaffold <id> <KIND>` the documented and
  only way a record is created - it already prints the current template - and
  have `tatr check` run as a pre-commit hook on `tasks/`, so a schema drift is
  refused at write time instead of found after the first commit. User decides.
  20260729-182255, 20260730-111003, 20260731-212557.

- `derive-every-number-in-a-table-from-the-same-rig` (x3, PROMOTE 2026-08-01 -> 20260801-113157) -> tooling, not prose.
  All three hits are the same shape: a measured table sits in the record and a
  figure in the prose beside it disagrees with the table - hand-counted the
  first time, measured under a pre-split scope the second, read off the table's
  ROW COUNT the third. Each time the correct number was already in the same
  file, four to ten lines away. Prose telling the author to use the rig cannot
  catch this, because the author believes they did. Proposal: have `tatr check`
  flag a record where the same quantity word appears with two different numbers
  ("N keeps", "N discarded", "N comments") - a cheap textual cross-check inside
  one file, which is where all three defects lived and where all three had their
  own correction sitting in plain sight. User decides.
  20260731-212557, 20260731-212611, 20260731-212612.

- `search-the-whole-record-tree-before-declaring-a-rationale-unrecorded` (x4, PROMOTE 2026-08-01 -> 20260801-113128)
  -> tooling, not prose. Three times a comment has been judged "unrecorded" and
  been recorded all along, each time for a DIFFERENT reason: the grep was scoped
  to the records the comment named (20260731-212610); the terms came from the
  comment's wording rather than its subject (20260731-212612); the terms were
  right and the OUTPUT was under-read, stopping at the `DECISION.md` files while
  the answer sat in the same task's `REVIEW.md` (20260731-212613). Prose has now
  been rewritten twice and failed a third time, because each fix addressed the
  previous instance's reason. The invariant underneath is that "no record holds
  this" is a NEGATIVE claim shipped with no evidence of its own. Proposal: a
  `tatr` subcommand that takes a symbol or phrase and greps `tasks/` whole,
  printing every hit WITH its record KIND, so the author reads a labelled
  listing instead of deciding when to stop scrolling - and so the KIND question
  (is this record a compaction target?) is answered by the tool rather than
  remembered. A fourth hit (20260731-212615) adds a fourth distinct reason: the
  comment cited TWO task IDs, the first had no compaction-target record, and the
  comment was cleared without opening the second - whose `DECISION.md` restated
  it. That strengthens the same proposal, since a tool fed every ID in a comment
  cannot chase only the first. User decides.
  20260731-212610, 20260731-212612, 20260731-212613, 20260731-212615.

- `a-correction-is-a-new-claim-re-derive-it` (x4, DEFER 2026-08-01 at x4: The x4 hit (20260731-212616) was prose, not a figure: a rewritten comment contradicting a flag documented ten lines below it. The proposed figure cross-check (20260801-113157) would not have caught it, so the lesson stays pending until the prose half has a mechanism.) -> tooling, not prose. Four
  hits, each one a FIX that shipped a fresh wrong claim: a corrected colour-scale
  fact reasoned from the palette's order (20260729-092452); a method-level
  finding fixed only at the two instances it named (20260731-212612); and a
  compaction recorded with "so no other figure moves", reasoned from an
  unchanged line count rather than re-measured, which took two further review
  rounds to unwind (20260731-212615); and a comment rewritten for honesty that
  contradicted a flag documented ten lines below it (20260731-212616), which the
  figure-oriented proposal below would NOT have caught. Prose cannot catch this because in each
  case the author had just done careful work and the correction felt like the
  end of the task, not a new claim. Proposal: fold it into the same `tatr check`
  cross-check proposed for
  [[derive-every-number-in-a-table-from-the-same-rig]] - a record whose diff
  changes any figure should have to re-print the block that figure came from, so
  "nothing else moved" is a regenerated table rather than a sentence. User
  decides.
  20260729-092452, 20260731-212612, 20260731-212615, 20260731-212616.

- `close-a-task-with-its-review-and-retro-not-just-the-status` (x3, PROMOTE 2026-08-01 -> 20260801-113117) -> tatr CLI
  guard, not prose. Three sessions have flipped STATUS to CLOSED before the
  REVIEW/RETRO artifacts existed, each time caught after the fact by
  `tatr check`. Prose has not held it. Proposal: make `tatr` REFUSE the
  transition to CLOSED unless `REVIEW.md` exists with an APPROVE verdict in its
  latest round (`--force` for the deliberate exception), so the mistake becomes
  impossible rather than merely detectable. 20260729-092239, 20260729-092339,
  20260729-141427.

- `when-a-fix-changes-an-invariant-grep-its-callers-for-documented-dependencies` (x3)
  -> tooling, not prose. Three hits, each a stated dependency left behind by a
  change that was itself careful: a comment in `src/game.ts` naming the
  auto-open invariant a fix was removing (20260729-141414); `AGENTS.md`'s
  repository map naming the path `src/game.ts` after it became `src/game/`
  (20260731-212610); and three comments naming `src/style.css` as the home of
  rules that had moved into `src/partials/` (20260731-212617), one of them the
  drift guard for `NARROW_VIEWPORT_QUERY`. The third hit is why prose will not
  hold it: the rule as written says to grep a DELETED name, and `style.css` was
  never deleted - it kept its path and lost its contents, so nobody thought to
  grep it. A pointer names a file for what is inside it. Proposal: a `tatr`
  subcommand (or a `work` verification step backed by one) that takes the paths
  a diff moved code OUT of and greps the tree for comments and docs naming
  them, printing each hit for a keep/repoint decision - the input is already in
  the diff, which is what makes it a tool rather than a thing to remember.
  User decides. 20260729-141414, 20260731-212610, 20260731-212617.
