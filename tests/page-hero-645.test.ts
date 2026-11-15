import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-645 (block 975,980) — one house top. The kit part PageHero, its
 * designer block, the /packages seed on it, and the render-time patch that
 * moves a page published with the lion behind its first band onto it.
 */

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

type Blk = { type: string; props: Record<string, unknown> };

describe("kit PageHero — the night galaxy, the stars, the words", () => {
  it("renders the hand copies' ground (keep-dark sky-veil, holds the night) with the star canvas and the stacked heading", async () => {
    const { PageHero } = await import("@/components/kit");
    const html = renderToStaticMarkup(
      createElement(PageHero, {
        kicker: "E.T. Phone Home",
        lines: [{ t: "I'LL BE" }, { t: "RIGHT HERE", tone: "teal" }],
        constellation: true,
        lead: "A lead line.",
      }),
    );
    expect(html).toMatch(/^<section class="keep-dark sky-veil kit-page-hero">/);
    expect(html).toContain("<canvas");
    expect(html).toContain('<p class="kicker">E.T. Phone Home</p>');
    expect(html).toContain('<h1 class="stack-hero"><span class="sh-ink">I&#x27;LL BE</span><span class="sh-teal">RIGHT HERE</span></h1>');
    expect(html).toContain('class="constellation"');
    expect(html).toContain('<p class="lead kit-page-hero-lead">A lead line.</p>');
  });

  it("carries no inline look of its own (the padding and stacking live in kit.css)", () => {
    const src = read("src/components/kit/PageHero.tsx");
    expect(src).not.toContain("style={{");
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    const css = read("src/app/kit.css");
    for (const cls of [".kit-page-hero{", ".kit-page-hero-inner{", ".kit-page-hero-lead{", ".kit-page-hero-words{"]) {
      expect(css).toContain(cls);
    }
  });

  it("children ride a centred words column (the designer block's slot)", async () => {
    const { PageHero } = await import("@/components/kit");
    const html = renderToStaticMarkup(createElement(PageHero, null, createElement("p", null, "her words")));
    expect(html).toContain('<div class="kit-page-hero-words"><p>her words</p></div>');
    expect(html).not.toContain("stack-hero");
  });
});

describe("the PageHero designer block", () => {
  it("is registered in the real config, listed in the Layout group, and refuses full-width blocks in its slot", async () => {
    const { config } = await import("@/lib/puck-config");
    const comps = config.components as Record<string, { fields?: Record<string, { type?: string; disallow?: string[] }> }>;
    expect(comps.PageHero).toBeDefined();
    expect(comps.PageHero.fields?.content?.type).toBe("slot");
    expect(comps.PageHero.fields?.content?.disallow).toEqual(expect.arrayContaining(["Band", "Hero", "ParallaxBand", "PageHero"]));
    const cats = config.categories as Record<string, { components?: string[] }>;
    expect(cats.layout.components).toContain("PageHero");
    // root-only, like Band: a package slot that refuses Band refuses PageHero too
    const panelSlots = Object.values(comps.Panel?.fields ?? {}).filter((f) => f.type === "slot");
    for (const f of panelSlots) expect(f.disallow).toContain("PageHero");
  });
});

