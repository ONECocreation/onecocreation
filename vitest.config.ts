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
    // T-147 seam 3 (Number One): three suites share data/site-config.json through process.cwd() and race
    // under parallel workers (~1 in 2 full runs red). Serial files until the suites isolate their cwd (mkdtemp).
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
