# Decision: where the onboarding explanation lives, and what the hint chip says

- STATUS: ACCEPTED
- DATE: 2026-07-29

Two load-bearing forks were confirmed with the user before any code was written,
because in both cases the candidates are mutually exclusive artifacts rather
than wording tweaks.

## Fork 1: the onboarding artifact

The alignment pass (`tasks/20260729-092452/NOTES.md` section 5) named this fork
and explicitly refused to settle it: in-board guidance versus a pre-board page.
Three constraints make the candidates exclusive:

1. The task's story asks for guidance that is **always available**.
2. `tasks/20260729-141414/DECISION.md` left this task an empty band that sits
   **inside `#arena`**, below the pre-guess tree and above the input. `#arena`
   scrolls and the tree grows downward into it, so anything mounted there is
   **pre-guess-only** by construction - it cannot be the always-available
   surface.
3. The only surface that never scrolls away is `.top-bar`, which already wraps
   at the 768px breakpoint. A third element there spends permanent vertical room
   on the viewport where the tree has least.

No single surface satisfies all three. That incompatibility - not the placement,
and not the look - is what went to the user.

### Chosen: an in-arena pre-guess brief, with the panel and FAQ behind it

A compact **brief** mounts in the empty band inside `#arena`, below the tree and
above the input, and is rendered only while the round has no guesses yet. It
carries the four facts a first-timer is missing: the objective, what the `?`
node is, that the tree is distance feedback, and the guess budget. It also
carries one control, **How to play**, which renders a fuller card into the
existing `.info-panel` and opens it.

Once the first guess lands, the brief is removed. The tree then owns that space,
which is the direction it grows.

Why: the brief fills exactly the band `20260729-141414` could not fill, it costs
the board nothing at the moment the board is busiest, and it routes deeper
reference through the ONE affordance that task established (`#open-panel`),
adding no competing "there is something to read" control.

**The accepted cost, stated plainly:** the guidance is NOT on screen mid-game
unless the player asks for it. A player who forgets the rule at guess 7 has the
footer FAQ link and the panel, not an on-board reminder. The user accepted this
in exchange for not spending permanent tree space.

### Pre-guess-every-round, not first-visit-only

The brief is gated on `state.numberOfGuesses() === 0`, not on a stored
"has played before" flag. It therefore reappears at the top of every round,
including practice rounds, and needs no storage key.

Two reasons. The band it fills is empty on EVERY round, not only a player's
first, so a first-visit flag would fix the blank screen once and leave it back
the next day. And a returning player dismisses it by doing the thing they came
to do - typing a guess - which is cheaper than any dismiss control.

### Rejected alternatives

- **Always-on top-bar objective line.** Never scrolls away, so it is genuinely
  always-available. Rejected because it permanently costs a wrapped row of
  `.top-bar` on a phone, and because it leaves `20260729-141414`'s empty band
  unfilled - this task inherited that band specifically to fill.
- **First-run card auto-opened in the info panel.** Reuses the established
  affordance and costs zero board space, but it is a wall the player must
  dismiss before touching the board, and it also leaves the band unfilled.
- **Pre-board interstitial page** (Metazooa parity). Rejected on the alignment
  pass's own reasoning: Metazooa can afford a page in front of its board because
  that page also carries a countdown, sibling games and ad slots. Metajurassic's
  whole proposition is the board.

## Fork 2: the hint chip string

This task owns the string; `20260729-141424` deliberately left it alone after
changing the mechanic underneath it. Two facts bound the wording, and both rule
out the obvious copy:

- The rule reveals a clade cutting the field to at most `HINT_SPLIT_FRACTION`,
  but on ~19% of presses nothing qualifies and it falls back to the best cut
  available, which narrows LESS than half. So "halves the field" would be false
  about one press in five.
- The hint is deliberately a bad buy for a player who can read the tree - it
  costs them +2.2 guesses (`tasks/20260729-160500/SPIKE.md`). Copy that sells it
  as an edge sells a trap.

### Chosen: `Stuck?` / `Spend 3 guesses to reveal a clade`

Rescue framing in the label, the product and the price in the body, and no
claim at all about how much the reveal narrows - so the fallback branch cannot
turn the string into a lie. This beats the reference string
("Exchange 3 guesses to reveal a rank!") on honesty at equal informativeness.

The `3` is read from `HINT_COST` rather than typed into the markup, because the
current hardcoded "Cost 3 Guesses" in `src/index.html` is a copy of a constant
that a reprice would silently rot
(`LESSONS.md`: `hand-copied-logic-mirrors-rot-update-them-in-the-same-change`).

Rejected: "Reveal a narrower clade" (accurate - the rule never returns a clade
at or above the deepest revealed one - but "narrower" reads as an edge); and
keeping the "Hint" label with the product appended (most conservative, but it
loses the rescue framing that the pricing evidence says the copy needs).
