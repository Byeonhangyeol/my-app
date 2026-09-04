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
    // 지운 파일을 바로 삭제하지 않고 잠시 보관해두는 곳(CLAUDE.md) — 린트 대상에서 제외.
    "trash-can/**",
  ]),
]);

export default eslintConfig;
