import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-215 (0018.06.23 a₿, Love's call #11) — "the two cards match: one is
 * a brighter pink/purple, the other muted — find the two card rules and
 * converge on the house card color." The two rules were house.css's
 * `.card{background:var(--panel)...}` (the standard glass — RoomsShelf /
 * PackageRoomsCard, StoreItemCard, everything else on the site) and
 * cartridge.css's `#classes .card{background:rgba(252,247,240,.94)...}`
 * (a solid-cream override on the home page's "Classes & Community" teaser,
 * sections.tsx's `<section id="classes">`). Converged by REMOVING the
 * override — the teaser now falls through to the same house `.card` every
 * other card on the site uses (already proven legible over the same
 * nebula.webp by the store's meditations shelf).
 *
 * The house's read-the-source pattern (cuts-style.test.ts): these are all
 * server/CSS assets, nothing to render in the node test env.
 */
const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

describe("TASK-215 — the two card colours converge on ONE house rule", () => {
  it("cartridge.css no longer overrides #classes .card's background", async () => {
    const src = await read("src/app/cartridge.css");
    expect(src).not.toMatch(/#classes\s+\.card\s*\{[^}]*background/);
  });

  it("house.css still carries the ONE standard .card background rule", async () => {
    const house = await read("src/app/house.css");
    expect(house).toContain(".card{background:var(--panel);");
  });

  it("nowhere else does a `.card` selector set its own background — cartridge.css/cartridges.css carry no rival", async () => {
    const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, ""); // drop comments — a comment mentioning "card" and "background" in prose is not a CSS rule
    const cartridge = strip(await read("src/app/cartridge.css"));
    const cartridges = strip(
      await fs.readFile(path.join(process.cwd(), "src/app/cartridges.css"), "utf8").catch(() => ""),
    );
    for (const [name, css] of [["cartridge.css", cartridge], ["cartridges.css", cartridges]] as const) {
      // a line whose selector (before the "{") mentions .card AND whose
      // declaration body sets a background — the exact shape of the
      // divergent rule this lane removed
      const rival = css.match(/[^{};]*\.card[^{]*\{[^}]*background[^}]*\}/);
      expect(rival, `${name} still carries a rival .card background rule: ${rival?.[0]}`).toBeNull();
    }
  });

  it("the teaser section's lockpill/roomrow/note also fall back to the default (theme-aware) house tokens", async () => {
    const src = await read("src/app/cartridge.css");
    expect(src).not.toMatch(/#classes\s+\.lockpill/);
    expect(src).not.toMatch(/#classes\s+\.roomrow/);
    expect(src).not.toMatch(/#classes\s+\.note/);
  });

  it("RoomsShelf's card (PackageRoomsCard.tsx) and the home teaser (sections.tsx) both wear the plain .card class — nothing id-scopes either one differently", async () => {
    const packageCard = await read("src/components/rooms/PackageRoomsCard.tsx");
    const sections = await read("src/components/sections.tsx");
    expect(packageCard).toMatch(/className="card room-card"/);
    expect(sections).toMatch(/className="card reveal"/);
  });
});
