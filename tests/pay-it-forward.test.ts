import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "fs";
import { readFileSync } from "fs";
import path from "path";
import type { ReactElement, ReactNode } from "react";
import { isolateCwd } from "./helpers/isolate-cwd";

/* ROOT is captured BEFORE the isolated cwd lands — the source pins below
   read the real tree, the gate-behaviour fixtures write to the throwaway
   one (jars.test.ts's pattern, TASK-158). */
const ROOT = process.cwd();
const cwd = isolateCwd("oc-t636-");

/**
 * TASK-636 (block 974,079 · K187 item 1 — the Admiral's A on desk card
 * 972826: "Build it, with my two fixes") — the public /pay-it-forward page,
 * built from the approved mockup (claim ad88a338). Pins:
 *
 *  1. THE DOUBLE GATE STAYS AS DRAWN: the page warms the switches
 *     (getSiteConfig, the T-186 warm-before-judge idiom), judges jarsOpen()
 *     AND liveJarKeys()'s per-item truth, and mounts TipJar only={["payforward"]}
 *     only when the payforward jar is in the live list. force-dynamic: the
 *     rail is judged per request, never cached at build.
 *  2. THE TWO REWORDED LINES (his fix 2): the reused store lines that
 *     carried a dash carry none here — "— how gifts were received will show
 *     here." became "How gifts were received will show here." and the
 *     bitcoin note's "wallet — nothing held" became "wallet. Nothing held".
 *     Every other word of both lines stays verbatim.
 *  3. THE ROW LAW (his fix 1): TipJar's Give button rides the same .btn-sm
 *     as the sats pills, and the custom amount box's padding/line-height
 *     land on the same 42px box — 12+12 + (.9rem × 1.25 = 18px) = 42 for the
 *     buttons; 18 + 2×10.5 + 2×1.5 = 42 for the input. The house.css anchors
 *     the arithmetic stands on are pinned too, so a stylesheet drift that
 *     breaks the law fails here instead of on the page.
 *  4. BEHAVIOUR (the real page component, invoked like studio-publish's
 *     tree walk): rail dark → no TipJar, hero still stands; rail live + jar
 *     item live → TipJar mounted with only=["payforward"]; jar item hidden
 *     → derive-or-dash, no TipJar even with the rail live.
 */

const PAGE = path.join(ROOT, "src", "app", "pay-it-forward", "page.tsx");
const TIPJAR = path.join(ROOT, "src", "components", "TipJar.tsx");
const HOUSE = path.join(ROOT, "src", "app", "house.css");

function findAll(node: ReactNode, pred: (el: ReactElement) => boolean, out: ReactElement[] = []): ReactElement[] {
  if (Array.isArray(node)) {
    for (const n of node) findAll(n, pred, out);
    return out;
  }
  if (node && typeof node === "object" && "props" in (node as ReactElement)) {
    const el = node as ReactElement;
    if (pred(el)) out.push(el);
    const kids = (el.props as { children?: ReactNode })?.children;
    if (kids) findAll(kids, pred, out);
  }
  return out;
}

function configureBtcpay() {
  process.env.BTCPAY_URL = "https://btcpay.t636-test.invalid";
  process.env.BTCPAY_STORE_ID = "t636-test-store";
  process.env.BTCPAY_API_KEY = "t636-test-key";
}

function clearBtcpay() {
  delete process.env.BTCPAY_URL;
  delete process.env.BTCPAY_STORE_ID;
  delete process.env.BTCPAY_API_KEY;
}

async function seedCatalog(status: "live" | "hidden") {
  await fs.writeFile(
    path.join(cwdDir(), "data", "store-catalog.json"),
    JSON.stringify({
      schemaVersion: 2,
      items: [
        {
          id: "gifts-of-gratitude",
          schemaVersion: 2,
          title: "Gifts of Gratitude",
          blurb: "Fund a session or membership for someone who can't right now.",
          images: [],
          kind: "digital",
          price: { sats: 111 },
          fulfillment: "digital",
          status,
        },
      ],
    }),
  );
}

function cwdDir() {
  return process.cwd();
}

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  clearBtcpay();
});

afterAll(() => {
  clearBtcpay();
  cwd.cleanup();
});

describe("1. the page wires the production double gate (jarsOpen AND liveJarKeys)", () => {
  it("source: warm-before-judge, both gates, the payforward-only mount, force-dynamic", () => {
    const src = readFileSync(PAGE, "utf8");
    expect(src).toContain("await getSiteConfig()");
    expect(src).toContain("jarsOpen()");
    expect(src).toContain("await liveJarKeys()");
    expect(src).toContain('jars.includes("payforward")');
    expect(src).toContain('only={["payforward"]}');
    expect(src).toContain('export const dynamic = "force-dynamic"');
  });
});

