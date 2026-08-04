# Decision: how the static FAQ states the guess budget

- STATUS: ACCEPTED
- DATE: 2026-08-04
- TASK: 20260729-212757
- TAGS: build, content

## Context

`src/faq.html` types the guess budget as a literal ("You have 25 attempts to
find the target."). Nothing overwrites it, so a reprice of `MAX_GUESSES` leaves
the FAQ contradicting the game. Unlike `#stat-box`, there is no existing filler
to lean on: the FAQ is a static page, and `src/faq.ts` today only imports
`style.css`.

The page IS an html-webpack-plugin template, so a build-time value is
mechanically possible. That makes the two routes mutually exclusive and
load-bearing: the number is either baked at build time or filled at runtime,
and each pulls a different dependency into the repo.

## Decision

**Fork 1 - runtime hydration from `src/faq.ts`.** Put an empty
`<span id="faq-guess-budget"></span>` in `src/faq.html` and fill it on load from
a pure copy builder that imports `MAX_GUESSES`. `src/faq.ts` is already a
webpack entry chunked into `faq/index.html` (`webpack.config.js`, `entry.faq`),
so the page runs JS today and no build-config change is needed.

**Fork 2 - a new `src/faqCopy.ts` rather than reusing `briefCopy()`.**
`src/ui/onboarding.ts` already exposes `briefCopy().budget`
(`You have ${MAX_GUESSES} guesses.`), but the FAQ gets its own builder.

## Alternatives considered

Fork 1:

- **Build-time substitution** via `htmlWebpackPlugin.options` or the
  `HtmlPartialsPlugin` `<%= key %>` vars. Rejected: `webpack.config.js` is
  CommonJS and `src/constants.ts` is TypeScript, so it needs `ts-node/register`
  in the build, a regex scrape of the source, or the constants moved to a
  JSON/JS file. The repo's `.json` rule is `asset/resource`
  (`webpack.config.js` module rules), so a plain JSON import of the constants
  would not even resolve as data. That is a constants-to-build-config bridge
  with exactly one consumer - over the concept budget.
- **Drop the number from the copy** ("a limited number of attempts"). Free, but
  it deletes the fact the question is asked to learn.

Fork 2:

- **Import `briefCopy()` from `src/ui/onboarding.ts`.** Rejected: it drags the
  onboarding DOM builders into the FAQ bundle and couples two pages' copy, so a
  wording change on the board would silently rewrite the FAQ. The shared thing
  is `MAX_GUESSES`, not the sentence.

## Consequences

- The FAQ sentence is absent in the pre-hydration frame of an otherwise static
  page. Accepted: the crawler-facing copy (title, description, og, canonical)
  comes from `_head.html` and is untouched; one sentence of body prose moves
  behind hydration.
- `src/faqCopy.ts` sits outside `src/ui/**`, which `jest.config.js` excludes
  from coverage, so the copy stays unit-testable - the same split that put
  `briefCopy()` beside the onboarding mounting code.
- A future second FAQ answer needing a constant extends `src/faqCopy.ts`; if
  build-time values are ever needed for a genuinely JS-free page, this decision
  is the one to revisit.
