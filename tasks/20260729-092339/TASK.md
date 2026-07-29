# Harden tree scaling and mobile scroll behavior

- STATUS: OPEN
- PRIORITY: 80
- TAGS: bug,ui,mobile,testing

## Story

As a mobile player making many guesses, I want the taxonomy tree to stay visible, centered, and scrollable, so that the core feedback loop remains usable even when the tree grows wide or deep.

## Review Findings

- The historical closed task was about graph scaling and Android/mobile scrolling.
- The current renderer uses `scrollWidth` thresholds, coarse scale classes, and a requestAnimationFrame scroll-to-center/bottom pass.
- There is no browser regression proof that a many-guess tree remains visible or horizontally scrollable on mobile.

## Steps

- [ ] Reproduce the large-tree case with the deterministic seed mode from `20260729-101819`, picking seeds whose targets have deep lineages, instead of a bespoke fixture.
- [ ] Add browser tests that render many guesses across different clades and assert the mystery target, latest guess, and input remain reachable.
- [ ] Check desktop, narrow mobile, and short-height viewport behavior.
- [ ] Revisit the scaling strategy if fixed scale classes still leave clipping, unreadable nodes, or broken scroll positions.
- [ ] Verify Android Chrome-like touch scrolling behavior as closely as the available harness allows.
- [ ] Document any manual mobile-browser acceptance that cannot be automated.

## Definition of Done

- A many-guess tree is covered by a browser regression test at mobile width. (test: browser E2E large-tree mobile test)
- The test proves the primary tree content is visible or reachable after render. (test: browser E2E assertions for node bounding boxes or scroll reachability)
- Short-height behavior is either handled or explicitly documented as an accepted limit. (manual: inspect a short viewport)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- This should be tackled after or alongside the browser harness task.
- Useful code areas: `src/ui/treeVisualizer.ts`, `src/style.css`, and `src/treeBuilder.ts`.
