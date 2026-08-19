import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Transplant cargo (TASK-03 Part 3): kit files bound for frens.earth —
    // not app code, not built or linted here (tsconfig excludes it too).
    "transplant/**",
  ]),
]);

export default eslintConfig;
