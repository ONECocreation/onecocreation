import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-355 (0018.07.02 a₿) — OC site chrome trio, cut from the Admiral's own
 * walk of the live site: the basket badge's CSS clip, the basket icon
 * redraw (D1, RULED), and the about page's account door going session-aware
 * (D2a, RULED). REVIEW-K86 folded the fix shapes at block 967,911. This
 * repo's tests run in a node environment (no jsdom) — pins hold the source
 * / the derived model, the same idiom `tests/signin-card.test.ts` and
 * `tests/about-copy.test.ts` already use.
 */

const read = (rel: string) => readFileSync(rel, "utf8");

describe("A — the basket badge carve-out (REVIEW-K86 item 1)", () => {
  const house = read("src/app/house.css");

  it("BasketChip's Link carries the basket-chip class the carve-out targets", () => {
    const src = read("src/components/BasketChip.tsx");
    expect(src).toMatch(/className="basket-chip"/);
  });

  it("the desktop tail-ellipsis block (min-width:1001px) carries the carve-out — overflow:visible, no max-width, and touches nothing else in that rule", () => {
    const i = house.indexOf("@media(min-width:1001px){");
    expect(i).toBeGreaterThan(-1);
    const block = house.slice(i, house.indexOf("\n}", i));
    expect(block).toMatch(/\.nav-tail a\.basket-chip\{overflow:visible;max-width:none\}/);
    // the TASK-258 clip rule itself is untouched by this lane
    expect(block).toMatch(/\.nav-tail>button,\.nav-tail>a,\.nav-tail>\*>button\{display:inline-block;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle\}/);
  });

  it("the phone tail block (max-width:1000px, the one with .nav-tail) carries the SAME carve-out", () => {
    // two @media(max-width:1000px) blocks exist in house.css (lions-gate-dawn.test.ts
    // pins the count at 2) — find the one that actually holds .nav-tail
    const starts = [...house.matchAll(/@media\(max-width:1000px\)\{/g)].map((m) => m.index!);
    expect(starts.length).toBe(2);
    const navBlockStart = starts.find((s) => house.slice(s, house.indexOf("\n}", s)).includes(".nav-tail a{"));
    expect(navBlockStart).toBeDefined();
    const block = house.slice(navBlockStart!, house.indexOf("\n}", navBlockStart!));
    expect(block).toMatch(/\.nav-tail a\{overflow:hidden;text-overflow:ellipsis;max-width:34vw\}/);
    expect(block).toMatch(/\.nav-tail a\.basket-chip\{overflow:visible;max-width:none\}/);
  });

  it("the badge display caps at 99+ (100 items), the screen-reader line keeps the true count", () => {
    const src = read("src/components/BasketChip.tsx");
    expect(src).toMatch(/\{count > 99 \? "99\+" : count\}/);
    // the hidden a11y line still reads the real `count`, never the capped display
    expect(src).toMatch(/\{count > 0 \? `\$\{count\} item\$\{count === 1 \? "" : "s"\}/);
  });
});

describe("B — the basket icon redraw (D1, RULED — the Red Riding Hood basket)", () => {
  const src = read("src/components/BasketChip.tsx");

  it("the rendered icon itself carries no emoji — comments may still quote the retired 🧺 by name (history), the SVG markup may not", () => {
    const svg = src.slice(src.indexOf("<svg"), src.indexOf("</svg>") + "</svg>".length);
    const emojiRange = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    expect(svg).not.toMatch(emojiRange);
  });

  it("draws an arched handle and a woven basket body, in the rose ink, at the 17px box — not the old bag path", () => {
    expect(src).toMatch(/width="17" height="17" viewBox="0 0 24 24"/);
    expect(src).toMatch(/color: "#E7B2C3"/);
    // the old T-121 bag paths are gone
    expect(src).not.toContain("M5.6 8.4h12.8l-1.05 10.3a2.6 2.6 0 0 1-2.6 2.4H9.25a2.6 2.6 0 0 1-2.6-2.4L5.6 8.4Z");
    expect(src).not.toContain("M9 10.6V7a3 3 0 0 1 6 0v3.6");
  });

  it("two states: the filled-only peeking shape is gated on count > 0, the handle and body are not", () => {
    const svg = src.slice(src.indexOf("<svg"), src.indexOf("</svg>") + "</svg>".length);
    expect(svg).toMatch(/\{count > 0 && \(/); // the peeking shape's own gate
    // exactly one conditional inside the icon (the peeking shape) — the
    // handle/body paths render in both states
    expect((svg.match(/count > 0/g) ?? []).length).toBe(1);
  });

  it("stays a few strokes: at most one weave-line path, stroke-width ~1.4 on the structural paths", () => {
    const svg = src.slice(src.indexOf("<svg"), src.indexOf("</svg>") + "</svg>".length);
    expect((svg.match(/<path/g) ?? []).length).toBeLessThanOrEqual(4);
    expect(svg).toMatch(/strokeWidth="1\.4"/);
  });

  it("the stale T-121 comment is rewritten: Love liked the emoji, the bag was the Admiral's own taste, the basket is his ruling", () => {
    expect(src).toMatch(/Love LIKED the 🧺 emoji/);
    expect(src).toMatch(/the bag was the Admiral's own\s*\n?\s*taste call, not hers/);
    expect(src).not.toMatch(/feels jank/); // the retired T-121 framing
  });

  it("the store buttons' own basket text is untouched (out of this lane's OWNS)", () => {
    for (const file of [
      "src/components/store/BuyPanel.tsx",
      "src/components/store/AddonActions.tsx",
      "src/components/ServiceCard.tsx",
      "src/components/booking/SlotPicker.tsx",
    ]) {
      expect(read(file)).toMatch(/Add to basket 🧺/i);
    }
  });
});

describe("C — AccountDoor (D2a, RULED — session-aware, no flash)", () => {
  it("mounts neither door while !checked — SSR's own getServerSnapshot forces checked:false (useMemberSession.ts), so the '—' idiom is the ONLY thing a real page ever ships before hydration", async () => {
    const AccountDoor = (await import("@/components/AccountDoor")).default;
    const html = renderToStaticMarkup(createElement(AccountDoor));
    expect(html).not.toContain("Create your account");
    expect(html).not.toContain("Go to your page");
    expect(html).toContain(">—<");
  });

  it("keeps the ABOUT_PINK_DOOR class family — source-pinned since a checked=true render never happens under SSR", async () => {
    const src = readFileSync("src/components/AccountDoor.tsx", "utf8");
    expect(src).toContain("ABOUT_PINK_DOOR");
    expect(src).toContain('href="/me"');
    expect(src).toContain("Go to your page →");
    expect(src).toContain('href="/welcome"');
    expect(src).toContain("Create your account ✨");
  });

  it("about/page.tsx mounts AccountDoor where the plain Create-your-account Link used to live", async () => {
    const src = readFileSync("src/app/about/page.tsx", "utf8");
    expect(src).toMatch(/import AccountDoor from "@\/components\/AccountDoor"/);
    expect(src).toMatch(/<AccountDoor \/>/);
    expect(src).not.toContain('href="/welcome">Create your account');
  });

  it("the about seed swaps its Create-your-account Buttons entry for the AccountDoor block, and drops the retired ConsciousCuts entry", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const flat = JSON.stringify(SEEDS.about.content);
    expect(flat).not.toContain("Create your account");
    expect(flat).not.toContain("ConsciousCuts & Waxing ✂️");
    const walk = (v: unknown, out: { type: string; props: Record<string, unknown> }[] = []) => {
      if (Array.isArray(v)) { v.forEach((x) => walk(x, out)); return out; }
      if (v && typeof v === "object") {
        const o = v as { type?: string; props?: Record<string, unknown> };
        if (o.type === "AccountDoor") out.push(o as { type: string; props: Record<string, unknown> });
        Object.values(o).forEach((x) => walk(x, out));
      }
      return out;
    };
    const doors = walk(SEEDS.about.content);
    expect(doors).toHaveLength(1);
    expect(Object.keys(doors[0].props)).toEqual(["id"]); // the { id }-only shape — no fossilised copy
  });
});

describe("every block type in the about seed is registered in puck-config.tsx; the NEW one is mirrored in copilot.ts", () => {
  it("every type the about seed actually uses has a live entry in config.components (the designer can render the whole seed)", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const { config } = await import("@/lib/puck-config");
    const comps = config.components as Record<string, unknown>;

    const types = new Set<string>();
    const walk = (v: unknown) => {
      if (Array.isArray(v)) { v.forEach(walk); return; }
      if (v && typeof v === "object") {
        const o = v as { type?: string };
        if (typeof o.type === "string") types.add(o.type);
        Object.values(o as Record<string, unknown>).forEach(walk);
      }
    };
    walk(SEEDS.about.content);
    expect(types.size).toBeGreaterThan(0);
    expect(types.has("AccountDoor")).toBe(true);

    for (const type of types) {
      expect(comps[type], `${type} missing from config.components`).toBeDefined();
    }
  });

  it("copilot.ts mirrors the NEW block, AccountDoor — the lockstep law only mirrors text/copy-generating blocks (Band/Gallery/Image/TwoColumns/Video are hand-placed layout, never model-authored, and were already absent before this lane)", () => {
    const copilotSrc = readFileSync("src/lib/copilot.ts", "utf8");
    expect(copilotSrc).toContain('type: "AccountDoor"');
  });

  it("AccountDoor specifically: registered in the Actions group, appended after its wave-B siblings", async () => {
    const { config } = await import("@/lib/puck-config");
    const categories = config.categories as Record<string, { components?: string[] }>;
    expect(categories.actions.components).toContain("AccountDoor");
    expect(categories.actions.components?.indexOf("AccountDoor")).toBeGreaterThan(
      categories.actions.components?.indexOf("LoginDoor") ?? -1,
    );
  });

  it("the block renders the real AccountDoor (its SSR '—' idiom, the same no-flash law)", async () => {
    const { config } = await import("@/lib/puck-config");
    const block = (config.components as unknown as Record<string, { render: () => import("react").ReactElement }>).AccountDoor;
    const html = renderToStaticMarkup(block.render());
    expect(html).toContain(">—<");
  });
});
