/** @type {import('jest').Config} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/test"],
    moduleFileExtensions: ["ts", "js", "json"],
    collectCoverageFrom: [
        "src/**/*.ts",
        "!src/**/*.d.ts",
        "!src/ui/**/*.ts", // Exclude UI components (DOM-heavy, hard to unit test)
        "!src/index.ts", // Exclude entry point
    ],
    coverageThreshold: {
        global: {
            branches: 65, // Current: 67.92%
            functions: 95, // Current: 95.65%
            lines: 93, // Current: 93.11%
            statements: 89, // Current: 89.13%
        },
    },
    coverageReporters: ["text", "lcov", "html"],
};
