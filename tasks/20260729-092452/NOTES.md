# Metazooa alignment: what the reference game actually does

- TASK: 20260729-092452
- DATE: 2026-07-29
- REFERENCE: <https://metazooa.com>, captured 2026-07-29 (home page,
  `/play/game`, `/faq`, and the shipped client bundles). Commands at the bottom.
- INSTRUMENTS: the captured HTML/JS above; the current Metajurassic sources in
  this repo; the playtest findings in `tasks/20260729-092435/NOTES.md` (reused,
  not re-derived).

Evidence labels, same convention as the playtest pass:

- `REFERENCE` - a fact read out of the captured Metazooa pages or bundles, with
  the string quoted verbatim where the wording matters.
- `ON-SCREEN` - present or absent in Metajurassic, in a captured screen or in
  the code that renders it, with the file named.
- `JUDGMENT` - design opinion. A human pass can overturn it.

**The bar, stated before any comparison.** Fidelity to Metazooa is NOT the
objective function. The bar is: *can a first-time player run the loop - guess,
read the feedback, form a better next guess - and want to come back tomorrow.*
Metazooa is used here as a shipped reference implementation of that loop, not as
a design target to match. Every "Metajurassic should" below is justified against
the bar, and several REFERENCE facts are deliberately NOT adopted (section 5).
Naming the bar first is `LESSONS.md`:
`the-bar-you-measure-against-is-itself-a-design-decision`.

**The single biggest thing this pass found:** the tree teaches no notion of
*closer*, and yet the share grid the player pastes is entirely built out of one.
Metazooa runs a single closeness language - one green-to-red scale keyed on
taxonomic distance - across the tree, the summary table and the share squares.
Metajurassic invented that scale for the share message alone
(`20260729-101823`); on the board, colour means node *type* and nothing means
*warmer*. Everything else here is smaller than that.

---

## 0. Correction: the local `metazooa` checkout is a solver, not the game

This task's step 1 originally said to compare against "the local
`~/personal/metazooa` helper page". That repo is a **solver** for the game: it
scrapes the species list off metazooa.com, uploads it to NCBI CommonTree, and
computes the best next guess (`README.md`, `scripts/get_species.py`,
`metazooa.py`). It is a tool for beating the game and carries no information
about the game's UX. The comparison below is therefore against the played game
at <https://metazooa.com>. Step 1 has been rewritten in `TASK.md` so the next
reader is not sent to the wrong artifact.

## 1. The Metazooa contract

What a player arriving from Metazooa expects the game to do. All `REFERENCE`.

1. **One mystery species per day, guessed by name.** "There is only one Mystery
   Animal per day, but you get 20 guesses to figure it out!" (home). The guess
   input is a combobox over the species list (`Combobox-*.js`), not a bare text
   field.
2. **Every wrong guess is informative, and the information is taxonomic rank.**
   "Wrong guesses will narrow down the answer by taxonomic rank (kingdom,
   phylum, class, order, etc.) The more your guess has in common with the
   answer, the more you will learn about the Animal." (home)
3. **The tree IS the feedback. Nothing narrates it.** The game screen's message
   line has a four-string vocabulary: `"Guess any species to begin!"` ->
   `"Enter your next guess."` -> `"You win! The answer is {{answer}}."` /
   `"No more guesses."` (`guesser.0`, `guesser.1`, `game.4`, `modal.0.1`). The
   only other prose the board produces is on the tree itself and is just as
   silent about the guess: the unknown node reads `"Find this Animal!"` and its
   card body `"Keep guessing!"`. No string in the captured bundles describes the
   relationship a guess revealed. The player reads the graph or learns nothing.
4. **Closeness is a colour, everywhere.** A five-stop scale
   `#3D8F4A -> #999900 -> #C79200 -> #D16500 -> #BA2D00` (green to red) is
   interpolated over the guess's `level` (taxonomic distance to the answer, so
   green sits at distance 0 - the same orientation as Metajurassic's grid) and
   applied to graph nodes, to the summary-table rows, and - quantized to
   `🟩🟨🟧🟥` - to the share grid (`colours-*.js`, `Table-*.js`, `share-*.js`).
5. **The budget is finite, visible and always on screen.** `(20 remaining)` sits
   next to the guess button.
6. **A hint is an explicit, named exchange.** Verbatim: **"Need a hint?
   Exchange 3 guesses to reveal a rank!"** with a button reading `Hint`
   (`hint.0`, `hint.1`).
