import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The galaxy top, fix round (block 976,030, Lumen's look at 976,027).
 *  1. /terms: the top carries the kicker and the heading only. The draft
 *     note is the small first line of the body again (mgmt-blurb), the
 *     same words as on main.
 *  2. /replays: no top in this PR (Lumen's ruling, block 976,030). The
 *     page and the theater's viewport budget (100vh - 390px) stay main's;
 *     the trade is held for the Admiral's ruling.
 *  3. /meditation: the same short top (no glyph line), so the email box
 *     stays in a phone's first screen.
 */
const read = (p: string) => readFile(path.join(process.cwd(), p), "utf8");

/** the props text of the page's one <PageHero ... /> */
const heroProps = (src: string) => {
  const m = src.match(/<PageHero\b([\s\S]*?)\/>/);
  expect(m, "one self-closing <PageHero />").toBeTruthy();
  return m![1];
};

describe("galaxy top fix round (block 976,030)", () => {
  it("/terms: the top has kicker and heading, no lead; the draft note is the body's small first line", async () => {
    const src = await read("src/app/terms/page.tsx");
    const props = heroProps(src);
    expect(props).toMatch(/kicker="The fine print, kindly"/);
    expect(props).not.toMatch(/\blead=/);
    expect(props).not.toMatch(/Draft v1/);
    const body = src.slice(src.indexOf('<section className="mgmt-wrap mgmt-body"'));
    const firstP = body.match(/<p\b[^>]*>([^<]*)<\/p>/);
    expect(firstP?.[0]).toBe('<p className="mgmt-blurb">Draft v1 — plain language; final wording with Love.</p>');
  });

  it("/terms renders the draft note once, as the small mgmt-blurb line, not as the top's lead", async () => {
    const TermsPage = (await import("@/app/terms/page")).default;
    const el = (await TermsPage()) as unknown;
    const { default: PageHero } = await import("@/components/kit/PageHero");
    type El = { type?: unknown; props?: Record<string, unknown> & { children?: unknown } };
    const all: El[] = [];
    const walk = (n: unknown) => {
      if (Array.isArray(n)) return n.forEach(walk);
      if (n && typeof n === "object" && "props" in (n as El)) {
        all.push(n as El);
        walk((n as El).props?.children);
      }
    };
    walk(el);
    const tops = all.filter((e) => e.type === PageHero);
    expect(tops).toHaveLength(1);
    expect(tops[0].props?.lead).toBeUndefined();
    const notes = all.filter((e) => e.type === "p" && e.props?.className === "mgmt-blurb");
    expect(notes).toHaveLength(1);
    expect(notes[0].props?.children).toBe("Draft v1 — plain language; final wording with Love.");
  });

  it("/meditation wears the short top: no glyph line", async () => {
    expect(heroProps(await read("src/app/meditation/page.tsx"))).not.toMatch(/\bconstellation\b/);
  });

  it("/replays is not touched: no house top, main's header words, the theater budget is 390 px as on main", async () => {
    const src = await read("src/app/replays/page.tsx");
    expect(src).not.toMatch(/PageHero/);
    expect(src).toMatch(/<p className="kicker">Read with Love<\/p>/);
    expect(src).toMatch(/<h1 className="kit-h1">Replays<\/h1>/);
    expect(src).toMatch(/<p className="kit-body">Every recorded reading, kept here to play again.<\/p>/);
    const css = await read("src/app/kit.css");
    expect(css).toMatch(/\.kitx-theater-card\{--kitx-player-w:min\(100%,max\(320px,calc\(\(100vh - 390px\)\*16\/9\)\)\)/);
    expect(css).not.toMatch(/100vh - 515px/);
  });

  it("the other galaxy tops keep their glyph line", async () => {
    for (const p of [
      "src/app/store/page.tsx",
      "src/app/support/page.tsx",
      "src/app/cart/page.tsx",
      "src/app/store/meditations/page.tsx",
      "src/app/store/memberships/page.tsx",
      "src/app/packages/[slug]/page.tsx",
      "src/app/terms/page.tsx",
    ]) {
      expect(heroProps(await read(p)), p).toMatch(/\bconstellation\b/);
    }
  });
});
