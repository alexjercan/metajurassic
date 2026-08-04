// The ORDER of the two builders inside `npm run build`, asserted over
// package.json.
//
// `webpack.config.js` sets `output.clean: true`, so webpack wipes `dist/` on
// every run. VitePress writes into `dist/docs/`. Run webpack second and it
// deletes the docs it was supposed to ship - and because both builders
// succeeded, every command still exits 0, `npm run build` is green, and the
// only symptom is a 404 on the deployed `/docs/` path.
//
// No other test can see this. The suite runs against `src/`, not against a
// `dist/` any spec builds, so a reorder is invisible everywhere else. That is
// the case `test/lintGate.test.ts` already records for the `ci` chain
// (LESSONS.md: a-guard-no-test-can-fail-is-a-comment), and the reason
// tasks/20260804-151403/DECISION.md section 5 chose a test over a comment.

import * as fs from "fs";
import * as path from "path";

interface PackageJson {
    scripts: Record<string, string>;
}

const packageJsonPath = path.join(__dirname, "..", "package.json");
const pkg = JSON.parse(
    fs.readFileSync(packageJsonPath, "utf8"),
) as PackageJson;

describe("the build script", () => {
    it("builds the docs site", () => {
        // Word-boundary matched for the same reason `lintGate.test.ts` does it:
        // `npm run docs:build` must not be satisfied by some future
        // `docs:build:preview`.
        expect(pkg.scripts.build).toMatch(/npm run docs:build(?![:\w-])/);
    });

    it("has a docs:build script to call", () => {
        expect(pkg.scripts["docs:build"]).toMatch(/vitepress build/);
    });

    it("runs webpack BEFORE the docs build", () => {
        // The whole point of the file. Indices rather than a regex spanning
        // both, so a failure reports two positions a reader can act on.
        const webpackAt = pkg.scripts.build.indexOf("webpack");
        const docsAt = pkg.scripts.build.indexOf("docs:build");

        expect(webpackAt).toBeGreaterThanOrEqual(0);
        expect(docsAt).toBeGreaterThanOrEqual(0);
        expect(webpackAt).toBeLessThan(docsAt);
    });

    it("chains the two builders so the first failure stops the run", () => {
        // `;` would let a failed webpack run be masked by a green docs build.
        const separators = pkg.scripts.build.match(/&&|\|\||;/g) ?? [];
        expect(separators.length).toBeGreaterThanOrEqual(1);
        expect(separators.every((s) => s === "&&")).toBe(true);
    });
});
