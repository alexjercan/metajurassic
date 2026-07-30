// The shape of the check gate itself, asserted over package.json.
//
// `npm run ci` is this repo's definition of green, and two of its properties
// are policy rather than code: lint must fail on WARNINGS (not just errors),
// and the chain must not swallow a failing exit code. Neither property is
// visible to any other test - the rest of the suite runs *inside* the gate and
// cannot observe how the gate is assembled - so deleting `--max-warnings=0`
// or piping a step's output somewhere would leave all 200-odd specs green
// while the signal silently weakened. That is exactly the failure mode
// `LESSONS.md`: `a-guard-no-test-can-fail-is-a-comment` records: a hand-run
// `cmd:` proof is evidence for one moment, not a guard.
//
// So this spec pins the DECISION (tasks/20260729-092419/DECISION.md), not
// eslint's behaviour. That eslint honours `--max-warnings` is upstream's
// contract; that this repo asks for it is ours.

import * as fs from "fs";
import * as path from "path";

interface PackageJson {
    scripts: Record<string, string>;
}

const packageJsonPath = path.join(__dirname, "..", "package.json");
const pkg = JSON.parse(
    fs.readFileSync(packageJsonPath, "utf8"),
) as PackageJson;

// `npm run <step>` where <step> ends there - so `lint` does not match
// `lint:fix`, and `test` does not match `test:e2e`.
const stepPattern = (step: string): RegExp =>
    new RegExp(`npm run ${step}(?![:\\w-])`);

describe("the lint script", () => {
    it("runs at zero tolerance for warnings", () => {
        // Without this, the three rules `eslint.config.mjs` sets to `warn`
        // (no-unused-vars, no-explicit-any, no-console) plus every warn-level
        // rule inherited from `recommendedTypeChecked` can all fire on a
        // passing gate.
        expect(pkg.scripts.lint).toMatch(/--max-warnings[= ]0\b/);
    });

    it("is the script the gate calls", () => {
        // Word-boundary matched, NOT `toContain`: "npm run lint" is a
        // substring of "npm run lint:fix", the one script this repo
        // deliberately leaves non-strict. A plain substring check passed
        // happily with the gate rewired to `lint:fix` - i.e. with the flag
        // above no longer running at all. See REVIEW.md round 1, MAJOR.
        expect(pkg.scripts.ci).toMatch(stepPattern("lint"));
    });

    it("is the script the CI workflow calls too", () => {
        // The strict flag reaches GitHub Actions only because the workflow
        // invokes `npm run lint` rather than spelling out its own eslint
        // command. AGENTS.md states that inheritance as fact, so assert it
        // against the workflow file instead of just reasoning about it in a
        // comment (REVIEW.md round 1, first MINOR).
        const workflow = fs.readFileSync(
            path.join(__dirname, "..", ".github", "workflows", "ci.yml"),
            "utf8",
        );
        expect(workflow).toMatch(/run:\s*npm run lint(?![:\w-])/);
    });
});

describe("the ci script", () => {
    const steps = [
        "format:check",
        "lint",
        "test:pipeline",
        "test:coverage",
        "test:e2e",
    ];

    it.each(steps)("includes %s", (step) => {
        expect(pkg.scripts.ci).toMatch(stepPattern(step));
    });

    it("chains its steps so the first failure stops the run", () => {
        // `&&` short-circuits and propagates the failing status. `;` would run
        // every step regardless and report only the last one's, and `||` would
        // treat a failure as a reason to continue.
        //
        // Asserted as two separate properties rather than one exact array, so
        // that legitimately appending a step to `ci` fails the "includes"
        // check above (pointing at the real omission) instead of failing here
        // on a separator count (REVIEW.md round 1, third MINOR).
        const separators = pkg.scripts.ci.match(/&&|\|\||;/g) ?? [];
        expect(separators.length).toBeGreaterThanOrEqual(steps.length - 1);
        expect(separators.every((s) => s === "&&")).toBe(true);
    });

    it("does not pipe a step's output anywhere", () => {
        // A trailing `| grep ...` or `| tee ...` reports the LAST command's
        // status, so a failed compile can arrive as exit 0. See this task's
        // Notes and the global "never end a build command with a pipe" rule.
        //
        // Any `|` at all: the earlier `/\|[^|]/` missed a script ENDING in a
        // pipe, since it demanded a following character. This also flags `||`,
        // which the separator assertion above independently forbids anyway.
        expect(pkg.scripts.ci).not.toMatch(/\|/);
    });
});
