# Notes: KISS pass over practice session, storage and content loaders

## The rig

Rebuilt from `tasks/20260731-212557/NOTES.md` `## How the population was
counted` (TypeScript PARSER, not the scanner; runs of consecutive standalone
`//` lines fused into one comment). Run inside `nix develop` with `NODE_PATH`
pointing at the worktree's `node_modules` symlink.

Validated BEFORE use, in both directions:

- `src/profile/`, `src/gameStats.ts`, `src/rollingAverage.ts` -> **889 / 10 /
  18**, reproducing child `20260731-212612`'s landed table exactly.
- The six cluster files on this branch's base (`4b7a2e0`) -> **629 / 28 / 156**,
  reproducing this task's baseline table exactly.

Every number below comes from that rig. `wc -l` was re-run alongside it and the
two agree per file.

## Before / after

`lines / comments / comment lines`, all six files, same rig, same invocation.

| File | Before | After | Delta |
|-|-|-|-|
| `src/practiceSession.ts` | 281 / 20 / 98 | 267 / 20 / 84 | -14 / 0 / -14 |
| `src/practice.ts` | 90 / 5 / 27 | 85 / 4 / 22 | -5 / -1 / -5 |
| `src/frontMatter.ts` | 66 / 2 / 26 | 71 / 2 / 31 | +5 / 0 / +5 |
| `src/jsonLoader.ts` | 68 / 1 / 5 | 68 / 1 / 5 | unchanged |
| `src/markdownLoader.ts` | 87 / 0 / 0 | 87 / 0 / 0 | unchanged |
| `src/storage.ts` | 37 / 0 / 0 | 37 / 0 / 0 | unchanged |
| **total** | **629 / 28 / 156** | **615 / 27 / 142** | **-14 / -1 / -14** |

`frontMatter.ts` GREW. Its header's central claim was false and the replacement
has to say both what is true AND that the loader question is still open, which
is a `NOTE:` marker that did not exist before. No numeric target was set or
chased in either direction; see `## Keep / compact, comment by comment`.

The comment count fell by exactly one - `practice.ts:64`, deleted outright as
pure archaeology. Every other comment survives in some form, which is what
`## Comments` "compaction, not deletion" asks for.

## Keep / compact, comment by comment

One row per SURVIVING comment, 27 of them, plus the one deletion. "Rule" is the
`AGENTS.md` `## Comments` row that decided it. Line numbers are post-pass.

### `src/practiceSession.ts` (20)

| Line | Subject | Verdict | Rule | Compacted towards |
|-|-|-|-|-|
| 10 | file header: the one job, storage-only, the lifecycle pointer | compact | rationale reproducing a DECISION.md; a pointer needs a constraint | `tasks/20260729-101754/DECISION.md` |
| 21 | `CURRENT_SEED_KEY`: presence resumes, absence re-rolls | keep | invariant the code defends | - |
| 26 | `MAX_PRACTICE_ENTRIES`: why finished rounds are capped not deleted | compact | rationale reproducing a DECISION.md | same, section 3 |
| 31 | `MAX_SEED_DRAWS`: why 20 is a guard, not a loop | keep | non-obvious setting / guards a value | - |
| 37 | `Rng`: same contract as `Math.random`, injectable | keep | public API contract | - |
| 41 | `drawSeed`: the draw range makes seed <-> key a bijection | compact | rationale reproducing a DECISION.md | same, section 4 |
| 45 | the fold also guards an rng returning exactly 1 | keep | guards a value | - |
| 53 | `createdAt`: a corrupt entry sorts OLDEST and is reaped first | keep | invariant the code defends | - |
| 68 | keys collected in one pass; `storage.key(i)` is index-based | keep | ordering dependency | - |
| 101 | `prunePracticeEntries` contract + no protect-the-active-round param | compact | rationale reproducing a DECISION.md | same, section 3 |
| 116 | newest-first, so the tail is the oldest | keep | ordering dependency | - |
| 127 | the round is not written here; a pointer with no entry is live | keep | invariant the code defends | - |
| 135 | prune to one BELOW the cap so the total lands at the cap | keep | non-obvious setting | - |
| 149 | the unconditional `removeItem` after a collided draw | compact | rationale reproducing a DECISION.md | same, section 4 |
| 158 | a `?seed=N` round never owns the pointer | compact | rationale reproducing a DECISION.md | same, section 4 |
| 170 | abandon: unfinished DELETED, finished KEPT | compact | rationale reproducing a DECISION.md; archaeology | same, section 2 |
| 183 | an unparseable entry is not a stat worth keeping | keep | invariant the code defends | - |
| 201 | `normalizePracticeSeed`: the two moduli | compact | rationale reproducing a DECISION.md | same, section 4 |
| 214 | `isResumable`: a missing `targetId` pins the board forever | **keep in full** | defect shape the code still defends | **nothing it may compact towards - see below** |
| 239 | `resolvePracticeSeed`: the three-rule resolution order | compact | rationale reproducing a DECISION.md | same, section 4 |

