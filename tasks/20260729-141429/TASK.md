# Fix the duplicated word in the share headline

- PRIORITY: 50
- TAGS: bug, ux, content
- KIND: TASK
- ACTIVITY: WORKING
- GATES: PLAN
- RESOLUTION: -

## Story

As a player pasting my result, I want the first line to read cleanly, so that the share message looks deliberate.

## Review Findings

From the playtest pass (`20260729-092435`, NOTES.md F4.2), ON-SCREEN.

- The share headline renders `✅ Dinosaur dinosaur-#00211 🦖`. `formatPuzzleId` (`src/gameState.ts`) already returns `dinosaur-#00211`, and `formatGameStateForSharing` prefixes `Dinosaur ` again.
- Practice is worse: `✅ Practice Dinosaur dinosaur-#00043 🦖`.
- It is the first line of the thing players paste in public.

Display form is settled in `DECISION.md`: headline reads `Dinosaur #211` /
`Practice Dinosaur #43` - no `dinosaur-` prefix, no zero padding. Storage keys
keep `gameState-[practice-]dinosaur-#NNNNN` exactly.

## Steps

- [ ] Red first, in `test/share.test.ts`: add a case asserting the whole first
      line, `✅ Dinosaur #211 🦖` for `{mode: "daily", seed: 210}` and
      `✅ Practice Dinosaur #43 🦖` for `{mode: "practice", seed: 42}`. Confirmed
      red on base: it reports `✅ Dinosaur dinosaur-#00211 🦖`.
- [ ] `src/puzzleKey.ts`: extract the display-number math from `formatPuzzleId`
      into a private `puzzleDisplayNumber(seed)` (`(puzzleResidue(seed) + 1) %
      PUZZLE_ID_MODULUS`), and export
      `formatPuzzleNumber(seed: number): string` returning
      `` `#${puzzleDisplayNumber(seed)}` ``. `formatPuzzleId`, `gameStateKey`,
      and `parseGameStateKey` keep their current output byte for byte
      (`20260729-101747`).
- [ ] `src/shareText.ts`: import `formatPuzzleNumber` instead of
      `formatPuzzleId`, rename the local `puzzleId` binding to `puzzleNumber`
      (l.100), and use it in both headline templates (l.116 win, l.123 loss).
      The `label` prefix and the literal `Dinosaur ` word stay.
- [ ] Update the assertions that pin the old headline, and only those:
      `test/seedMode.test.ts` l.133-134 (`Practice Dinosaur` +
      `dinosaur-#00043` -> `Practice Dinosaur #43`) and l.145
      (`✅ Dinosaur dinosaur-#00002` -> `✅ Dinosaur #2`);
      `test/share.test.ts` l.268-269 (same practice pair);
      `e2e/share.spec.ts` l.138 (`✅ Dinosaur dinosaur-#` -> `✅ Dinosaur #`)
      and l.267 (`💀 Dinosaur dinosaur-#` -> `💀 Dinosaur #`).
- [ ] Leave every key-shaped assertion alone: `test/gameState.test.ts`
      round-trip block (l.358-419), `test/gameStats.test.ts`,
      `test/rollingAverage.test.ts`, `e2e/seed.spec.ts`,
      `e2e/practice.spec.ts` l.381, `e2e/dailyKeyMirror.ts`. They assert the
      storage key, which does not change.
- [ ] Run `npm run ci` inside `nix develop`.

## Definition of Done

- The share headline names the puzzle once, in both modes, for a win and a
  loss. (test: `test/share.test.ts` full-first-line case, red on base with
  `✅ Dinosaur dinosaur-#00211 🦖`)
- No `Dinosaur dinosaur-` string survives in shipped code, unit tests, or E2E.
  (cmd: `! grep -rn --include='*.ts' -e 'Dinosaur dinosaur-' src test e2e scripts`)
- Storage keys and their parse inverse are unchanged. (test:
  `test/gameState.test.ts` `gameStateKey`/`parseGameStateKey` round-trip block
  passes with no edits to it)
- `npm run ci` passes. (cmd: `npm run ci`)
