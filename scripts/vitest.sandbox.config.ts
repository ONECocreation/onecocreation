import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/** T-541a: runs ONLY scripts/sub-sandbox-smoke.vitest.ts (never part of the gate). */
export default defineConfig({
  test: { environment: "node", include: ["scripts/sub-sandbox-smoke.vitest.ts"], testTimeout: 120_000 },
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
});
