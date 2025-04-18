/**
 * This is intended to be a basic starting point for linting in your app.
 * It relies on recommended configs out of the box for simplicity, but you can
 * and should modify this configuration to best suit your team's needs.
 */

/** @type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
            jsx: true,
        },
        project: "./tsconfig.json",
    },
    env: {
        browser: true,
        commonjs: true,
        es6: true,
    },
    ignorePatterns: [
        "!**/.server",
        "!**/.client",
        "sst.config.ts",
        "node_modules",
    ],

    // Base config
    extends: ["eslint:recommended"],

    overrides: [
        // React
        {
            files: ["**/*.{js,jsx,ts,tsx}"],
            plugins: ["react", "jsx-a11y", "react-hooks"],
            extends: [
                "plugin:react/recommended",
                "plugin:react/jsx-runtime",
                "plugin:react-hooks/recommended",
                "plugin:jsx-a11y/recommended",
            ],
            settings: {
                react: {
                    version: "detect",
                },
                formComponents: ["Form"],
                linkComponents: [
                    { name: "Link", linkAttribute: "to" },
                    { name: "NavLink", linkAttribute: "to" },
                ],
                "import/resolver": {
                    typescript: {
                        project: "./tsconfig.json",
                    },
                },
            },
            rules: {
                "react-hooks/rules-of-hooks": "error",
                "react-hooks/exhaustive-deps": "error",
            },
        },

        // Typescript
        {
            files: ["**/*.{ts,tsx}"],
            plugins: ["@typescript-eslint", "import"],
            parser: "@typescript-eslint/parser",
            parserOptions: {
                project: "./tsconfig.json",
            },
            settings: {
                "import/internal-regex": "^~/",
                "import/resolver": {
                    node: {
                        extensions: [".ts", ".tsx"],
                    },
                    typescript: {
                        alwaysTryTypes: true,
                        project: "./tsconfig.json",
                        tsconfigRootDir: "./",
                        pathsToResolve: require("./.eslintrc-paths"),
                    },
                },
            },
            extends: [
                "plugin:@typescript-eslint/recommended",
                "plugin:import/recommended",
                "plugin:import/typescript",
            ],
        },

        // Node
        {
            files: [".eslintrc.cjs"],
            env: {
                node: true,
            },
        },
    ],
};
