import { describe, it, expect, afterAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { isolateCwd } from "./helpers/isolate-cwd";

/**
 * TASK-393 (the toggle sweep, block 968,132 a₿, amended 968,133) — pins
 * for every surface this lane touches: the new largeSums switch → output
 * contract (R8 of the amendment), the four rail-aware copy spots (R5),
 * the packages add-ons consumer filter (R1), the SiteRoom operator row
 * (R2), the cart basket's four rail states (R4), and the already-covered
 * pins Ground names (the /support jars gate, the /me lightning-wallet
 * star). One file, one table per surface.
 *
 * Two idioms, per R8's own split:
 *  - a switch→output CONTRACT for the two places a full render is cheap
 *    and decisive: the home affirmation shelf (Affirmations(), rendered
 *    with react-dom/server under largeSums false/true) and the packages
 *    add-ons filter (visibleTierAddons, a pure function — no render
 *    needed to prove it). cartCheckoutLine (R4's own pure export) gets
 *    the same table treatment.
 *  - readFileSync SOURCE PINS as supporting evidence everywhere else
 *    (the kit-components.test.ts idiom) — scoped to the named surfaces,
 *    never a rendered-copy string match (the brief's own FORBIDDEN
 *    clause: pin the switch→markup relationship at the source level).
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");

describe("site-config.ts — the largeSums switch exists, default OFF", () => {
  it("the features type carries largeSums: boolean", async () => {
    const src = await read("src/lib/site-config.ts");
    expect(src).toMatch(/largeSums:\s*boolean;/);
  });

  it("defaultSiteConfig() defaults it OFF (§8.7)", async () => {
    const src = await read("src/lib/site-config.ts");
    expect(src).toContain("largeSums: false,");
  });

  it("sanitize()'s bools(o.features, d.features) and saveSiteConfig()'s spread stay generic — no per-key edit needed", async () => {
    const src = await read("src/lib/site-config.ts");
    expect(src).toContain("features: bools(o.features, d.features)");
    expect(src).toContain("features: { ...current.features, ...(patch.features ?? {}) }");
  });
});

describe("SiteRoom.tsx — Love's own switch for it (R2)", () => {
  it("FEATURE_ROWS carries a largeSums row with an honest about-line", async () => {
    const src = await read("src/app/a/site/SiteRoom.tsx");
    expect(src).toMatch(/key:\s*"largeSums"/);
    expect(src).toContain('label: "Large Sums of Money"');
  });
});

describe("tiers-content.ts — stays data; the gate lives at the consumer (R1)", () => {
  it("the large-sums entry stays in TIER_ADDONS, with a comment naming the flag and where the gate lives", async () => {
    const src = await read("src/lib/tiers-content.ts");
    expect(src).toContain('{ itemId: "large-sums", name: "Large Sums of Money"');
    expect(src).toMatch(/features\.largeSums/);
    expect(src).toContain("visibleTierAddons");
  });
});

describe("packages/[slug]/page.tsx — visibleTierAddons, the ONE filter (R1/R8)", () => {
  it("largeSums false drops exactly the large-sums entry; true returns TIER_ADDONS whole", async () => {
    const { visibleTierAddons } = await import("@/app/packages/[slug]/page");
    const { TIER_ADDONS } = await import("@/lib/tiers-content");

    const off = visibleTierAddons(false);
    expect(off.some((a) => a.itemId === "large-sums")).toBe(false);
    expect(off.length).toBe(TIER_ADDONS.length - 1);
    // every OTHER entry rides through untouched
    for (const a of TIER_ADDONS.filter((x) => x.itemId !== "large-sums")) {
      expect(off).toContainEqual(a);
    }

    const on = visibleTierAddons(true);
    expect(on).toEqual(TIER_ADDONS);
  });

  it("the add-ons Promise.all maps over visibleTierAddons(switches.features.largeSums), not the raw TIER_ADDONS", async () => {
    const src = await read("src/app/packages/[slug]/page.tsx");
    expect(src).toContain("visibleTierAddons(switches.features.largeSums)");
  });
});

describe("sections.tsx — the home shelf gate (:451) beside features.store (:448)", () => {
  it("the Large Sums card is a conditional spread on switches.features.largeSums", async () => {
    const src = await read("src/components/sections.tsx");
    expect(src).toContain("if (!switches.features.store) return null;");
    expect(src).toContain("...(switches.features.largeSums");
  });
});

describe("sections.tsx — the R5 rail-aware sweep (Jewelry/Affirmations/Donations)", () => {
  it("a shared liveRails() helper judges the live btc/card rails once, reused by all three spots", async () => {
    const src = await read("src/components/sections.tsx");
    expect(src).toMatch(/async function liveRails\(\):\s*Promise<\{\s*btc:\s*boolean;\s*card:\s*boolean\s*\}>/);
    const callSites = src.match(/const rails = await liveRails\(\);/g) ?? [];
    expect(callSites.length).toBe(3); // Jewelry, Affirmations, Donations
  });

  it("no unconditional bitcoin/lightning promise remains in the four spots' old wording", async () => {
    const src = await read("src/components/sections.tsx");
    expect(src).not.toContain("Pay in bitcoin or dollars; shipped to your door.");
    expect(src).not.toContain("Checkout is bitcoin/lightning (or dollars)");
    expect(src).not.toContain("New You. Each payable in bitcoin.");
    expect(src).not.toContain("bitcoin over lightning");
  });

  it("each spot's four-state table is present in source (both / btc-only / card-only / neither)", async () => {
    const src = await read("src/components/sections.tsx");
    // Jewelry
    expect(src).toContain('"Pay in bitcoin or by card; shipped to your door."');
    expect(src).toContain('"Pay by card; shipped to your door."');
    expect(src).toContain('"Shipped to your door once checkout opens."');
    expect(src).toContain('"Checkout is by card; shipping & address collected at checkout."');
    expect(src).toContain("Checkout isn’t open yet");
    // Affirmations
    expect(src).toContain('"Each payable in bitcoin or by card."');
    expect(src).toContain('"Each payable by card."');
    expect(src).toContain('"Each one, the moment checkout opens."');
    // Donations
    expect(src).toContain('"Give in bitcoin, straight to Love."');
    expect(src).toContain('"Give in dollars."');
    expect(src).toContain('"Giving opens again soon."');
  });

  it("Donations()'s jarsOpen() gate on <TipJar/> itself is untouched (a separate concern from the rail-aware paragraph)", async () => {
    const src = await read("src/components/sections.tsx");
    expect(src).toMatch(/\{open && <TipJar \/>\}/);
  });
});

describe("cart/page.tsx:65 — four rail states (R4), pure + tabled", () => {
  it("both / btc-only / card-only / neither — the exact table", async () => {
    const { cartCheckoutLine } = await import("@/app/cart/page");
    const table: [{ btc: boolean; card: boolean }, string][] = [
      [{ btc: true, card: true }, "one checkout — everything settles together, by lightning or by card."],
      [{ btc: true, card: false }, "one checkout — everything settles together, by lightning."],
      [{ btc: false, card: true }, "one checkout — everything settles together, by card."],
      [{ btc: false, card: false }, "your basket is holding everything — checkout opens the moment a payment rail does."],
    ];
    for (const [rails, want] of table) {
      expect(cartCheckoutLine(rails)).toBe(want);
    }
  });

  it("the fallback JSX renders {cartCheckoutLine(rails)}, not a static literal unconditional on rails", async () => {
    const src = await read("src/app/cart/page.tsx");
    expect(src).toContain("{cartCheckoutLine(rails)}");
    expect(src).not.toMatch(/<p[^>]*>\s*one checkout — everything settles together, by lightning or by card\.\s*<\/p>/);
  });
});

describe("puck-seeds.ts — the home seed's Large Sums panel is commented, not deleted (R7)", () => {
  it("every reference to the large-sums image in the home seed region sits on a commented-out line", async () => {
    const src = await read("src/lib/puck-seeds.ts");
    const lines = src.split("\n").filter((l) => l.includes("affirmation-largesums.webp"));
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) expect(l.trim().startsWith("//")).toBe(true);
  });

  it("the comeback comment names the flag and the republish step", async () => {
    const src = await read("src/lib/puck-seeds.ts");
    expect(src).toContain("features.largeSums");
    expect(src).toMatch(/uncomment.*republish|republish.*uncomment/i);
  });
});

describe("the home affirmation shelf — switch→output contract (R8, rendered)", () => {
  const iso = isolateCwd("oc-feature-switches-393-");

  afterAll(() => {
    iso.cleanup();
  });

  async function renderAffirmations(largeSums: boolean): Promise<string> {
    process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.REGISTRY_DRIVER;
    const { defaultSiteConfig } = await import("@/lib/site-config");
    const cfg = defaultSiteConfig();
    cfg.features.store = true; // Affirmations() returns null unless store is on
    cfg.features.largeSums = largeSums;
    const file = path.join(process.cwd(), "data", "site-config.json");
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(cfg), "utf8");
    const { Affirmations } = await import("@/components/sections");
    const el = await Affirmations();
    expect(el).not.toBeNull();
    return renderToStaticMarkup(el as ReactElement);
  }

  it("largeSums OFF, store ON: the offer's identity is absent", async () => {
    const html = await renderAffirmations(false);
    expect(html).not.toContain("Large Sums of Money");
    expect(html).not.toContain("affirmation-largesums.webp");
    // its shelf-mates still stand — this is a filter, not a section wipe
    expect(html).toContain("Thank You");
    expect(html).toContain("IAM Worthy");
  });

  it("largeSums ON, store ON: the offer's identity is present", async () => {
    const html = await renderAffirmations(true);
    expect(html).toContain("Large Sums of Money");
    expect(html).toContain("affirmation-largesums.webp");
  });
});

describe("the already-covered items stay covered (Ground item 4 — pins, not edits)", () => {
  it("support/page.tsx: the jars block is gated on jarsOpen() (A7 already answered)", async () => {
    const src = await read("src/app/support/page.tsx");
    expect(src).toMatch(/\{jarsOpen\(\)\s*&&/);
  });

  it("ConstellationCard.tsx: no star's title/subtitle names lightning or a wallet (E1 already answered)", async () => {
    // the file's own docblock explains the HISTORY in words ("the
    // lightning-wallet star is HIDDEN") — that comment is expected and
    // fine; the pin is that no live `Star` object (t:/w: fields) reads
    // lightning/wallet/NWC, i.e. no such star was ever re-added.
    const src = await read("src/components/me/ConstellationCard.tsx");
    const fieldHits = src.match(/[tw]:\s*"[^"]*"/gi) ?? [];
    expect(fieldHits.length).toBeGreaterThan(0);
    for (const field of fieldHits) {
      expect(field.toLowerCase()).not.toMatch(/lightning|wallet|nwc/);
    }
  });
});
