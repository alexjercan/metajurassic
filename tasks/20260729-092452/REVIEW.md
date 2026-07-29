# Review: Align Metajurassic flow with Metazooa expectations

- TASK: 20260729-092452
- BRANCH: research/metazooa-alignment

## Round 1

- VERDICT: REQUEST_CHANGES
- REVIEWER: out-of-context

- [x] R1.1 (MAJOR) tasks/20260729-092452/NOTES.md:210-214 - Section 4.3 says
  Metajurassic "replaced" "the top-down walk that `20260729-141424` measured,
  rejected", and the appended bullet in `tasks/20260729-092327/TASK.md:88`
  repeats it. That is not what the repo does. `src/treeBuilder.ts:37-49` says
  the opposite in its own docstring: "the reveal still walks top-down, one clade
  at a time, but skips the rungs that eliminate nothing", and
  `tasks/20260729-141424/TASK.md:41` says "the reveal stays top-down". What was
  rejected was the ONE-LEVEL-PER-HINT walk, not top-down reveal. In the same
  breath, "cuts the remaining field by at least half" is stated unqualified in
  NOTES 4.3, while the shipped function has a documented fallback that fires on
  ~19% of calls and returns a clade holding MORE than `HINT_SPLIT_FRACTION`. The
  092327 bullet carries that caveat; NOTES 4.3 - the section it points at for
  full context - does not. Suggested change: reword 4.3 and the 092327 bullet to
  "both reveal top-down; Metazooa advances one rank, Metajurassic skips rungs
  that narrow nothing and targets a >=1/2 split, with a ~19% fallback that can
  under-deliver", and cite `20260729-160500/SPIKE.md` alongside
  `20260729-141424` since the spike is where the rule was settled.
  - Response: Reworded 4.3 and the 092327 bullet: both games reveal top-down, what was rejected was the one-level-per-hint walk, and the ~19% under-delivering fallback is now stated in the note itself. `20260729-160500/SPIKE.md` cited. Verified RESOLVED by the round-1 reviewer in round 2.
- [x] R1.2 (MAJOR) tasks/20260729-092327/TASK.md:86-89 - the comparative claim
  "Metajurassic's hint is now the BETTER mechanic at that price" (and NOTES.md
  4.3 "Same price, strictly more information") sits under a `REFERENCE` bullet,
  but it is not captured evidence. The only Metazooa hint artifact in the
  capture is the offer string `hint.0`/`hint.1`; the hint resolution is
  server-side (nothing in `_mode_-*.js`, `Table-*.js` or `action-*.js`
  implements it), so "Metazooa reveals the next rank down, unfiltered" is an
  inference from a UI string plus a local measurement. Since `20260729-092327`
  turns this into player-facing copy, the mislabel is load-bearing. Suggested
  change: keep the verbatim string as `REFERENCE` and split the comparison into
  a `JUDGMENT` bullet that states the inference explicitly.
  - Response: Split into a `REFERENCE` bullet (the verbatim offer string) and a `JUDGMENT` bullet naming the inference and its limit (Metazooa resolves the hint server-side). Verified RESOLVED in round 2.
- [x] R1.3 (MINOR) tasks/20260729-092452/NOTES.md:278-283 - the "Reproducing
  this capture" bundle map is misattributed, so a reader grepping the named file
  will not find the quoted strings. Re-fetched: `hint.0`, `hint.1`,
  `guesser.0-.2`, `game.4`, `modal.0.1`, `modal.2`, `share.0` and
  `table.0-.3,.5-.10` all live in `Table-rFL686Xi.js`; `_mode_-DNoE3pEO.js`
  carries `game.0`, `modal.0.0`, `modal.0.1`, `modal.3` and `table.4`. Suggested
  change: swap the annotations, or replace the per-file map with a single
  `grep -F` across all downloaded bundles.
  - Response: Bundle map corrected and the block now greps across all downloaded bundles. The reviewer re-ran the new commands verbatim in a clean directory; they reproduce. RESOLVED.
