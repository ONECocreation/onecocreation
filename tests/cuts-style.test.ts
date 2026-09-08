import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-165 (0018.06.17 a₿ · block 966,080 — the T-152 seam, ruled B) —
 * /book/cuts wears the house style. The pins (the house's read-the-source
 * pattern — sessions-style.test.ts / route-gates.test.ts — because these
 * are async server components, never rendered in the node test env):
 *
 *   1. the page carries the T-152 house wrapper: keep-dark night ground,
 *      the page-scoped veils from house.css, and the house faces (kicker /
 *      stack-hero / lead) for every word — no page-local font, no hex;
 *   2. NO console skin anywhere on the door: the mgmt-* classes are gone
 *      from the page AND the chooser;
 *   3. the chooser rides the house booking idiom — SlotPicker's night
 *      glass panels, the lit-paper/dark-ink field pair (the house input
 *      law), the chip-select pressed state for the picked session;
 *   4. NO logic change to the chooser: same session id, same storage key,
 *      same sessionStorage writes, same SlotPicker hand-off;
 *   5. the route follows the `cuts` switch — the shared NotOpenYet (T-137)
 *      inside the site chrome, the gate the page's FIRST branch (the T-160
 *      idiom; the brief said this gate already existed — verification on
 *      the base found /book/cuts was never gated, so the minimal branch
 *      was added in the owned file and pinned here).
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const PAGE = "src/app/book/cuts/page.tsx";
const CHOOSER = "src/components/booking/CutsChooser.tsx";

const CONSOLE_CLASSES = [
  "mgmt-ground",
  "mgmt-wrap",
  "mgmt-body",
  "mgmt-head",
  "mgmt-eyebrow",
  "mgmt-title",
  "mgmt-blurb",
];

describe("TASK-165 — /book/cuts wears the house style", () => {
  it("the page carries the house wrapper — keep-dark night, the T-152 veils, the house faces", async () => {
    const src = await read(PAGE);
    expect(src.includes("keep-dark sky-veil book-hero-veil")).toBe(true);
    expect(src.includes("keep-dark book-shelf-veil")).toBe(true);
    for (const cls of ["kicker", "stack-hero", "sh-ink", "sh-teal", "lead"]) {
      expect(src.includes(cls), `/book/cuts lost the house .${cls}`).toBe(true);
    }
  });

  it("no console skin on the door — no mgmt-* class on the page or the chooser", async () => {
    for (const rel of [PAGE, CHOOSER]) {
      const src = await read(rel);
      for (const cls of CONSOLE_CLASSES) {
        expect(src.includes(cls), `${rel} still wears the console .${cls}`).toBe(false);
      }
    }
  });

  it("no page-local font or hex on the page — the house trio and the cartridge tokens carry it all", async () => {
    const src = await read(PAGE);
    expect(src.includes("fontFamily"), "cuts/page.tsx sets its own font-family").toBe(false);
    expect(src.match(/#[0-9a-fA-F]{3,8}\b/), "cuts/page.tsx pours a literal hex").toBeNull();
  });

  it("the chooser rides the house booking idiom — night glass, lit-paper fields, the chip pressed law", async () => {
    const src = await read(CHOOSER);
    expect(src.includes('background: "var(--glass)"'), "the steps left the night glass").toBe(true);
    expect(src.includes('background: "var(--field-bg)"'), "the fields left the lit-paper law").toBe(true);
    expect(src.includes("--field-ink"), "the fields lost their dark ink").toBe(true);
    expect(src.includes('className="chip-select"'), "the session choices left the house chip").toBe(true);
    expect(src.includes("aria-pressed"), "the picked state lost its pressed word").toBe(true);
  });

  it("NO logic change — same session, same storage key, same writes, same SlotPicker hand-off", async () => {
    const src = await read(CHOOSER);
    expect(src.includes('export const LOC_KEY = "oc-inperson-loc"')).toBe(true);
    expect(src.includes('"soul-conversation"')).toBe(true);
    expect(src.includes("sessionStorage.getItem(LOC_KEY)")).toBe(true);
    expect(src.includes("sessionStorage.setItem(LOC_KEY")).toBe(true);
    expect(src.includes("<SlotPicker key={picked} serviceId={picked} inPerson />")).toBe(true);
  });

  it("the route follows the `cuts` switch — NotOpenYet inside the site chrome, the gate FIRST (the T-160 idiom)", async () => {
    const src = await read(PAGE);
    const start = src.indexOf("TASK-165 GATE");
    const end = src.indexOf("end TASK-165 GATE");
    expect(start, "gate marker missing").toBeGreaterThan(-1);
    expect(end, "gate end marker missing").toBeGreaterThan(start);
    const gate = src.slice(start, end);
    expect(gate).toContain("getSiteConfig");
    expect(gate).toContain("features.cuts");
    expect(gate).toContain("<NotOpenYet");
    expect(gate).toContain("<SiteHeader />");
    expect(gate).toContain("<SiteFooter />");
    /* FIRST branch: the gate sits ahead of the chooser's render */
    expect(start).toBeLessThan(src.indexOf("<CutsChooser />"));
  });
});