7. **A second reading of the same state exists.** A `Show table` toggle swaps
   the tree for a table over the answer's rank ladder - columns `Rank`, `Name`,
   `Guesses`, `Hints`, with `Summary` and `Chronological` orderings and a
   `Return to tree` link (`game.0`, `table.0-.8`). The ladder ends in a
   `???` species row, so the player can see how many ranks still separate them
   from the answer.
8. **An encyclopedia card for the current node is part of the game screen.**
   The narrowed clade is rendered as a card - common name, scientific name,
   Wikipedia paragraph, image, `From Wikipedia`, `Hide image` - in normal flow
   below the tree, not over it.
9. **The round is stamped.** The board is titled `Animal #1094`.
10. **The close is a small ritual.** Modal `You win!` / `No more guesses.`,
    "Share your score or play a practice game!", mini-stats (`Games`: Plays,
    Wins / `Streak`: Current, Max), a share button, a practice outlet
    (`New Practice` / `Resume Practice`), and cross-promotion. The share text
    is `Animal #NNNN` + `I figured it out in N guesses!` or
    `I was stumped by today's game!` + the heat grid + `🔥 N | Avg. Guesses: N`
    + the URL + `#metazooa`.
11. **Tomorrow is promised on the home page, not in the modal.** "A new game
    will start in 8h 54m" renders on the page you pass through on the way in.
12. **The rules live on the home page; the FAQ is content questions.**
    Metazooa's `/faq` is four entries - how animals were chosen, taxonomy
    disagreements, why there is no Reptilia, privacy. Not one of them is
    "how do I play".

## 2. The three moments

### First screen

- `REFERENCE` Metazooa's first screen is not the board. It is a page that
  states the goal, states the rank-narrowing rule, shows a worked example tree
  built from guesses against `Homo sapiens`, states the 20-guess budget, shows
  the countdown, and only then offers **"Enter the zoo!"**.
- `ON-SCREEN` Metajurassic's `/` **is** the board. `src/index.html` is a
  `Guesses Left: 25` chip, a `Hint: Cost 3 Guesses` chip, the tree, and an input
  reading "Enter a dinosaur...". Nothing states the objective or the rule
  (playtest F3.1).
- `ON-SCREEN` The rules do exist - `src/faq.html` has "How do I play?" and
  "What does the tree show?" - reachable only from a small grey footer link.
  That is the one place Metazooa deliberately does not keep them.
- `JUDGMENT` **Priority 1 for the first screen: state the objective and the
  rank-narrowing rule on the board, before the first guess.** Metajurassic
  should NOT copy the interstitial (section 5), which means the content
  Metazooa puts on its home page has to live in-board or not at all.
- `JUDGMENT` **Priority 2: the hint chip should name its product, not only its
  price.** Metazooa's string is the model to beat, and on the shipped evidence
  Metajurassic's is the more useful mechanic at the same price (see 4.3) - it
  just never says so.
- `JUDGMENT` **Priority 3: stamp the round.** `Animal #1094` costs one line and
  makes the board feel like today's puzzle rather than a scratch page.
  Metajurassic computes `dinosaur-#NNNNN` already (`formatPuzzleId`,
  `src/gameState.ts:54`) and shows it only inside the share text.
- Everything else the first screen could grow is secondary and belongs behind
  the panel, the archive or the profile.

### After the first guess

- `REFERENCE` Metazooa shows, in one scroll: the tree, the encyclopedia card for
  the narrowed node, the remaining budget, the hint offer, and a `Show table`
  toggle. Colour on the tree encodes how close each guess was.
- `ON-SCREEN` Metajurassic shows the tree plus a slide-over info panel holding
  the museum card (`src/ui/panel.ts`), a `⟡ Info` pull tab, and the two chips.
  The panel occluding the tree on a phone was fixed in `20260729-141414`.
- `ON-SCREEN` **No closeness encoding exists on the board.** `renderTree`
  (`src/ui/treeVisualizer.ts:23-32`) assigns `node-clade`, `node-root`,
  `node-species`, `node-mystery`, `node-winner`, `node-revealed`; `style.css`
  colours those by *kind* - every guessed species is the same blue whether it
  joined the answer at the root or one rank away.
- `ON-SCREEN` No rank-ladder view exists. The tree shows the revealed chain, so
  a player can see where they are but not how far is left.
- `JUDGMENT` **Priority 1 after the first guess: colour guessed species by
  closeness, using the metric the share grid already uses.** This is the
  highest-value alignment change on the board: it teaches at guess 1 the exact
  language the player will paste at game over, and it turns the tree from a
  structure diagram into a warmth diagram. Filed as `20260729-182255`. The
  scale to follow is Metajurassic's own, not the reference's: `CLOSENESS_TIERS`
  (`src/gameState.ts`) runs cold `⬛`/`🟦` to hot `🟩`. That is the same
  orientation as Metazooa's - green means close in both - and only the cold end
  differs, black and blue here against red there. Adopt the idea, not the
  palette.
