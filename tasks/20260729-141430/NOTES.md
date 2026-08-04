# Notes: Normalize typographic punctuation in Jurassic content

## What changes

Before: every species card shows an en dash in its era range (`Late Jurassic
(155–150 Ma)`), and 37 museum-fact / clade blurbs use an unspaced em dash
(`brain was notoriously tiny—about the size of a hot dog—leading to...`). The
repo's own `AGENTS.md` asks for ASCII punctuation, so the content contradicts
the rule the code follows.

After: `Late Jurassic (155-150 Ma)` and `... notoriously tiny -- about the size
of a hot dog -- leading to ...`. Same facts, same layout, ASCII glyphs. A Jest
test then fails if a typographic dash or curly quote re-enters the shipped
content, so the convention is enforced rather than restated.

## Surfaces

| Path | Why |
|------|-----|
| `src/jurassic/species/*.md` (97 files) | `period:` frontmatter holds the en dash; 25 of them also have an em dash in the body. |
| `src/jurassic/clades/*.md` (12 files) | Em dash in the description body only; clades carry no `period`. |
| `src/jurassic/index.json` | Generated. Regenerated, never hand-edited. |
| `test/dataIntegrity.test.ts` | Home of the new assertion: it already loads the REAL payload and already bans a character class (`HTMLISH`) over the same field list. |

Measured, not estimated:

- 97 en dashes, all in `period:`, all between two digits. `rg` for an en dash
  with a non-`\d–\d` context returns nothing, so the frontmatter fix is a
  mechanical `–` -> `-` with no judgement calls.
- 37 em dashes, all in prose bodies, all unspaced `word—word`. 4 files use them
  in pairs as a parenthetical (`stegosaurus`, `corythosaurus`,
  `edmontosaurini`, `acrocanthosaurus`); ` -- ` on both sides still reads.
- The only other non-ASCII in the content is LETTERS: `ț` in `Hațeg` (2) and
  `é` in `Rubén` (1). Those are correct spellings of a real place and a real
  person and must survive. The test therefore bans a punctuation set, NOT
  non-ASCII.

## Data and interfaces

No production type, signature or module changes. The whole diff is content plus
one test.

New in `test/dataIntegrity.test.ts`, mirroring the existing `HTMLISH` constant:

```ts
// U+2010..U+2015 dashes, curly quotes, ellipsis, minus sign.
const TYPOGRAPHIC = /[‐-―‘’“”…−]/;
```

reused by one case in the existing `describe("Jurassic text content")`, over
`textFieldsOf(species)` and the clade `name`/`description` - the same fields the
HTML case already walks.

## Sketches

Illustrative only.

```diff
--- a/src/jurassic/species/stegosaurus.md
-period: Late Jurassic (155–150 Ma)
+period: Late Jurassic (155-150 Ma)
-... brain was notoriously tiny—about the size of a hot dog—leading to a funny
+... brain was notoriously tiny -- about the size of a hot dog -- leading to a funny
```

```diff
--- a/test/dataIntegrity.test.ts
+    it("keeps typographic punctuation out of shipped text", () => {
+        const offenders: string[] = [];
+        for (const species of data.species) {
+            for (const [field, value] of textFieldsOf(species)) {
+                if (TYPOGRAPHIC.test(value)) offenders.push(`${species.id}.${field}: ${value}`);
+            }
+        }
+        // ... same walk over data.clades
+        expect(offenders).toEqual([]);
+    });
```

## Shape

```
  src/jurassic/species/*.md  --.
  src/jurassic/clades/*.md   --+--> markdown_to_json.py --> src/jurassic/index.json
       (edit here)              |                                |
                                |                                v
                                |                        buildGameData (jsonLoader)
                                |                                |
   contentSource.test.ts  <-----'                                v
   (md must equal json)                             dataIntegrity.test.ts
                                                    +-- existing: HTMLISH ban
                                                    +-- NEW: TYPOGRAPHIC ban
                                                                 |
                                                                 v
                                                        src/ui/card.ts panel
```

## Consequences and open questions

- **The `rg` proof only covers the markdown.** `json.dump` defaults to
  `ensure_ascii=True`, so `index.json` stores these as `–` / `—`
  escapes - a byte grep over it finds nothing today and would find nothing if
  the content regressed. That is exactly why the enforcement has to be a Jest
  test over the PARSED payload, not a grep. Confirmed: `grep -c '\\u2013'
  index.json` = 97.
- **113 files, one conflict window.** Nothing else is in flight on
  `src/jurassic/` right now, so land it before the next content task starts.
- **Regeneration writes an untracked file.** `python scripts/markdown_to_json.py`
  also rewrites `commontree-metajurassic.json`, which `.gitignore` covers. The
  `git diff --exit-code src/jurassic/index.json` proof is unaffected.
- **Open: `src/ui/card.ts` uses `—` six times** (lines 98-105) as the
  empty-field placeholder, and `test/hintSelection.test.ts:72` has one in a
  comment. Both are outside `src/jurassic/`, so the stated Steps do not cover
  them and the new test would not catch them. The card ones are user-facing in
  principle, though unreachable in practice since `dataIntegrity` already
  asserts every field is non-empty. Assumption taken: leave them, and note that
  a follow-up could either swap them for `-` or widen the ban to source files.
  Cheap to fold in if the plan wants it.
- **What this forecloses:** nothing structurally. If the content ever wants a
  genuine typographic character, the ban becomes an edit to one regex plus a
  justification, which is the intended cost.
