import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-152 (0018.06.17 a₿, block 966,019) — Love's meeting: "on the book a
 * session page the font and colors need to be the same. the home page is
 * correct. /sessions has the incorrect font and coloring"; "make the
 * /session page dark". The nav's SESSIONS door opens /book
 * (site-config.ts) — the sessions page IS /book.
 *
 * These pins hold the house-style contract on the sessions/book sources
 * (the same read-the-source pattern classroom-live.test.ts uses — these
 * are async server components, never rendered in the node test env):
 *
 *   1. NO page-local font-family anywhere under src/app/book — heading and
 *      body faces ride the house FONT TRIO (kicker / stack-hero / sec-h /
 *      lead / body), exactly like the home page;
 *   2. NO page-local hex colors under src/app/book — color comes from the
 *      cartridge tokens (the old hardcoded #EBCB77 is the exhibit);
 *   3. /book holds the night in BOTH themes: keep-dark on the hero AND the
 *      sessions shelf, with the page-scoped veils living in house.css (the
 *      T-155 .login-galaxy precedent), never inline;
 *   4. the session card's Book doors wear the popup's rose (.btn-rose —
 *      the T-121 pair, measured ≥4.99:1 on every gradient stop), and the
 *      flip contract classes are untouched.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const BOOK_SOURCES = [
  "src/app/book/page.tsx",
  "src/app/book/[serviceId]/page.tsx",
  "src/app/book/cuts/page.tsx",
  "src/app/book/receipt/[bookingId]/page.tsx",
];

describe("TASK-152 — the sessions/book pages wear the house style", () => {
  it("no page-local font-family under src/app/book — the house trio carries every word", async () => {
    for (const rel of BOOK_SOURCES) {
      const src = await read(rel);
      expect(src.includes("fontFamily"), `${rel} sets its own font-family`).toBe(false);
    }
  });

  it("no page-local hex colors under src/app/book — the cartridge tokens carry every color", async () => {
    for (const rel of BOOK_SOURCES) {
      const src = await read(rel);
      expect(src.match(/#[0-9a-fA-F]{3,8}\b/), `${rel} pours a literal hex`).toBeNull();
    }
  });

  it("/book's hero rides the house classes — kicker, stack-hero, lead — no stale class set", async () => {
    const src = await read("src/app/book/page.tsx");
    for (const cls of ["kicker", "stack-hero", "sh-ink", "sh-teal", "lead"]) {
      expect(src.includes(cls), `/book hero lost the house .${cls}`).toBe(true);
    }
  });

  it("/book holds the dark ground in both themes — keep-dark on the hero AND the shelf, veils by class", async () => {
    const src = await read("src/app/book/page.tsx");
    expect(src.includes("keep-dark book-hero-veil")).toBe(true); // the grounds swapped (Admiral, 0018.06.17): the galaxy rides the shelf now
    expect(src.includes("keep-dark sky-veil book-shelf-veil")).toBe(true);
  });

  it("the veils live in house.css as session/book rules (the T-155 page-scoped precedent), never inline", async () => {
    const house = await read("src/app/house.css");
    expect(house.includes(".book-hero-veil::before")).toBe(true);
    expect(house.includes(".book-shelf-veil::before")).toBe(true);
  });

  it("the session card's Book doors wear the popup's rose on BOTH faces — and the flip contract is untouched", async () => {
    const src = await read("src/components/ServiceCard.tsx");
    const roseDoors = src.match(/btn btn-sm btn-rose/g) ?? [];
    expect(roseDoors.length).toBe(2); // front + back Book ⚡
    for (const cls of ["flip-card", "flip-front", "flip-back", "is-flipped"]) {
      expect(src.includes(cls), `ServiceCard lost the .${cls} flip contract`).toBe(true);
    }
  });

  it("the home shelf and /book share the ONE session card (the style the home page proves correct)", async () => {
    const home = await read("src/components/sections.tsx");
    const book = await read("src/app/book/page.tsx");
    expect(home.includes('import ServiceCard from "./ServiceCard"')).toBe(true);
    expect(book.includes('import ServiceCard from "@/components/ServiceCard"')).toBe(true);
  });
});
