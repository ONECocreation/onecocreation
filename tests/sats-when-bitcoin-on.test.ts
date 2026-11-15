import { describe, it, expect, afterAll, beforeEach } from "vitest";
import { promises as fs, readFileSync } from "fs";
import path from "path";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { isolateCwd } from "./helpers/isolate-cwd";

/**
 * lane/oc-sats-when-bitcoin-on (block 976,021 — the Admiral's pin: "only
 * show sats when bitcoin is on"). Both states, on every public surface this
 * lane changed:
 *   bitcoin OFF → no sats word, no "≈ … sats" line;
 *   bitcoin ON  → the sats lines stand exactly as today.
 * "Bitcoin on" is the house's own rail truth (liveAdapter(): the /a/site
 * payments.btcpay switch AND a configured btcpay env), read through
 * satsShown() — no new switch.
 */

const REPO = process.cwd();
const iso = isolateCwd("oc-sats-976021-");
afterAll(() => iso.cleanup());

const BTC_ENV = { BTCPAY_URL: "https://btcpay.invalid", BTCPAY_STORE_ID: "store", BTCPAY_API_KEY: "key" };

async function setRails(btc: boolean) {
  process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.REGISTRY_DRIVER;
  for (const [k, v] of Object.entries(BTC_ENV)) {
    if (btc) process.env[k] = v;
    else delete process.env[k];
  }
  const { defaultSiteConfig } = await import("@/lib/site-config");
  const cfg = defaultSiteConfig();
  cfg.features.store = true;
  cfg.features.memberships = true;
  cfg.payments.btcpay = btc;
  const file = path.join(process.cwd(), "data", "site-config.json");
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(cfg), "utf8");
  // warm the sync switch cache to THIS config (the page idiom)
  const { getSiteConfig } = await import("@/lib/site-config");
  await getSiteConfig();
}

const SATS = /sats/i;

async function html(el: Promise<ReactElement | null> | ReactElement | null): Promise<string> {
  const e = await el;
  expect(e).not.toBeNull();
  return renderToStaticMarkup(e as ReactElement);
}

describe("satsShown() reads the bitcoin rail truth (no new switch)", () => {
  it("off when the btcpay switch is off; on when the switch is on and btcpay is configured", async () => {
    const { satsShown } = await import("@/lib/sats-shown");
    await setRails(false);
    expect(await satsShown()).toBe(false);
    await setRails(true);
    expect(await satsShown()).toBe(true);
  });

  it("the helper calls liveAdapter(), the rail truth every price page already reads", () => {
    const src = readFileSync(path.join(REPO, "src/lib/sats-shown.ts"), "utf8");
    expect(src).toContain("liveAdapter() !== null");
  });
});

describe("home / and /packages fallback — Packages() cards", () => {
  beforeEach(() => setRails(false));

  it("bitcoin OFF: no sats line on the package cards", async () => {
    await setRails(false);
    const { Packages } = await import("@/components/sections");
    const out = await html(Packages());
    expect(out).toContain("$33<small>/mo</small>");
    expect(out).not.toContain('class="sats"');
    expect(out).not.toMatch(SATS);
  });

  it("bitcoin ON: the line stands as today", async () => {
    await setRails(true);
    const { Packages } = await import("@/components/sections");
    const out = await html(Packages());
    expect(out).toContain('<div class="sats">⚡ ≈ 55,555 sats / month</div>');
    expect((out.match(/class="sats"/g) ?? []).length).toBe(3);
  });
});

describe("/packages designer branch — the PackagesGrid block", () => {
  async function grid(btc: boolean | undefined) {
    const { config } = await import("@/lib/puck-config");
    const { TIERS } = await import("@/lib/entitlement");
    const { TIER_PAGES } = await import("@/lib/tiers-content");
    const block = (config.components as unknown as Record<string, { render: (p: Record<string, unknown>) => ReactElement }>).PackagesGrid;
    const shelf = {
      railsOn: false,
      ...(btc === undefined ? {} : { btc }),
      tiers: TIER_PAGES.map((p) => ({ tier: p.tier, slug: p.slug, name: TIERS[p.tier].name, priceUsd: TIERS[p.tier].priceUsd, priceSats: TIERS[p.tier].priceSats })),
    };
    return renderToStaticMarkup(block.render({ shelf }));
  }

  it("bitcoin OFF (and unknown): no sats line", async () => {
    for (const b of [false, undefined]) {
      const out = await grid(b);
      expect(out).toContain("$33<small>/mo</small>");
      expect(out).not.toMatch(SATS);
    }
  });

  it("bitcoin ON: the line stands as today", async () => {
    const out = await grid(true);
    expect(out).toContain("⚡ ≈ 55,555 sats / month");
  });

  it("the page hands the grid the rail truth", () => {
    const src = readFileSync(path.join(REPO, "src/app/packages/page.tsx"), "utf8");
    expect(src).toContain("btc: await satsShown(),");
  });
});

