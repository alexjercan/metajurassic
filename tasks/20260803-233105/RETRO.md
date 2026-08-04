# Retro: Make tree nodes keyboard operable

- TASK: 20260803-233105
- BRANCH: feat/tree-keyboard-nav
- REVIEW ROUNDS: 4

## What went well

- Splitting the traversal table into a DOM-free `src/ui/treeNav.ts` and a DOM
  shell in `src/ui/treeKeyboard.ts`, then putting only the pure half inside the
  coverage gate. Thirteen Jest tests cover the edges (missing parent, unknown
  id, only-child Home/End) that would each have cost a browser round trip, and
  coverage rose on all four axes with no floor lowered.
- Sabotage as the acceptance test for a test. Every round's fix was verified by
  deleting the mechanism and re-running, and that habit is what caught three
  separate assertions that were green for the wrong reason - two attempts at
  `Space does not scroll the board`, and the plain-`End` press that would have
  landed exactly where `ArrowRight` already had.
- Round 3's fix strengthened the FIXTURE, not just the assertion: `branchingItem`
  now returns the widest row, so `End` has somewhere to jump that no other key
  reaches. That is the durable form of the habit - an assertion is only pinned
  when the wrong mechanism would produce a different answer.
- The plan's two corrections were caught and recorded at implementation time
  rather than silently absorbed: the clock-pin clause named the wrong page, and
  the fifth test was really two unrelated assertions that a failure could not
  tell apart.

## What went wrong

- Four review rounds, and rounds 2 and 3 found the SAME shape: a mechanism the
  plan named, the implementation built, and no test ever read back. Round 2 was
  the whole ARIA layer - roles, `aria-expanded`, the labels that are the reason
  the task exists - every one deletable with the suite green. Round 3 was the
  `Home` and `End` bindings, deletable with the desktop project green.
- Both hid behind coverage one level away. The tier words had a unit test for
  the ARRAY; the direction table had a unit test for the DIRECTIONS. The split
  that made the pure half cheap to cover is exactly what let that cheap
  coverage stand in for the binding it does not touch. The decision to split
  was right - it just moved where the gap could hide, and nobody moved the
  check with it.
- Round 1 spent its whole effort on whether a NEGATIVE assertion was green for
  the right reason, three attempts and two false. The positive assertions went
  unquestioned because there were none to question - an absence is harder to
  see than a wrong presence.
- One record-level slip survived to round 4: R2.2 renamed a test and the
  close-out prose citing it was not swept, so TASK.md named a proof that no
  longer existed. Fixed in this round.

## What to improve next time

- Breadth: the diff is large (about 1900 lines) but not splittable. Roles,
  roving `tabindex`, key handling and labels are one operable widget - ship half
  and the board is worse than before. The source half is only ~310 lines; the
  bulk is a 660-line E2E spec and the task records. No missed split.
- Churn: the plan-time question that would have prevented three of the four
  rounds is not the from-scratch challenge - the design survived every round
  untouched. It is a Definition-of-Done question: **every mechanism a Step
  names needs a DoD clause that goes red when that mechanism is deleted.** This
  plan's DoD covered behaviours a player performs and skipped the attribute
  layer and two of the six key bindings, both of which the Steps named
  explicitly. Reading the Steps against the DoD, clause by clause, would have
  found both gaps before any code was written.
- Context: no compaction warning and no threshold crossing in the records. The
  four rounds each ran an out-of-context reviewer, and this compound ran in a
  fresh context after a rotation - the handoff held because the branch and the
  records carried the state, not the conversation.

## Action items

- At plan time, cross the Steps against the Definition of Done: any mechanism a
  Step names with no DoD clause that would go red on its deletion is a gap in
  the plan, not in the implementation.
- When a task splits logic into a pure module and a shell, name in the plan
  which clause pins the BINDING between them. Pure-module coverage does not
  reach it.
- Renaming a test sweeps the task records that cite it, the same way renaming a
  symbol sweeps the docs.

## Landing message

```
feat: make the guess tree keyboard operable

The board becomes one ARIA tree widget: role="tree" on the outer list,
role="treeitem" per node, role="group" per nested list, one roving
tabindex, arrows plus Home and End to move, and Enter or Space to open a
node's card through the same onSelect path a click uses. Each item carries
an aria-label naming it, its kind and its state, so the warm/cold feedback
is no longer colour-only, and a :focus-visible ring paints on the focused
box.

The traversal table lives in a DOM-free src/ui/treeNav.ts inside the
coverage gate; src/ui/treeKeyboard.ts holds the roving tabindex and the
delegated keydown and focusin. The mystery target is announced as a
disabled item and stays inert. Pointer behaviour, every existing CSS
selector and the resting board are unchanged.
```
