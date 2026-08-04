# Notes: Drive the guess budget in markup from MAX_GUESSES

## What changes

Nothing the player sees today changes. What changes is what a *maintainer* sees
after editing `src/constants.ts`.

Before: `MAX_GUESSES = 25` is typed a second and third time into markup.

- `src/index.html:24` - `<div class="stat-box" id="stat-box">Guesses Left: 25</div>`.
  `updateUI()` overwrites it on first render, so today it is only wrong in the
  pre-hydration frame and in the template a reader trusts.
- `src/faq.html:37` - "You have 25 attempts to find the target." Static page,
  nothing overwrites it. Reprice the game and this line lies forever.

After: both lines carry the value the game enforces, and a repriced
`MAX_GUESSES` moves them without a human remembering to. A Jest guard fails if
a literal budget is typed back into any page template.

## Surfaces

| File | Why |
|------|-----|
| `src/constants.ts` | Unchanged in value; becomes the build's source too, so it grows a comment saying so. |
| `webpack.config.js` | Reads `MAX_GUESSES` and passes it to each `HtmlWebpackPlugin` instance as a page option. |
| `src/index.html` | `#stat-box` seeded from the option instead of `25`. Serves both `index` and `practice`. |
| `src/faq.html` | The "How do I play?" answer takes the number from the option. |
| `test/markupConstants.test.ts` (new) | The absence guard: no page template names the budget or the hint cost as a literal. |
| `e2e/faq.spec.ts` (new, or a case in `routes.spec.ts`) | The board and the FAQ state the same number in a real browser. |

Untouched and already correct: `src/ui/onboarding.ts`, `src/gameOverCopy.ts`,
`src/shareText.ts`, `src/gameState.ts` all build their copy from the constant.

## Data and interfaces

No runtime types change. The new seam is build-time.

```js
// webpack.config.js
const { MAX_GUESSES } = requireConstants();   // -> { MAX_GUESSES: number, HINT_COST: number }
```

The value reaches templates through html-webpack-plugin's existing EJS pass -
the same channel `basePath` already uses:

```
htmlWebpackPlugin.options.maxGuesses : number
```

It must be set on the `index`, `practice` and `faq` plugin instances (index and
practice share `src/index.html`).

Note the partials plugin (`webpack-partials.js`) cannot carry this: it runs at
`beforeEmit`, *after* EJS, and has its own `<%= key %>` substitution. Templates
that need the number use `htmlWebpackPlugin.options`; partials would need the
other mechanism. Nothing here needs a partial, so this stays out of scope.

### How webpack.config.js reads a TypeScript constant

The one real decision. Three candidates:

1. **`ts-node/register` in the config** (recommended). `ts-node` is already a
   devDependency (used by `og:image` and the playtests). Three lines, one
   authority, no new file:

   ```js
   require("ts-node").register({
       transpileOnly: true,
       compilerOptions: { module: "commonjs" },
   });
   const { MAX_GUESSES } = require("./src/constants");
   ```

   Cost: `ts-node` moves from an out-of-CI script dependency onto the build
   path, including the Pages deploy. `transpileOnly` keeps it to a few hundred
   ms and no typecheck coupling.

2. **Regex-read `src/constants.ts`** from the config and throw if unmatched.
   No new dependency on the build path; a text parse of source, which is the
   kind of guard that rots quietly. Rejected unless (1) misbehaves.

3. **Move the numbers to `constants.json`**, imported by `constants.ts`
   (`resolveJsonModule` is already on) and `require`d by the config. Clean for
   the build, but it splits the constants from the long comments that justify
   them - `HINT_SPLIT_FRACTION` and `MAX_HINTS` carry the reasoning that makes
   that file readable. Rejected on readability.

Assumption recorded, not blocking: option 1. It puts the coupling in the
direction the repo already tolerates - build config reads app source, and
`src/constants.ts` stays the single authority. This is the opposite direction
from the `SITE_URL` duplication in `webpack.config.js`, which was left
hand-synced precisely because the alternative was the *runtime bundle importing
build config*. That objection does not apply here.

