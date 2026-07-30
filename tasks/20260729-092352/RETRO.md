# Retro: Validate Jurassic data and media integrity (with the folded-in media repair)

- TASK: 20260729-092352
- ALSO COVERS: 20260729-092404
- BRANCH: test/jurassic-data-integrity
- REVIEW ROUNDS: 1 (APPROVE, six MINOR/NIT findings, all fixed)

## What went well

- Scanning the real payload BEFORE planning changed the plan. The scan showed
  the graph was clean and the defect was exactly one thing, uniform across all
  150 species - and, unplanned, that every icon was a 1-element list holding
  precisely the species' own clade `image`. That last fact turned the central
  assertion from the weak "is a well-formed URL" into
  `species.icon === clades[species.clade].image`, which also catches a
  well-formed but wrong icon. The stronger invariant existed only because the
  data was read before the test was written.
- Test-first held on a testing task, where it is easy to skip. The integrity
  suite was written and run before the repair, failed 3 of 15 - exactly the
  icon assertions - and the other 12 passed. That is what makes the later green
  mean something.
- Surfacing the real fork to the user paid off. Quarantine-pin versus
  fold-the-repair-in was presented with the constraint that made them exclusive
  (the gate cannot be green with an unquarantined assertion over broken data)
  rather than as a preference. The user picked the option this session had NOT
  recommended, and it produced the better branch: no `test.failing` left
  behind, the e2e `test.fixme` flipped on, and the game's icons actually fixed.
- Sabotaging each new test to confirm it can fail (the staleness pin, the
  guard, the card fallbacks) caught nothing wrong, but the out-of-context
  reviewer ran the same technique and found the one place the technique had NOT
  been applied - see below.

## What went wrong

- R1.3, the finding worth the whole review round: the Python guard added to the
  content pipeline was unfalsifiable. Deleting `validate_attributes` from both
  call sites left the ENTIRE gate green, because every test asserts over the
  committed content, which is clean. Root cause: new behavior was added in a
  language the test suite does not cover, and "the DoD has a `cmd:` proof for
  it" was accepted as equivalent to "a test guards it". A hand-run command is
  evidence for one moment; it is not a guard. The fix (`test_content_pipeline.py`
  in the gate) took twenty minutes and should have been part of the guard's
  first commit.
- R1.4: the guard was added to two of the THREE scripts that write
  `index.json`. `csv_to_json.py` was read during planning and then not
  revisited when the guard was designed, and the AGENTS.md paragraph written
  afterwards said "both conversion scripts" - a sentence that was true about
  the code and false about the claim a reader would take from it.
- Adding `sorted()` to the generator while touching it turned a 150-line
  content repair into a 1886-line diff. Caught by looking at the diff stat
  rather than by any test. Reverted and filed as `20260730-120355`. An
  unrelated improvement made "while I am in here" is not free: it costs the
  reviewability of the change it rides along with.
- Self-inflicted: `git checkout <file>` to undo a deliberate test-sabotage also
  reverted that file's repair, silently putting one of the 150 icons back to
  the broken shape. Only noticed because the next command re-grepped. Reverting
  a mutation with `git checkout` is only safe on a file the branch has not
  already modified.

## What to improve next time

- When a change adds enforcement in a language or layer the test suite does not
  reach, the same change adds the test that reaches it. Ask literally: "if I
  delete this guard, what turns red?" - and if the answer is "nothing", it is
  not a guard yet.
- When guarding a data-writing invariant, enumerate every writer first
  (`grep -l 'open(.*index.json.*w'` here would have listed all three), then
  guard the set. A guard on the paths you happened to be editing reads, from
  the docs, like a guard on the class.
- Mutation-revert with a scratch copy (`cp file /tmp/x.bak` ... `cp back`), not
  `git checkout`, on any file the branch has already changed.

## Action items

- [ ] tatr 20260730-120355: make the generated content graph deterministically
      ordered (the reverted `sorted()`, as its own reviewable diff)
- [ ] tatr 20260730-120401: delete or wire up the dead `src/markdownLoader.ts`
- [x] `scripts/test_content_pipeline.py` added to the gate (R1.3)
- [x] coverage floors raised to just under the new numbers, so the new suites
      cannot be deleted unnoticed
- [x] LESSONS.md: new `a-guard-no-test-can-fail-is-a-comment` and
      `enumerate-every-writer-before-guarding-an-invariant`; bumped
      `mock-fixtures-hide-real-data-defects-test-the-real-payload` to x3
