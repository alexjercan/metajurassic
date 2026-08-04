# Review: Ship the v1.0.0 release: CHANGELOG, quickstart README, refreshed FAQ

- TASK: 20260804-151357
- BRANCH: docs/v1-release

## Round 1

- REVIEWER: out-of-context
- VERDICT: REQUEST_CHANGES

- [x] R1.1 (MAJOR) src/faq.html:75 - the hint answer describes the rule the
  game replaced. It says a hint "reveals the shallowest clade in the answer's
  lineage that is not on the tree yet"; `findNextHintCladeId` returns the
  shallowest unrevealed clade that cuts the candidate field to at most
  `HINT_SPLIT_FRACTION`, deliberately skipping rungs that eliminate nothing,
  and falls back to the *deepest* unrevealed clade on ~19% of presses
  (`src/hintRule.ts:6-25`, `tasks/20260729-141424/DECISION.md`). A player
  reading this sees hints jump several levels past what the sentence promises,
  which is the exact FAQ-contradicts-the-game failure the Story exists to end.
  Reword to the phrasing this same change already got right in
  `CHANGELOG.md:27` - "the shallowest unrevealed clade in the answer's lineage
  that meaningfully cuts the remaining field".
  - Response: fixed. `src/faq.html:75-78` now reads "the shallowest unrevealed
    clade in the answer's lineage that meaningfully cuts the remaining field",
    matching `CHANGELOG.md:27` and the `findNextHintCladeId` docstring. The
    finding is correct and its root cause is now recorded in TASK.md's
    Difficulties: Step 4 specified the old wording verbatim.
- [x] R1.2 (MINOR) tasks/20260804-151357/TASK.md:156 - the close-out says "the
  FAQ gained seven `.faq-item` blocks" and then names six in the parenthetical;
  the diff adds six (`src/faq.html` goes from 5 blocks to 11). Line 196's "of
  the seven new answers... the other six" carries the same error forward.
  Change both to six and five respectively. ("twelve flat items" is correct -
  eleven `.faq-item` plus the retained `.faq-archive`.)
  - Response: fixed. Count re-derived the same way (5 on master, 11 on the
    branch): both lines now say six and five. The `.faq-archive` sentence in
    the same paragraph was also rewritten for R1.4, and the Alternatives entry
    that referenced the old choice with it.
- [x] R1.3 (NIT) src/faqCopy.ts:24 - `A hint costs ${HINT_COST} guesses.`
  hardcodes the plural, so a reprice to 1 ships "costs 1 guesses" and
  `test/faqCopy.test.ts` stays green because it only counts integers. Optional:
  pluralize off `HINT_COST` the way `src/shareText.ts:108-114` does, and add a
  `HINT_COST === 1` case. Held at NIT because `src/ui/onboarding.ts:27,132`
  hardcode the same plural - the pattern is the repository's, not this diff's,
  and fixing it only here would leave the surfaces inconsistent.
  - Response: not fixed here; filed as task 20260804-155041, which covers
    `src/faqCopy.ts:24` and both `src/ui/onboarding.ts` sites together and
    names `src/shareText.ts:108-114` as the pattern. Agreeing with the
    reviewer's own reasoning: the defect is latent (HINT_COST is 2, so nothing
    reads wrong today) and pre-dates this diff, so fixing one of three
    surfaces on a release branch buys inconsistency, not correctness.
