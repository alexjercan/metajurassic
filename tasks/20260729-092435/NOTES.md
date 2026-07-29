# Playtest pass: findings

- TASK: 20260729-092435
- DATE: 2026-07-29
- INSTRUMENTS: `scripts/playtest/difficulty.ts` (simulation over the real
  content graph), `scripts/playtest/walkthrough.ts` (browser screen capture,
  desktop 1280x800 and Pixel 5, daily and seeded practice)

Every finding carries an evidence label. See `DECISION.md` for why this pass is
instrumented rather than narrated.

- `MEASURED` - a number from the simulation over `src/jurassic/index.json`.
- `ON-SCREEN` - present or absent in a captured screen of the running game, or
  in the code that renders it, with the reproduction named.
- `JUDGMENT` - design opinion. Not playtest data; a human pass can overturn it.

**The single biggest thing this pass found:** the game asks the player to
perform a deduction - which dinosaurs live inside clade X - that it barely
supports. For the internal clades the tree usually shows, no surface answers it
at all; for leaf clades the only answer is an FAQ-linked carousel of 150 cards.
Everything else is smaller than that.

---

## 1. Can a player infer the next guess from clade feedback?

**F1.1 `MEASURED` - the feedback is worth a great deal, if you can use it.**
Four simulated policies over all 150 targets, 20 trials each:

| policy | what it knows | loss rate | median | p90 | max |
|---|---|---|---|---|---|
| `blind` | ignores the tree entirely | **84.8%** | 13 | 23 | 25 |
| `tree-reader` | only "the target is inside the revealed clade" | 5.8% | 8 | 16 | 25 |
| `consistent` | full LCA deduction | 0.0% | 4 | 7 | 11 |
| `optimal` | best splitting guess each turn | 0.0% | 4 | 5 | 6 |

Reading the tree at all is the difference between losing five times in six and
losing one time in seventeen. The loop is sound.

Read the cost columns next to `loss rate`, not instead of it: they are computed
over WON rounds only, so `blind`'s "median 13" describes the 15.2% of rounds it
managed to win, not the policy. `optimal` is deterministic and runs once per
target (n=150); the others run 20 trials each (n=3000).

**F1.2 `ON-SCREEN` - no surface maps a clade to its members, and the only
inverse route is an FAQ-buried 150-card scan that helps for leaf clades only.**
After a guess the player is told, say, "Cerapoda". To act on that they must name
a Cerapodan. What the game offers:

