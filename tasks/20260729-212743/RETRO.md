# Retro: Make the hint chip keyboard reachable

- TASK: 20260729-212743
- BRANCH: feat/hint-chip-keyboard
- REVIEW ROUNDS: 1

## What went well

DECISION.md's Consequences section did the planning. It named the two things
that would otherwise have shipped as silent regressions - the mandatory
`.hint-box[hidden]` rule and the UA button resets - and both became Steps
rather than review findings.

It also named the test-hook migration up front: dropping `.hint-box.disabled`
turns three `not.toHaveClass(/disabled/)` assertions vacuous forever, so the
DoD carried a `cmd:` grep for the hook itself, not just for the feature. That
grep went 9 hits -> 0 and is the reason the migration could not be forgotten.

Review found no BLOCKER or MAJOR. Round 1 APPROVEd with three NITs.

## What went wrong

Nothing in the code. One process near-miss: the out-of-context reviewer filed a
MAJOR against `src/game/hintChip.ts:23`, claiming the live-branch restore was
an unpinned bug that would strand the Practice link in the slot after a
practice "New game". The recording pass re-derived it and it does not hold -
`startAnotherRound` is a `window.location.replace`, so the page reloads and the
template's own `hidden` attributes decide the slot. Downgraded to NIT.

The reviewer's supporting evidence was real (deleting the lines kept all 168
tests green) but its explanation was wrong: the lines are unreachable, not
untested. A mutation that changes no test is evidence of one or the other, and
the two route to opposite fixes - add a test, or delete the code.

## What to improve next time

Planning tracked the deletion of `.hint-box.practice a` but not the property it
was carrying, so `text-decoration: none` had to be rehomed onto `.hint-box`
during implementation. When a Step deletes a CSS rule, list the declarations
inside it and where each one lands, the same way the Steps already listed the
UA resets.

## Action items

- None. R1.1-R1.3 are NITs on comment wording and one unreachable pair of
  lines; leaving them is an accepted outcome of the APPROVE.
- The `manual:` DoD line stays pending for the user's own visual judgement at
  desktop and 360px.
- Follow-up already seeded during work: `20260803-233105`, keyboard-operable
  tree nodes. This task's `:focus-visible` rule is the app's first, and a
  global focus convention belongs to that task, not this one.

## Landing message

```
feat: make the hint chip keyboard reachable

The hint chip was a <div> with a click listener, so the round's rescue
mechanic existed for a mouse and for nothing else. It is now a real
<button>, and the game-over Practice route moves out of it into a sibling
<a> sharing the same slot, since a link nested in a button is invalid.

Unaffordable becomes native `disabled` rather than a class whose only
teeth were `pointer-events: none`, which stopped a pointer and nothing
else. Three specs asserting `not.toHaveClass(/disabled/)` move to
`not.toBeDisabled()`; they were vacuous against a <div>.

Appearance, size, position and copy are unchanged in every state.
```