describe("2. the two reused store lines carry no dash (his fix 2)", () => {
  /* the docblock quotes the OLD lines for review; the pins judge the render
     body (from `export default` down) */
  it("the gifts-received line: dash dropped, words otherwise verbatim", () => {
    const src = readFileSync(PAGE, "utf8");
    const body = src.slice(src.indexOf("export default"));
    expect(body).toContain("How gifts were received will show here.");
    expect(body).not.toContain("— how gifts were received");
  });

  it("the bitcoin note: the em dash became a full stop, words otherwise verbatim", () => {
    const src = readFileSync(PAGE, "utf8");
    const body = src.slice(src.indexOf("export default"));
    expect(body).toContain("own wallet. Nothing");
    expect(body).not.toContain("own wallet — nothing");
    expect(body).toContain(
      "Dollars are always welcome too: bitcoin is an\n                  option here, never a demand.",
    );
  });

  it("no em dash or spaced hyphen stands anywhere in the panel copy (metadata is the drawn exception)", () => {
    const src = readFileSync(PAGE, "utf8");
    const body = src.slice(src.indexOf("export default"));
    expect(body).not.toContain("—");
    expect(body).not.toMatch(/ - /);
  });
});

describe("3. the row law (his fix 1): Give, the pills and the custom box are one height", () => {
  it("the Give button rides .btn-sm, the same size class as the sats pills", () => {
    const src = readFileSync(TIPJAR, "utf8");
    expect(src).toContain('className="btn btn-gold btn-sm" type="button" onClick={give}');
    expect(src).toContain('"btn btn-gold btn-sm" : "btn btn-ghost btn-sm"');
    expect(src).toContain('alignItems: "center"');
  });

  it("the custom amount box is pinned to the same 42px border-box (never font metrics)", () => {
    const src = readFileSync(TIPJAR, "utf8");
    expect(src).toContain("height: 42");
    expect(src).toContain('boxSizing: "border-box"');
    expect(src).toContain('fontSize: ".9rem"');
    expect(src).toContain('border: "1.5px solid');
  });

  it("the arithmetic anchors hold: .btn-sm padding and the .btn line-height in house.css", () => {
    const css = readFileSync(HOUSE, "utf8");
    // 12+12 + (.9rem = 14.4px × 1.25 = 18px) = 42px, the box every row member shares
    expect(css).toContain(".btn-sm{padding:12px 24px;font-size:.9rem");
    expect(css).toMatch(/\.btn\{[^}]*line-height:1\.25/);
  });
});

describe("4. the gate behaves: the real page component, rail dark and rail live", () => {
  it("rail dark (no BTCPay env): no TipJar, the hero still stands", async () => {
    clearBtcpay();
    const Page = (await import("@/app/pay-it-forward/page")).default;
    const { default: TipJar } = await import("@/components/TipJar");
    const { default: StackedHero } = await import("@/components/StackedHero");
    const el = await Page();
    expect(findAll(el, (e) => e.type === TipJar)).toHaveLength(0);
    const heroes = findAll(el, (e) => e.type === StackedHero);
    expect(heroes).toHaveLength(1);
    expect((heroes[0].props as { kicker?: string }).kicker).toBe("Gifts of Gratitude");
    // the quiet way back points at the store drawer, so it gates with the jar
    expect(renderToStatic(el)).not.toContain("/store#gifts");
  });

  it("rail live + the jar item live: TipJar mounts with only=[payforward]", async () => {
    configureBtcpay();
    await seedCatalog("live");
    const Page = (await import("@/app/pay-it-forward/page")).default;
    const { default: TipJar } = await import("@/components/TipJar");
    const el = await Page();
    const jars = findAll(el, (e) => e.type === TipJar);
    expect(jars).toHaveLength(1);
    expect((jars[0].props as { only?: string[] }).only).toEqual(["payforward"]);
    clearBtcpay();
  });

  it("rail live but the jar item hidden: derive-or-dash, no TipJar", async () => {
    configureBtcpay();
    await seedCatalog("hidden");
    const Page = (await import("@/app/pay-it-forward/page")).default;
    const { default: TipJar } = await import("@/components/TipJar");
    const el = await Page();
    expect(findAll(el, (e) => e.type === TipJar)).toHaveLength(0);
    clearBtcpay();
  });
});

/* the page's element tree, flattened to its string leaves — enough to pin
   the /store#gifts link's absence without rendering the client chrome */
function renderToStatic(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(renderToStatic).join("");
  if (typeof node === "object" && "props" in (node as ReactElement)) {
    const el = node as ReactElement;
    const props = el.props as Record<string, unknown>;
    return `${typeof props.href === "string" ? props.href : ""}${renderToStatic(props.children as ReactNode)}`;
  }
  return "";
}
