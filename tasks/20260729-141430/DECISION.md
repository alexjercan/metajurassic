# Decision: Normalize typographic punctuation in Jurassic content

- DATE: 20260804-125806
- STATUS: ACCEPTED
- TASK: 20260729-141430
- TAGS: content, testing

## Context

The content fix is mechanical; the only real design question is where the
enforcement lives, and how wide it reaches.

Three facts constrain it, all measured on the base:

- The content's non-ASCII is not uniform. 134 of the 137 non-ASCII characters
  under `src/jurassic/` are dashes to remove; the other 3 are letters
  (`ț` x2 in `Hațeg`, `é` x1 in `Rubén`) that are correct spellings and must
  survive. A "ban non-ASCII" rule would delete real information.
- A byte grep over the generated payload is blind. `json.dump` defaults to
  `ensure_ascii=True`, so `src/jurassic/index.json` stores these as `–`
  escapes; grepping it finds nothing today and would find nothing after a
  regression.
- `npx jest -t "<name>"` exits 0 when no test matches its filter, so "the new
  case exists" is not provable by a name filter.

This repo has also twice recorded that a hand-run `cmd:` grep is evidence for
one moment and not a guard (`test/lintGate.test.ts`,
`test/markupConstants.test.ts`, LESSONS.md
`a-guard-no-test-can-fail-is-a-comment`), so the DoD grep alone is not enough.

## Decision

1. Enforce with a Jest case over the PARSED payload, in the existing
   `describe("Jurassic text content")` of `test/dataIntegrity.test.ts`, beside
   the `HTMLISH` case it mirrors.
2. Ban a punctuation SET (`‐-―`, `‘’“”`, `…`, `−`), not non-ASCII, so the three
   letters survive by construction rather than by exception list.
3. Write the constant with `\uXXXX` escapes so the test source stays ASCII and
   does not itself become a target of the rule it enforces.
4. Prove the guard by mutation - inject a dash into the shipped payload, assert
   the suite goes red, restore - rather than by a name filter or a source grep.
5. Scope the ban to Jurassic content. The six `—` empty-field placeholders in
   `src/ui/card.ts` and the one in a `test/hintSelection.test.ts` comment stay.

## Alternatives considered

- **A source-file guard enumerating `src/jurassic/**/*.md`**, like
  `markupConstants.test.ts` does over the page templates. Rejected as redundant:
  `test/contentSource.test.ts` already asserts the parsed markdown equals
  `index.json` exactly, so a dash authored in a `.md` necessarily reaches the
  payload and trips the payload guard. Two guards, one invariant.
- **Widen the ban to all of `src/`**, catching the `card.ts` placeholders.
  Rejected for this task: those are a UI glyph choice rather than authored
  content, and they are unreachable in practice because `dataIntegrity` already
  asserts every text field is non-empty. Deferred, not dismissed - it is a one
  regex plus one file diff if wanted.
- **Grep-only enforcement** (`! rg -q "[–—]" src/jurassic/` in CI). Rejected:
  it is the exact shape LESSONS.md says decays. Kept as a DoD proof, not as the
  guard.

## Consequences

- The rule now has a failing test behind it, so a regression is a red gate
  rather than a re-litigated convention.
- Content that ever wants a genuine typographic character costs one regex edit
  plus a written justification. That is the intended price, not an oversight.
- The `card.ts` placeholders remain a known, recorded gap. Anyone widening the
  ban later starts from this decision rather than rediscovering it.
