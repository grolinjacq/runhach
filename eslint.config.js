import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.wrangler/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "apps/worker/worker-configuration.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["**/*.{js,mjs}", "**/*.config.ts", "e2e/**/*.ts", "**/scripts/**"],
    languageOptions: { globals: globals.node },
  },
  {
    // Playwright scripts run code inside the page (page.evaluate), so browser globals exist too.
    files: ["e2e/**/*.{ts,mjs}"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
