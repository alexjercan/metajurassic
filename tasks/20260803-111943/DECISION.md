# Decision: Prove the escaping on the apostrophe that exists, not on invented quoted copy

- DATE: 20260804-124040
- STATUS: ACCEPTED
- TASK: 20260803-111943
- TAGS: build, testing

## Context

TASK.md Step 2 asked for an `e2e/social.spec.ts` assertion on "a round-tripped
title containing a quote". No `pageTitle` or `pageDescription` in
`webpack.config.js:23-59` contains `"`, `<`, `>` or `&`. The only escapable
character in the shipped copy is the apostrophe in the daily description
(`Guess today's dinosaur.`).

An apostrophe assertion on the DECODED attribute is green on base: verified by
building `master` and reading `dist/index.html`, which emits

```html
<meta name="description" content="Guess today's dinosaur. ..." />
```

A browser hands that attribute back as `Guess today's dinosaur. ...` both
before and after the change, so on its own it proves nothing. A proof that is
green on the base branch is not a proof.

## Decision

Do not invent quoted product copy, and do not add a test-only page. Split the
proof by altitude and make the served-boundary half assert on the raw served
bytes:

| Proof | Level | Red on base because |
|-|-|-|
| `test/socialHeadEscaping.test.ts` | `fill` directly | the file and the escaping do not exist |
| `e2e/social.spec.ts` raw-source assertion | served HTML text | base serves a literal `'`, not `&#39;` |
| `e2e/social.spec.ts` decoded assertion | parsed DOM | guards the other direction: double-encoding |

The e2e half fetches `/` with `page.request.get` and asserts the response body
contains `today&#39;s`, then asserts the parsed `og:description` still reads
back as `today's`. The pair pins that escaping happens through the real build
AND that it round-trips to the exact configured string.

The `"` / `<` / `>` / `&` cases are pinned by the unit test against the real
exported `fill`, which is the function that actually decides them.

## Alternatives considered

- **A seventh, test-only `HtmlWebpackPlugin` page with a quoted title.** Gives a
  literal quote end to end, at the cost of a permanent build entry, a `dist/`
  page, and a `PAGES` entry that is not a product surface. More build surface
  for a guarantee the unit test already carries.
- **Change a real page title to contain a quote.** Contorts shipped copy to
  serve a test.
- **Assert only the decoded apostrophe, as `NOTES.md` proposed.** Rejected:
  green on base, per the build check above.

## Consequences

- `webpack-partials.js` gains a named export (`module.exports.fill`) that exists
  for the test. It is the substitutor itself, not a seam invented around it.
- The e2e raw-source assertion is coupled to the daily description's wording. If
  that copy loses its apostrophe the test reddens loudly rather than silently
  going vacuous, which is the intended failure mode.
- Escaping applies to every `fill` value, including `basePath`. Correct for
  every placeholder that exists: all sit inside double-quoted attributes. A
  future raw-HTML placeholder would need a different substitutor, not a
  per-key opt-out flag.
