# Persist in-progress practice games across reloads

- STATUS: CLOSED
- PRIORITY: 68
- TAGS: bug, ux, gameplay

## Story

As a practice player, I want a reload or accidental tab close to bring back my in-progress round, so that I never lose a game I was in the middle of.

## Review Findings

- `src/practice.ts:8` rolls a fresh `Math.floor(Math.random() * 1_000_000)` seed on every page load, so a reload silently abandons the current practice game.
- Each abandoned game leaves an orphaned `gameState-practice-*` localStorage entry; storage grows without bound and abandoned rounds are never surfaced anywhere.
- Practice seeds can collide modulo the key format, silently resuming an unrelated saved round.

## Plan

### The session module

A new `src/practiceSession.ts` owns the whole practice-round lifecycle so it is
unit-testable without a DOM (it takes a `StorageProvider` and an injectable
`rng`, exactly as `gameState.ts` takes storage). `src/practice.ts` stays a thin
page wiring layer.

```
CURRENT_SEED_KEY = "practice-current"   // holds the active seed as a decimal string
MAX_PRACTICE_ENTRIES = 50               // retention cap on gameState-practice-* keys

resolvePracticeSeed(search, storage, rng) -> number
    seedParam = parseSeedParam(search)
    if seedParam !== null: return seedParam        // ?seed=N always wins, and is not stored
    saved = storage.getItem(CURRENT_SEED_KEY)
    if saved parses to a safe integer AND its gameState key exists AND that
       round is not over: return saved
    return startNewPracticeRound(storage, rng)

startNewPracticeRound(storage, rng) -> number
    prunePracticeEntries(storage)                   // enforce the cap first
    seed = a random integer in [0, PUZZLE_ID_MODULUS) whose gameState key is
           NOT already occupied (retry; if every attempt collides, take the
           last one and drop the entry it would shadow)
    storage.setItem(CURRENT_SEED_KEY, String(seed))
    return seed

abandonPracticeRound(seed, storage)
    storage.removeItem(gameStateKey(seed, "practice"))   // per DECISION.md
    storage.removeItem(CURRENT_SEED_KEY)

prunePracticeEntries(storage, keep = MAX_PRACTICE_ENTRIES, protectedSeed?)
    enumerate gameState-practice-* keys via parseGameStateKey, order by the
    saved createdAt (missing/unparseable createdAt sorts oldest), remove from
    the oldest until at most `keep` remain; never remove the protected seed.
```

Seed collision (finding 3) is fixed by drawing from `[0, PUZZLE_ID_MODULUS)`
rather than `[0, 1_000_000)` -- that makes seed <-> key a bijection instead of
a 10:1 fold -- and by rejecting a draw whose key is already occupied.

