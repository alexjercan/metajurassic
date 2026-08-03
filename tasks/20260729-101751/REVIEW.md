# Review: Make shared links unfurl with Open Graph and Twitter cards

- TASK: 20260729-101751
- BRANCH: feature/og-unfurl

## Round 1

- REVIEWER: out-of-context
- VERDICT: REQUEST_CHANGES

- [x] R1.1 (MAJOR) e2e/social.spec.ts:60 - the only assertion on `og:image` is
  `toMatch(/^https:\/\//)`, so nothing in `npm run ci` proves the referenced
  PNG is served. Delete the `CopyPlugin` entry at `webpack.config.js:147-155`
  (or typo its `to:`) and all 8 social tests plus the full `ci` stay green
  while every unfurl silently loses its image - the Story's "and image". Only
  DoD proof 3 catches it, and `ci` does not run it. Add to the per-page test:
  `expect((await page.request.get(image.replace(SITE_URL, ""))).status()).toBe(200);`
  so the stable hash-free path is pinned at the served boundary.
  - Response: fixed. `e2e/social.spec.ts:66-72` now fetches the `og:image`
    path against the served origin and asserts a 200, after pinning that the
    URL starts with `SITE_URL/`. Falsified before accepting: retargeting the
    CopyPlugin `to:` to `assets/og-image-BROKEN.png` fails all 6 per-page
    tests on exactly that line. Worth knowing for the next falsification -
    the break is masked by a stale on-disk `dist/`, because the dev server's
    `static: dist` serves the old PNG; `rm -rf dist` first.
- [x] R1.2 (MINOR) webpack-partials.js:59 - `fill`'s function-replacement
  `$`-guard (line 13, and the comment above it) is undone one line later:
  `.replace("<!-- social-head -->", head)` passes `head` as a *string*
  replacement, so a `$&`, `` $` `` or `$'` inside `pageDescription` is still
  expanded against the marker match. Change to
  `.replace("<!-- social-head -->", () => head)`, and the same for the
  `header`/`footer` replacements on lines 60-61.
  - Response: fixed. `webpack-partials.js:58-64` - all three marker
    replacements are now function replacements, with a comment saying why.
- [x] R1.3 (MINOR) tasks/20260729-101751/DECISION.md:29 - "Each carries a
  comment cross-referencing the other" is false: `src/shareText.ts:25` is
  untouched by the diff and its `SHARE_URL` has no comment pointing at
  `SITE_URL`. Add the reciprocal comment above `src/shareText.ts:25`, or
  reword the decision to say only the build side cross-references.
  - Response: fixed. Both: `src/shareText.ts:25-28` gains the reciprocal
    comment, and DECISION.md now says three copies (the spec is the third)
    rather than two.
- [x] R1.4 (MINOR) AGENTS.md:22 - the repo map still says `webpack-partials.js`
  "adds shared header/footer"; it now also injects `src/_head.html` at the
  `<!-- social-head -->` marker. Update that cell. Also add a
  `scripts/og-image.ts` row next to `scripts/playtest/*.ts` (line 26) and an
  `npm run og:image` row to the commands table (lines 106-108) - neither
  existing pattern matches the new script, so the card render is currently
  undiscoverable.
  - Response: fixed. `AGENTS.md:22` describes the head injection and the
    marker; a `scripts/og-image.ts` row sits next to `scripts/playtest/*.ts`;
    an `npm run og:image` row joins the outside-CI command table, whose
    heading widened to "Playtests and other outside-CI rigs" so the row is
    not filed as a playtest.
- [x] R1.5 (NIT) e2e/social.spec.ts:9 -
  `https://alexjercan.github.io/metajurassic` now lives in three places (here,
  `webpack.config.js:16`, `src/shareText.ts:25`); the `SITE_URL` comment at
  `webpack.config.js:11-15` and DECISION.md both account for only two. Name
  the spec in that "keep the two in sync by hand" comment.
  - Response: fixed. The `webpack.config.js:13-16` comment now names all
    three copies, and `e2e/social.spec.ts:10-11` says it is the third.

Verified in-session (re-derived, not taken from the reviewer):