## Sketches

Illustrative, not a patch.

```diff
  // webpack.config.js
+ require("ts-node").register({ transpileOnly: true,
+     compilerOptions: { module: "commonjs" } });
+ const { MAX_GUESSES } = require("./src/constants");
...
      new HtmlWebpackPlugin({
          template: "src/faq.html",
          basePath: publicPath,
+         maxGuesses: MAX_GUESSES,
          ...PAGES.faq,
      }),
```

```diff
- <div class="stat-box" id="stat-box">Guesses Left: 25</div>
+ <div class="stat-box" id="stat-box">
+     Guesses Left: <%= htmlWebpackPlugin.options.maxGuesses %>
+ </div>
```

```diff
-   revealed in the tree to guide your next guess. You have
-   25 attempts to find the target.
+   revealed in the tree to guide your next guess. You have
+   <%= htmlWebpackPlugin.options.maxGuesses %> attempts to find the target.
```

Seeding `#stat-box` rather than emptying it (the `#hint-text` precedent): once
the templating channel exists, the correct number in the pre-hydration frame is
free, and it avoids a blank box on first paint. `#hint-text` was emptied
because its copy is *dynamic* (it changes with hints used), not merely
templated.

```ts
// test/markupConstants.test.ts - shape only
const templates = ["index.html", "faq.html", "practice"...]; // enumerate, glob src/*.html
for (const file of templates) {
    it(`${file} states no guess budget as a literal`, () => {
        expect(read(file)).not.toMatch(new RegExp(`\\b${MAX_GUESSES}\\b`));
    });
}
```

Enumerated over a real `readdirSync` of `src/*.html`, and the list asserted
non-empty, per `absence-needs-an-enumerated-scope` - a glob that matches
nothing passes vacuously. The regex is built *from* `MAX_GUESSES`, so it tracks
a reprice instead of pinning `25`.

## Shape

```
   src/constants.ts  (MAX_GUESSES - single authority)
        |                    |
        | require            | import
        v                    v
  webpack.config.js     app bundle
        |                    |
        | plugin option      | updateUI(), onboarding, shareText
        v                    v
   EJS pass in            #stat-box after hydration
   html-webpack-plugin
        |
        +--> dist/index.html      "Guesses Left: 25"   (pre-hydration frame)
        +--> dist/practice/...    same template
        +--> dist/faq/index.html  "You have 25 attempts"  (never hydrated)

   test/markupConstants.test.ts --- reads src/*.html, fails on a literal
   e2e/faq.spec.ts -------------- board number == FAQ number in a browser
```

## Consequences and open questions

- Cost: `ts-node` joins the build path. If that ever bites (CI cold start, a
  Node/ts-node version skew on Pages), option 3 is the escape hatch and is a
  mechanical change.
- Templates stop being plain HTML in one more place. `src/index.html` already
  carries `<%= htmlWebpackPlugin.options.basePath %>`, so this is not a new
  category, but anyone opening the file in a browser directly now sees a raw
  tag in the top bar.
- Forecloses nothing. `HINT_COST` is already out of markup; the same option
  channel is there if a page ever needs it.
- The Jest guard is deliberately a guard, not a hand-run grep -
  `a-guard-no-test-can-fail-is-a-comment`, the same reasoning `test/lintGate.test.ts`
  records. The task's DoD asks for a recorded grep; a test that runs every CI
  is strictly stronger, and the grep is still run and recorded during work.
- Open, non-blocking: whether the FAQ E2E belongs in `routes.spec.ts` (already
  visits `/faq/`) or a new spec. Decide at plan time; leaning on extending
  `routes.spec.ts` only if it does not muddy that spec's single concern.
- Open, non-blocking: the guard's regex will also flag an innocent `25` in
  future page copy (`a-text-guard-matches-prose-too`). Accepted: `src/*.html`
  is five small files and a false positive is a one-line allowlist away, where
  a false negative is the bug this task exists to kill.