describe("/packages opens on the house top with one lion", () => {
  it("the seed's first block is a PageHero holding her kicker, heading (the one h1) and lead; no lion photo anywhere in the seed", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const content = SEEDS.packages.content as Blk[];
    expect(content[0].type).toBe("PageHero");
    const words = content[0].props.content as Blk[];
    expect(words.map((b) => b.type)).toEqual(["Eyebrow", "Heading", "Text"]);
    expect(words[1].props.level).toBe("h1");
    expect(JSON.stringify(SEEDS.packages)).not.toContain("lions-gate.webp");
    expect(JSON.stringify(SEEDS.packages)).not.toContain('"bgSrc"');
  });

  it("the seed publishes clean through the real rails (one h1 read inside the PageHero slot; no errors)", async () => {
    const { lintPage, hasErrors } = await import("@frens-earth/plugin-rails");
    const { ONECOCREATION } = await import("@/brand/tokens");
    const { SEEDS } = await import("@/lib/puck-seeds");
    const findings = lintPage(SEEDS.packages as never, { tokens: ONECOCREATION, lane: "brand" });
    expect(findings.filter((f) => f.rule === "one-h1")).toEqual([]);
    expect(hasErrors(findings)).toBe(false);
  });

  it("the seed carries no 'limitation' comment any more (standard rule 7)", () => {
    const src = read("src/lib/puck-seeds.ts");
    expect(src).not.toContain("documented package\n     limitation");
    expect(src).not.toContain("documented package limitation");
  });

  it("the grid section is the page's one lion, with the phone rule that keeps it whole", () => {
    expect(read("src/lib/puck-blocks/packages-grid.tsx")).toContain('className="lions-gate lions-gate-whole"');
    const css = read("src/app/cartridge.css");
    expect(css).toContain(".lions-gate-whole::before{");
    expect(css).toMatch(/\.lions-gate-whole::before\{[^}]*position:sticky[^}]*aspect-ratio:1/);
    // the home page's hand-built section keeps plain .lions-gate (A.6)
    expect(read("src/components/sections.tsx")).toContain('<section id="packages" className="lions-gate">');
  });

  it("the route has its own title", async () => {
    const mod = await import("@/app/packages/page");
    expect((mod as { metadata?: { title?: string } }).metadata?.title).toBe("Packages — One Cocreation");
  });
});

describe("applyHouseTopToPuck — a page published with the lion top", () => {
  const lionTop = (): { content: Blk[]; root: Record<string, unknown> } => ({
    root: {},
    content: [
      {
        type: "Band",
        props: {
          id: "pk-3",
          background: "sky-veil",
          hold: "night",
          bgSrc: "/images/lions-gate.webp",
          content: [
            { type: "Eyebrow", props: { id: "pk-0", text: "The Heart Field — Where Heaven and Earth Meet", align: "center" } },
            { type: "Heading", props: { id: "pk-1", text: "Memberships", level: "h1", align: "center" } },
            { type: "Text", props: { id: "pk-2", text: "Her own lead.\nKept as she typed it.", align: "center" } },
          ],
        },
      },
      { type: "PackagesGrid", props: { id: "pk-grid" } },
    ],
  });

  it("draws the first band as a PageHero holding the band's own blocks, untouched and in order", async () => {
    const { applyHouseTopToPuck } = await import("@/lib/puck-seeds");
    const doc = lionTop();
    const before = JSON.stringify(doc);
    const out = applyHouseTopToPuck(doc);
    expect(JSON.stringify(doc)).toBe(before); // pure: the stored page is never written
    expect(out.content[0].type).toBe("PageHero");
    expect(out.content[0].props.id).toBe("pk-3");
    expect(out.content[0].props.content).toBe(doc.content[0].props.content); // her blocks, the same objects
    expect(out.content[1]).toBe(doc.content[1]);
    expect(JSON.stringify(out)).not.toContain("lions-gate.webp");
  });

  it("leaves a ground Love chose herself, a plain band, and any other first block alone (same reference)", async () => {
    const { applyHouseTopToPuck } = await import("@/lib/puck-seeds");
    const own = lionTop();
    own.content[0].props.bgSrc = "/media/her-own-sky.webp";
    expect(applyHouseTopToPuck(own)).toBe(own);
    const plain = lionTop();
    delete plain.content[0].props.bgSrc;
    expect(applyHouseTopToPuck(plain)).toBe(plain);
    const grid = { root: {}, content: [{ type: "PackagesGrid", props: { id: "g" } }] };
    expect(applyHouseTopToPuck(grid)).toBe(grid);
    const lionLater = lionTop();
    lionLater.content.reverse();
    expect(applyHouseTopToPuck(lionLater)).toBe(lionLater);
  });

  it("the route wires it on the published branch, inside the shelf injection", () => {
    expect(read("src/app/packages/page.tsx")).toContain("applyPackagesToPuck(applyHouseTopToPuck(puck as Data), shelf)");
  });
});
