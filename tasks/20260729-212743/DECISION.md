# Decision: Make the hint chip keyboard reachable

- DATE: 20260803-232332
- STATUS: ACCEPTED
- TASK: 20260729-212743
- TAGS: a11y, ux

## Context

`#hint-box` is a `<div>` with a click listener, so the rescue mechanic is
mouse/touch-only. Two forks have to be settled before any of it can be built.

Fork 1 - what carries the unaffordable state. `.hint-box.disabled` today sets
only `pointer-events: none`, which stops a pointer and nothing else; once the
chip is focusable, that is an actively wrong guard.

Fork 2 - what the game-over slot is. `updateHintButton` currently rewrites
`#hint-text` into `<a href=".../practice">Practice</a>` INSIDE the chip. A link
inside a button is invalid HTML, and browsers resolve the nesting
unpredictably, so the chip cannot become a `<button>` while that branch stands.

## Decision

Fork 1: native `disabled` on a real `<button>`, styled through
`.hint-box:disabled`.

Fork 2: two elements sharing one visual slot. `<button id="hint-box">` for the
live round and a sibling `<a id="hint-practice" class="hint-box practice">` for
game over, each `hidden` when the other is showing, both carrying `.hint-box`
so the top bar's geometry is identical either way.

Built from scratch today this is what we would write: the platform already
gives a button focus, Enter/Space activation, the `button` role and an inert
disabled state, and it gives an anchor keyboard-reachable navigation. Nothing
here needs a custom widget.

## Alternatives considered

- `role="button"` + `tabindex="0"` + a keydown handler on the existing `<div>`.
  Works, and is what an ARIA-first reading suggests, but it reimplements three
  behaviours the platform ships and gets the Space-versus-Enter timing subtly
  wrong by default. Rejected: no requirement here that a native button cannot
  meet.
- `aria-disabled="true"` plus a swallowed handler, instead of native
  `disabled`. This keeps the chip focusable and announced while unaffordable,
  which is the better answer when the disabled reason is non-obvious. Rejected
  for now: the chip's own copy names the price, `#stat-box` shows the budget
  next to it, and a focusable control that silently does nothing is its own
  a11y complaint. Reversible in one attribute if a playtest says otherwise.
- Keep one element and swap its tag or its innerHTML at game over. Rejected:
  either the invalid nesting stands, or the code is re-creating and re-wiring a
  DOM node mid-round, which is more machinery than one `hidden` toggle.
- Do nothing. The mechanic stays unreachable for keyboard and screen-reader
  players, which is the whole finding.

## Consequences

Easier: Enter, Space, focus, the `button` role, and pointer-and-keyboard-inert
disabling all come free and stay correct; the practice link is reachable at no
cost. The two-element slot also lets the game-over copy and the live copy have
independent markup without `innerHTML` string building.

Harder: a `disabled` button leaves the tab order entirely and is not announced,
so a player tabbing past an unaffordable chip gets no explanation - the
accepted side of the fork-1 trade. `.hint-box.disabled` disappears as a test
hook, so three specs asserting `not.toHaveClass(/disabled/)` must move to
`not.toBeDisabled()` in the same change or pass vacuously forever. Two elements
must be kept in visual sync by hand; a `.hint-box[hidden] { display: none; }`
rule is mandatory because `display: flex` beats the UA `[hidden]` rule. And UA
button styling (`font`, `color`, `text-align`, `width`) has to be reset
explicitly, which is why the visual check at 360px is a Step and not an
afterthought.
