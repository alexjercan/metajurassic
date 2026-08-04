# Make tree nodes keyboard operable

- PRIORITY: 45
- TAGS: a11y, ux
- KIND: TASK
- ACTIVITY: UNDERSTANDING
- GATES: -
- RESOLUTION: -

## Story

As a keyboard or screen-reader player, I want to select a node in the guess
tree without a mouse, so that the board itself is operable, not just the
controls around it.

## Finding

Deferred deliberately from `20260729-212743` (hint chip -> real `<button>`),
which fixed the one control that was a swap away from correct.
`src/ui/treeVisualizer.ts` attaches `onSelect` as a click listener on plain
`div` node boxes: no `tabindex`, no role, no key handling. Unlike the hint chip
this is not a tag swap - a rendered phylogeny wants roving-`tabindex` focus
management and a `role="tree"`/`role="treeitem"` structure, with an answer for
how focus survives a re-render after each guess and how a scrolled-out node is
brought into view when focused.

## Open questions

- Roving `tabindex` over the whole tree, or one tab stop plus arrow-key
  navigation within it?
- Does focus need to survive `renderTree` re-running after every guess?
- Does `20260729-212743`'s amber `:focus-visible` become a global convention
  here, or stay chip-local?

## Definition of Done

Not yet planned. Needs UNDERSTANDING first.
