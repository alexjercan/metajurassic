# Rework hint reveal order and price

- STATUS: CLOSED
- PRIORITY: 88
- TAGS: bug,gameplay,design


## Flow State

- FLOW STEP: DONE
- PLAN STATUS: APPROVED

## Story

As a player who cannot read the tree, I want a hint that actually rescues my
round, so that being lost is recoverable - while a player who CAN read the tree
still has no reason to press it.

## Review Findings

From the playtest pass (`20260729-092435`, NOTES.md F2.2-F2.4), all MEASURED over the real content graph by `scripts/playtest/difficulty.ts`:

- `findNextHintCladeId` (`src/treeBuilder.ts:47`) walks the target's lineage DOWNWARD from the root, so the first hint offered on a fresh board is the second-least-specific clade there is (the root, Dinosauria, is already on screen) - and costs the same 3 guesses as the last.
- Traced: Tyrannosaurus hint 1 reveals `saurischia` (99 of 150 species inside); hint 2 `eusaurischia` (97). Six guesses, a quarter of the budget, to eliminate 53 candidates.
- Buying hints up front never pays for itself. Mean total cost, `consistent` policy: 0 hints 4.7, 1 hint 7.2, 2 hints 10.2, 3 hints 12.7.
- Nor does buying one MID-ROUND, which is the hint's best case (by then the revealed frontier has moved down, so the clade offered is more specific). One hint bought after n guesses, `consistent`: never 4.7, after 1 guess 7.5, after 2 6.8, after 4 5.3, after 6 4.8 - and dividing by the share of rounds that lasted long enough to buy it gives a net **+2.5 to +2.9 guesses per hint actually bought**, out of the 3 it costs.
- The one measured benefit: for the weaker `tree-reader` player a late hint is close to break-even (+0.7 net) and lowers the loss rate from 5.8% to 4.6%. So the hint is a bad buy at every point measured, ruinous up front, and only approaches break-even when a weak player buys one late.
- Hinting down to the target's own clade costs `3 x lineage depth`: median 27 guesses against a 25-guess budget. Only 63/150 targets (42%) are reachable at all; worst is Corythosaurus at 45.

## User Input (20260729)

Recorded verbatim, because it re-framed the task:

> I personally agree with the fact that hints are bad choice, but I wouldn't
> really change them -> keep them top->down + maybe make them cheaper, but
> unsure; I would personally defer this task but record my input for it; or if
> possible but needs a spike/exploration -> hint splits the remaining guesses in
> better halves -> let's actually start a research on making the hint better to
> split guesses

So: the reveal stays top-down, the price is open, and the two-way fork below was
the wrong question. The research ran as `20260729-160500`.

## Direction (DECIDED - see DECISION.md)

`tasks/20260729-160500/SPIKE.md` measured it; the user then rejected the
spike's own bar (return on investment) in favour of a RESCUE bar - a hint is a
desperate move, not an edge - and that flipped the answer. Accepted shape:

- **Reveal: threshold split at `HINT_SPLIT_FRACTION = 1/2`** - the shallowest
  unrevealed lineage clade that cuts the live candidate set to at most half,
  falling back to the deepest unrevealed clade when nothing qualifies. Keeps the
  top-down direction; skips only the rungs that narrow nothing.
- **Price: `HINT_COST` stays 3.** Once the fraction is fixed, price barely moves
  rescue (50/51/55% at cost 1/2/3) and only decides how bad an investment the
  hint is. At 3 it costs an expert +2.2 to +2.4 guesses.
- **`MAX_HINTS`, a new constant: `-1` = uncapped, any positive integer = a
  per-round cap. Set to `-1`.** The mechanism ships now, the cap stays open.

Why these numbers: one hint takes a player who cannot read the tree from 83%
loss to 50% (at 1/3 it is 34%, at 1/4 it is 14% - too generous). The shipped
rule delivers 0.92 bits cold and 0.06-0.39 mid-round, i.e. close to nothing
exactly when a stuck player presses it.

## Steps

