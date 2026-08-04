# Review: Pluralize HINT_COST and MAX_GUESSES prose off the constant

- TASK: 20260804-155041
- BRANCH: fix/plural-constants

## Round 1

- REVIEWER: out-of-context
- VERDICT: APPROVE

- [ ] R1.1 (MINOR) src/plural.ts:4-8 - the docstring reproduces
  `tasks/20260804-155041/DECISION.md`'s rationale in full (why a leaf module,
  what `src/faqCopy.ts` refuses, where the helper started), which `AGENTS.md`
  `## Comments` sends to "compact to one line plus the pointer"; "rather than
  an export from `src/gameOverCopy.ts` where it started" is archaeology the
  record holds. Cut lines 4-8 and keep lines 10-12 as the stated constraint,
  followed by `See tasks/20260804-155041/DECISION.md`.
  - Response:

- [ ] R1.2 (NIT) test/constantPlurals.test.ts:35-36 - `HARDCODED_PLURAL` pins a
  hand-written noun allowlist (`guess|hint|attempt` plus plurals), so a future
  count noun ("clades", "rounds") reintroduces the defect shape uncaught;
  `test/markupConstants.test.ts` builds its patterns from the constants instead.
  Broaden the alternation to `[a-zA-Z]+s\b` - re-derived here as zero hits over
  `src/**/*.ts` on HEAD, so the stricter regex is green today and covers the
  next noun.
  - Response:

- [ ] R1.3 (NIT) test/constantPlurals.test.ts:6-7 - "Raised as R1.3/R2.3 in
  tasks/20260804-151357/REVIEW.md" is the review-archaeology row of the
  `## Comments` discard table. Drop that sentence; the defect description above
  it already states the invariant and `tasks/20260804-155041/` holds the
  provenance.
  - Response:

No BLOCKER or MAJOR. The Story is delivered: every sentence that interpolates a
game constant now agrees its noun with that constant, and the source scan makes
the invariant repository-wide rather than site-by-site.

Re-derived independently of the round-1 reviewer:

- Red on base. `git grep -nE '\$\{[^}]*\} (guess|guesses|hint|hints|attempt|
  attempts)\b' master -- 'src/*.ts'` returns exactly nine hits in four files -
  `faqCopy.ts:17,24`, `gameOverCopy.ts:23,30`, `shareText.ts:124`,
  `ui/onboarding.ts:27,55,127,132` - and exactly zero on HEAD. That is the
  Close-out's claim, verbatim, and exactly the set the diff fixes.
- `npm run ci` inside `nix develop`: exit 0. `npx jest`: 469 tests in 34 suites,
  matching the Close-out's numbers. No existing test file is edited in the diff,
  which is the no-regression proof for DoD item 4.
- The broadened-regex claim behind R1.2: `\$\{[^}]*\} [a-zA-Z]+s\b` over
  `src/**/*.ts` returns zero hits on HEAD.
- `AGENTS.md` `## Comments` carries the discard rows R1.1 and R1.3 cite, and
  the "a pointer needs a constraint" rule that keeps `src/plural.ts:10-12`.

Every ticked Step matches its literal text against the diff, including the
`MAX_GUESSES`-as-denominator choice in `winSummary` and the already-correct
`shareText.ts:108,114` / `ladderCard.ts:17,19` sites folded in under
DECISION.md. `src/plural.ts` is a load-bearing module-boundary choice and has
its DECISION.md.

Pending user check (does not block APPROVE):

- DoD item 7, `manual:` - the how-to-play card reads correctly in the singular.
  Correctly left unticked and flagged unconfirmed in the Close-out. Reading
  `src/ui/onboarding.ts:127-134` at `HINT_COST`/`MAX_GUESSES` = 1 gives "1
  guess. A name the game does not know..." and "A hint spends 1 guess to name a
  clade...", both correct, but `src/ui/**` is DOM-built and out of node-test
  reach, so the judgement is the user's.

Inspection:

```sh
cd "$(sprout show fix/plural-constants)"
git diff master...HEAD
git grep -nE '\$\{[^}]*\} (guess|guesses|hint|hints|attempt|attempts)\b' master -- 'src/*.ts'
grep -rn 'plural(' src/
nix develop --command bash -c 'npm run ci'
```
