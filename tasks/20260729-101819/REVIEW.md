# REVIEW: deterministic seed mode

- VERDICT: APPROVE
- ROUNDS: 1
- REVIEWER: out-of-context agent (round 1), against the committed branch diff

## Round 1

Reviewer confirmed the change does what it claims: reproducibility, storage
isolation, and the share-label guard are all real and correctly implemented,
and the tests exercise the actual functions over the real shipped payload
(`src/jurassic/index.json`), not mocks. The pre-existing share masquerade
(practice shares used today's daily puzzle id) is genuinely fixed. Definition
of Done confirmed met (mapped-target reproducibility, colliding-daily-key
isolation proven non-vacuous, share guard both directions, docs present,
practice-only routing).

### Findings (all non-blocking)

1. MINOR - `formatPuzzleId` (gameState.ts) overflows to a 6-digit id
   (`#100000`) at `seed=99999`, which `parseGameStateKey`'s `\d{5}` anchored
   regex rejects, so that seeded round is dropped from practice stats. Inherited
   behavior (daily seeds stay small for centuries) but reachable via
   `?seed=99999`.
2. MINOR - the puzzle-id / storage key uses `seed % 10^5` while the target uses
   `seed % 150` through the permutation, so two seeds differing by exactly
   100000 (e.g. 42 and 100042) share an id/key but resolve to different targets.
   Inherited; practice never restores state so there is no wrong-target load,
   but the id is a display/storage handle, not a target identity.
3. NIT - add a `parseSeedParam` test for an overflowing >safe-integer value
   (the "huge" edge case the task called out) returning null.
4. NIT - `formatGameStateForSharing`'s defaulted `context` and `initGame`'s own
   default are identical; mild redundancy, kept for back-compat with existing
   `gameState.test.ts` callers.

### Resolution

Findings 1 and 2 are inherited pre-existing properties of `formatPuzzleId`,
out of scope to re-architect here and daily-critical to leave untouched;
instead DECISION.md now documents explicitly that the practice puzzle id is a
display/storage handle (mod 10^5), not a target identity, and names the large-
seed boundary. Finding 3 (cheap, task-called-out) is addressed by adding the
overflow test. Finding 4 is harmless redundancy, left as-is for back-compat.
Verdict stands at APPROVE.
