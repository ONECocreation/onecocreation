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
  /* TASK-159 (0018.06.17 a₿ · block 966,055) — T-153's second seam, closed:
     @pacsarcade/puck-config ships RAW tsx (its README: "hosts consume via
     transpilePackages"; next.config.ts's transpilePackages list covers
     `next build`/dev, but vitest had no equivalent). Inlining it here hands
     it to the transform — the real blocks render in tests, no more
     puck-config mock. TASK-284 (0018.06.25 a₿): vitest 4 dropped `jsx`
     from the esbuild option's types (vite 8 transforms via oxc, which
     already honors tsconfig's react-jsx), so the explicit jsx:"automatic"
     line is gone; the inline below is what still matters. */
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // T-147 seam 3 / TASK-158 (0018.06.17 a₿): the three suites that share
    // data/site-config.json now isolate their own cwd (tests/helpers/
    // isolate-cwd.ts) instead of racing over process.cwd() — fileParallelism
    // rides the default again. Green ×10, see TASK-158's SUMMARY.md.
    server: { deps: { inline: ["@pacsarcade/puck-config"] } },
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