### `src/practice.ts` (4 survive, 1 deleted)

| Line | Subject | Verdict | Rule | Compacted towards |
|-|-|-|-|-|
| 12 | why the new round is CLAIMED, and why `replace(pathname)` | compact | rationale reproducing a DECISION.md | `tasks/20260729-101754/DECISION.md` section 4 |
| 34 | the button ships hidden in the SHARED template | keep | constraint + pointer, already in the target form | - |
| 42 | the modal link becomes a new-game action here, not on daily | compact | rationale reproducing a DECISION.md | same, section 1 |
| 71 | resume only UNTIL the round finishes; the entry stays | keep | invariant the code defends | - |
| ~~64 (before)~~ | "is the fix for tasks/20260729-101754 - the round was always being SAVED, it was just never read back" | **deleted** | archaeology; the record holds it | - |

The deleted comment also narrated what `resolvePracticeSeed`'s own name and
docstring already say. Nothing of it was load-bearing.

### `src/frontMatter.ts` (2)

| Line | Subject | Verdict | Rule | Compacted towards |
|-|-|-|-|-|
| 1 | ONE parser, the true readers, the open loader question, the Python mirror | rewrite + marker | every clause describes behaviour that no longer ships (the reader claim only); live tracker marker | `DECISION.md` choice 2 |
| 52 | `isSerializedCollection`: the historical defect shape, MIRRORED from Python | keep untouched | defect shape + cross-language contract | - |

### `src/jsonLoader.ts` (1)

| Line | Subject | Verdict | Rule |
|-|-|-|-|
| 36 | why `buildGameData` is split from the fetch (mirror-rot) | keep untouched | non-obvious constraint |

### `src/storage.ts`, `src/markdownLoader.ts`

No comments. Read, changed nothing. Both byte-identical to `master`.

## Reading the loader family as one unit

`jsonLoader.ts`, `markdownLoader.ts`, `frontMatter.ts`, `storage.ts`, read
together rather than file by file.

**There are two `loadGameData` implementations, and only one ships.**

- `src/jsonLoader.ts:28` fetches the generated `src/jurassic/index.json` and
  maps it through `buildGameData`. This is the shipped one: every page entry
  imports it - `src/game/index.ts:3`, `src/clades.ts:2`, `src/species.ts:2`,
  `src/profile/index.ts:4`. `buildGameData` is additionally imported by seven
  test files, which is exactly the reuse its comment defends.
  (`game/index.ts` is not itself a webpack entry - it is reached from
  `src/index.ts` and `src/practice.ts`, which are.)
- `src/markdownLoader.ts:37` walks `require.context("./jurassic/species")`,
  fetches each `.md` and parses it with `parseFrontMatter`. **Nothing imports
  this module.** Repo-wide, excluding `tasks/`, the string `markdownLoader`
  appears three times and all three are prose:
  `src/frontMatter.ts` (the false header this task fixed),
  `test/contentSource.test.ts:9` (a comment), and `LESSONS.md:292` (the
  regex-vs-comment scanner lesson).

That makes `markdownLoader.ts` dead. It is **not removed here**: that is
`20260730-120401` ("Delete or wire up the dead markdownLoader", OPEN, filed by
`20260729-092352`), and it turns on which loader the project WANTS - a product
decision, the wrong shape for a KISS pass. `git diff master --
src/markdownLoader.ts` is empty.

The consequence for this task is the `frontMatter.ts` header, which asserted
the dead path as fact. Fixed as a COMMENT defect, not a code change; see
`DECISION.md` choice 2.

**`storage.ts`** is one interface (`StorageProvider`) and one implementation
(`BrowserStorage`), every method guarded by a `typeof localStorage ===
"undefined"` check so the module is safe under Jest's non-DOM environments,
plus a `defaultStorage()` factory. No comments, nothing unclear, nothing to do.

**`frontMatter.ts`** is the only module both a shipped path (via the dead
loader) and the test suite would share. Its `parseFrontMatter` is a deliberate
re-expression of `scripts/markdown_to_json.py`; the round-trip test is what
keeps the two honest.

