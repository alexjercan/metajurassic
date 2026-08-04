# Decision: how the docs site attaches to the game's build and gates

- STATUS: ACCEPTED
- DATE: 2026-08-04
- TASK: 20260804-151403
- TAGS: build, docs, tooling

## Context

NOTES.md left five questions open. Each is a fork in how a second static
builder attaches to a repo whose build, gates and mobile layout are already
tuned, so each is answered here from the code rather than re-litigated in the
work phase.

Three facts drive most of it:

- `webpack.config.js` sets `output.clean: true`. Webpack wipes `dist/` on
  every run, and VitePress writes into `dist/docs/`. Wrong order means the
  docs are deleted, every command exits 0, and the deployed `/docs/` path
  404s.
- `src/partials/responsive.css:242` documents that under 768px the footer
  wraps, a wrapped row costs ~27px of game area, and that is enough to clip
  the onboarding brief at 320x568 - which `e2e/onboarding.spec.ts` asserts.
  `.footer-label-long` is hidden at that width specifically to keep the
  current **four** footer links on one row.
- `.github/workflows/ci.yml` has a second job, `build`, that runs
  `npm run build` on every push and pull request to master - even though
  `npm run ci` itself never invokes `build`.

## Decision

**1. The docs link goes in `src/faq.html` and `README.md`, not the footer.**
TASK.md offers "footer or FAQ"; the responsive comment picks FAQ. A fifth
footer link is a live risk of turning the mobile E2E suite red for a reason
nobody would trace back to a docs task.

**2. `docs/**` joins the prettier globs only.**

| Gate | `docs/**`? | Why |
|------|-----------|-----|
| `prettier` (`format`, `format:check`) | yes | Cheap, keeps the one new TypeScript file in the repo's format; Markdown is a supported parser. |
| `eslint` | no | The config runs `recommendedTypeChecked` via `projectService`. Linting `docs/.vitepress/config.ts` drags the whole `.vitepress` tree, and VitePress's own types, into the type-checked project for one ~20-line file. |
| `tsconfig.json` `include` | no | Same reason. VitePress type-checks its config through its own Vite pipeline during `docs:build`. |

**3. `docs:build` chains into `build`, not into `ci`.** Because `ci.yml`'s
`build` job runs on every PR, this already fails a PR on a dead internal docs
link, with no Vite build added to the local `ci` gate. `npm run ci` stays
byte-identical, so `test/lintGate.test.ts` - which asserts the exact step list
of `ci` - keeps passing unchanged.

**4. All seven pages land in this task.** NOTES.md floats cutting to three and
seeding the rest. Landing a docs site missing four of its seven specified
pages is narrowing the user's scope, which is the user's call, not the plan's.
The pages are short and mutually independent, so the cost of the larger set is
review length, not correctness.

**5. Build order is guarded by `test/docsGate.test.ts`, not by a comment.**
It pins `webpack` before `docs:build` in `pkg.scripts.build`, in the style of
`test/lintGate.test.ts` and for the same recorded reason: a guard no test can
fail is a comment, and a hand-run `cmd:` proof is evidence for one moment.

## Alternatives considered

- **Footer link plus a re-tuned breakpoint.** Buys a second entry point at the
  cost of re-deriving a tuned mobile layout inside a task whose subject is a
  documentation site. Rejected.
- **`docs/**` in the eslint globs and `tsconfig.json` `include`.** Uniformity
  for one config file, paid for by pulling VitePress's type surface into the
  root project. Rejected; `docs:build` is that file's proof.
- **`docs:build` as a step in `npm run ci`.** Would add a full Vite build to
  every local gate run, and would force an edit to the `ci` string that
  `lintGate.test.ts` pins. Redundant once the `ci.yml` `build` job is
  accounted for. Rejected.
- **A Playwright route spec for `/docs/`.** `playwright.config.ts` starts
  `npm run serve`, the webpack dev server, which knows nothing about VitePress
  output - so the spec needs a second static server for the least valuable
  guard available. Rejected; `ignoreDeadLinks: false`, the ordering test and
  the `dist/docs/index.html` assertion cover the failure modes that matter.
- **Routing VitePress through `webpack.config.js`.** VitePress ships its own
  Vite build and is not a webpack plugin. Never viable; recorded so nobody
  tries.

## Consequences

- `docs/.vitepress/config.ts` becomes the only TypeScript in the repo that is
  formatted but neither linted nor part of the root TypeScript project. Its
  only proof is that `docs:build` succeeds.
- The docs have exactly two entry points: the FAQ page and `README.md`. A
  player who never opens the FAQ never sees them. Accepted for now; revisit
  only alongside a deliberate footer or header change.
- `build` becomes order-sensitive in a way that fails silently if broken.
  `test/docsGate.test.ts` is the only thing standing between a reorder and a
  green build that ships a 404.
- The Pages workflow moves from Node 18 to Node 22, aligning the deploy path
  with the versions `ci.yml` tests and removing a class of "works in CI, fails
  in deploy" bug.
