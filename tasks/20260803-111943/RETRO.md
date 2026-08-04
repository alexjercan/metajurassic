# Retro: Escape HTML in the social head partial substitution

- TASK: 20260803-111943
- BRANCH: chore/escape-html-social-head
- REVIEW ROUNDS: 1

## What went well

Round 1 APPROVE with only two NITs. The fix landed as a property of the
substitutor rather than a set of call-site escapes, so a future placeholder is
safe by default.

The proof split held up under an independent re-derivation: the unit test pins
the escape table against the real exported `fill`, the e2e pins the served
bytes. Both were confirmed red on base by two different methods (stashing
`webpack-partials.js`; and reading `master`'s file, which exports no `fill`,
against `webpack.config.js:26-27`'s literal apostrophe).

Breadth: 3 files, ~65 lines. No split was missed - the escape function, its
unit pin and its served-boundary pin are one indivisible change.

## What went wrong

The plan encoded a proof for data that does not exist. Step 2 asked for an e2e
assertion on "a round-tripped title containing a quote", but no `pageTitle` or
`pageDescription` in `webpack.config.js` contains `"`, `<`, `>` or `&`. Work
had to stop and resolve it in DECISION.md.

Why it seemed sound: the finding this task carried over was *about* quotes
(`pageTitle: 'The "how" of it'` truncating a `<meta>`), so writing the proof in
the same character felt like proving the reported bug. The gap is that the
reported bug used a hypothetical title while the proof has to run against
configured copy.

The near-miss underneath it: NOTES.md proposed asserting the decoded
`og:description` contains `today's`. That is green on `master` - a browser
decodes the attribute identically either way - so it would have shipped as a
proof that proves nothing. Caught only by actually building `master` and
reading `dist/index.html`.

## What to improve next time

At plan time, when a `cmd:` proof asserts on product data, name the concrete
existing value it will read and state why the assertion is red without the
change. "Assert the title round-trips" is not checkable; "assert the served
bytes for `/` contain `today&#39;s`, which `master` emits as `today's`" is.

For a diff whose effect is an encoding, prefer an assertion on the raw
transport bytes over one on a parsed/decoded view. A decoder hides exactly the
difference the change makes.

Context: no compaction, threshold crossing or handoff observed. Round 1 used
the standard out-of-context reviewer; nothing else was delegated.

## Action items

- None. Both NITs (R1.1 test scope, R1.2 AGENTS.md repository-map cell) are
  take-it-or-leave-it and were left; neither blocks landing.

## Landing message

```
chore: escape HTML in the social head partial substitution

`fill` in `webpack-partials.js` spliced raw strings into the shared head,
header and footer partials. Every placeholder sits inside a double-quoted
attribute, so a `"`, `&`, `<` or `>` in page copy would truncate a `<meta>`
tag while the existing `length > 0` e2e assertions stayed green.

Escape values at the substitution point in one pass over `[&<>"']`, so an `&`
the pass introduces cannot be escaped again. Export `fill` and pin the escape
table against it directly; pin the served bytes for `/` in
`e2e/social.spec.ts`, which carry `today&#39;s` and decode back to `today's`.
```
