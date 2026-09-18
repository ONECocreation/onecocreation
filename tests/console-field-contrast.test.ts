import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-324 (0018.06.26 a₿) — the People search field read grey-on-grey:
 * the console's shared `field` grammar (glass.tsx) is a React.CSSProperties
 * object and cannot carry pseudo-selectors, so the placeholder ink and the
 * focus ring live in globals.css as .console-field, threaded onto every
 * in-scope consumer. The pins (the house's read-the-source pattern):
 *
 *   1. globals.css carries the pair — .console-field::placeholder with an
 *      explicit color at opacity:1 (the browser default is undeclared and
 *      was the grey-on-grey), and .console-field in the house focus-ring
 *      idiom (outline: 2px solid var(--color-cyan); outline-offset: 2px);
 *   2. the placeholder hex clears 4.5:1 on --field-bg's WORST composite
 *      (94% white over a black ground — the field tokens are
 *      theme-invariant, so the worst case is the honest bar), computed
 *      here with the WCAG formula, not transcribed;
 *   3. every field-styled element in the 12 in-scope consumers wears the
 *      class (the one standing exception: letters/[key]'s radio-row
 *      <label>, a container, not a field element);
 *   4. People's search box carries its persistent label — visible
 *      "Search members", id-linked htmlFor, aria-label, placeholder kept;
 *   5. check-usability.mjs holds the placeholder contract pair so the
 *      house gate sees the value going forward.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const GLOBALS = "src/app/globals.css";
const PEOPLE = "src/app/a/people/page.tsx";
const USABILITY = "scripts/check-usability.mjs";

/* TASK-333 (0018.06.27 a₿) — StudioRoom.tsx was excluded from T-324's sweep
   because T-306 (its owning lane) was still an open PR; T-306 has since
   merged. This lane threads .console-field onto its 8 field-styled
   elements and, per its named decision (fold in), onto
   SendToUserChooser.tsx's one adjacent field too — same pin, two more
   consumers. */
const CONSUMERS = [
  "src/app/a/booking/page.tsx",
  "src/app/a/letters/page.tsx",
  "src/app/a/letters/[key]/page.tsx",
  "src/app/a/people/page.tsx",
  "src/app/a/site/SiteRoom.tsx",
  "src/app/a/site/about-videos/AboutVideosCard.tsx",
  "src/app/a/store/page.tsx",
  "src/app/a/live/go-live-room.tsx",
  "src/components/console/DiscountsDesk.tsx",
  "src/components/console/NavEditor.tsx",
  "src/components/console/CardsRailCard.tsx",
  "src/components/console/RetreatsDesk.tsx",
  "src/components/studio-overlay/StudioRoom.tsx",
  "src/components/studio-overlay/SendToUserChooser.tsx",
];

const FIELD_STYLE = /style=\{(?:\{\s*\.\.\.field(?![A-Za-z])|field\})/;
/* letters/[key]'s segment picker rows are <label> containers wearing field
   as a card — not input/select/textarea elements; out of the sweep */
const KNOWN_NON_FIELD_ELEMENT = /letters\/\[key\]\/page\.tsx:<label/;

const lin = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const luminance = (hex: string) =>
  0.2126 * lin(parseInt(hex.slice(1, 3), 16)) +
  0.7152 * lin(parseInt(hex.slice(3, 5), 16)) +
  0.0722 * lin(parseInt(hex.slice(5, 7), 16));
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

describe("TASK-324 — the console field's placeholder + focus ring (grey-on-grey repair)", () => {
  it("globals.css carries the pair — explicit placeholder ink at opacity:1, and the house focus ring", async () => {
    const css = await read(GLOBALS);
    const ph = css.match(/\.console-field::placeholder\s*\{([^}]*)\}/);
    expect(ph, ".console-field::placeholder rule missing").not.toBeNull();
    expect(ph![1]).toMatch(/color:\s*#[0-9A-Fa-f]{6}/);
    expect(ph![1]).toMatch(/opacity:\s*1/);
    const ring = css.match(/\.console-field:focus-visible\s*\{([^}]*)\}/) ??
      css.match(/([^{}]*\.console-field:focus-visible[^{}]*)\{([^}]*)\}/);
    expect(ring, ".console-field is not wired into a :focus-visible rule").not.toBeNull();
    expect(css).toMatch(/\.console-field:focus-visible[^{}]*\{[^}]*outline:\s*2px solid var\(--color-cyan\)[^}]*outline-offset:\s*2px/);
  });

  it("the placeholder hex clears 4.5:1 on --field-bg's worst composite (94% white over black)", async () => {
    const css = await read(GLOBALS);
    const hex = css.match(/\.console-field::placeholder\s*\{[^}]*color:\s*(#[0-9A-Fa-f]{6})/)![1];
    /* --field-bg = rgba(255,255,255,.94); the darkest composite it can pour
       is over a black ground — 240/240/240. Both themes share the field
       tokens, so this one number is the bar for dark AND dawn. */
    const worstBg = luminance("#F0F0F0");
    expect(ratio(luminance(hex), worstBg)).toBeGreaterThanOrEqual(4.5);
  });

  it("every field-styled element in the 14 in-scope consumers wears .console-field", async () => {
    for (const rel of CONSUMERS) {
      const src = await read(rel);
      const lines = src.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (!FIELD_STYLE.test(lines[i])) continue;
        const here = `${rel}:${lines[i].trim().slice(0, 60)}`;
        if (KNOWN_NON_FIELD_ELEMENT.test(here)) continue;
        expect(lines[i].includes("console-field"), `${rel}:${i + 1} styles with field but lost .console-field`).toBe(true);
      }
    }
  });

  it("People's search box carries its persistent Search members label", async () => {
    const src = await read(PEOPLE);
    expect(src.includes('htmlFor="people-search"'), "the label lost its link").toBe(true);
    expect(src.includes("Search members"), "the label lost its words").toBe(true);
    expect(src.includes('id="people-search"'), "the input lost its id").toBe(true);
    expect(src.includes('aria-label="Search members"'), "the input lost its aria-label").toBe(true);
    expect(src.includes('placeholder="search members…"'), "the placeholder hint is gone").toBe(true);
  });

  it("check-usability.mjs holds the placeholder contract pair — the gate sees it going forward", async () => {
    const src = await read(USABILITY);
    const entry = src.match(/name:\s*"field placeholder on field"[^}]*fg:\s*"(#[0-9A-Fa-f]{6})"/);
    expect(entry, "no placeholder contract pair in check-usability.mjs").not.toBeNull();
    const css = await read(GLOBALS);
    expect(css.includes(`.console-field::placeholder {\n    color: ${entry![1]};`),
      "the contract pair and the CSS rule pour different placeholder values").toBe(true);
  });

  /* TASK-333 — two targeted tests naming the exact evidence each of the
     newly-unblocked files carries, beyond the generic sweep above. */
  it("StudioRoom.tsx's CopyDoor readonly input carries .console-field (focus ring only — it's readOnly, never a placeholder)", async () => {
    const src = await read("src/components/studio-overlay/StudioRoom.tsx");
    const line = src.split("\n").find((l) => l.includes("readOnly") && l.includes("...field"));
    expect(line, "CopyDoor's readonly input line not found").toBeDefined();
    expect(line!.includes("console-field"), "CopyDoor's readonly input lost .console-field").toBe(true);
  });

  it("SendToUserChooser.tsx's member-search box carries .console-field (folded in per T-333's named decision)", async () => {
    const src = await read("src/components/studio-overlay/SendToUserChooser.tsx");
    const line = src.split("\n").find((l) => l.includes("...field") && l.includes("fontSize"));
    expect(line, "member-search box style line not found").toBeDefined();
    expect(line!.includes("console-field"), "member-search box lost .console-field").toBe(true);
  });
});