> The pseudocode above is the plan AS APPROVED and is left standing as history.
> Three parts of it were wrong and changed during review; the shipped behaviour
> is `src/practiceSession.ts`, and the reasoning is in `REVIEW.md` round 1 and
> `DECISION.md`. In short: `abandonPracticeRound` KEEPS a finished round
> (deleting it erased the player's own stats), `?seed=N` is folded into the key
> residue rather than honoured verbatim (the collision fix above only covered
> drawn seeds), and `prunePracticeEntries` has no `protectedSeed` parameter
> (no caller could reach it).

### Page wiring

- `src/practice.ts` calls `resolvePracticeSeed`, then `loadGameState(...,
  "practice")` instead of `createNewGameState`, so a saved round comes back.
- Its `saveState` callback clears `practice-current` once `state.isGameOver()`,
  so a finished round is not resumed on the next load (the task's "resume until
  the round finishes") while its entry stays on disk for stats.
- Explicit new game: a `#new-game-btn` in the `.top-bar` of the SHARED
  `src/index.html`, rendered `hidden`. `src/practice.ts` unhides and wires it
  (abandon -> start new round -> reload); `src/index.ts` is untouched, so the
  daily page keeps the button hidden and behaves identically. Confirmed with the
  user; recorded in `DECISION.md`.
- The game-over modal's existing `Practice` anchor still links to `/practice`;
  on the practice page that now resumes rather than re-rolls, so the same
  handler retargets it to the new-game action.

## Steps

- [x] Write `DECISION.md`: the new-game artifact (hidden button in the shared
      template) and the retention policy (abandoned round deleted; finished
      rounds kept, bounded by the cap), with the constraints that decided both.
- [x] Add `src/practiceSession.ts` with `resolvePracticeSeed`,
      `startNewPracticeRound`, `abandonPracticeRound`, `prunePracticeEntries`
      and the `practice-current` / cap constants.
- [x] Jest specs first, red before green (`test/practiceSession.test.ts`), over
      a fake `StorageProvider` and an injected rng: resume an unfinished round,
      roll fresh after a finished one, `?seed=N` overrides without persisting,
      abandon deletes the entry and the pointer, a colliding draw is rejected,
      the cap prunes oldest-first and never the active round.
- [x] Add the hidden `#new-game-btn` to the `.top-bar` in `src/index.html` and
      style it in `src/style.css`, including the narrow-viewport top-bar layout.
- [x] Rewrite `src/practice.ts` onto the session module: resume via
      `loadGameState`, clear `practice-current` on game over, unhide and wire
      the button, retarget the modal `Practice` action.
- [x] Add `e2e/practice.spec.ts`: play guesses in an UNSEEDED practice round,
      reload, assert the same target and the same guesses are still on the
      board; then press "New game" and assert a fresh round.
- [x] Assert the daily page is unaffected: `#new-game-btn` stays hidden on `/`.
- [x] Run `npm run ci` (see `E2E_PORT` in AGENTS.md if 8080 is taken).

## Definition of Done

- Reload mid-practice restores the same round -- same target, same guesses --
  in an UNSEEDED round, so `?seed=N` cannot mask it.
  (test: `e2e/practice.spec.ts` reload spec + `test/practiceSession.test.ts`)
- Starting a new practice game is an explicit action, available mid-round, and
  it discards the UNFINISHED round it replaces. (test: `e2e/practice.spec.ts`
  new-game spec + `test/practiceSession.test.ts` abandon spec)
- A round the player FINISHED survives "New game" -- from the top-bar button and
  from the game-over modal's action alike -- so winning and starting another
  round does not erase the win from the practice stats.
  (test: `e2e/practice.spec.ts` "finished practice rounds" describe +
  `test/practiceSession.test.ts` "KEEPS a finished round")
- `?seed=N` cannot resume an unrelated round either: the param is folded into
  the residue its storage key represents.
  (test: `test/practiceSession.test.ts` "folded into the residue")
- The phone top bar is measured on the page that actually has three items in it.
  (test: `e2e/mobile.spec.ts` top-bar and hint-chip cases, now run over
  `/practice/` as well as `/`)
- The daily page is behaviourally unchanged: `#new-game-btn` is present but
  hidden on `/`, and `src/index.ts` is not modified.
  (test: `e2e/practice.spec.ts`; cmd: `git diff --stat master -- src/index.ts`
  must print NOTHING. Run at plan time on master: empty output, exit 0 -- which
  is the expected result on the branch too, since the file must not be touched.)
- Orphaned practice entries stay bounded at `MAX_PRACTICE_ENTRIES`.
  (test: `test/practiceSession.test.ts` pruning spec)
- A practice seed can no longer silently resume an unrelated saved round.
  (test: `test/practiceSession.test.ts` collision spec)
- `npm run ci` passes. (cmd: `npm run ci`)

## Notes

- Depends on: `20260729-092258` for the browser-level reload coverage (CLOSED).
- The playtest evidence below says any regression test must use an UNSEEDED
  round; the E2E spec above does, which is why it cannot reuse the seeded
  fixtures in `e2e/seed.spec.ts`.

## Flow State

- FLOW STEP: DONE
- PLAN STATUS: APPROVED

## Playtest evidence (2026-07-29, from `20260729-092435`)

Confirmed, ON-SCREEN. `src/practice.ts` calls `createNewGameState`, not
`loadGameState`, so reloading a practice round starts a brand new random target
even though `saveGameState` has been writing the round to
`gameState-practice-...` all along. The state is on disk and simply never read
back.

Noted during the playtest walkthrough while playing seeded rounds: a seeded
round reproduces its target on reload only because the SEED reconstructs it, not
because the saved game is restored - so `?seed=N` masks this bug rather than
exercising it. Any regression test should use an unseeded practice round.