- [x] R1.4 (MINOR) tasks/20260729-182255/TASK.md:21 - "the share scale's hot end
  is red/orange" misdescribes the repo's own scale. `CLOSENESS_TIERS`
  (`src/gameState.ts:315-321`) is `⬛ 🟦 🟨 🟧 🟩` with GREEN as the closest tier
  and orange as a mid tier; there is no red in the Metajurassic grid. An
  implementer told to reuse the share tiers plus this warning would build a
  red-hot tree contradicting the grid it is supposed to teach. Suggested change:
  restate as "the scale runs cold `⬛`/`🟦` to hot `🟩`; the collision to watch is
  the green hot end against `node-winner` gold, not `--danger-red`".
  - Response: Restated as cold `⬛`/`🟦` to hot `🟩` with the collision warning redirected to `node-winner` gold. RESOLVED, though the fix introduced R2.1.
- [x] R1.5 (NIT) tasks/20260729-092452/NOTES.md:104-107 - section 1.3 says the
  message line's "entire vocabulary" is four strings; the capture also contains
  `guesser.2` ("Guess", the button) and two tree-side strings, "Keep guessing!"
  and the SSR tip node "Find this Animal!". None narrates a guess result, so the
  conclusion stands, but the claim is stated more absolutely than the capture
  supports. Suggested change: scope it to the message line and name the
  tree-side strings as the exceptions that prove the point.
  - Response: Scoped to the message line and named the two tree-side strings. RESOLVED.

Not findings, recorded as prose by the reviewer: the stated bar, the section-5
"deliberately not aligned" list and the deferral of the in-board-versus-
interstitial fork to a `DECISION.md` in `20260729-092327` are the right shape
for a research task, and no load-bearing choice in this diff itself needs a
`DECISION.md`. All eleven cross-referenced task IDs exist, the three appended
interim notes match what section 6 claims was routed to them, and the two new
tasks carry the priorities and framing the note attributes to them. No AGENTS.md
or README staleness; no non-ASCII punctuation in the added lines beyond quoted
UI glyphs. `tatr check --ledger LESSONS.md` exits 1 only with
`closed-missing-review` / `closed-missing-retro` for this task, which resolve by
construction as this review and the retro land.

Verified by the reviewer directly: `nix develop -c npm run ci` from the worktree
(exit 0, Jest plus 34 Playwright specs, 1 skipped); `test -s NOTES.md`; a
re-fetch of metazooa.com, `/play/game`, `/faq` and the five pinned bundle
hashes, with every quoted string in section 1 re-checked and matched, including
the palette, the share shape, the MiniStats four numbers and the `???` terminal
row; and every cited Metajurassic file and line.

Verified in-session before adopting the round (per the review skill's
re-derivation rule): `src/treeBuilder.ts:37-49` and `tasks/20260729-141424/TASK.md:41`
confirm R1.1; `CLOSENESS_TIERS` in `src/gameState.ts` confirms R1.4 (green is
the closest tier); grepping the two bundles confirms R1.3's attribution; and
`Find this Animal!` / `Keep guessing!` are present in the capture, confirming
R1.5.

Pending `manual:` DoD checks for the user: the note names the core loop; the
note lists priorities for the three moments; implementation work is split into
follow-up tasks; every Metazooa claim carries a capture URL and date.

## Round 2

- VERDICT: REQUEST_CHANGES
- REVIEWER: out-of-context

R1.1 through R1.5 were all verified RESOLVED against the current files (not
against the commit message): 4.3 now matches `src/treeBuilder.ts:37-61` and
`tasks/20260729-141424/TASK.md:41`; the REFERENCE/JUDGMENT split is in both the
note and `20260729-092327`; the corrected capture block was re-run verbatim in a
clean directory and reproduces every quote; the tier direction matches
`CLOSENESS_TIERS` (`src/gameState.ts:315-321`); and 1.3 is scoped to the message
line. Two new findings, both introduced by the fixes.

