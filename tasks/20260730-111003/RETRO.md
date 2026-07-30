# Retro: 20260730-111003 - vertical escape hatch for the game-over modal

One commit, one review round, APPROVEd in round 2. `npm run ci` green (exit 0):
323 Jest tests over 21 suites, the content pipeline, and 114 Playwright cases.

## What went well

**Measuring before planning falsified the task's own first Step.** The task said
to write a case that "fails because a `.modal-actions` control is outside the
viewport vertically" at 568x320. Driving the real screens first showed that at
568x320 every control is inside the viewport - what is cut off is the modal's own
top and bottom edge - and that a control only leaves the screen once the row
wraps, which needs narrow AND short (360x320, 360x300). Had the step been taken
at its word, the reproduction would have asserted a defect that does not exist at
that size and then been "fixed" into passing. Two failure shapes went into the
sweep instead of one, and the correction is on disk above the Steps.

**The mechanism fork went to the user with the constraint named, not just the
options.** `max-height` on the modal and scrolling the overlay both give a
vertical escape hatch, but they are exclusive against an existing promise:
`expectModalFitsViewport` asserts the `.modal` box lies inside the viewport, and
the overlay-scrolling shape makes the box taller than the viewport by design and
retires that guard. Naming that incompatibility - rather than offering two
plausible-sounding CSS snippets - is what made the choice a decision rather than
a preference, and it is what `DECISION.md` records.

**One test per size, not a loop.** The first draft swept the five sizes inside a
single case. It stopped at the first failure and reported one number, saying
nothing about the other four. Splitting it into one case per size per outcome is
what produced the per-size, per-axis reproduction table, and it is the suite -
not this task's notes - that will answer "which size, which axis" on the next
regression.

**Every quoted number was produced against the code that shipped.** The helper
was reworked twice after the first reproduction, so all four mutation experiments
plus the reproduction were re-run at the end rather than recalled
([[a-verification-result-expires-when-the-code-it-ran-against-changes]]). The
reviewer reproduced every one of them independently.

## What went wrong

**The reachability pass could manufacture its own pass, and the comment asserting
otherwise was written before it was checked.** The helper scrolls, then asserts.
The comment claimed that where there is no scroll container a `scrollTop`
assignment is inert, so the pass cannot repair the defect it is looking for. That
is true of `overflow: visible` and false of `overflow: hidden`, which Chromium
scrolls programmatically but neither touch nor wheel can move. The reviewer
changed one keyword and got the entire modal suite green on a modal whose actions
were clipped 15px below the card and unreachable by any real input. The lesson is
not "test the test" in the abstract: it is that a claim about what a mechanism
CANNOT do is a hypothesis, and this one was stated as documentation without ever
being run. Writing the sentence was the moment to try it.

**A one-sided containment check.** The horizontal axis asserts controls inside
the modal's own box; the vertical axis, after the rework, asserted only viewport
reachability. So the state where the pills are drawn straddling the card's bottom
border, half on the backdrop, passed at two of the five sizes. The asymmetry came
from thinking of the vertical rework as "replace visibility with reachability"
when the old vertical assertion was doing two jobs - reachability AND containment
- and only one was replaced.

**A plan step rested on a claim the referenced task's own review had already
refuted.** The plan said to re-run 20260729-141428's horizontal fixes "reverted
one at a time" and expect each to redden. That task's REVIEW.md says in plain
words that its single reverts were all green and only the full parent CSS
reddens. Reading its TASK.md and CSS comments but not its REVIEW.md is what
produced the wrong plan; the correction is recorded in the Steps rather than
quietly dropped.

**Two false numbers reached a committed record.** "In all five, `.modal-overlay`
reports `scrollHeight > clientHeight`" was false at 640x360 - the one size chosen
precisely because it FITS, so it cannot also have unreachable overflow - and a
Definition of Done line quoted the wrapped-row height for a viewport where the
row does not wrap. Both came from generalising a sentence over a set after
measuring most of it, in a table that had the right numbers three lines above.

## Diagnostics worth keeping

Two subpixel puzzles ate real time and both ended in the product being fine and
the instrument being wrong:

1. `scrollIntoViewIfNeeded` left `intersectionRatio` at 0.9955 at every control
   and every short size. Chromium snaps `scrollTop` to whole pixels while this
   layout is fractional, so the 15.188px a control needs is not a position the
   container can hold. The fix is to scroll one whole pixel further, not to relax
   the assertion to `ratio: 0.99` - which would equally pass a control clipped by
   a real bug ([[never-add-a-tolerance-to-silence-an-undiagnosed-failure]]). The
   diagnosis came from printing `intersectionRatio` itself, after a first guess
   ("Playwright rounds the offset") that was close enough to be misleading.
2. Trying to falsify the new containment assertion with `max-height: 30px`, the
   case PASSED - and the reason was that the modal will not shrink below ~58px,
   so a 42px button still fits its clip box. The mutation was not a violation.
   The assertion was then falsified properly by combining `no-overflow-y` with the
   R1.1 guard disabled, which produced the reviewer's 15px exactly.

An unplanned finding from `revert-141428`: `max-height` is an OUTER height only
because of the `box-sizing: border-box` beside it, so that revert (which removes
`box-sizing`) silently turned the cap into a content height and re-clipped the
box. The two declarations are one mechanism; the CSS comment now says so.

## What the screens caught that no assertion could

At 568x320 the fix leaves the action row cut in half by the modal's bottom edge
until the player scrolls, with no persistent scrollbar or other affordance -
strictly better than before on reachability, but a step BACK on legibility at
that size, where master showed the whole row and clipped only the chrome. The
content is 331px against 320px: an 11px gap. Filed as `20260730-160720` (p58)
with the measurements. This is exactly what
[[re-render-and-look-after-every-layout-change-not-once-per-task]] is for; the
geometry was green and the picture was not.

## Do differently next time

1. When writing a comment that says a mechanism CANNOT produce a false pass, run
   the mutation that would prove it in the same sitting. The sentence is a test
   plan, not documentation.
2. When replacing an assertion, enumerate the jobs the old one was doing before
   writing the new one. "Visibility" was also containment.
3. Read a referenced task's REVIEW.md, not only its TASK.md and the CSS comments
   it left behind. Its findings are where its own claims got corrected.
4. A sentence quantified over a swept set ("in all five...") is an assertion.
   Check it against every member, or scope it to the ones measured.