- [x] Confirm the build shape with the user and record it in `DECISION.md`.
      Done 20260729: threshold split at 1/2, `HINT_COST` unchanged at 3,
      `MAX_HINTS = -1`.
- [x] Add `HINT_SPLIT_FRACTION` and `MAX_HINTS` to `src/constants.ts`.
- [x] Implement the threshold split in `findNextHintCladeId`. The live candidate
      set is derived from the guess history (a species is still consistent iff
      its LCA with each past guess matches what that guess showed); no new
      persisted state.
- [x] Enforce `MAX_HINTS` in `GameState.canAffordHint()` (and whatever gates the
      button), with `-1` meaning uncapped. Ship the mechanism even though it is
      open, so closing the two-hint collapse later is a constant change.
- [x] Re-run `npm run playtest:hint` and confirm section 5: one hint takes the
      `hint-follower` player from 83% loss to roughly 50%, and the hint stays a
      net LOSS for the `deduce` player at every buy point.
- [x] Hint affordance copy: NOT this task (user, 20260729). `HINT_COST` is
      unchanged so `Hint: Cost 3 Guesses` stays true, and `20260729-092327`
      already owns that string. The guarantee now worth stating, and the ~19%
      fallback caveat, are recorded there instead.
- [x] Test the reveal rule and the affordability edge (a hint must not be
      purchasable into an unwinnable state, and must respect `MAX_HINTS`).

## Verification (20260729, `PLAYTEST_TRIALS=20`)

Measured on the branch with the rule in place, via `npm run playtest:hint`:

- **Rescue.** `hint-follower` loss with the shipped rule at cost 3: 83% with no
  hint, **55% after one**. (At cost 1 it is 50%; the price was set to 3
  deliberately.)
- **Not a shortcut.** For the `deduce` player the hint stays a clear net loss at
  every buy point: **+2.2 / +2.2 / +2.4** guesses per hint bought (up front,
  after 2, after 4).
- **Blind control.** Unchanged and slightly worse, as expected: 83% -> 85%. A
  player who ignores information cannot be helped by more of it.
- **Bits delivered.** 1.57 cold and 1.67 / 1.30 / 0.99 / 0.86 after 1/2/4/6
  guesses, against the old walk's 0.92 cold and **0.06** / 0.15 / 0.39 / 0.44.
  The mid-round emptiness that made the button a trap is gone.
- **Mirror check.** The rig's reproduction of the rule agrees with the shipped
  function 548/548, so the harness measures the game that actually ships.
- **Cost of the rule.** 0.21 ms per `findNextHintCladeId` call with 20 guesses
  on the board; it runs on every UI update, so this was measured rather than
  assumed.

## Definition of Done

- One hint takes the `hint-follower` player from ~83% loss to roughly 50%, and
  a hint remains a net loss for the `deduce` player at every buy point. This
  REPLACES the old bar ("a hint must lower total cost for a deducing player"),
  which the user rejected: a hint that pays off for someone who can already
  deduce is a shortcut, not a hint. (cmd: `npm run playtest:hint`)
- A hint never reveals a clade holding more than half the live candidate set
  when a qualifying clade exists, over the real payload. (test: Jest)
- `MAX_HINTS` is enforced, and `-1` means uncapped. (test: Jest)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Do NOT change `MAX_GUESSES`. The same pass measured 25 as non-binding (0% loss for a deducing player, 5.8% for a tree-reader); the difficulty problem is the hint, not the budget.
- Superseded framing: the original Steps offered a fork between (a) bottom-up at
  cost 3 and (b) top-down at cost 1. The spike measured (a) as a solve button
  (4.98 bits, drops a tree-reader's round from 8.9 to 6.5) and rejected it.
- Spike: `tasks/20260729-160500/SPIKE.md` (sections 1-4 measure ROI, section 5
  measures rescue - the bar this task is built against).
- Decision: `DECISION.md` next to this file.
- The rescue only materialises for a player who can act on a clade NAME. The
  user declined to put a clade-to-species mapping in the round
  (`20260729-141425`) and routed it to the species archive instead, so looking a
  clade up is deliberately effortful.
