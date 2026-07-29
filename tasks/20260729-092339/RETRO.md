# Retro: Harden tree scaling and mobile scroll behavior

- TASK: 20260729-092339
- BRANCH: fix/tree-scaling-mobile-scroll
- REVIEW ROUNDS: 2

## What went well

- The bug playbook was followed literally: measure, THEN theorise. The
  reproduction table in TASK.md (three viewports, node counts, scroll extents)
  separated three real faults from one reported symptom that does not exist in
  this harness, and the record says so plainly instead of claiming the fix
  closed the original report.
- Extracting the geometry into `src/ui/treeLayout.ts` before touching the
  renderer paid off twice. It made the edges testable without a browser, and
  when review round 1 asked for a scale floor and a bigger-than-viewport case,
  both were a unit test each rather than a browser round trip.
- The rejected instrument was written down. `Input.synthesizeScrollGesture`
  moves the arena by exactly zero under a touch source, and the helper comment
  says so, so the next person does not re-derive it.

## What went wrong

- **The review phase was never run, and the Flow State marker said otherwise.**
  The branch arrived at `FLOW STEP: COMPOUNDING` with STATUS CLOSED and no
  REVIEW.md on disk. The marker is a claim; the artifact is the evidence, and
  only the artifact was missing. Running the review found two majors, so the
  skipped phase was not a formality.
- **R1.1 (major, the relayout ate the player's scroll).** Root cause: the
  rotation fix added a `resize` + `orientationchange` + `ResizeObserver`
  listener where there had been none, and the handler was written for the one
  trigger it was built for. Nobody enumerated what ELSE fires those events -
  Android Chrome's URL bar hiding mid-drag is the obvious one, and it is the
  exact platform and gesture this task exists for. The fix re-created a
  "the tree fights my drag" symptom of the same family as the bug being fixed.
- **R1.2 (major, an assertion tuned to the fixture).** The newest-guess
  containment check asserted a guarantee `focusRect` explicitly does not make
  (DECISION.md fork 2 says the pair is framed only when it fits), and passed on
  5.0px of margin decided by text widths - on a font stack CI does not have.
  Root cause: the assertion was written from what the fixture DID rather than
  from what the code PROMISES, and the margin was never looked at.
- **R1.4 (minor, a tolerance fitted to its own measurement).** The dead-band
  allowance `max(96px, 8% of the range)` passed against a measured band of
  96.25px. That is a threshold chosen by reading the number it had to clear. It
  also had the wrong shape - the band grows with the scale while the
  proportional term shrinks with the tree - so a narrower, perfectly honest
  layout would have failed it. Replacing it with the exact invariant
  (scroll extent <= painted tree + the arena's own padding) removed the knob
  entirely, which is what should have happened first.
- **R1.6 (minor, a restated constant).** The DoD said "node text never renders
  below `MIN_NODE_FONT_PX`", but both specs declared `10.5` by hand, so lowering
  the constant would have left the suite green. The proof was of a number, not
  of the claim.

## What to improve next time

- When a change adds a listener for a browser event, enumerate every trigger of
  that event on the target platform before writing the handler, and decide what
  the handler does when nothing it cares about changed. Default to idempotent:
  recompute, but only ACT when the inputs moved.
- Before asserting a geometric containment, print the margin. Five pixels is a
  coincidence; a hundred is a guarantee. If the margin is thin, the assertion is
  probably claiming something the code does not promise - go read the promise.
- Prefer the exact invariant to a tolerance. If a check needs a fudge factor,
  derive it from the layout that produces it, and if it cannot be derived, that
  is a sign the invariant has not been stated correctly yet.
- Pin a test to the shipped constant by importing it. A restated number proves
  the behaviour, never the claim about the constant.

## Action items

- [x] `never-add-a-tolerance-to-silence-an-undiagnosed-failure` bumped to x2 in
      LESSONS.md, with the "fitted to its own measurement" variant.
- [x] `hand-copied-logic-mirrors-rot-update-them-in-the-same-change` bumped to
      x2 (the restated `10.5`).
- [x] `close-a-task-with-its-review-and-retro-not-just-the-status` bumped to x2
      (closed at COMPOUNDING with no REVIEW.md).
- [x] new lesson `a-new-listener-inherits-every-trigger-of-its-event`.
- [x] new lesson `assert-the-promise-not-the-fixture-and-read-the-margin`.
- Manual acceptance on real Android Chrome and Opera stays pending on TASK.md;
  it is the only part of the original report this cycle cannot close.