- `E2E_PORT=8191 npm run ci` - exit 0, 165 e2e passed.
- DoD proofs 1, 2, 3 re-run individually - all exit 0.
- `e2e/social.spec.ts` read end to end: R1.1 confirmed by inspection, no
  assertion reaches the image bytes.
- `webpack-partials.js:58-61` read: R1.2 confirmed, the string-replacement
  path is real and contradicts the comment at lines 11-12.
- `src/shareText.ts:25` has no cross-reference comment; R1.3 confirmed.
- `AGENTS.md` lines 22, 25-26, 106-108 confirm the stale cell and the two
  missing rows.
- Close-out notes in TASK.md match what re-ran; the `manual:` proof is left
  open, not self-ticked.

Pending user check (does not block a verdict):

- DoD proof 6 (`manual:`) - after deploy, paste the link in Slack/Discord or
  run a card validator. Only observable post-deploy.

Not verified:

- `npm run og:image` was not executed (it writes the tracked
  `src/assets/og-image.png`; review makes no writes). The committed PNG is a
  real 1200x630 image whose content matches the HTML source and the
  `og:image:alt` copy.
- `src/assets/og-image.html` requests `"Segoe UI", Tahoma, sans-serif`, none
  guaranteed on a Linux box, so the render is not byte-reproducible across
  machines. The card is manual-run-only, so this is an observation, not a
  finding.

## Round 2

- REVIEWER: out-of-context
- VERDICT: APPROVE

- [ ] R2.1 (MINOR) webpack-partials.js:12 - `fill` substitutes human-authored
  prose into HTML *attribute* values (`content="<%= pageTitle %>"` in
  `src/_head.html`) with no HTML escaping, so a `"` in any `PAGES` string
  truncates the tag and no test catches it: `pageTitle: 'The "how" of it'`
  emits `content="The "how" of it"`, which a crawler reads as `The `, while
  the spec's `title.length > 0` check still passes. The diff already guards
  these values against one substitution hazard (`$`) but not the one that
  bites at the destination. Escape `&`, `"`, `<`, `>` on each value inside
  `fill` before replacing (safe for `basePath`, which is a path), or assert
  the round-tripped title in `e2e/social.spec.ts`. Latent today - no current
  `PAGES` string contains a quote - so it does not block the verdict.
  - Response:

Round-1 findings R1.1-R1.5 all verified fixed and ticked:

- R1.1: `e2e/social.spec.ts:66-72` fetches `image.replace(SITE_URL, "")` and
  asserts 200. Falsified independently by the reviewer: `CopyPlugin`
  `to: "assets/og-image-BROKEN.png"` with a clean `dist/` fails 6 tests at
  `social.spec.ts:72` with `Received: 404`.
- R1.2: all three marker replacements are function replacements
  (`webpack-partials.js:60-64`). Falsified: reverting only the `social-head`
  one and building with `pageDescription: "Dollar $& test."` emits the
  expanded marker; with the fix the literal `$&` survives.
- R1.3: `src/shareText.ts:25-28` carries the reciprocal comment; DECISION.md
  now says three copies.
- R1.4: `AGENTS.md:22` names the head injection and the marker; the
  `scripts/og-image.ts` row and the `npm run og:image` command row exist.
- R1.5: `webpack.config.js:10-16` names all three copies; `e2e/social.spec.ts`
  declares itself the third.

Verified in-session (re-derived, not taken from the reviewer):

- `E2E_PORT=8191 npm run ci` - exit 0, 165 e2e passed.
- R2.1 re-derived directly: `webpack-partials.js:8-16` applies no escaping and
  `src/_head.html` places every value inside a double-quoted attribute; running
  `fill` on that tag with a quoted title reproduces the truncated attribute.
- `webpack.config.js:25-57` read: no current `pageTitle`/`pageDescription`
  contains `"`, `<`, `>` or `&`, so R2.1 is latent rather than shipping broken.

Pending user check (does not block the verdict):

- DoD proof 6 (`manual:`) - after deploy, paste the link in Slack/Discord or
  run a card validator. Only observable post-deploy.

Not verified:

- `npm run og:image` was not executed; review makes no writes. The committed
  `src/assets/og-image.png` is a real 1200x630 image matching the HTML source
  and the `og:image:alt` copy, but its render is not byte-reproducible across
  machines (`src/assets/og-image.html` requests `"Segoe UI", Tahoma`).