- the tree renders only *guessed* species plus the `?` placeholder
  (`src/treeBuilder.ts` `buildGuessTree` walks `guessedSpecies`, never the
  clade's members);
- the info-panel clade card is name, silhouette and description only
  (`src/ui/card.ts` `createCladeCard`) - captured in
  `03-after-first-guess-*.png`;
- the `/clades` page renders those same cards (`src/clades.ts`);
- `/species` (`src/species.ts`) *does* give the inverse: all 150 species,
  alphabetical, each card carrying `Clade: <name>` (`src/ui/card.ts:101`). But
  it is reachable only from a link inside the FAQ (`src/faq.html:81`), it is a
  horizontal carousel of 150 cards, and each card names a species' **immediate**
  clade only. So it can answer "who else is in Ceratosauria" by brute-force
  scan, and cannot answer "who is in Cerapoda" at all, because no card mentions
  an ancestor clade.

So the clade the tree usually shows you - an internal one - has no membership
surface anywhere, and the leaf clades that do have one require leaving the game,
finding a link in the FAQ, and reading 150 cards. A real player therefore sits
somewhere between `blind` and `tree-reader` depending on how much dinosaur
taxonomy they already carry, and the game does very little to move them up. That
gap - an 84.8% loss rate at one end, 5.8% at the other - is the whole ballgame.

**F1.3 `MEASURED` - the field collapses fast once you can deduce.** Candidates
still possible for a `consistent` player: median 51 after guess 1, 12 after 2, 3
after 3, 1 after 5. The information is there; the interface is what withholds
it.

**F1.4 `MEASURED` - a fifth of the answers are gifts.** 84 leaf clades, median 2
members, 34 of them singletons: 23% of targets are decided the moment their own
clade appears.

> **-> task filed: give the player a way to see who is in a clade.**

---

## 2. Do 25 guesses and hint cost 3 feel fair?

**F2.1 `MEASURED` - 25 is not the binding constraint, and should not change.**
Nobody who reads the tree runs out: `consistent` never lost a single round of
3000 and peaked at 11; `tree-reader` lost 5.8%. A tighter budget would punish
the player for the interface gap in F1.2, not for playing badly. **No task.**

**F2.2 `MEASURED` - the hint is the real difficulty defect. It is both
mispriced and pointed the wrong way.** `findNextHintCladeId`
(`src/treeBuilder.ts:47`) walks the target's lineage *downward from the root*,
so the first hint offered on a fresh board is the second-least-specific clade
there is (the root, Dinosauria, is already on screen), and it costs the same as
the last.

Traced on real targets:

```
Tyrannosaurus:  hint 1 -> "saurischia"     99 species inside  (3 guesses spent)
                hint 2 -> "eusaurischia"   97 species inside  (6 guesses spent)
                hint 3 -> "theropoda"      70 species inside  (9 guesses spent)
Stegosaurus:    hint 1 -> "ornithischia"   51 species inside  (3 guesses spent)
                hint 2 -> "genasauria"     50 species inside  (6 guesses spent)
```

Six guesses -- a quarter of the entire budget -- to go from 150 candidates to 97.

Across all targets, buying hints up front never pays for itself:

| hints bought up front | total cost, `consistent` | total cost, `tree-reader` |
|---|---|---|
| 0 | 4.7 | 9.2 |
| 1 | 7.2 | 11.0 |
| 2 | 10.2 | 13.6 |
| 3 | 12.7 | 15.4 |

Up front is the hint's *worst* case, though, because only the root is revealed
so the game has nothing specific to offer yet. The fair test is the case a stuck
player is actually in: play a few guesses, then buy one. By then the revealed
frontier has moved down and the hint is more specific. Measured that way (one
hint, bought after n guesses; `boughtIn` is the share of rounds that actually
bought one - a round that ended before guess n never gets there, and a shallow
lineage can run out of clades to reveal):

| when | `consistent` cost | boughtIn | `tree-reader` cost | boughtIn | `tree-reader` loss |
|---|---|---|---|---|---|
| never | 4.7 | - | 9.2 | - | 5.8% |
| after 1 guess | 7.5 | 97% | 10.5 | 97% | 5.6% |
| after 2 | 6.8 | 75% | 10.0 | 87% | 5.1% |
| after 4 | 5.3 | 24% | 9.6 | 64% | 4.9% |
| after 6 | 4.8 | 4% | 9.5 | 43% | 4.6% |

Dividing the cost increase by `boughtIn` gives the net cost of one hint that was
actually bought: **+2.5 to +2.9 guesses for a deducing player at every point
measured** - it spends 3 and saves almost nothing, because it reveals a clade a
deducing player has already ruled in. For the weaker `tree-reader` a late hint
is close to break-even (+0.7 net at "after 6": costs 3, saves ~2.3) **and it
does lower the loss rate, 5.8% -> 4.6%**. Treat that +0.7 as an upper bound
rather than a clean estimate: because costs are averaged over won rounds, the
1.2 points of rounds the hint newly rescues re-enter the pool as the most
expensive wins there are, inflating the mean. The bias runs against the hint, so
"close to break-even" is the conservative reading.

So the honest statement is narrower than "never buy one": **a hint is a bad buy
at every point measured, ruinous up front, and only approaches break-even when a
weak player buys one late.** Its one real benefit - fewer lost rounds for weak
players - costs them 3 guesses to get.

**F2.3 `MEASURED` - and the hint can never reach anywhere useful.** Because it
descends one level per purchase, hinting all the way to the target's own clade
costs `3 x lineage depth`: a median bill of **27 guesses against a 25-guess
budget**. Only **63 of 150 targets (42%)** can be hinted to their own clade at
all; the worst (Corythosaurus) would cost 45.

**F2.4 `JUDGMENT`** - the fix is a design fork, not a number tweak. Either the
hint reveals from the *bottom* of the unknown lineage (most specific first,
which is what "hint" implies), or it stays top-down and costs 1. The mid-round
numbers argue that pricing alone will not save the top-down walk: even at its
best moment it saves a strong player almost nothing, because it reveals what
they have already deduced. Recording that fork properly belongs in the
implementation task, not here.

> **-> task filed: rework hint reveal order and price.**

---

## 3. Where does the first minute stall?

### Desktop

**F3.1 `ON-SCREEN` - the objective is never stated.** The first screen
(`01-first-screen-desktop.png`) is a "Guesses Left: 25" chip, a "HINT: COST 3
GUESSES" chip, the word "Dinosauria" over a dashed red `?`, and an input reading
"Enter a dinosaur...". Nothing says what winning is, what the `?` is, or that
the tree is feedback. The FAQ is a footer link in small grey text.

**F3.2 `ON-SCREEN` - the hint chip states its price and never its product.** It
reads exactly `HINT: COST 3 GUESSES`. Combined with F2.2, the one piece of
information the player is given about hints is the only one that argues against
using them.

**F3.3 `ON-SCREEN` - the panel pull tab is an unlabelled `✧` clipped by the
viewport edge** on both desktop and mobile (visible at the right edge of
`01-first-screen-desktop.png` and `01-first-screen-mobile.png`). It is the only
route back to the info panel.

**F3.4 `JUDGMENT`** - once a guess lands, desktop reads well:
`04-after-hint-desktop.png` shows Dinosauria -> Cerapoda -> {Iguanodontia, Triceratops}
with the `?` under Iguanodontia, and the panel beside it rather than over it.
The task's prior "desktop is playable after a short learning period" holds.

### Mobile (Pixel 5)

**F3.5 `ON-SCREEN` - the panel still hides the whole game, from the first guess
onward.** `20260729-092315` fixed the pre-first-guess case only. From guess 1 the
panel auto-opens and, being full-width on a phone, covers the tree completely:
`03-after-first-guess-mobile.png` shows the Cerapoda card and **no tree at all**.
The player is shown a museum card instead of the feedback they just earned.

**F3.6 `ON-SCREEN` - a mid-game reload does the same thing again**, confirming
open task `20260729-125313`: `07-returning-midgame-mobile.png`, two guesses in,
23 left, tree entirely hidden behind the card. On desktop the same reload is
harmless; on mobile it is the whole screen.

**F3.7 `ON-SCREEN` - the panel card is clipped mid-sentence** with no scroll
affordance ("...allowing them to rapidly crop fresh vegetation with their beaks
while" - `03-after-first-guess-mobile.png`).

**F3.8 `ON-SCREEN` - the game-over modal is wider than the phone viewport.** In
`05-win-modal-seed42-mobile.png` the action row runs off both edges: "OK" is
clipped at x=0 and the "Share" button is cut off on the right. Share is the
retention action and it is the one hanging off the screen.

**F3.9 `ON-SCREEN` - the first screen is mostly empty on mobile**: the two-node
tree floats in the middle of the arena with large blank bands above and below
it, so most of the vertical space between the top bar and the input carries
nothing.

> **-> tasks filed: keep the tree visible on mobile (panel behaviour + pull
> tab + card overflow + the empty first screen, F3.9); fix the game-over modal
> overflow.**
> **-> interim notes added to `20260729-092327` (objective, hint copy) and
> `20260729-125313` (reload).**

### Input

**F3.10 `ON-SCREEN`, reproduced - the autocomplete goes dead mid-round.**
`src/ui/autocomplete.ts` slices to 8 matches *before* filtering out already
guessed species:

```ts
.filter((name) => name.toLowerCase().includes(normalized))
.slice(0, 8)                       // <- cut first
.filter((name) => !isGuessed(name)) // <- filter after
```

Reproduced in the browser, and committed as a re-runnable scenario
(`autocompleteEndurance` in `scripts/playtest/walkthrough.ts`, on
`/practice/?seed=5`): 83 species contain "saur"; after guessing the first 8 of
them, typing "saur" shows an **empty** list while 75 valid unguessed candidates
remain. Typing a full name and pressing Enter
still works, so it is not fatal - but the primary input affordance dies exactly
when the player is deep in a round and narrowing down.

**F3.11 `ON-SCREEN` - no prefix ranking.** Typing "tyr" offers
`Yutyrannus, Styracosaurus, Tyrannotitan, Tyrannosaurus, Nanotyrannus` - source
order, substring match. The dinosaur the player is almost certainly typing is
fourth.

> **-> task filed: fix autocomplete filtering order and rank prefix matches.**

---

## 4. Is the session close worth coming back for?

**F4.1 `ON-SCREEN` - the share text is good now.** All five branches rendered
side by side (per `LESSONS.md` `render-every-branch-of-a-message-side-by-side`):

```
DAILY WIN            DAILY WIN + HINT      DAILY LOSS
⬛⬛🟩🟩🦖            ⬛🟩🦖💡              🟨🟨🟧🟧🟦⬛🟩🟧⬛⬛🟨⬛🟧🟨🟨🟦🟧⬛🟧🟧🟩🟩🟨🟦🟩
🔥 4 day streak | Avg. 5.6                 Avg. 5.6   (no streak brag on a loss)
```

The grid varies, the loss withholds the streak, practice is labelled
"Practice Dinosaur". `20260729-101823` did its job.

**F4.2 `ON-SCREEN` - the headline stutters.** It renders
`✅ Dinosaur dinosaur-#00211 🦖`: `formatPuzzleId` already returns
`dinosaur-#00211` and `formatGameStateForSharing` prefixes "Dinosaur " again.
Small, but it is the first line of the thing players paste.

**F4.3 `ON-SCREEN` - the close itself is thin.** The win modal is a trophy, the
answer, and `Solved in 2 / 25 guesses`
(`05-win-modal-seed42-*.png`). No streak, no distribution, no countdown - which
is exactly what open task `20260729-101838` describes. The loss modal reads
`You used all 25 guesses`, correct in the no-hint round captured here and
already known wrong when hints were spent.

**F4.4 `JUDGMENT` - would I paste it? Yes, now.** The grid tells a story and the
stats are real. **Is there a reason to come back tomorrow? Not yet** - nothing
on the end screen refers to tomorrow at all. The share message is the retention
asset and the modal around it is not.

**F4.5 `ON-SCREEN` - practice mode.** A seeded round is reproducible and shares
distinctly. A reload starts a *brand new random* round
(`src/practice.ts` calls `createNewGameState`, not `loadGameState`), confirming
open task `20260729-101754`. At game over the hint chip turns into a "Practice"
link and the modal offers a Practice button; on the practice page itself both
mean "play again", which works.

> **-> task filed: share headline stutter.**
> **-> interim notes added to `20260729-101838` and `20260729-101754`.**

---

## 5. Incidental

**F5.1 `ON-SCREEN` - content punctuation drifts from the repo convention.** The
authored markdown under `src/jurassic/` contains 97 en dashes and 37 em dashes
across 113 files (mostly period ranges like `Late Jurassic (153–148 Ma)` and
`diastema—a distinct...`), where `AGENTS.md` asks for plain ASCII. Cosmetic, and
visible in the panel card on every guess.

> **-> task filed (low priority).**

---

## What a human playtest still has to check

This pass cannot speak to any of the following, and none of it should be treated
as settled:

1. **Whether the tree is legible as feedback at a glance.** F1.1 proves the
   information is decisive; it says nothing about whether a person looks at
   Dinosauria -> Cerapoda -> `?` and understands what to do next.
2. **Whether F1.2 is actually experienced as unfair or as the challenge.** A
   dinosaur enthusiast may enjoy supplying the taxonomy themselves. The fix
   direction (reveal clade members) could remove the game.
3. **How long the first minute feels.** Dead space (F3.9) and an unstated
   objective (F3.1) may read as calm rather than empty.
4. **Whether losing feels bad.** The simulation says almost nobody who reads the
   tree loses; it cannot say whether the 5.8% who do come back.
5. **Whether anyone would actually share.** F4.4 is opinion about a message, not
   observed behaviour.
6. **Real device behaviour.** Everything mobile here is Chromium emulating a
   Pixel 5 at a fixed viewport. Touch scrolling, the software keyboard resizing
   the viewport, and Safari are untested - and the keyboard in particular
   interacts with F3.5 and F3.9.

## Reproducing this pass

```sh
nix develop
npm run playtest:difficulty          # the numbers
npm run serve                        # in another shell
npm run playtest:walkthrough         # the screens -> playtest-shots/
```
