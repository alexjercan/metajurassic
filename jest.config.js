/** @type {import('jest').Config} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    // `src` is here for COVERAGE discovery, not test discovery: jest only
    // instruments files it finds under `roots`, so without it a `src/` module
    // no test imports is ABSENT from the report rather than listed at 0%, and
    // `collectCoverageFrom` below never sees it. Nothing under `src/` matches
    // `testMatch`, so the suite set is unchanged.
    roots: ["<rootDir>/test", "<rootDir>/src"],
    // Pins the suite's time zone to a DST-observing one; see the file.
    globalSetup: "<rootDir>/test/setTimeZone.js",
    moduleFileExtensions: ["ts", "js", "json"],
    // Asset imports are webpack's job (`asset/resource` -> a URL string), so
    // anything importing one - `src/ui/card.ts` and its default icon - needs a
    // stand-in under Jest.
    moduleNameMapper: {
        "\\.(svg|png|jpe?g|gif|webp|css)$": "<rootDir>/test/assetStub.js",
    },
    collectCoverageFrom: [
        "src/**/*.ts",
        "!src/**/*.d.ts",
        "!src/ui/**/*.ts", // Exclude UI components (DOM-heavy, hard to unit test)
        "src/ui/treeLayout.ts", // ...except this one: pure geometry, no DOM
        "src/ui/treeNav.ts", // ...and this one: pure traversal, no DOM
        "!src/game/**/*.ts", // DOM components, same reason as src/ui/**
        "!src/profile/**/*.ts", // DOM components, same reason as src/ui/**
        // Page entry points: DOM bootstrap only, covered by the e2e suite.
        "!src/index.ts",
        "!src/clades.ts",
        "!src/faq.ts",
        "!src/practice.ts",
        "!src/species.ts",
    ],
    // Raised with the data-integrity suite (20260729-092352), which pulled the
    // real numbers up sharply. Left at the old floors, the new tests could all
    // be deleted without the gate noticing.
    coverageThreshold: {
        global: {
            branches: 78, // Current: 81.83%
            functions: 98, // Current: 99.31%
            lines: 97, // Current: 98.22%
            statements: 94, // Current: 95.39%
        },
    },
    coverageReporters: ["text", "lcov", "html"],
    reporters: [
        "default",
        [
            "jest-junit",
            {
                outputDirectory: "test-results",
                outputName: "junit.xml",
                suiteName: "Jest Tests",
                classNameTemplate: "{classname}",
                titleTemplate: "{title}",
                ancestorSeparator: " › ",
            },
        ],
    ],
};
