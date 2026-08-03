# Notes: Name the closeness colour in the how-to-play copy

## What changes

Copy only. Two surfaces currently describe the tree's warmth signal without
mentioning that the board draws it in colour.

| Surface | Before | After |
|-|-|-|
| How-to-play card, "Reading the tree" fact (`src/ui/onboarding.ts`) | "...so the tree is telling you how warm you are." | Same, plus one clause naming the colour: the node's colour runs cold to hot, brightest green is closest. |
| FAQ, "What does the tree show?" (`src/faq.html`) | Clades + proximity to the `?` node. Silent on colour. | Same, plus one sentence on the colour scale and that the shared grid uses the same tiers. |

No behaviour, no scale, no CSS, no new strings elsewhere. A player reading the
card cold learns that a green node is the closest guess, instead of inferring
it from five rounds of trial.

## Surfaces

| File | Why |
|-|-|
| `src/ui/onboarding.ts` | The `buildHowToPlayCard` template literal holds the "Reading the tree" fact. Card copy, not `briefCopy()`. |
| `src/faq.html` | Static `<p class="faq-answer">` for "What does the tree show?". |
| `e2e/onboarding.spec.ts` | Not edited. Re-run as the DoD's proof that layout survives. |

Deliberately NOT touched:

- `briefCopy().feedback` - the four-line pre-guess brief. It is the surface the
  clipping E2E actually guards (`#onboarding-brief`, 1px of slack at the
  tightest covered viewport, `tasks/20260729-092327`), and the task scopes the
  change to the card and the FAQ. Adding a fifth idea there would spend the
  slack those assertions exist to protect.
- `src/closeness.ts`, `src/partials/tree.css`, `src/shareText.ts` - the scale
  and its two renderings. This task describes them; it must not restate their
  numbers.

## Data and interfaces

None added or changed. `buildHowToPlayCard(): HTMLElement` and
`briefCopy(): {...}` keep their signatures; the edit is inside the card's
template literal. `src/faq.html` is static markup with no build-time wiring.

## Sketches

Illustrative only.

`src/ui/onboarding.ts`, inside `buildHowToPlayCard`:

```diff
                     <strong>Reading the tree:</strong>
                     <span>Your guess is placed at the clade it shares with the answer -
                     the group they both belong to. A deeper shared clade means a
-                    closer guess, so the tree is telling you how warm you are.</span>
+                    closer guess, so the tree is telling you how warm you are -
+                    the node's colour runs cold to hot, brightest green closest.</span>
```

`src/faq.html`:

```diff
                         tree, the closer you are to the answer.
+                        Each guess is coloured by how warm it was, cold to hot,
+                        with the brightest green closest - the same five steps
+                        the shared grid's squares use.
                     </p>
```

## Shape

Three surfaces already index one scale. This task adds the two dashed edges -
copy that names the scale - without adding a fourth source of truth.

```
                 src/closeness.ts
              TIER_UPPER_BOUNDS (THE scale)
                        |
          +-------------+-------------+
          |                           |
   tree.css .node-close-*      shareText.ts CLOSENESS_CELLS
   (hue + lightness ramp)          (cold->hot squares)
          |                           |
          +------------+--------------+
                       |
                 (described by)
                       |
          +------------+------------+
          :                         :
  onboarding.ts card         faq.html answer
  "Reading the tree"      "What does the tree show?"
```

## Consequences and open questions

- **Cost.** Two more places that go stale if the palette moves. Nothing
  mechanical binds copy to `TIER_UPPER_BOUNDS`; the block comments in
  `closeness.ts` and `tree.css` already claim the scale lives in one place, and
  prose about it will not be caught by `test/closeness.test.ts`. Accepted: the
  alternative is a copy generator, which is more machinery than one clause is
  worth.
- **What the colour now is.** `20260730-094852` landed
  (`0369f8b`, "carry tree closeness on lightness as well as hue"): the fill
  alpha and text luminance ramp monotonically across tiers, so warmth reaches a
  player who cannot separate the hues. The task's Note says to write against the
  result. Hence "brightest green" rather than "green" - the copy names both
  channels in three words and does not promise the hue alone will land.
- **Layout risk is low but non-zero.** The card is the info-panel surface, not
  the clipped `#onboarding-brief`; the E2E asserts nothing about card height and
  the sweep's tight viewports test the brief. So the DoD's
  `e2e/onboarding.spec.ts` run is a regression guard, not a proof the card
  fits - the card's own fit is eyeball-only. Worth stating, not worth new
  scaffolding here.
- **Open: does the FAQ name the emoji grid explicitly?** The sketch says "the
  shared grid's squares", which ties the surfaces together as the task's third
  Step asks. If the grid is meant to stay unmentioned in the FAQ, that clause
  drops and the sentence stands alone.
- **Open: "colour" vs "color".** `src/faq.html` and `src/ui/onboarding.ts`
  carry no existing spelling of either word (the DoD's `grep` returns nothing
  today). Assumption: British "colour", matching the task records and the
  `closeness.ts` comments.
