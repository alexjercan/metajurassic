# Notes: Guard the sorted graph invariant beyond the generator

The invariant: `src/jurassic/index.json` holds `species` and `clades` in sorted
key order. It matters because `gameData` picks the daily answer by position in
that key order, so a re-order re-points every puzzle number. Today only
`markdown_to_json.py:128` (`sorted(os.listdir(path))`) enforces it. Nothing
fails if the committed payload is hand-edited out of order, and the one test
that touches ordering rests on an unasserted premise.

## What changes

No user-visible behavior changes. Four maintainer-facing changes:

| Before | After |
|-|-|
| `test_sorts_ids_regardless_of_creation_order` assumes `os.listdir` returns fixtures unsorted; on a filesystem that returns them sorted the test passes without testing anything | The test asserts its premise first, so an order-sorting filesystem produces a loud failure, not a green vacuous pass |
| `npm run ci` never checks the committed `index.json` key order | A committed payload in unsorted key order turns `test/contentSource.test.ts` red |
| `20260730-120355` records claim a mid-round player gets a target swap on deploy day | This task's `DECISION.md` corrects that forward: `targetId` is persisted, so a saved round keeps its target |
| The invariant lives only in `tasks/` records and a code comment | `AGENTS.md` names it on the repository map row for `index.json` |

## Surfaces

| File | Why |
|-|-|
| `scripts/test_content_pipeline.py` | R1.1: assert the unsorted-listdir premise for both fixture dirs before `self.generate()`; reword the comment from assumed to asserted. |
| `test/contentSource.test.ts` | R1.2: add a key-order assertion beside the existing `toEqual` in "regenerates index.json exactly". |
| `tasks/20260804-123559/DECISION.md` | R1.3: forward correction of the mid-round-swap claim. Records are append-only, so the older task's files are not edited. |
| `AGENTS.md` | R1.4: extend the `src/jurassic/index.json` repository-map row. |

Not touched: `scripts/markdown_to_json.py`, `src/`, `src/jurassic/index.json`.
The generator is already correct; this task adds the checks around it.

## Data and interfaces

No new functions, types or signatures. Only test assertions and prose.

Relevant existing shapes, unchanged:

- `readSource(dir: string): SourceEntry[]` in `test/contentSource.test.ts:50`
  already `.sort()`s filenames, so its reconstructed object is in sorted key
  order by construction. That makes it a ready oracle for the committed order.
- `raw` is `import rawGameData from "../src/jurassic/index.json"` with
  `resolveJsonModule`. Keys are non-numeric slugs, so JS object key order is
  insertion order and `Object.keys` reflects the committed file order.
- `sorted(os.listdir(path))` at `scripts/markdown_to_json.py:128` is the single
  enforcement point.

## Sketches

Illustrative only.

R1.1 - assert, do not assume (`scripts/test_content_pipeline.py`):

```python
-        # ... Files are written in deliberately
-        # non-alphabetical order so directory order cannot pass by accident.
+        # ... listdir order is filesystem-determined, not creation order, so
+        # the premise is asserted below rather than assumed.
         ...
+        for subdir in ("species", "clades"):
+            entries = os.listdir(os.path.join(self.content, subdir))
+            self.assertNotEqual(
+                entries, sorted(entries),
+                f"premise gone: {subdir} listdir is already sorted, so this "
+                "test cannot distinguish sorted output from listdir order",
+            )
         result = self.generate()
```

R1.2 - order, not just contents (`test/contentSource.test.ts`):

```ts
         expect(fromSource).toEqual(committed);
+        // `toEqual` is order-blind. index.json key order picks the daily
+        // answer, so assert it too - against the sorted source order the
+        // generator emits.
+        expect(Object.keys(committed.species)).toEqual(
+            Object.keys(fromSource.species)
+        );
+        expect(Object.keys(committed.clades)).toEqual(
+            Object.keys(fromSource.clades)
+        );
```

R1.4 - `AGENTS.md:24`:

```
-| `src/jurassic/index.json` | Generated runtime graph. Never hand-edit. |
+| `src/jurassic/index.json` | Generated runtime graph. Never hand-edit. `species` and `clades` are in sorted id order, and that order picks the daily answer, so re-ordering re-points every puzzle. |
```

## Shape

```
  src/jurassic/species/*.md          (authored source)
  src/jurassic/clades/*.md
          |
          | markdown_to_json.py: sorted(os.listdir(...))   <- the only producer
          v                                                   of the invariant
  src/jurassic/index.json  --> jsonLoader --> gameData.getRandomSpecies(seed)
          ^                                     (position in key order)
          |
   who can break it, and what catches it after this task:

   generator regression ......... scripts/test_content_pipeline.py  (R1.1 makes
                                  the existing test honest)
   hand-edited committed payload  test/contentSource.test.ts        (R1.2, new)
   human forgetting the rule .... AGENTS.md repository map          (R1.4, new)
```

## Consequences and open questions

- R1.1 converts a silent non-test into a hard failure on any filesystem whose
  `listdir` happens to return sorted order. That is the point (the DoD asks for
  it), but it is a real portability cost: the test becomes environment-
  sensitive rather than skipping. Alternative considered and not chosen:
  `self.skipTest(...)` on the premise, which keeps CI green everywhere but
  restores the silent hole the finding is about. Recording the choice, not
  escalating it.
- Four fixture names are written in the order zuniceratops, allosaurus,
  triceratops, brachiosaurus, plus a fifth clade file from `setUp`. Checked on
  this machine's `/tmp`: listdir returns those four in creation order, and the
  clades as `titanosauria, allosauroidea, zephyrosauria, ceratopsoidea` - both
  unsorted, so the premise holds here. It is not guaranteed elsewhere, which is
  exactly why it gets asserted.
- R1.2's oracle is `fromSource`, which is sorted by construction. That couples
  the assertion to `readSource`'s `.sort()`: if that call were ever removed the
  assertion would weaken to "committed order equals readdir order" rather than
  failing. Cheaper alternative is asserting against
  `[...Object.keys(...)].sort()` directly; slightly weaker (it proves sorted,
  not "matches what the generator emits"). Either satisfies the DoD. Plan
  should pick one.
- R1.3 is a records-only change with no code effect. Its evidence is
  `src/gameState.ts:64` (`saveGameState` writes `targetId`) and
  `src/gameState.ts:93` (`loadGameState` passes `parsed.targetId` into the
  restored `GameState`) - verified, the finding is correct. The residual true
  statement is narrower: a player with NO saved round yet on deploy day sees
  the new target, which is indistinguishable from a normal day.
- Not in scope, and still open from `20260730-120355` NOTES.md:92 - regenerate
  `index.json` and `git diff --exit-code` is not part of `npm run ci`. R1.2
  closes most of that hole from the other side (a stale or re-ordered payload
  fails Jest), but a source edit whose regeneration was never run is still
  caught only by the existing structural `toEqual`, not by a fresh generator
  run.