describe("home shelves — Affirmations(), Services(); /jewelry — Jewelry()", () => {
  it("bitcoin OFF: no sats line on the affirmation cards or the jewelry cards", async () => {
    await setRails(false);
    const { Affirmations, Jewelry } = await import("@/components/sections");
    const aff = await html(Affirmations());
    expect(aff).toContain("$11.11");
    expect(aff).not.toContain("11,110 sats");
    // the button label: the bolt is a bitcoin mark
    expect(aff).not.toContain("⚡");
    expect(aff).toContain('href="/store">Add</a>');
    const jw = await html(Jewelry());
    expect(jw).toContain("$88");
    expect(jw).not.toContain('class="sats"');
  });

  it("bitcoin ON: both stand as today", async () => {
    await setRails(true);
    const { Affirmations, Jewelry } = await import("@/components/sections");
    const aff = await html(Affirmations());
    expect(aff).toContain('<div class="sats">⚡ ≈ 11,110 sats</div>');
    expect(aff).toContain('href="/store">Add ⚡</a>');
    expect(await html(Jewelry())).toContain('<div class="sats">⚡ ≈ 88,000 sats</div>');
  });

  it("the session cards (home Services(), /book) get no sats number while bitcoin is off", () => {
    const sec = readFileSync(path.join(REPO, "src/components/sections.tsx"), "utf8");
    const book = readFileSync(path.join(REPO, "src/app/book/page.tsx"), "utf8");
    expect(sec).toContain("sats: btc ? s.price.sats : undefined,");
    expect(book).toContain("sats: btc ? s.price.sats : undefined,");
    expect(book).toContain("const btc = await satsShown();");
  });
});

describe("the other hand-built public pages (source pins)", () => {
  it("/services tier cards, /about's tier line and /book/[id]'s price word follow the rail", () => {
    const services = readFileSync(path.join(REPO, "src/app/services/page.tsx"), "utf8");
    expect(services).toContain('{btc && <div className="sats">⚡ ≈ {t.priceSats.toLocaleString()} sats / month</div>}');
    const about = readFileSync(path.join(REPO, "src/app/about/page.tsx"), "utf8");
    expect(about).toContain("${t.priceUsd}/mo{btc && <> · ⚡ ≈ {t.priceSats.toLocaleString()} sats</>}");
    const bookId = readFileSync(path.join(REPO, "src/app/book/[serviceId]/page.tsx"), "utf8");
    expect(bookId).toContain("if (btc && sats != null) bits.push");
    expect(bookId).toContain("{priceLabel(service, btc)}");
  });
});

describe("the designer branch — applySatsRuleToPuck over the house seeds", () => {
  const texts = (data: unknown): string[] => {
    const out: string[] = [];
    const walk = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") {
        const n = v as { type?: string; props?: Record<string, unknown> };
        if (n.type === "Text" && typeof n.props?.text === "string") out.push(n.props.text);
        Object.values(n.props ?? n).forEach(walk);
      }
    };
    walk(data);
    return out;
  };

  it("bitcoin OFF: the home and jewelry seeds lose every sats word; the dollars stay", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const { applySatsRuleToPuck } = await import("@/lib/puck-sats");
    for (const key of ["home", "jewelry"]) {
      const seed = SEEDS[key] as { content: unknown[] };
      expect(texts(seed).some((t) => SATS.test(t))).toBe(true); // the seed carries them today
      const out = applySatsRuleToPuck(seed, false);
      expect(texts(out).filter((t) => /≈.*sats/.test(t))).toEqual([]);
    }
    const home = texts(applySatsRuleToPuck(SEEDS.home as { content: unknown[] }, false));
    expect(home).toContain("$33/mo");
    expect(home).toContain("$11.11");
    const labels = (d: unknown) => JSON.stringify(d).match(/"label":"Add[^"]*"/g) ?? [];
    expect(labels(SEEDS.home)).toContain('"label":"Add ⚡"');
    const offLabels = labels(applySatsRuleToPuck(SEEDS.home as { content: unknown[] }, false));
    expect(offLabels.length).toBeGreaterThan(0);
    expect(offLabels.every((l) => l === '"label":"Add"')).toBe(true);
    const jw = texts(applySatsRuleToPuck(SEEDS.jewelry as { content: unknown[] }, false));
    expect(jw).toContain("$88");
  });

  it("bitcoin ON: the same doc comes back untouched", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const { applySatsRuleToPuck } = await import("@/lib/puck-sats");
    const seed = SEEDS.home as { content: unknown[] };
    expect(applySatsRuleToPuck(seed, true)).toBe(seed);
  });

  it("the home and jewelry pages run it on their designer branch", () => {
    for (const f of ["src/app/page.tsx", "src/app/jewelry/page.tsx"]) {
      const src = readFileSync(path.join(REPO, f), "utf8");
      expect(src).toContain("applySatsRuleToPuck(");
      expect(src).toContain("await satsShown()");
    }
  });
});
