# Escape HTML in the social head partial substitution

- PRIORITY: 30
- TAGS: chore, build
- KIND: TASK
- ACTIVITY: PLANNING
- GATES: -
- RESOLUTION: -

## Story

As a maintainer editing page copy, I want `fill` in `webpack-partials.js` to escape its values, so that a quote or ampersand in a title or description cannot silently truncate a `<meta>` tag.

## Review Findings

- Carried over from review round 2 of 20260729-101751, finding R2.1 (MINOR).
- `webpack-partials.js:8-16` substitutes values with no HTML escaping; `src/_head.html` places every one inside a double-quoted attribute (`content="<%= pageTitle %>"`).
- `pageTitle: 'The "how" of it'` emits `content="The "how" of it"`, which a crawler reads as `The `. `e2e/social.spec.ts`'s `length > 0` assertions still pass.
- Latent today: no current `pageTitle` / `pageDescription` in `webpack.config.js:25-57` contains `"`, `<`, `>` or `&`.

## Steps

- [ ] Escape `&`, `"`, `<`, `>` on each value inside `fill` before substituting. Safe for `basePath`, which is a path.
- [ ] Add an `e2e/social.spec.ts` assertion on a round-tripped title containing a quote, so the escaping is pinned at the served boundary.

## Definition of Done

- A quoted title survives the build intact. (cmd: `npx playwright test e2e/social.spec.ts`)
- The repo stays green. (cmd: `npm run ci`)
