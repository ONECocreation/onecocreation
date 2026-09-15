import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-233 (0018.06.25 a₿ · block 967,125) — the /style preview overlay's
 * source pins. The overlay is a client component riding Puck's store and
 * portal machinery, so — the house's read-the-source pattern
 * (style-route.test.ts, keep-dark-bands.test.ts) — the contracts are
 * pinned off the source:
 *
 *  · LIVE → DRAFT: each theme pane renders the store's published copy
 *    ("Live on the site now") distinctly from the working draft ("Your
 *    draft — …"), with honest empty states (dashes, never fake content);
 *  · THE LIGHT PANE DERIVES: ThemePane stamps data-oc-theme="light" on the
 *    iframe's own document root so the cartridge's production
 *    html[data-oc-theme="light"] chain paints it — PuckEditor carries NO
 *    .oc-pv-light/.oc-pv-dark class any more (the twin can't creep back:
 *    this file fails if it does);
 *  · THE PUBLISH WORDS: "Publish this page" / "Publish every page", the
 *    plain-language confirm, and the D2-ruled gold button kept EXACTLY
 *    (ruled gold background, white ink);
 *  · the drifted-comment sweeps: PaletteVars points at
 *    src/app/style/preview.css (the TASK-175 rename), store.publishAll
 *    points at the route's lint gate.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");

describe("the overlay — Live vs Draft, per theme", () => {
  it("both theme panes render, Live distinctly from Draft, with honest empty states", async () => {
    const src = await read("src/components/PuckEditor.tsx");
    expect(src).toContain('<ThemePane theme="light" label="Light"');
    expect(src).toContain('<ThemePane theme="dark" label="Dark"');
    expect(src).toContain("Live on the site now");
    expect(src).toContain("Your draft — what &ldquo;Publish this page&rdquo; puts live");
    /* the two renders carry DIFFERENT data — the store's live copy vs the
       working draft (the old overlay rendered liveData in both panes),
       each wrapped in <main> exactly as the published route wraps Render */
    expect(src).toMatch(/<main><Render config=\{config\} data=\{live\} \/><\/main>/);
    expect(src).toMatch(/<main><Render config=\{config\} data=\{draft\} \/><\/main>/);
    /* never-published and read-failed states speak in dashes, not fakes */
    expect(src).toContain("— this page has never been published");
    expect(src).toContain("— the live copy couldn&rsquo;t be read just now");
  });

  it("the overlay's Live side re-reads the store's {draft, live} pair on open", async () => {
    const src = await read("src/components/PuckEditor.tsx");
    expect(src).toMatch(/fetch\(`\/api\/puck\?slug=\$\{encodeURIComponent\(slug\)\}`\)/);
  });
});

describe("the light pane derives — no twin selector list in the overlay", () => {
  it("PuckEditor stamps the production theme attribute on the pane's own document root", async () => {
    const src = await read("src/components/PuckEditor.tsx");
    expect(src).toContain('doc.documentElement.setAttribute("data-oc-theme", "light")');
    /* the cartridge pick and the font variable classes ride along, so the
       twin-cartridge rules (html[data-oc-cartridge][data-oc-theme]) and
       next/font variables resolve in the pane exactly as on the site */
    expect(src).toContain('doc.documentElement.setAttribute("data-oc-cartridge", cartridge)');
    expect(src).toContain("doc.documentElement.className = document.documentElement.className");
  });

  it("no .oc-pv-light/.oc-pv-dark class survives in the editor (the twin can't creep back)", async () => {
    const src = await read("src/components/PuckEditor.tsx");
    expect(src).not.toMatch(/className="[^"]*oc-pv-light/);
    expect(src).not.toMatch(/className="[^"]*oc-pv-dark/);
    expect(src).not.toMatch(/className=\{`[^`]*oc-pv-(light|dark)/);
  });

  it("preview.css keeps the scope classes ONLY for the brand board's swatch panes", async () => {
    const css = await read("src/app/style/preview.css");
    expect(css).toContain("BrandBoard");
    expect(css).not.toMatch(/\.oc-pv-body/); // the overlay's old inline body wrapper is gone
    expect(css).toMatch(/\.oc-preview-pane > iframe/); // the deriving frame is the pane
  });
});

describe("the publish words", () => {
  it("plain-language labels on both publish gestures", async () => {
    const src = await read("src/components/PuckEditor.tsx");
    expect(src).toContain(">Publish this page</button>");
    expect(src).toContain(">Publish every page</button>");
    expect(src).not.toContain(">Publish to live</button>");
    expect(src).not.toContain(">Publish all</button>");
  });

  it("the publish-all confirm and result speak in her words — which page, why, nothing lost", async () => {
    const src = await read("src/components/PuckEditor.tsx");
    expect(src).toContain("Publish every page to the live site now?");
    expect(src).toContain("a page that doesn't pass stays a draft");
    expect(src).toContain("the brand guidelines found things to fix");
  });

  it("the D2 ruling stands: the publish button keeps ruled gold with white ink", async () => {
    const src = await read("src/components/PuckEditor.tsx");
    expect(src).toMatch(/background: GOLD, color: "#fff" \/\* D2 RULED/);
  });
});

describe("the drifted-comment sweeps", () => {
  it("PaletteVars references the post-TASK-175 path (style, not studio)", async () => {
    const src = await read("src/components/PaletteVars.tsx");
    expect(src).toContain("src/app/style/preview.css");
    expect(src).not.toContain("src/app/studio/preview.css");
    /* the scopes stay — the brand board's swatch panes still ride them */
    expect(src).toContain('dawnScopes: [".oc-pv-light"]');
    expect(src).toContain('nightScopes: [".oc-pv-dark"]');
  });

  it("store.publishAll points at the route's lint gate", async () => {
    const src = await read("packages/page-store/src/store.ts");
    const i = src.indexOf("async function publishAll()");
    const comment = src.slice(Math.max(0, i - 400), i);
    expect(comment).toContain("lint gate");
  });

  it("scar.css no longer claims its tokens still live in cartridge.css", async () => {
    const src = await read("src/app/scar.css");
    expect(src).not.toContain("verbatim from cartridge.css's dark-first block");
    expect(src).toContain("lifted out of cartridge.css");
  });
});
