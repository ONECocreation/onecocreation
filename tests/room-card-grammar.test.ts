import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-216 (0018.06.23 a₿, #37 — "classes and community area cards adopt
 * the same card style as the site's other cards"). T-215 already converged
 * CommunitySpotlight and the home teaser onto the plain house `.card`
 * (`two-card-colors.test.ts`). The one real outlier left was
 * PackageRoomsCard.tsx (RoomsShelf's card, /classes' "the rooms
 * themselves"): its `.card` wore an inline ternary `padding` instead of a
 * shared rule — a small ad hoc recipe living in the component instead of
 * the ONE stylesheet. Moved to house.css (`.room-card`/
 * `.room-card[data-compact]`); the compact variant rides a data attribute
 * rather than a second class name so the component's `className="card
 * room-card"` stays the exact literal T-215's two-card-colors.test.ts
 * already pins.
 */
const root = process.cwd();
const read = (rel: string) => fs.readFile(path.join(root, rel), "utf8");

describe("TASK-216 — PackageRoomsCard's padding moves to the house stylesheet", () => {
  it("the component carries no inline padding anymore", async () => {
    const src = await read("src/components/rooms/PackageRoomsCard.tsx");
    expect(src).not.toMatch(/padding:\s*compact/);
    expect(src).not.toMatch(/style=\{\{\s*padding:/);
  });

  it("the compact variant rides a data attribute, not a template-literal class", async () => {
    const src = await read("src/components/rooms/PackageRoomsCard.tsx");
    expect(src).toMatch(/data-compact=\{compact/);
    // the literal T-215's two-card-colors.test.ts asserts verbatim — never
    // becomes a template string
    expect(src).toMatch(/className="card room-card"/);
  });

  it("house.css carries the one padding recipe for both variants", async () => {
    const house = await read("src/app/house.css");
    expect(house).toMatch(/\.room-card\{height:100%;padding:14px 18px\}/);
    expect(house).toMatch(/\.room-card\[data-compact\]\{padding:12px 16px\}/);
  });
});