Nothing else in the family looked unused. No symbol was removed, so there is no
prove-it-dead grep to record beyond the `markdownLoader` one above.

## Records checked, per compacted comment

Each grep used terms from the comment's SUBJECT, not its wording, over `tasks/`
whole; the record found was READ and its KIND checked.

| Subject searched | Record found | KIND / status | Holds it? |
|-|-|-|-|
| `MAX_PRACTICE_ENTRIES`, cap, prune oldest-first | `20260729-101754/DECISION.md` s3 | TASK / CLOSED, DECISION ACCEPTED | yes, in full |
| protect-the-active-round parameter | same, s3 | same | yes, including the `a-guard-no-test-can-fail-is-a-comment` citation |
| seed draw range, seed <-> key fold | same, s4 | same | yes |
| `?seed=N` not persisted, pointer ownership | same, s4 | same | yes |
| abandon retention, finished vs unfinished | same, s2 | same | yes, including the got-it-backwards history |
| two moduli, `seed mod 10^5` vs `seed mod 150` | same s4, and `20260729-101819/DECISION.md` | both TASK / CLOSED | yes, twice over |
| shared template, hidden new-game button | same, s1 | same | yes |
| **`isResumable`, missing `targetId`, resuming a broken board** | **`20260729-101754/REVIEW.md:123-128`** | **REVIEW.md - not a compaction target** | **NO - kept in full** |
| index-based `storage.key(i)` iteration | nothing | - | no - kept |
| rng returning exactly 1 | nothing (three false hits on "exactly", all unrelated) | - | no - kept |
| one below the cap | nothing | - | no - kept |

The `isResumable` row is the one the plan warned about, and it took review
round 1 to get right. `20260729-101754`'s **DECISION.md** covers its NEIGHBOURS
on both sides - `prunePracticeEntries` (section 3) and `normalizePracticeSeed`
(section 4) - and not it. The first pass stopped there and recorded "nothing",
which was false: the same task's **REVIEW.md:123-128** holds the rationale
almost verbatim, as the NIT "a corrupt entry with no `targetId` would resume
forever" and its fix. A literal `grep -rn isResumable tasks/` finds it in one
hit; the SUBJECT grep run instead searched `targetId` and the record was not
read closely enough.

The verdict is unchanged, but for a stated reason rather than by accident.
`## Comments` "compact only towards an existing record" names `DECISION.md`,
`SPIKE.md` and `NOTES.md`; `REVIEW.md` is not among them, and it is round-1
feedback on one implementation rather than a decision the project holds. So
there is still nothing this comment MAY compact towards, and it stays verbatim
- but the rationale does exist in the tree, and a reader looking for it should
be sent there rather than told it is nowhere.

## Doc sweep, both polarities

- Forward: `grep -rn` for `practiceSession`, `practice.ts`, `frontMatter`,
  `jsonLoader`, `markdownLoader`, `storage.ts` over `AGENTS.md` and
  `README.md` - **no hits**.
- Reverse: `AGENTS.md:21` is the enumeration that caught sibling
  `20260731-212611`. It lists `src/` core as `game/`, `gameState.ts`,
  `gameData.ts`, `treeBuilder.ts`, `hintRule.ts`, `puzzleKey.ts`,
  `shareText.ts`, plus `src/ui/`. None of this cluster's six files is in that
  list, and no file was added, removed, split or renamed, so the enumeration
  stays correct. `README.md` names no `src/` path at all.

No doc change was needed.

## Sibling files touched

None. No import line in any sibling's file changed - this pass moved no code
and renamed no symbol, so there was nothing to re-point.

## Verification

Inside `nix develop`, in the worktree:

- `npm run ci` - green. ESLint `--max-warnings=0` clean; Jest 21 suites / 323
  tests passed; Playwright 126 passed.
- `npm run build` - webpack compiled successfully.
- `git diff master -- test e2e` - **empty**. No assertion touched.
- `git diff master -- src/markdownLoader.ts src/storage.ts src/jsonLoader.ts` -
  **empty**.
- `grep -rnE '(//|\*).*(2026[0-9]{4}-[0-9]{6}|tasks/)'` over the five live
  cluster files - 13 hits, 12 of them a record pointer sitting after the
  constraint it explains, 1 a `NOTE:` marker naming OPEN task
  `20260730-120401`. The base's bare pointer at `practiceSession.ts:18`
  ("Decisions recorded in ...", no constraint) is gone.
