# Decision: what the share message actually is

- STATUS: ACCEPTED
- DATE: 2026-07-29
- TASK: 20260729-101823

## Context

The old `formatGameStateForSharing` printed `🔥 <guessCount> | Avg. Guesses: 5.2`
(both fabricated) over a row of N identical green squares. The share message is
the game's only growth loop, so what it CONTAINS is a product decision, not a
formatting detail, and several of the candidate shapes were mutually exclusive.
These four forks were put to the user before any code was written.

## 1. How a guess is encoded: 5-tier heat scale

`closeness = (lineageDepth - indexOfLCA) / lineageDepth` against the target's
lineage, binned into `⬛ 🟦 🟨 🟧 🟩` with `🦖` for the winning guess.

Alternatives: a Wordle-style 3 tiers (cold/warm/hot), or a per-guess progress
bar row. The bar tells the most vivid story but multiplies the paste height by
the guess count, which matters for a game whose losses run to 25 guesses.
Three tiers read easily but throw away most of the metric's range.

Evidence the metric is worth five bins: over 5000 random real species pairs from
`src/jurassic/index.json` the value lands in every bin (0.1 -> 41%, with a tail
out to 1.0). Against a fixture tree this would have proven only the arithmetic,
so the tier test runs on the real payload.

## 2. Stats: real values, zero-data values dropped

The user chose real `currentStreak` / `averageGuesses` from `gameStats` over
omitting stats entirely. That choice has an edge the options did not cover: on a
first-ever share both values are 0, and `Avg. 0.0` would be exactly the kind of
made-up number this task exists to delete. So a stat with no data behind it is
DROPPED, and with no stats at all the line disappears. Practice shares carry the
average only - the streak counts consecutive DAYS, which practice has no notion
of. Flagged to the user at the plan gate.

`gameState.ts` stays storage-free: `game.ts` calls `computeGameStats` and passes
a plain `ShareStats` record in.

## 3. Hints render as one `💡`, appended after the guesses

The user asked for one bulb per hint "at the point it was bought". That position
is NOT recoverable: saved state keeps `guesses` and `hintClades` as two separate
unordered sets with no interleaving record. Faking a position would be its own
fabrication, so the bulbs go at the end. Exact placement needs an ordered event
log in the persisted state plus a migration for existing saves - out of scope
here, and a follow-up if it is ever wanted.

## 4. Native share when available, clipboard as fallback

`src/ui/share.ts` exports a DOM-free, dependency-injected `shareResult`. Try
`navigator.share` wherever it exists; a user cancel (`AbortError`) returns
`"cancelled"` and does NOT quietly fall through to a clipboard write the player
declined; any other failure, or no API at all, falls back to
`navigator.clipboard`. Only the silent clipboard path shows the "Copied!"
confirmation, since the OS sheet is its own feedback.

## Not changed: the practice puzzle id

The task's original finding asked for practice shares with "no daily puzzle
number". Task `20260729-101819` had since landed
`Practice Dinosaur dinosaur-#00043`, where the number is the practice SEED id
rather than a daily puzzle number - documented in AGENTS.md and pinned by
`test/seedMode.test.ts`. The finding is satisfied by that behavior, so it is
kept rather than reopened.
