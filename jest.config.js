/** @type {import('jest').Config} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/test"],
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
        "!src/index.ts", // Exclude entry point
    ],
    // Raised with the data-integrity suite (20260729-092352), which pulled the
    // real numbers up sharply. Left at the old floors, the new tests could all
    // be deleted without the gate noticing.
    coverageThreshold: {
        global: {
            branches: 78, // Current: 79.06%
            functions: 98, // Current: 99%
            lines: 97, // Current: 97.79%
            statements: 94, // Current: 94.4%
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
