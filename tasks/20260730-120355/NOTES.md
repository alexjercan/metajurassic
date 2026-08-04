# Notes: Make the generated content graph deterministically ordered

## What changes

Nothing a player sees changes in the page, but one thing shifts under them: the
daily answer.

- Before: `scripts/markdown_to_json.py` walks `os.listdir`, so the key order of
  `src/jurassic/index.json` is whatever order the filesystem hands back. It is
  stable on this machine today (regenerating right now reproduces the committed
  file byte for byte), but it is not stable across machines, checkouts, or file
  churn. A future one-line content edit can therefore land as a 1886-line
  reshuffle - which is exactly what happened in `20260729-092352` and got
  reverted.
- After: species and clade ids come out sorted, so regeneration is reproducible
  anywhere and a content edit diffs as a content edit.
- Side effect, unavoidable and one-time: the daily target is
  `species[permutation[seed mod n]]` where `species` is `Object.entries` over
  index.json key order (`src/jsonLoader.ts:42` -> `src/gameData.ts:139-160`).
  Reordering the keys re-points every past and future puzzle number at a
  different dinosaur. See open questions.

## Surfaces

| File | Why |
|------|-----|
| `scripts/markdown_to_json.py` | `load_directory` sorts; the comment at lines 123-126 that defers the sort to this task goes away. |
| `src/jurassic/index.json` | Regenerated. The whole point of the change; the diff must be a pure reorder. |
| `scripts/json_to_markdown.py` | Confirm-only. It writes one file per id and never depends on dict order, so no change. |
| `test/contentSource.test.ts` | Confirm-only. `readSource` sorts and the comparison is `toEqual` (structural), so it passes before and after; its line 102-103 comment ("directory order vs sorted") becomes stale and is worth a one-word touch-up. |
| `commontree-metajurassic.json` | Regenerated as a byproduct; gitignored (`*metajurassic.json`), so it never reaches the diff. |

## Data and interfaces

One line, no signature changes:

```python
def load_directory(path: str) -> dict:  # unchanged signature
```

Nothing in `src/` changes. `buildGameData(raw: RawGameData): GameData` keeps
consuming key order as-is.

## Sketches

Illustrative, not the patch.

```diff
 def load_directory(path: str) -> dict:
-    # Directory order, NOT sorted: the committed index.json is in this order,
-    # and sorting it here would bury a content change under a 1900-line
-    # reshuffle. ... filed as 20260730-120355.
+    # Sorted, not directory order: os.listdir order differs across machines and
+    # after file churn, so an unsorted graph makes a one-line content edit diff
+    # as a full reshuffle.
     entries = {}
-    for filename in os.listdir(path):
+    for filename in sorted(os.listdir(path)):
```

## Shape

```
  src/jurassic/species/*.md ---.
  src/jurassic/clades/*.md  ---+--> markdown_to_json.load_directory
                                     |  sorted(listdir)   <-- the change
                                     v
                              src/jurassic/index.json   (key order == sorted)
                                     |
                    .----------------+-----------------.
                    v                                  v
        jsonLoader.buildGameData              build_tree -> commontree.json
        Object.entries -> species[]                  (gitignored)
                    |
                    v
        gameData.speciesIndexForDate(seed)
        species[permutation[seed mod 150]]  <-- shifts once, by construction
```

## Consequences and open questions

- Cost: one regeneration commit whose diff is ~1900 lines of pure movement.
  It has to land alone, with nothing else in it, or it is unreviewable. That is
  the whole reason this is its own task.
- Verification cannot be by eye. The check is content equality on the parsed
  objects plus a key-order inequality, e.g. compare `json.load` of the pre- and
  post-image: dicts equal, `list(d[k])` differing. `git diff --stat` alone
  proves nothing.
- The daily-answer shift. Assumption recorded rather than escalated: the game
  already re-points every puzzle whenever a species is added or removed (`n`
  changes, so `seed mod n` does), so answer stability across content changes is
  not a property the project holds today. A player mid-round on deploy day gets
  a target swap; the saved state keeps their guesses. If that turns out to be
  unacceptable, the alternative is to pin the runtime order independently of
  index.json (sort ids in `buildGameData`) - which shifts answers once anyway,
  so it buys nothing here and is out of scope.
- Once landed, sortedness is only enforced by convention: nothing fails if a
  future edit reintroduces unordered output. The DoD check
  (`markdown_to_json.py` then `git diff --exit-code`) is the practical guard,
  and it is not in `npm run ci`. Open question for planning: is adding that
  regeneration check to CI in scope, or a follow-up task?
- Not touched: `csv_to_json.py`, the `scripts/playtest/` simulations, and any
  ordering inside a record (field order comes from insertion in
  `parse_markdown_file` and is already deterministic).
