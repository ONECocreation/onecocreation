import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { applyLionToPuck, LION_GROUND, SEEDS } from "@/lib/puck-seeds";

/**
 * TASK-256 (0018.06.24 a₿) — the lion holds the memberships field on the
 * designer branch too. The Admiral: "the membership area on the main page has
 * the lion background. for some reason we lost the lion background on the
 * /memberships page." The live page was a published designer snapshot from
 * before the seed carried the lion, and the lion had been seeded as an inline
 * picture, never a ground. Now: the seed's first Band wears the lion as its
 * bgSrc, any older snapshot gets the same ground at render time, and the
 * designer branch's <main> wears .lions-gate-dark like the hand-built one.
 */

type Band = { type: string; props: Record<string, unknown> };

describe("applyLionToPuck (TASK-256)", () => {
  it("gives a first Band with no ground the lion as bgSrc", () => {
    const data = { content: [{ type: "Band", props: { id: "b", background: "sky-veil" } }, { type: "Text", props: { id: "t" } }] };
    const out = applyLionToPuck(data);
    expect((out.content[0] as Band).props.bgSrc).toBe(LION_GROUND);
    expect(out.content[1]).toBe(data.content[1]); // the rest untouched, same references
    expect((data.content[0] as Band).props.bgSrc).toBeUndefined(); // pure — the input is not mutated
  });
  it("leaves a Band that already carries its own ground alone (Love's choice wins)", () => {
    const own = { content: [{ type: "Band", props: { id: "b", bgSrc: "/images/own.webp" } }] };
    expect(applyLionToPuck(own)).toBe(own);
    const colour = { content: [{ type: "Band", props: { id: "b", bgColor: "#111" } }] };
    expect(applyLionToPuck(colour)).toBe(colour);
  });
  it("leaves a page alone whose first block is not a Band, or that has no content", () => {
    const text = { content: [{ type: "Text", props: { id: "t" } }] };
    expect(applyLionToPuck(text)).toBe(text);
    const empty = { content: [] as unknown[] };
    expect(applyLionToPuck(empty)).toBe(empty);
    const none = {} as { content?: unknown[] };
    expect(applyLionToPuck(none)).toBe(none);
  });
});

describe("the memberships seed carries the lion as the band's ground", () => {
  const content = SEEDS.memberships.content as Band[];
  it("first Band: bgSrc is the lion", () => {
    expect(content[0].type).toBe("Band");
    expect(content[0].props.bgSrc).toBe(LION_GROUND);
  });
  it("no inline lion picture anywhere in the seed (the ground is the lion, not a photo in the flow)", () => {
    const json = JSON.stringify(content);
    expect(json.split(LION_GROUND).length - 1).toBe(1); // exactly the one bgSrc
    const images = json.match(/"type":"Image"[^}]*lions-gate/g) ?? [];
    expect(images).toHaveLength(0);
  });
  it("the lion path is the cartridge's own", () => {
    const cartridge = readFileSync("src/brand/cartridge.ts", "utf8");
    expect(cartridge).toContain(`lionsGate: "${LION_GROUND}"`);
  });
});

describe("/memberships designer branch wears the lion page", () => {
  const src = readFileSync("src/app/memberships/page.tsx", "utf8");
  it("the Puck branch's <main> is .lions-gate-dark and renders applyLionToPuck(puck)", () => {
    expect(src).toContain('<main className="lions-gate-dark lion-in-band"><Render config={config} data={applyLionToPuck(puck as Data)} /></main>');
    expect(src).toContain('import { applyLionToPuck } from "@/lib/puck-seeds"');
  });
  it("the hand-built branch keeps its own lion main", () => {
    expect(src.split('<main className="lions-gate-dark lion-in-band">').length - 1).toBe(1);
    expect(src.split('<main className="lions-gate-dark">').length - 1).toBe(1);
  });
  it("the designer bands reveal the page's night lion with dawn's unchanged framing", () => {
    const css = readFileSync("src/app/cartridge.css", "utf8");
    expect(css).toContain('main.lions-gate-dark.lion-in-band section{background:transparent!important}');
    expect(css).not.toMatch(/(?:^|\n)main\.lions-gate-dark\.lion-in-band\s*\{/);
    const night = css.match(/(?:^|\n)\.lions-gate-dark\s*\{([^}]*)\}/);
    expect(night).not.toBeNull();
    expect(night![1]).toContain('url("/images/lions-gate.webp") center top / cover no-repeat');
    const dawn = css.match(/(?:^|\n)html\[data-oc-theme="light"\] main\.lions-gate-dark\s*\{([^}]*)\}/);
    expect(dawn).not.toBeNull();
    expect(dawn![1]).toBe('\n  background:\n    linear-gradient(rgba(251,246,239,.82), rgba(251,246,239,.9)),\n    url("/images/lions-gate.webp") center top / cover no-repeat;\n');
    expect(css).toContain('html[data-oc-theme="light"] main.lions-gate-dark section{background:transparent!important}');
  });
});