- `JUDGMENT` **Priority 2: keep the museum card, keep it out of the tree's
  way.** The card is not a deviation to be trimmed (see 4.1).
- `JUDGMENT` **Priority 3, decision-first: the rank-ladder summary.** Filed as
  `20260729-182320`, framed as "decide whether to give depth-to-target at all",
  because it hands the player information the tree currently withholds.

### Game over

- `REFERENCE` Metazooa closes with the modal, mini-stats, share, practice, and
  puts the countdown to tomorrow on the home page.
- `ON-SCREEN` Metajurassic closes with 🏆, "The answer was X",
  `Solved in N / 25 guesses`, and OK / Practice / Share (`src/ui/modal.ts:36`).
  No stats, no countdown - which is exactly open task `20260729-101838`.
- `ON-SCREEN` The share text itself is already at parity or better: same
  shape - id, headline, heat grid, streak and average, URL - built from real
  stats (`20260729-101823`).
- `JUDGMENT` **The close is the one place the original review's "the gap is
  retention polish" call holds exactly.** Priorities, in order: fix the modal
  overflow that already exists on phones (`20260729-141428`), then stats +
  countdown (`20260729-101838`). Nothing new needs filing here.
- `JUDGMENT` Metazooa's own close is LIGHTER than what `20260729-101838` plans:
  four numbers, no distribution histogram. Worth knowing before that task
  designs a big card - the ritual is what retains, not the density.

## 3. What stays Metajurassic

Confirmed to keep, and none of it is in tension with the contract in section 1:

- The museum cards and the dinosaur art - Metazooa ships a card too (1.8); the
  richness is the identity layer, and only its *placement* ever competed with
  the tree.
- The collection/profile, the `/clades`, `/species` and archive surfaces -
  Metazooa has no equivalent. This is Metajurassic being a museum, and it is the
  reason to prefer it over a clone.
- Practice mode, including seeded rounds - Metazooa has practice too, so this is
  contract-compatible.
- 25 guesses rather than 20 (section 5).
- The half-splitting hint (section 4.3), which on the shipped evidence is the
  more useful mechanic at the same price.

## 4. Assumptions this pass falsified

**4.1 "The museum-card richness is a deviation from Metazooa."** False.
`REFERENCE`: Metazooa's own game screen carries an encyclopedia card - common
name, scientific name, a Wikipedia paragraph, an image and a `Hide image`
control. The genre includes the card. The Metajurassic-specific problem was
never the card's existence but that it was presented as a slide-over that
covered the tree on a phone - already fixed in `20260729-141414`. This retires
the framing in this task's own Review Findings ("richer museum-card game ...
can obscure the loop").

**4.2 "Metajurassic should describe each guess result in words."** Not a
Metazooa expectation. `REFERENCE`: the reference game's message line never
mentions the guess at all; it has four strings, and the only other board prose
("Find this Animal!", "Keep guessing!") says nothing either (1.3). A player
arriving from Metazooa expects to *read the tree*. Adding narration may still
be a good idea for onboarding, but it must be argued on the bar, not sold as
parity - and `20260729-092327` should know that before it writes copy.

**4.3 "Metajurassic's hint is behind Metazooa's."** Not on the evidence there
is, and probably the opposite.

- `REFERENCE`: both cost 3 guesses, and Metazooa's offer says it reveals a
  *rank* ("Exchange 3 guesses to reveal a rank!").
- `JUDGMENT`, flagged because it is inference and not capture: **which** rank
  Metazooa reveals is NOT observable from the client. The hint resolves
  server-side; nothing in the captured bundles implements a selection rule. So
  "Metazooa advances exactly one rank per hint, including rungs that narrow
  nothing" is read off the offer string, not measured.
- `ON-SCREEN`: Metajurassic also reveals top-down, one clade at a time - the
  reveal ORDER was never the thing that changed - but it skips the rungs that
  eliminate nothing, returning the shallowest unrevealed clade that cuts the
  still-possible species to at most `HINT_SPLIT_FRACTION` (1/2). What
  `20260729-141424` rejected was the one-level-per-hint walk, which measured
  0.06-0.39 bits mid-round. See `src/treeBuilder.ts:37-60` and, for how the rule
  and its price were settled, `tasks/20260729-160500/SPIKE.md`.
- `ON-SCREEN`, the caveat that must travel with the claim: on ~19% of calls no
  unrevealed clade meets the threshold and the deepest one is returned instead,
  which holds MORE than half the field. The hint can under-deliver; "always
  halves the field" is not true.

