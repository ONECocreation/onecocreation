import { describe, it, expect, afterAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { label } from "@/components/sections";
import { TIERS } from "@/lib/entitlement";
import { isolateCwd } from "./helpers/isolate-cwd";

/**
 * TASK-394 (block 968,138+ a₿, amended block 968,140 after Astra's plan
 * review) — "Package A/B/C" retired everywhere the site said it, in favor
 * of the real tier names Love already sells under (entitlement.ts's TIERS:
 * A "Weekly Intuitive", B "Observer", C "Evening Star"). Two surfaces:
 *
 *  1. sections.tsx's Classes() lockpill — the label() generator, hoisted to
 *     a named export by the amendment's R3 (exactly one export, this file
 *     owns it) so it can be pinned as a MAPPING TABLE, not a presence
 *     check: label("all") / label("A"|"B"|"C") against the literal
 *     strings AND against TIERS itself, plus a negative pin that no
 *     `` `Package ${ `` template survives. A render suite backs it with the
 *     real Classes() component (feature-switches.test.ts's isolateCwd
 *     idiom) — R1's finding pinned there too: the lockpill spans are
 *     labels, not links; the section's one and only anchor is the
 *     "Enter your rooms" door to /classes.
 *  2. puck-seeds.ts's home-classes-community band (:382-384,:391-393) —
 *     the six seed lines' "· Package A/B/C" tails now read the same three
 *     real names.
 *
 * Amendment R4 (Number One's walk of the first gated build, block 968,140):
 * the two-word names ("Weekly Intuitive", "Evening Star") wrapped INSIDE
 * the pill on a tight .roomrow. Fix rides an EXISTING house.css utility
 * (`.card .nowrap{white-space:nowrap}`, :213) — the two lockpill spans
 * gained a second class, `nowrap`, no CSS edited. Pinned below: the render
 * suite's class-list pin follows the new className, plus a read-only pin
 * that the utility still exists in house.css (a file this lane never
 * writes to — another live lane owns it).
 *
 * A wide grep stands as its own test: no "Package A/B/C" string survives in
 * src/ outside this lane's own claim/tests (Ground's own grep, at cut: the
 * ONLY two sources were sections.tsx's generator and these six seed lines).
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");

describe("label() — the mapping table (amendment R3, not a presence check)", () => {
  it('label("all") stays "All members" — byte-identical to before', () => {
    expect(label("all")).toBe("All members");
  });

  it('label("A"|"B"|"C") equals TIERS.A/B/C.name — sourced, never a guessed literal', () => {
    expect(label("A")).toBe(TIERS.A.name);
    expect(label("B")).toBe(TIERS.B.name);
    expect(label("C")).toBe(TIERS.C.name);
  });

  it('label("A"|"B"|"C") are, today, the exact real names: Weekly Intuitive / Observer / Evening Star', () => {
    expect(label("A")).toBe("Weekly Intuitive");
    expect(label("B")).toBe("Observer");
    expect(label("C")).toBe("Evening Star");
  });

  it('the negative pin: no `Package ${` template arm remains in the generator', async () => {
    const src = await read("src/components/sections.tsx");
    expect(src).not.toContain("Package ${");
  });
});

describe("puck-seeds.ts — the six seed lines carry the real tier names", () => {
  it('zero "Package A/B/C" literals remain', async () => {
    const src = await read("src/lib/puck-seeds.ts");
    expect(src).not.toMatch(/Package [ABC]/);
  });

  it("the Classes column's three suffixes equal the three real names, room titles untouched", async () => {
    const src = await read("src/lib/puck-seeds.ts");
    expect(src).toContain(`✦ Clair Senses — Foundations · ${TIERS.A.name}`);
    expect(src).toContain(`✦ Chronicles: Weekly Reading · ${TIERS.B.name}`);
    expect(src).toContain(`✦ Quantum Healing — Deep Dive · ${TIERS.C.name}`);
  });

  it('the Community column\'s three suffixes equal the three real names, "All members" untouched', async () => {
    const src = await read("src/lib/puck-seeds.ts");
    expect(src).toContain("♡ The Heart Field · All members");
    expect(src).toContain(`♡ Daily Tune-Up & Check-ins · ${TIERS.A.name}`);
    // the curly apostrophe in "Observers’" (U+2019) is load-bearing — kept verbatim (amendment Keep list)
    expect(src).toContain(`♡ The Observers’ Circle · ${TIERS.B.name}`);
    expect(src).toContain(`♡ Evening Star — Inner Sanctum · ${TIERS.C.name}`);
  });
});

describe("the wide grep, as a test (Ground: the ONLY two sources were sections.tsx + puck-seeds.ts)", () => {
  it('no "Package A/B/C" string survives anywhere in src/', async () => {
    async function walk(dir: string): Promise<string[]> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const out: string[] = [];
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...(await walk(full)));
        else out.push(full);
      }
      return out;
    }
    const files = await walk(path.join(ROOT, "src"));
    const hits: string[] = [];
    for (const f of files) {
      const body = await fs.readFile(f, "utf8");
      if (/Package [ABC]/.test(body)) hits.push(path.relative(ROOT, f));
    }
    expect(hits).toEqual([]);
  });
});

describe("the home shelf, rendered — the real Classes() component (feature-switches.test.ts idiom)", () => {
  const iso = isolateCwd("oc-package-names-394-");

  afterAll(() => {
    iso.cleanup();
  });

  async function renderClasses(): Promise<string> {
    process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.REGISTRY_DRIVER;
    const { defaultSiteConfig } = await import("@/lib/site-config");
    const cfg = defaultSiteConfig();
    cfg.features.classes = true; // Classes() returns null unless classes or community is on
    cfg.features.community = true;
    const file = path.join(process.cwd(), "data", "site-config.json");
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(cfg), "utf8");
    const { Classes } = await import("@/components/sections");
    const el = await Classes();
    expect(el).not.toBeNull();
    return renderToStaticMarkup(el as ReactElement);
  }

  it("both cards render the real tier names — the word Package is gone", async () => {
    const html = await renderClasses();
    expect(html).not.toContain("Package");
    expect(html).toContain("Weekly Intuitive");
    expect(html).toContain("Observer");
    expect(html).toContain("Evening Star");
    expect(html).toContain("All members");
  });

  it("every room row still wraps its label in the SAME .lockpill span — no structural change", async () => {
    const html = await renderClasses();
    // ROOMS (matrix-rooms.ts): 3 "class" rooms + 4 "community" rooms = 7 rows, 7 pills.
    expect(html.match(/class="lockpill"/g)).toBeNull(); // the bare class alone no longer appears
    expect(html.match(/class="lockpill nowrap"/g)?.length).toBe(7);
  });

  it("R1 (amendment): the pills are labels, not links — the section's only anchor is the /classes door", async () => {
    const html = await renderClasses();
    const anchors = html.match(/<a /g) ?? [];
    expect(anchors.length).toBe(1); // "Enter your rooms" — the lockpills carry no href at all
    expect(html).toContain('href="/classes"');
  });
});

describe("R4 (Number One's walk, block 968,140) — the pill never wraps", () => {
  it('house.css still carries the .card .nowrap utility this fix rides (read-only evidence — never edited here)', async () => {
    const css = await read("src/app/house.css");
    expect(css).toContain(".card .nowrap{white-space:nowrap}");
  });

  it(".lockpill itself still carries no white-space rule — the utility class is load-bearing, not redundant", async () => {
    const css = await read("src/app/house.css");
    const lockpillRule = css.match(/\.lockpill\{[^}]*\}/)?.[0] ?? "";
    expect(lockpillRule).not.toContain("white-space");
  });
});
