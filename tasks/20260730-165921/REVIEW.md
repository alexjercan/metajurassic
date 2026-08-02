# Review: Replace the share-failure alert with inline feedback

- TASK: 20260730-165921
- BRANCH: fix/inline-share-failure

## Round 1

- REVIEWER: out-of-context
- VERDICT: APPROVE

- [ ] R1.1 (MINOR) src/partials/modal.css:236 - the six-line comment above
  `.modal-error` reproduces DECISION.md's two rejected placements, and the
  placement it argues for is enforced in `src/index.html`, not by this rule.
  `AGENTS.md` (`## Comments`) says rationale that a `DECISION.md` already holds
  compacts to one line plus the pointer. Cut it to the constraint plus
  `tasks/20260730-165921/DECISION.md` - something like "Mirrors `.input-error`
  for a failed modal action; lives below `.modal-actions`, see
  tasks/20260730-165921/DECISION.md".
  - Response:
- [x] R1.2 (NIT) tasks/20260730-165921/TASK.md:134 - the close-out says the
  cross-check `grep -rn 'alert' src/` "returns six hits". It returns eight: six
  prose lines (`src/partials/modal.css:237`, `src/index.html:89`,
  `src/index.html:156`, `src/partials/input.css:20`, `src/game/index.ts:117`,
  `src/ui/modal.ts:89`) plus the two `role="alert"` attributes
  (`src/index.html:97`, `src/index.html:160`). The enumeration is right, the
  count is not; change "six hits" to "eight hits".
  - Response: corrected in the close-out; it now reads "eight hits: six prose
    lines plus the two `role="alert"` attributes". Re-verified by the reviewer
    against a fresh `grep -rn 'alert' src/`. R1.1 stays open: it is a code
    comment, MINOR, and shipping it costs nothing that a later touch of
    `modal.css` cannot fix.

Verified by re-running, not by reading the close-out:

- All three DoD proofs on the branch. `npm run ci` exit 0, 149 e2e passed.
  `grep -rnP 'alert\x28"' src/` no match, exit 1, which is the criterion.
  `npm run test:e2e -- share.spec.ts` 4 passed.
- The rewritten pin fails with the fix deleted: with `src/` restored to
  `master` and `e2e/` left on the branch, "does not claim a copy for a
  clipboard write that failed" fails at `expect(modalError).toBeVisible()`
  (`e2e/share.spec.ts:216`), 1 failed / 3 passed. The tree was restored to the
  branch afterwards and `git status` is clean.
- Every ticked Step against the diff. Two departures, both declared in the
  Steps and in DECISION.md: `src/ui/modal.ts` owns the element instead of
  `src/game/shareButton.ts`, and the element carries `role="alert"`.
- Staleness. `showModal()` (`src/ui/modal.ts:106`) is the only path that adds
  `active` to `#modal-overlay`, and it clears first, so no reopen can carry a
  previous failure back. `clearModalError()` in the `.then`
  (`src/game/shareButton.ts:32`) covers a retry that succeeds.
- `showModalError` sets `textContent` then `hidden = false`, matching
  `showInputError` (`src/game/index.ts:119`) exactly.
- Doc sweep for `alert`: no hit outside `src/` and the exempt `tasks/` tree.
  The three pre-existing comments naming `alert()` survive.
- `tatr check` clean.

Not verified, and not blocking: the half-line shift of `.modal-actions` when
the message appears is an accepted consequence in DECISION.md, not a claim any
test makes. Nothing in `e2e/mobile.spec.ts` fails a share, so the pinned modal
geometry never sees the visible element - confirmed by the suite staying green,
not by a new measurement.

No open `manual:` proofs.