So: same price, and on the shipped evidence Metajurassic's rule is the more
useful one, with a documented under-delivering branch. The only thing clearly
lagging is the string on the chip.

**4.4 "The clade-membership gap (playtest F1.2) is a Metajurassic defect."**
Partly falsified as a *parity* claim: no clade-to-members surface was found
anywhere in the captured Metazooa pages either - the guess combobox is the only
species listing, and the table names ranks, not their members. So supplying
members is Metajurassic going BEYOND the reference, not catching up to it.
It may still be the right call on the bar - F1.2 is measured and real - but
`20260729-141425` should own it as an enrichment decision with a difficulty
cost, not as a missing standard feature.

**4.5 The original direction call, "the gap versus Metazooa is retention
polish (share, ritual), not the core loop."** Half right. Retention polish was
real and is now largely closed (share done, stats/countdown filed). But two
core-loop gaps survive it: the board teaches no closeness (2, "after the first
guess") and the rules are in the one place the reference deliberately avoids
(2, "first screen"). The direction call's other half - "keep the tree primary,
keep the museum collection as the identity layer" - is validated.

## 5. Deliberately NOT aligned

- **25 guesses, not 20.** Playtest F2.1 measured 25 as non-binding for anyone
  who reads the tree (`consistent` never lost in 3000 rounds, peak 11). Cutting
  to 20 for parity would punish players for the interface gaps above. No change.
- **No pre-board interstitial.** Metazooa can afford a page between the player
  and the board because its home page also carries the countdown, the sibling
  games and the ad slots. Metajurassic's whole proposition is the board; putting
  a wall in front of it costs the first minute more than the explanation buys.
  The explanation still has to happen - in-board (2, "first screen"). This is a
  fork `20260729-092327` must confirm with the user as a concrete artifact
  before building, not infer from this note.
- **No cross-promotion, no sibling-game shelf.** Nothing to promote.
- **The `Chronological` / `Summary` table orderings.** If the ladder view is
  built at all, one ordering is enough to start.

## 6. Routing

New tasks filed:

- `20260729-182255` (p78, feature/ux) - colour guessed species on the tree by
  closeness, reusing the share grid's metric.
- `20260729-182320` (p58, feature/ux, decision-first) - rank-ladder summary of
  what the guesses have narrowed.

Interim notes added to existing tasks rather than duplicating them:

- `20260729-092327` (onboarding, hint copy) - the verbatim reference hint
  string, the in-board-versus-interstitial fork, and 4.2.
- `20260729-101838` (post-game ritual) - the reference close, and 2 "game over".
- `20260729-141425` (clade membership) - 4.4.

No task filed for the share text (at parity, `20260729-101823`), for the guess
budget (5), or for the game-over ritual beyond what `20260729-101838` and
`20260729-141428` already carry.

## Reproducing this capture

```sh
cd "$(mktemp -d)"
curl -sS -A "Mozilla/5.0" https://metazooa.com/ -o metazooa.html
curl -sS -A "Mozilla/5.0" https://metazooa.com/play/game -o play.html
curl -sS -A "Mozilla/5.0" https://metazooa.com/faq -o faq.html
# the bundle names are content-hashed and WILL change; re-read them from the page:
grep -o -E '/_build/assets/[A-Za-z0-9_.-]+\.js' play.html | sort -u
# then download them all and grep across the set - the i18n keys do NOT sit in
# the bundle their screen suggests (hint.*, guesser.*, game.4 and the table
# columns all live in Table-*.js; _mode_-*.js carries game.0, modal.* and
# table.4), so grep the set rather than a guessed file:
grep -o -E '/_build/assets/[A-Za-z0-9_.-]+\.js' play.html | sort -u \
  | xargs -I{} curl -sS -A "Mozilla/5.0" -O "https://metazooa.com{}"
grep -Fh 'Exchange 3 guesses' *.js        # and any other quoted string
# the five bundles the strings above came from, as of 2026-07-29:
#   Table-rFL686Xi.js      hint.*, guesser.*, game.4, modal.0.1, modal.2, table.*
#   _mode_-DNoE3pEO.js     game.0 ("Show table"), modal.0.0, modal.3, table.4
#   share-Bncg7zYA.js      grid tiers, headline, stats line
#   MiniStats-Dfn6iro5.js  statistics.1-.6
#   colours-DxBDFGLq.js    the five-stop palette
```

Both `play.html` and the home page inline the day's answer in their SSR payload
(`answer:"barnacle"` on the capture date), so do not paste a fresh capture into
a channel where someone is mid-round.