- [x] R2.1 (MINOR) tasks/20260729-092452/NOTES.md:155 and
  tasks/20260729-182255/TASK.md:21 - the R1.4 fix introduces a wrong gloss:
  "the INVERSE direction of Metazooa's green-to-red". It is not the inverse -
  both scales put GREEN at the closest end. Metazooa's ramp is interpolated over
  `level`, and `level` is distance from the answer (the SSR payload has the
  answer species at `level:0` and the kingdom root at `level:20`), so green sits
  at distance 0; `share-*.js` quantizes the FAR end to `🟥`. Metazooa is
  green-near/red-far, Metajurassic is green-near/black-far: same orientation,
  different cold end. Suggested change: "the same orientation as Metazooa's
  (green is close in both); only the cold end differs".
  - Response: Confirmed independently from the `level` values in the SSR payload
    before adopting - the claim was wrong as written. Both places now say the
    orientation is the same and only the cold end differs, and section 1.4 says
    green sits at distance 0 so the reference description carries it too.
- [x] R2.2 (MINOR) tasks/20260729-092452/NOTES.md:124-125 - leftover from the
  R1.2 rework: section 2 Priority 2 still said "strictly the better mechanic",
  the exact word the fix removed everywhere else, and it points at a 4.3 that
  now walks that back. Section 3's "a better mechanic than the reference" reads
  the same way. Suggested change: mirror 4.3's wording.
  - Response: Both reworded to "on the shipped evidence ... the more useful
    mechanic at the same price".

Recorded by the round's reviewer: `nix develop -c npm run ci` exit 0 (9 Jest
suites / 193 tests, 34 Playwright specs); the branch diff touches only task
records, no `src/`; style clean apart from quoted UI glyphs; the "0.06-0.39
bits" figure is faithful to `tasks/20260729-141424/TASK.md`'s verification
block. `tatr check` diagnostics at that point were `closed-not-approved` and
`closed-missing-retro`, both of which resolve as the approval and the retro
land.

## Round 3

- VERDICT: APPROVE
- REVIEWER: out-of-context

R2.1 and R2.2 were both verified RESOLVED against the current files. On R2.1 the
reviewer re-derived the Metazooa orientation from `colours-DxBDFGLq.js`, the
`level` values in the `play.html` SSR payload and `share-*.js`, and confirmed
all three amended sites now match it as well as `CLOSENESS_TIERS`
(`src/gameState.ts:315-321`); putting the orientation into section 1.4 as well
was noted as a better fix than the finding asked for. On R2.2 the word
"strictly" no longer appears in the note. No new problems were introduced; the
round-3 edits touch only markdown, so the `npm run ci` proof run green at
`53951b3` still stands and was not re-run.

- [x] R3.1 (NIT) tasks/20260729-092452/REVIEW.md:111,125 - the round-2 findings
  were still unticked while their responses recorded them as fixed, so the file
  contradicted itself at a glance. Suggested change: tick both R2 boxes with the
  round-3 verdict.
  - Response: Ticked. They were deliberately left open until this round, because
    the round-2 fixes had not yet been verified by the reviewer who raised them.

The reviewer audited this REVIEW.md against what it actually did and found
nothing misrepresenting its findings or claiming a verification that did not
happen. One compression it flagged rather than filed: round 2 records the
"0.06-0.39 bits" figure as faithful to `tasks/20260729-141424/TASK.md` while
dropping the qualifier that it is marginally conservative at the top of the
measured range (that block lists 0.06 / 0.15 / 0.39 / 0.44 after 1/2/4/6
guesses). The claim as recorded is still true.

Pending `manual:` DoD checks, for the user at flow Finish: the note names the
core loop Metajurassic must preserve; the note lists concrete UI priorities for
first screen, after first guess and game over; implementation work is split into
follow-up tasks (`tatr ls`); every claim about Metazooa carries a capture URL
and date and reproduces from the note's commands. Also pending from the filed
follow-ups, not from this branch: `20260729-182255`'s "mystery and winner nodes
stay visually distinct" inspection, and `20260729-182320`'s depth-to-target fork,
which needs the user's call before anything is built.
