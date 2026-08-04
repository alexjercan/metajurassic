# Decision: Guard the sorted graph invariant beyond the generator

- DATE: 20260804-133958
- STATUS: ACCEPTED
- TASK: 20260804-123559
- TAGS: content, testing, docs

## Context

Round 1 of `20260730-120355` approved the reorder with four findings, all
MINOR or NIT, sharing one theme: the sorted-key-order invariant is enforced at
the generator and nowhere else. Two choices in this follow-up are load-bearing
enough to record: the oracle the new Jest assertion compares against, and a
forward correction of a claim the earlier task's records carry.

## Decision

Choice 1 - the R1.2 oracle. `test/contentSource.test.ts` asserts the committed
`index.json` key order against a SORTED COPY OF ITSELF
(`expect(Object.keys(committed.X)).toEqual([...Object.keys(committed.X)]
.sort())`), not against `fromSource`.

The invariant belongs to the shipped payload. `fromSource` is built by
`readSource`, which already calls `.sort()` on the directory listing, so
comparing the two orders would test that one sort agrees with another sort -
green even if the committed file were unsorted, provided it were merely a
permutation. A sorted copy of the committed keys is the only oracle that is
independent of how this test read the directory.

Choice 2 - forward correction of `20260730-120355` `DECISION.md:50` and
`NOTES.md:92`. Both say a player mid-round on deploy day "gets a target swap"
and keeps only their guesses. That is wrong. `saveGameState` writes `targetId`
into the persisted record (`src/gameState.ts:93`) and `loadGameState` restores
`parsed.targetId` (`src/gameState.ts:65`), so a mid-round player keeps their
target across a deploy - guesses and answer both. Only a player with no saved
round for that seed yet resolves a target fresh through
`gameData.getRandomSpecies(seed)`, and that target is indistinguishable from a
normal day's. The earlier records are append-only and are not edited; this
entry is the correction of record.

## Alternatives considered

Comparing key order between `fromSource` and `committed`. Rejected: both sides
are sorted by construction, so the assertion could not fail for the defect it
exists to catch.

Asserting sortedness inside `src/jsonLoader.ts` at runtime. Rejected: it moves
a build-time content invariant into shipped code and costs every page load, and
the failure would reach players rather than the maintainer.

Editing `20260730-120355`'s records in place to fix the target-swap claim.
Rejected: task records are append-only, so the correction lives here.

## Consequences

A hand-edited or re-ordered `src/jurassic/index.json` now fails the Jest suite
rather than silently re-pointing every puzzle. The pipeline test fails loudly
instead of passing vacuously when a filesystem returns `os.listdir` in sorted
order, which removes the last way its premise could rot unnoticed.

The deploy-day risk recorded by `20260730-120355` was overstated: no
mid-round player loses their target. Anyone reading those records should read
this entry alongside them.
