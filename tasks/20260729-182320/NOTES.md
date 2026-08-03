# NOTES - Rank-ladder summary of what the guesses have narrowed

Plan drafted during UNDERSTANDING, 20260803. Not authority: `DECISION.md` is,
once the fork below is answered.

## 1. The fork (Step 1, must be answered before any code)

The task exists because Metazooa ships a `Show table` toggle whose ladder ends
in a `???` species row. That row is the entire difficulty question.

| Option | What the player gets | What it costs |
|-|-|-|
| A. Full ladder, `???` rows for unrevealed ranks | Depth-to-target as a number | Hands out information the tree deliberately withholds |
| B. Ladder over the REVEALED lineage only | A compact restatement of the board | Nothing; but must earn its surface |
| C. Do not build | - | Closes the alignment finding as "decided against" |

### Precedent that constrains the answer

`20260729-141425` began as "show which species belong to a revealed clade" and
the user killed that shape verbatim:

> this one we won't do; it feels a bit like cheating (makes the game way too
> easy)

The clade-to-species mapping was pushed out of the round and into the archive.
Option A is the same trade in a different wrapper - it converts a deduction into
a readout - so consistency with that call points away from A.

### Why B is not automatically C

The story is "see how far the answer still is", which only A answers literally.
But the story's stated pain is "instead of re-reading the tree each turn", and
that pain is real and measurable on the current board:

- The tree is a scrolling SVG-ish DOM (`src/ui/treeVisualizer.ts`,
  `src/ui/treeScroll.ts`); on a phone the whole board does not fit at once.
- Nothing on screen answers "which of my guesses joined where" without the
  player tracing branches. `renderLastGuess` shows only the LAST guess's clade.
- Closeness tiers already exist on the data (`SpeciesNode.closenessTier`, from
  `20260729-182255`), so a per-guess warmth column is free.

So B is not a no-op restatement if it is a *per-guess* summary rather than a
redraw of the same nodes. That is the shape proposed below.

## 2. Proposed build if B is chosen

### 2.1 What the player sees

A **Round summary** card inside the EXISTING info panel. Rows, deepest revealed
clade first:

```
Round summary                       4 guesses - 1 hint

Dinosauria            root
  Triceratops         ▪ cold
Ornithischia          from your guesses
  Stegosaurus         ▪ cool
Cerapoda              revealed by a hint
  Iguanodon           ▪ warm
  Parasaurolophus     ▪ hot        <- last guess
```

- One row per REVEALED clade in the target's lineage, ordered root -> deepest.
- Under each clade, the guesses whose join with the target landed there, with
  the same closeness tier the tree and the share grid use.
- A per-clade provenance label: `root`, `from your guesses`, `revealed by a
  hint`. This is the "what your guesses have established" the story asks for.
- A header line with guesses spent and hints bought.
- **No `???` row and no rank count.** The card stops at the deepest revealed
  clade. Depth-to-target is not printed anywhere.

### 2.2 Placement

The panel already owns the "there is something to read" affordance
(`src/ui/panel.ts` header comment, `20260729-092327/DECISION.md`: no second
competing control). So:

- The panel's card container gets a two-tab switcher: `Info` (today's museum
  card, unchanged default) and `Summary`.
- The `⟡` pull tab is untouched - same single entry point, same unseen-card
  behaviour.
- No new top-bar control, no `Return to tree` link (the tree is never replaced -
  unlike Metazooa, we do not swap the board out).

This is the one deviation from the reference worth calling out: Metazooa
*replaces* the tree; we *annotate beside* it. Replacing the board would fight
`arena-wrapper`/`panel-open` layout and the phone-occlusion rule from
`20260729-141414`.

### 2.3 Ordering

`Summary` only. `Chronological` is explicitly out of scope
(`20260729-092452/NOTES.md` section 5).

## 3. Files touched

| File | Change |
|-|-|
| `tasks/20260729-182320/DECISION.md` | NEW. Records the fork and the user's call. Gate for everything below. |
| `src/rankLadder.ts` | NEW. Pure derivation: `GameState` + `CladeNode[]` -> `LadderRow[]`. No DOM, no new state. Walks the roots `buildGuessTree` already returned rather than re-traversing the graph (Step 2). |
| `test/rankLadder.test.ts` | NEW. Seeded round; asserts row order, per-clade guess buckets, provenance labels, and that NO unrevealed clade ever appears. |
| `src/ui/ladderCard.ts` | NEW. `buildLadderCard(rows)` -> `HTMLElement`, same shape as `createCladeCard` in `src/ui/card.ts`. `src/ui/**` is out of jest coverage, so it stays dumb - all logic lives in `rankLadder.ts`. |
| `src/ui/panel.ts` | Tab state + `renderLadderCard(state, data, roots)`; keep `manuallyClosedPanel` semantics intact (do not route through `openPanel`). |
| `src/game/index.ts` | Re-render the summary from `updateUI()` alongside `renderLastGuess`, using the roots already built there. |
| `src/index.html` | Tab markup inside `#info-panel`, above `#panel-card-container`. NOTE: this template is registered twice in `webpack.config.js` (daily + `/practice/`), so it must ship working for both - no `hidden`-by-default trick needed here, the summary is valid in practice too. |
| `src/partials/panel.css` | Tab strip + ladder row styles. No new partial, so `src/style.css` is unchanged. |
| `src/partials/responsive.css` | Only if the tab strip needs a narrow-viewport height adjustment; the panel is already `width: 100%` under `(max-width: 768px)`. |
| `e2e/ladder.spec.ts` | NEW. Pixel 5: open the summary, assert it does not occlude the tree (Definition of Done), and assert the deepest row is a revealed clade. |

Not touched: `src/treeBuilder.ts`, `src/gameState.ts`, `src/hintRule.ts`,
`src/shareText.ts`. The summary is a read of existing state; it stores nothing
and changes no rule.

## 4. How it changes the game

- **Difficulty: unchanged.** Every fact on the card is already on the board.
  The candidate-collapse measurement in `20260729-092435` F1.3 (median 3 by
  guess 3) is not moved, because no new constraint is revealed.
- **Legibility: improved mid-round, most on a phone.** "Which guesses have I
  already spent, and how warm were they" becomes one glance instead of a scroll.
- **Teaches the closeness language earlier.** The tier chips repeat what the
  share grid will paste at game over - the same argument that justified
  `20260729-182255`.
- **Risk:** a second thing to read inside one panel. Mitigated by defaulting to
  the existing `Info` tab, so a player who never taps `Summary` sees today's
  game unchanged.

## 5. Definition of Done mapping

| Criterion | Met by |
|-|-|
| `DECISION.md` records the fork and the call | Step 1 artifact |
| Surface matches the decision; does not occlude the tree on a phone | `e2e/ladder.spec.ts` on Pixel 5 |
| `npm run ci` passes | `nix develop -c npm run ci` |

## 6. If the answer is C

Write `DECISION.md` with the reasoning in section 1, set RESOLUTION, and land
nothing. That is an explicitly legitimate outcome per the task's own Notes.
