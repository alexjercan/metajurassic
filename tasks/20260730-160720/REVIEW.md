# Review: Let the game-over modal fit a landscape phone without scrolling

- TASK: 20260730-160720
- BRANCH: fix/short-viewport-modal-compaction

## Round 1

- REVIEWER: out-of-context
- VERDICT: APPROVE

- [ ] R1.1 (MINOR) src/partials/responsive.css:382 - the post-trim numbers in
  the block comment are wrong and contradict `DECISION.md` and the Close-out,
  which both say 271. Re-measured on this branch: the card is 271px at 568x320,
  480x320, 640x360 and 900x400, and `#modal.clientHeight` is 271 there too -
  286/368 is the `calc(100% - 32px)` CAP, not the box the content sits in.
  Replace with "271px of card against the 286px cap at 568x320 (15px of slack),
  and 271 against 368 at 900x400".

Verified independently, on the branch worktree:

- `npm run ci` green, 150 passed, exit 0.
- Re-measured `#modal` scrollHeight/clientHeight with a throwaway spec (deleted;
  the numbers are here): 271/271 at 568x320, 480x320, 640x360 and 900x400;
  362/286 at 360x320 and 362/266 at 360x300, so the two sizes that keep the
  scroll really do still overflow; 433/433 unchanged at 393x852, so nothing
  above 480px of height moved.
- Red on base for the intended reason: with `src/partials/responsive.css`
  reverted to master, `expectModalNeedsNoScroll` fails with "at 568x320 the
  modal holds 433px of content in a 286px box ... 147px of it is below the
  fold" and "at 900x400 ... 457px in a 366px box". Both new assertions are
  load-bearing.
- Block order: the new `@media (max-height: 480px)` is the last of four
  (`max-width: 768px` at 3, `max-height: 700px` at 307, `max-height: 620px` at
  337), so the ordering lesson the plan cites is honoured; the 900x400 case
  proves the height axis alone against the desktop `padding: 40px 48px` step.
- Scope of the block: only `padding-top`/`padding-bottom`, `margin-top`/
  `margin-bottom` and `font-size`, as DECISION.md commits to. No `max-width`
  and no horizontal padding, so no restatement is owed and the 393px one-row
  promises compute from unchanged numbers. `.modal` markup is a single instance
  in `src/index.html`, so no other dialog is caught by the trim.
- Read the rendered screens at 568x320 and 900x400: the whole card is on
  screen, the 1.75rem trophy still reads as a trophy, and the stat cells hold
  one row.
- `expectModalStillScrolls` is the one addition beyond the literal Steps and it
  is the right one: `expectActionsReachable` is inert where there is no
  overflow, so without it `overflow-y: auto` could be deleted with the suite
  green. It is declared in the Close-out rather than smuggled in.

Process signal: the plan's Definition of Done asserted only the fitting half.
The implementer noticed the escape hatch would go untested and closed it with a
second helper. Worth a plan-side habit: when a change narrows where a promise
holds, the sizes it no longer covers need an assertion too.
