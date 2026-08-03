# Retro: Make shared links unfurl with Open Graph and Twitter cards

- TASK: 20260729-101751
- BRANCH: feature/og-unfurl
- REVIEW ROUNDS: 2

## What went well

- The plan named the injection-point constraint up front - `webpack-partials.js`
  runs at `beforeEmit`, after html-webpack-plugin's EJS pass - so the head
  partial reused and generalised the existing `basePath` substitution instead
  of inventing a second templating path. No new mechanism.
- The three genuinely contested choices (site-URL duplication, committed PNG
  with an HTML source, plugin-side substitution) went into DECISION.md with
  their rejected alternatives, so review argued about the code, not the shape.
- Both review rounds ran out-of-context, and round 2 falsified every round-1
  fix by breaking it deliberately (retargeted `CopyPlugin` `to:`, reverted
  string replacement) rather than reading the fix and agreeing with it.

## What went wrong

- R1.1 (MAJOR): the Definition of Done proved the PNG ships, but that proof
  was a hand-run `cmd:` outside `npm run ci`. Deleting the `CopyPlugin` entry
  left all 8 social tests and the whole `ci` green while every unfurl lost its
  image - the Story's "and image". The plan wrote the assertion at the wrong
  boundary: `og:image` was checked for shape (`/^https:\/\//`) and never
  fetched.
- R2.1 (MINOR, left open as 20260803-111943): `fill` guards its values against
  `$` replacement-pattern expansion but not against the HTML-attribute quoting
  they land in. The guard was written for the domain the value passes through,
  not the domain it ends in.
- R1.2 repeated that same shape one level up: `fill`'s internal `$`-guard was
  undone one line later by three string-replacement marker injections.

## What to improve next time

- Plan-time: for each `cmd:` proof, ask whether the repo's standing automation
  runs it. A proof only the author runs by hand is documentation, not a guard.
  Either fold it into `ci` or say in the plan that it is a release check.
- Plan-time: when a value crosses from build config into markup, name the
  destination domain in the Step, not just the transport. "Substitute
  `pageTitle` into the head partial" hid two escaping domains (`$` patterns,
  HTML attributes) that cost one round each.
- Assert artifacts at the served boundary, not the source boundary. The fix
  that closed R1.1 - fetch the URL, assert 200 - is the pattern; a string-shape
  assertion on a URL proves nothing about what a client receives.

## Action items

- 20260803-111943 - escape HTML in `fill` and pin a quoted title in
  `e2e/social.spec.ts`. Carries R2.1.
- DoD proof 6 (`manual:`) stays open: after deploy, paste the link in
  Slack/Discord or run a card validator. Not resolvable on a branch.
