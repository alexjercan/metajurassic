# Decision: Jurassic data-integrity harness shape

- STATUS: ACCEPTED
- DATE: 2026-07-30

Three choices on this task had mutually-exclusive candidates, so they are
recorded here rather than inferred while coding. Choice 1 went to the user at
the plan gate; choices 2 and 3 were decided from the code and this repo's
conventions.

## 1. The repair is folded into the validation cycle (user decision)

The scan found exactly one defect: all 150 species `icon` values are stringified
Python lists. Task `20260729-092404` owns repairing it, and this task owns
validating it. That makes the central assertion of the harness ("icons are
usable media references") a statement about behavior task `092404` has not
delivered yet, and the two candidates could not both hold:

- **Quarantine pin.** Ship the harness now, express the true invariant as Jest
  `test.failing` plus an active test pinning the defect set at exactly 150, and
  leave the game's icons broken until `092404` runs. Precedent exists:
  `tasks/20260729-092258/DECISION.md` committed the same invariant as an e2e
  `test.fixme`.
- **Fold the repair in.** Deliver both tasks from one branch, so every icon
  assertion is a plain green test and no quarantined assertion is left behind.

They are exclusive because the gate cannot be green with an unquarantined icon
assertion while the data is still broken. Presented at the plan gate; the user
chose to fold the repair in. Both tasks close together, and the e2e `test.fixme`
flips on in the same change.

Folding in also buys a strictly stronger invariant. The 150 icons are not merely
"some URL wrapped in a list": every one is a 1-element list whose URL is exactly
the species' own clade `image` (verified over the payload before planning). So
the post-repair test pins `species.icon === clades[species.clade].image` rather
than the weak "well-formed URL" shape, and a wrong-but-well-formed icon is
caught too.

## 2. The pipeline is hardened by refusing the defect, not by unwrapping it

The list repr is authored INTO `src/jurassic/species/*.md`; `markdown_to_json.py`
only copies frontmatter strings through. The scraper that produced the repr is
not in this repository, so "fix the pipeline so it cannot regenerate the list
repr" has two candidate readings:

- **Sanitize:** teach the pipeline to unwrap a `['...']` value on the way to
  JSON. Rejected: it makes the generated JSON silently disagree with the
  authored source, which is exactly the class of defect this task exists to
  catch, and it hides the authoring bug forever.
- **Refuse:** make the pipeline exit non-zero and name the offending file when a
  frontmatter value is a serialized list or other non-scalar repr. Chosen. The
  markdown stays the source of truth, and the defect surfaces at the authoring
  layer where it can be fixed once.

To make that refusal provable rather than asserted, `markdown_to_json.py` grows
an argparse `--jurassic-path` (default unchanged), so the check can be run
against a poisoned temporary content tree.

## 3. Source validation reuses the shipped parser and pins a round trip

Validating the authored frontmatter needs a parser in the test process. Three
candidates:

- **Hand-copy a frontmatter parser into the test.** Rejected outright by
  `LESSONS.md`: `hand-copied-logic-mirrors-rot-update-them-in-the-same-change`.
- **Shell out to `scripts/markdown_to_json.py` from Jest and diff its output.**
  Uses the real generator, but makes the Jest suite depend on a Python
  interpreter being on PATH in every environment that runs the gate (CI is stock
  ubuntu, local is the nix shell). Rejected as an environment coupling the suite
  does not otherwise have.
- **Lift `parseFrontMatter` out of `src/markdownLoader.ts` into a shared
  `src/frontMatter.ts`, parse the source with it in the test, and assert the
  reconstructed graph equals the committed `index.json` exactly.** Chosen.

The chosen option is self-checking, which is what makes the remaining TS/Python
duplication safe: the TS parser is never trusted on its own, only compared
against the Python-generated `index.json`. If the two ever disagree - a quoting
rule, a multi-line value, a stale regeneration - the round-trip test goes red.
It also proves `index.json` is in sync with the markdown, which nothing checked
before.

Note discovered while doing this: `src/markdownLoader.ts` is DEAD CODE (every
page imports `loadGameData` from `jsonLoader`). It is left in place and rewired
to the shared parser here rather than deleted, because deleting a module is not
this task's scope; a follow-up task tracks it.

## 4. Card fallbacks are tested in jsdom, not in the browser suite

"Cards handle missing optional media gracefully" cannot be driven from the real
data, because every one of the 150 species and 108 clades HAS an image - there
is no route that renders a media-less card. So the assertion needs a constructed
input, which makes it a unit-level test of `src/ui/card.ts` rather than an e2e
one. `jest.config.js` runs `testEnvironment: "node"`, so this adds
`jest-environment-jsdom` and a per-file `@jest-environment jsdom` docblock,
leaving the default environment (and every existing spec) untouched.
