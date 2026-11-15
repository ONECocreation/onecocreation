import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The galaxy top on eleven pages (block 976,027; the Admiral's desk answer
 * "All of them"). Each page's hand-built branch opens on the shared kit
 * PageHero (night galaxy, stars, held night at dawn, no photo). The home
 * page, /reading and /memberships are left alone by his earlier words.
 */
const read = (p: string) => readFile(path.join(process.cwd(), p), "utf8");

const ELEVEN = [
  "src/app/store/page.tsx",
  "src/app/support/page.tsx",
  "src/app/cart/page.tsx",
  "src/app/store/meditations/page.tsx",
  "src/app/store/memberships/page.tsx",
  "src/app/packages/[slug]/page.tsx", // Weekly Intuitive, Observer, Evening Star
  "src/app/replays/page.tsx",
  "src/app/meditation/page.tsx",
  "src/app/terms/page.tsx",
];

describe("the galaxy top (kit PageHero) on the eleven pages", () => {
  it("each page file renders <PageHero> exactly once", async () => {
    for (const p of ELEVEN) {
      const src = await read(p);
      expect((src.match(/<PageHero\b/g) ?? []).length, p).toBe(1);
    }
  });

  it("no page among them keeps a second top: no hand-placed StackedHero, kit-h1 or mgmt-title beside it", async () => {
    for (const p of ELEVEN) {
      const src = await read(p);
      expect(src, p).not.toMatch(/<StackedHero\b/);
      expect(src, p).not.toMatch(/className="kit-h1"|className="mgmt-title"/);
    }
  });

  it("the three left alone still carry no PageHero: home, /reading, /memberships", async () => {
    for (const p of ["src/app/page.tsx", "src/app/reading/page.tsx", "src/app/memberships/page.tsx"]) {
      expect(await read(p), p).not.toMatch(/<PageHero\b/);
    }
  });

  it("the package top says the tier's own name: last word teal, no new words", async () => {
    const { tierHeroLines } = await import("@/app/packages/[slug]/page");
    expect(tierHeroLines("Weekly Intuitive")).toEqual([{ t: "WEEKLY" }, { t: "INTUITIVE", tone: "teal" }]);
    expect(tierHeroLines("Observer")).toEqual([{ t: "OBSERVER", tone: "teal" }]);
    expect(tierHeroLines("Evening Star")).toEqual([{ t: "EVENING" }, { t: "STAR", tone: "teal" }]);
  });

  it("the words said in a top are not said again below it", async () => {
    const shelf = await read("src/components/store/ShelfSection.tsx");
    expect(shelf).toMatch(/heading = true/);
    expect(shelf).toMatch(/\{heading && \(/);
    for (const p of ["src/app/store/meditations/page.tsx", "src/app/store/memberships/page.tsx"]) {
      expect(await read(p), p).toMatch(/heading=\{false\}/);
    }
    expect(await read("src/app/meditation/page.tsx")).toMatch(/<FreeMeditation heading=\{false\} \/>/);
    // the home page still calls the section bare, heading and all
    expect(await read("src/app/page.tsx")).toMatch(/<FreeMeditation \/>/);
  });
});
