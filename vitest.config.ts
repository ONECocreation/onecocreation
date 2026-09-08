import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * vitest enters the house with TASK-105 (0018.06.12 a₿) — the brief's G3/G4
 * demand route/shell tests and there was no runner yet. Node environment
 * (the specs exercise server modules: the recon-img route handler and the
 * mail shell), and the `@` → src alias mirrors tsconfig's paths so the
 * specs import exactly what the app imports.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // T-147 seam 3 / TASK-158 (0018.06.17 a₿): the three suites that share
    // data/site-config.json now isolate their own cwd (tests/helpers/
    // isolate-cwd.ts) instead of racing over process.cwd() — fileParallelism
    // rides the default again. Green ×10, see TASK-158's SUMMARY.md.
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
