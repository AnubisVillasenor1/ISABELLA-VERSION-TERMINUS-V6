import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "*.config.*", "*.mjs", "*.cjs"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.build.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-misused-promises": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  prettierConfig
);