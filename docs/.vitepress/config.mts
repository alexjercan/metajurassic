import { defineConfig } from "vitepress";

// `.mts`, not `.ts`: the root package.json declares `"type": "commonjs"`, so a
// plain `.ts` config is loaded as CommonJS and VitePress is ESM-only. Renaming
// it back reintroduces "ESM file cannot be loaded by require" at docs:build.

// The docs site is a SUBPATH of the game, not a second deployment: VitePress
// writes into the same `dist/` webpack does, and the existing Pages workflow
// uploads that one directory. See tasks/20260804-151403/DECISION.md.
export default defineConfig({
    title: "Metajurassic",
    description:
        "How Metajurassic plays, how its content is built, and how the repository fits together.",

    // Mirrors webpack's `PUBLIC_PATH` with `docs/` appended, rather than being
    // hardcoded to the Pages value: `PUBLIC_PATH` is unset locally, so
    // `npm run docs:dev` serves from `/docs/` and the deploy serves from
    // `/metajurassic/docs/` off the same config.
    base: process.env.PUBLIC_PATH
        ? `${process.env.PUBLIC_PATH}docs/`
        : "/docs/",

    // Relative to `docs/`. Webpack owns `dist/` and runs FIRST in
    // `npm run build`, because `output.clean: true` would otherwise delete
    // this; `test/docsGate.test.ts` is what holds that order.
    outDir: "../dist/docs",

    // The 1.x default, stated so a later change has to remove a line rather
    // than merely not add one. A dead internal link is the failure this site
    // is most likely to grow, and `ci.yml`'s `build` job runs `npm run build`
    // on every pull request, so this is the gate that catches it.
    ignoreDeadLinks: false,

    themeConfig: {
        nav: [
            { text: "Play", link: "https://alexjercan.github.io/metajurassic" },
            { text: "How to play", link: "/how-to-play" },
            { text: "Architecture", link: "/architecture" },
        ],

        sidebar: [
            {
                text: "Playing",
                items: [
                    { text: "Overview", link: "/" },
                    { text: "How to play", link: "/how-to-play" },
                    {
                        text: "Practice and seeds",
                        link: "/practice-and-seeds",
                    },
                    { text: "Archives", link: "/archives" },
                    {
                        text: "Profile and ranks",
                        link: "/profile-and-ranks",
                    },
                ],
            },
            {
                text: "Building",
                items: [
                    { text: "Content pipeline", link: "/content-pipeline" },
                    { text: "Architecture", link: "/architecture" },
                ],
            },
        ],

        socialLinks: [
            {
                icon: "github",
                link: "https://github.com/alexjercan/metajurassic",
            },
        ],

        search: { provider: "local" },
    },
});
