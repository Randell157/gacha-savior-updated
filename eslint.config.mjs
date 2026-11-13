import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // .agents/ holds installed Claude Code skills (the security audit), not site code.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".agents/**"]),
  {
    // eslint-plugin-react can't auto-detect the React version under ESLint 10
    settings: { react: { version: "19" } },
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-page-custom-font": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);
