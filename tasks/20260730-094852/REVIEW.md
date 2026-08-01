# Review: Make the tree's closeness readable without colour

- TASK: 20260730-094852
- BRANCH: feature/tree-closeness-lightness-ramp

## Round 1

- REVIEWER: out-of-context
- VERDICT: REQUEST_CHANGES

- [x] R1.1 (MAJOR) tasks/20260730-094852/DECISION.md:73 - every recorded fill
  luminance composites the tint over `--node-bg` `#151820`, but
  `.node-close-*`'s `background` is a SHORTHAND that replaces `.node-box`'s
  `background: var(--node-bg)` outright (same specificity, later in the file),
  so the tint actually composites over the page `--bg-dark` `#0a0c10`.
  Re-derived independently: the real values are 0.0061 / 0.0085 / 0.0216 /
  0.0244 / 0.0355, adjacent ratios 1.04 / 1.22 / 1.04 / 1.15. Correct the
  numbers in DECISION.md "Consequences", `TASK.md:54` and the close-out at
  `TASK.md:83`, and say the basis is the page background, not the node
  background. MAJOR rather than MINOR because `src/partials/tree.css:180`
  instructs the next maintainer to "retune these values only against that
  test" while the records hand them the wrong compositing basis to reason
  with. The conclusion the numbers support - fill alone is too weak to carry
  the ramp - survives the correction unchanged.
  - Response: Fixed. DECISION.md "Consequences", TASK.md:54 and the close-out all name the page background as the basis and carry the recomputed numbers; src/partials/tree.css says so too, next to the retune instruction.
- [x] R1.2 (MINOR) src/partials/tree.css:176 - the rewritten block comment
  keeps the claim that the fill "separates a guess from a clade", which is not
  true at the cold end: over the page background, tier 0 lands at 0.0061 and
  tier 1 at 0.0085 against a clade node's flat 0.0092, a contrast ratio of
  1.06 and 1.01. Amend the comment to say the fill carries the guess/clade
  split at the WARM tiers, where the amber collision actually lives, and that
  the cold tiers lean on border and text instead.
  - Response: Fixed. The comment now says the fill does the guess/clade job at the WARM tiers only, and that the cold end never did it - on this scale or the flat 0.14 one before it.
- [x] R1.3 (MINOR) scripts/playtest/walkthrough.ts:383 - the phone shot is
  selected positionally as `VIEWPORTS[1]`, so reordering or extending
  `VIEWPORTS` silently photographs a different device. Replace with
  `VIEWPORTS.find((v) => v.name === "mobile")!`.
  - Response: Fixed. Added `mobileViewport()`, which finds the entry by name and throws if VIEWPORTS has no phone.
- [x] R1.4 (NIT) e2e/closeness.spec.ts:14 - `const LADDER = CLOSENESS_LADDER;`
  is a pass-through alias. Delete the line and import as
  `CLOSENESS_LADDER as LADDER` on line 4.
  - Response: Fixed. Imported as `CLOSENESS_LADDER as LADDER`; the alias line is gone.
- [x] R1.5 (NIT) scripts/playtest/walkthrough.ts:47 - the inline
  `import("@playwright/test").Locator` duplicates an import the file already
  has. Add `Locator` to the named import on line 19 and use it bare.
  - Response: Fixed. `Locator` is on the named import from @playwright/test.

Not a finding, recorded because it changes how R1.2 should be read: the cold
end never had fill separation from a clade node. On master, at a flat 0.14,
tiers 0 and 1 sat at ratios of 1.021 and 1.019 against `--node-bg`. This
branch moves them to 1.056 and 1.011 - a wash - while materially IMPROVING the
tiers the earlier decision actually cared about, tier 3 orange against the
amber clade colour going 1.085 -> 1.258. R1.2 is a comment that overclaims,
not a regression the diff introduced.

Verified in session, independently of the out-of-context reviewer:

- Re-derived R1.1 from the stylesheet rather than accepting it. `.node-box`
  (src/partials/tree.css:113) sets `background: var(--node-bg)`; every
  `.node-close-*` rule sets the `background` shorthand later in the same file
  at equal specificity, so `--node-bg` is replaced, not composited onto.
  `--bg-dark: #0a0c10` and `--node-bg: #151820` are both in
  src/partials/tokens.css. Recomputed both the branch's and master's fill
  luminances to reach the numbers above.
- `nix develop -c npm run ci` green from the worktree: Jest, the Python
  pipeline tests, and 126 Playwright specs, `e2e/closeness.spec.ts` among them.
- `tatr check` and `tatr check --ledger LESSONS.md` exit 0.
- The reviewer reverted `src/partials/tree.css` to master in a scratch copy and
  confirmed `the scale is legible without hue` fails there for exactly the
  reasons the close-out records, with the border-hue cases still green.
- The close-out's text luminances and step ratios reproduce exactly. Only the
  FILL numbers are on the wrong basis.
- Border hues are byte-identical to master and rule order is untouched, so
  `20260729-182255` fork 1 stands and no supersede link is owed.

Pending user checks, not resolved by this review:

- `manual:` the greyscale render of a five-tier board keeps the tiers tellable
  apart. Both the implementer and the reviewer read the shot as five ascending
  steps; that is corroboration, not the user's judgement.
- `manual:` the colour render still reads correctly on desktop and phone.
- The mobile greyscale shot is clipped to tiers 2-4, which are the deuteranope
  confusion set. Whether that is sufficient phone evidence is the user's call.

## Round 2

- REVIEWER: out-of-context
- VERDICT: APPROVE

All five round-1 findings verified as fixed. The reviewer re-derived R1.1's
corrected numbers from scratch - recomputing the sRGB source-over composites
and walking the ancestor chain `.tree` -> `.arena` -> `.arena-wrapper` ->
`.game-area` -> `.game-container` -> `body` to confirm no intervening
background - and reached 0.0061 / 0.0085 / 0.0216 / 0.0244 / 0.0355 with
adjacent ratios 1.044 / 1.222 / 1.040 / 1.149. Confirmed.

Two new findings, both from the round-1 fixes themselves and both fixed in
this round:

- [x] R2.1 (NIT) src/partials/tree.css:182 - the new comment said tiers 0 and
  1 "land within a couple of percent of a clade node's luminance", but tier 0
  is 0.0061 against the clade's 0.0092 - a 1.06 contrast ratio and 34% below
  in raw luminance. "A couple of percent" fits tier 1 and master's flat scale,
  not tier 0. Quote the ratios instead.
  - Response: Fixed. The comment now gives the ratios: 1.06 and 1.01 on this
    scale, 1.02 and 1.02 on the flat 0.14 one.
- [x] R2.2 (NIT) src/partials/tree.css:187 - the retuning note was inserted
  between "The fill has two jobs" and "Its second job", splitting the
  enumeration. Move it after the second-job paragraph.
  - Response: Fixed. The shorthand note now hangs off the "retune these values
    only against that test" sentence at the end of the block, which is where a
    maintainer meets it.

Re-verified in session after those two edits: `nix develop -c npm run ci`
green, `tatr check` and `tatr check --ledger LESSONS.md` exit 0. Border hues
and rule order still byte-identical to master.

Pending user checks, carried forward from round 1 and still not resolved by
review:

- `manual:` the greyscale render of a five-tier board keeps the tiers tellable
  apart.
- `manual:` the colour render still reads correctly on desktop and phone.
- The mobile greyscale shot is clipped to tiers 2-4, the deuteranope confusion
  set. Whether that is sufficient phone evidence is the user's call.