- [x] R1.4 (NIT) src/faq.html:166 - the retained `.faq-archive` block's
  sentence ("Browse the full museum collection...") now restates the new
  archives answer eleven lines above it. Optional: drop that block's `<p>` and
  keep the bare links, which is what the close-out calls it ("the link
  affordance").
  - Response: fixed. The `<p>` is gone; `.faq-archive` is now its `<h2>` plus
    `.archive-links`. Taken rather than declined because the close-out already
    justified the block as a link affordance, so the duplicated sentence was
    the part that never had a reason. The block itself stays - the two archive
    links are the only navigation off this page. `.faq-archive p` in
    `src/partials/faq.css` went with it; its 20px bottom margin moved onto the
    `h2` so the gap above the links is unchanged.

Verification, not findings:

- `npm run ci` re-run in-session under `nix develop` (E2E_PORT=8193): exit 0,
  185 E2E passed. `npm run build` exit 0.
- R1.1 re-derived independently of the reviewer: read `src/hintRule.ts:1-31`
  and `CHANGELOG.md:25-29` directly; the two prose descriptions of the same
  rule disagree, and the CHANGELOG's is the accurate one.
- R1.2 re-derived by counting `class="faq-item"` on both sides of the diff:
  5 on master, 11 on the branch.
- `cmd:` proofs (CHANGELOG headings, README line count and absent sections,
  pyproject description) pass and were confirmed red on master.
- New tests assert behavior: the E2E hint-price case reads the board's chip and
  asserts the whole sentence shape on `/faq/`, so it fails if the span or the
  mount is reverted. No existing test weakened or deleted.
- Doc sweep: no stale references to the removed README sections outside
  `tasks/`; the seed-mode and Playwright procedure they held already live in
  `AGENTS.md`.

Process signal: Step 4 of TASK.md specified the inaccurate hint wording
verbatim, so R1.1 was seeded by the plan rather than introduced in
implementation - a planning step that wrote player-facing prose from memory of
the rule instead of from `src/hintRule.ts`.

Pending user checks (`manual:`, do not block the verdict):

- Proof 2 - user reads `CHANGELOG.md` and confirms the 1.0.0 section describes
  the game they can play.
- Proof 4 - user opens `/faq/` and confirms every header route has an answer.

Inspection commands:

```bash
cd "$(sprout show docs/v1-release)"
git diff master...HEAD
sed -n '1,31p' src/hintRule.ts && sed -n '25,29p' CHANGELOG.md
grep -c 'class="faq-item"' src/faq.html
nix develop --command bash -c 'npm run ci'
```

## Round 2

- REVIEWER: out-of-context
- VERDICT: APPROVE

Every Round 1 finding verified against the code and ticked. R1.1's reworded
hint answer matches `src/hintRule.ts:6-25` and `CHANGELOG.md:27`; R1.2's counts
re-derived (5 `.faq-item` on master, 11 on HEAD); R1.4's `<p>` is gone and the
20px bottom margin moved onto `.faq-archive h2`, so the gap above the links is
unchanged. R1.3's pushback is sound and its follow-up task exists.

- [ ] R2.1 (MINOR) tasks/20260804-151357/TASK.md:152 - the close-out says
  `README.md` "went from 65 lines"; 65 is the diff-stat churn count. The file
  was 59 lines on master (`git show master:README.md | wc -l`) and is 30 now.
  Change 65 to 59. Same class of defect as R1.2: a close-out number
  transcribed from a diff stat rather than re-derived.
- [ ] R2.2 (MINOR) src/faq.html:90-92 - the round-summary answer attributes
  every row to guesses ("the clades your guesses established... each one next
  to the guesses that revealed it"), but `LadderProvenance` is
  `root | guesses | hint` (`src/rankLadder.ts:26`) and `src/ui/ladderCard.ts:13`
  prints "revealed by a hint" on hint rows, which carry no guesses. A player
  who bought a hint - a surface this same change introduces two items above -
  sees a row the FAQ says does not exist. Add a clause, e.g. "clades a hint
  revealed are labelled as such". Held at MINOR rather than NIT because
  FAQ-contradicts-the-game is the exact failure this task's Story exists to
  end; not a MAJOR because it is an omission on an end-of-round card, not a
  wrong rule a player acts on.
- [ ] R2.3 (NIT) tasks/20260804-155041/TASK.md:24-28 - the follow-up's title
  says "HINT_COST and MAX_GUESSES" but its Context lists only `HINT_COST`
  sites, so the task under-scopes its own title; add `src/faqCopy.ts:16`
  ("You have ${MAX_GUESSES} attempts") and the onboarding brief. Line 32 also
  says "`HINT_COST` 2"; it is 3 (`src/constants.ts:2`). The pushback's
  reasoning is unaffected - the plural is right at either value.
- [ ] R2.4 (NIT) src/faq.html:76-78 - "meaningfully cuts the remaining field,
  so it narrows the field without ever naming the answer" repeats "field" in
  one sentence. Change the second clause to "so it narrows things down without
  ever naming the answer".

Verification, not findings:

- `npm run ci` re-run in-session under `nix develop` (E2E_PORT=8195): exit 0,
  185 E2E passed.
- R2.1 re-derived independently of the reviewer: `git show master:README.md |
  wc -l` is 59, `wc -l < README.md` is 30, and `git diff --stat` reports the
  65 the close-out quotes.
- R2.2 re-derived independently: read `src/rankLadder.ts:26` and
  `src/ui/ladderCard.ts:10-14` directly; the `hint` provenance and its label
  exist and the FAQ answer does not mention them.
- `HINT_COST` re-derived as 3 from `src/constants.ts:2`. Round 1's R1.3
  Response and the follow-up task both say 2; the error is in the rationale
  prose, not in any shipped surface, since no surface hardcodes the number.
- No regression found in the fix commit (660c274): the CSS margin move
  preserves the 20px gap, `.faq-archive` is used only at `src/faq.html:167`,
  and no test was weakened or deleted.

Disposition of the open findings: all four are MINOR or NIT and none blocks the
verdict. R2.1's correct value (59) is now on this record, which is where the
correction durably lives. R2.2, R2.3 and R2.4 are FAQ prose and follow-up
record scope, not release blockers.

Process signal: both record defects across the two rounds (R1.2, R2.1) are
close-out numbers transcribed from diff stats instead of re-derived with the
command that produced them. Worth a habit in the retro.

Pending user checks (`manual:`, do not block the verdict):

- Proof 2 - user reads `CHANGELOG.md` and confirms the 1.0.0 section describes
  the game they can play.
- Proof 4 - user opens `/faq/` and confirms every header route has an answer.

Inspection commands:

```bash
cd "$(sprout show docs/v1-release)"
git show master:README.md | wc -l && wc -l < README.md
sed -n '26p' src/rankLadder.ts && sed -n '10,14p' src/ui/ladderCard.ts
sed -n '88,96p' src/faq.html
nix develop --command bash -c 'npm run ci'
```
