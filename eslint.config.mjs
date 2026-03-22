import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        rules: {
            // Customize rules here
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/no-explicit-any": "warn",
            "no-console": ["warn", { allow: ["warn", "error"] }],
            // Allow floating promises in top-level module code (initialization)
            "@typescript-eslint/no-floating-promises": "off",
            // Allow require() imports for compatibility
            "@typescript-eslint/no-require-imports": "off",
        },
    },
    {
        // Relaxed rules for test files
        files: ["test/**/*.ts", "**/*.test.ts", "**/*.spec.ts"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/ban-ts-comment": "off",
        },
    },
    {
        ignores: [
            "dist/",
            "build/",
            "coverage/",
            "node_modules/",
            "webpack.config.js",
            "jest.config.js",
            "eslint.config.mjs",
        ],
    }
);
