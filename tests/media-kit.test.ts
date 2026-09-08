import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import MediaKit, { BRAND_MARKS } from "@/components/MediaKit";

/**
 * TASK-179 (0018.06.18 a₿) — the old-style brand files retire. The July
 * plain-gold ring set (onecocreation-coin-gold.*, onecocreation-mark-gold.*)
 * moved to docs/brand-archive/ and is never served again; the media kit shows
 * and downloads only the live marks (the purple-half mark, the raylit lockup,
 * and the two email rasters). Two pins: (1) MediaKit really renders the new
 * marks — rendered, not just the model; (2) a source pin that no served path
 * anywhere in src/ or public/ names coin-gold or mark-gold.
 */

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const RETIRED = ["coin-gold", "mark-gold"] as const;
const RETIRED_FILES = [
  "onecocreation-coin-gold.png",
  "onecocreation-coin-gold.svg",
  "onecocreation-mark-gold.png",
  "onecocreation-mark-gold.svg",
  "onecocreation-mark-gold-RECIPE.md",
] as const;

/** Every file under a dir, recursively (tests never scan node_modules). */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

describe("MediaKit — the brand block serves the live marks (T-179)", () => {
  it("the model lists exactly the four live files: mark.svg, lockup-raylit.svg, and the two email PNGs", () => {
    const hrefs = BRAND_MARKS.flatMap((m) => [m.img, ...m.downloads.map((d) => d.href)]);
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/brand/onecocreation-mark.svg",
        "/brand/onecocreation-mark-email.png",
        "/brand/onecocreation-lockup-raylit.svg",
        "/brand/onecocreation-lockup-email.png",
      ]),
    );
    expect(hrefs).toHaveLength(6); // two cards: one img + two downloads each
  });

  it("every file the model serves actually exists under public/", () => {
    for (const m of BRAND_MARKS) {
      for (const p of [m.img, ...m.downloads.map((d) => d.href)]) {
        expect(existsSync(join(ROOT, "public", p)), `${p} must exist under public/`).toBe(true);
      }
    }
  });

  it("renders the new marks — and never the retired gold set", () => {
    const html = renderToStaticMarkup(createElement(MediaKit));
    expect(html).toContain("/brand/onecocreation-mark.svg");
    expect(html).toContain("/brand/onecocreation-lockup-raylit.svg");
    expect(html).toContain("/brand/onecocreation-mark-email.png");
    expect(html).toContain("/brand/onecocreation-lockup-email.png");
    for (const name of RETIRED) {
      expect(html, `rendered kit must not name ${name}`).not.toContain(name);
    }
  });

  it("the download labels are honest — an email raster says EMAIL PNG", () => {
    for (const m of BRAND_MARKS) {
      for (const d of m.downloads) {
        if (d.href.endsWith(".png")) expect(d.label).toContain("PNG");
        if (d.href.endsWith(".svg")) expect(d.label).toContain("SVG");
      }
    }
  });
});

describe("the served-path pin — nothing served names coin-gold or mark-gold", () => {
  it("no source file under src/ references a retired gold brand path", () => {
    const offenders: string[] = [];
    for (const file of walk(join(ROOT, "src"))) {
      const text = readFileSync(file, "utf8");
      for (const name of RETIRED) {
        // A SERVED reference is a /brand/ path; bare prose ("never coin-gold")
        // and archive mentions are not the thing this pin guards.
        if (text.includes(`/brand/onecocreation-${name}`)) {
          offenders.push(relative(ROOT, file));
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no file under public/ references a retired gold brand path, and public/brand holds no *gold* file at all", () => {
    const offenders: string[] = [];
    for (const file of walk(join(ROOT, "public"))) {
      const name = relative(join(ROOT, "public"), file);
      if (name.includes("gold")) offenders.push(`FILENAME: ${name}`);
      if (/\.(svg|html?|css|js|json|txt|md)$/i.test(name)) {
        const text = readFileSync(file, "utf8");
        for (const retired of RETIRED) {
          if (text.includes(`/brand/onecocreation-${retired}`)) offenders.push(`REFERENCE: ${name}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the retired set rests in docs/brand-archive/, intact, and the README records it", () => {
    for (const f of RETIRED_FILES) {
      expect(existsSync(join(ROOT, "docs", "brand-archive", f)), `${f} must rest in docs/brand-archive/`).toBe(true);
      expect(existsSync(join(ROOT, "public", "brand", f)), `${f} must be gone from public/brand/`).toBe(false);
    }
    const readme = readFileSync(join(ROOT, "docs", "brand-archive", "README.md"), "utf8");
    expect(readme).toContain("coin-gold");
    expect(readme).toContain("mark-gold");
  });
});
