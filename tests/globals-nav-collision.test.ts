import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * TASK-271 (0018.06.24 a₿ · block 967,055) — §4b of the T-263 census closed:
 * the dead `.nav-links`/`.nav-toggle`/`header nav` block in globals.css
 * (zero JSX in the tree ever rendered those classes — grep-verified) is
 * gone, and the bare `header{}`/`footer{}` template-chrome selectors are
 * now scoped with `:not(.site-header/.mgmt-head/.site-footer)` so a future
 * clone can't reprise the "black band over the menu" collision (T-121-era
 * incident) even if house.css's neutralisations were ever removed.
 */

const CSS_PATH = fileURLToPath(new URL("../src/app/globals.css", import.meta.url));
const css = readFileSync(CSS_PATH, "utf8");

describe("globals.css — the dead nav block and the header/footer collision (T-271 §4b)", () => {
  it("carries no .nav-links rule", () => {
    expect(css).not.toMatch(/\.nav-links\s*[.,{]/);
  });

  it("carries no .nav-toggle rule", () => {
    expect(css).not.toMatch(/\.nav-toggle\s*[.,{]/);
  });

  it("carries no bare `header nav` rule", () => {
    expect(css).not.toMatch(/header\s+nav\s*\{/);
  });

  it("scopes the bare header{} rule away from the site's own chrome classes", () => {
    expect(css).toMatch(/header:not\(\.site-header\):not\(\.mgmt-head\)\s*\{/);
  });

  it("scopes the bare footer{} rule away from the site's own footer class", () => {
    expect(css).toMatch(/footer:not\(\.site-footer\)\s*\{/);
  });
});
