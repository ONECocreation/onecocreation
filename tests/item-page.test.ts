import { describe, it, expect, vi, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { relatedItems } from "@/components/store/RelatedItems";
import { gatedLine, scalePrice } from "@/components/store/BuyPanel";
import { readSession } from "@/lib/session-read";
import { struckLine } from "@/app/store/[id]/page";
import type { StoreItem } from "@/lib/store";

/**
 * TASK-177 (0018.06.18 a₿, block 966,098) — the item page wears the
 * ShinePages product layout (recon 03/04: two columns ≥900px, breadcrumb,
 * struck sale price, "Related" as a row of three) and the BuyPanel knows
 * you are signed in (the header's own /api/frens/session read, wrapped in
 * lib/session-read.ts — no shared helper module existed; FrenBadge carries
 * the same two fetches inline and is outside this lane's OWNS).
 *
 * Pins:
 *  1. the two-column wrapper class + the ≥900px collapse law live where the
 *     house keeps them (read-the-source, the sessions-style.test.ts pattern
 *     — these are async server components, never rendered in node);
 *  2. the breadcrumb: Home / Store / <section>, section derived from kind;
 *  3. relatedItems: same kind, LIVE only (the hidden-item law from packages
 *     — never a hidden item), never the item itself, at most three;
 *  4. gatedLine: T-173's guest words VERBATIM, the signed-in words naming
 *     the account; the email field is gone for a member;
 *  5. readSession: the fixture session — frens-space handle, email member's
 *     known-by name, signed out → null;
 *  6. scalePrice: the qty door carries the LINE total, never a unit price.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

function item(over: Partial<StoreItem>): StoreItem {
  return {
    id: "x",
    schemaVersion: 2,
    title: "X",
    blurb: "words",
    images: [],
    kind: "digital",
    price: { sats: 11111, fiat: { amount: 1100, currency: "USD" } },
    fulfillment: "digital",
    status: "live",
    ...over,
  };
}

describe("the ShinePages product layout — the two-column wrapper and the night ground", () => {
  it("the page rides .product-cols inside the keep-dark night veil", async () => {
    const src = await read("src/app/store/[id]/page.tsx");
    expect(src.includes('className="product-cols"')).toBe(true);
    expect(src.includes("keep-dark item-veil")).toBe(true);
  });

  it("house.css carries the ≥900px two-column law — one column on the phone, picture first", async () => {
    const house = await read("src/app/house.css");
    expect(house.includes(".product-cols{display:grid")).toBe(true);
    expect(house.match(/@media\(min-width:900px\)\{\.product-cols\{grid-template-columns:/)).toBeTruthy();
    expect(house.includes(".item-veil::before")).toBe(true);
  });

  it("no page-local font faces on the reshaped surfaces — the house trio carries every word, NO serifs", async () => {
    for (const rel of ["src/app/store/[id]/page.tsx", "src/components/store/RelatedItems.tsx"]) {
      const src = await read(rel);
      expect(src.includes("fontFamily"), `${rel} sets its own font-family`).toBe(false);
      expect(src.match(/serif/i), `${rel} mentions a serif`).toBeNull();
    }
  });
});

describe("the breadcrumb — Home / Store / <section>", () => {
  it("the page carries the crumb trail with the section derived from the item's kind", async () => {
    const src = await read("src/app/store/[id]/page.tsx");
    expect(src.includes('aria-label="breadcrumb"')).toBe(true);
    expect(src.includes('href="/"')).toBe(true);
    expect(src.includes('href="/store"')).toBe(true);
    // every shelf-section kind maps to its crumb (store/page.tsx's GROUPS)
    for (const kind of ["digital", "package", "self", "fourthwall", "service"]) {
      expect(src.includes(`${kind}:`), `breadcrumb lost the ${kind} section`).toBe(true);
    }
  });
});

describe("relatedItems — same kind, live only, never itself, at most three", () => {
  const current = item({ id: "me", kind: "digital" });

  it("excludes hidden items (the packages law), soldout items, and the item itself", () => {
    const all = [
      current,
      item({ id: "hidden-one", status: "hidden" }),
      item({ id: "gone", status: "soldout" }),
      item({ id: "a" }),
      item({ id: "b" }),
    ];
    expect(relatedItems(all, current).map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("only the SAME kind relates — a ware never rides a meditation's page", () => {
    const all = [
      item({ id: "ware", kind: "self", fulfillment: "self" }),
      item({ id: "kin" }),
    ];
    expect(relatedItems(all, current).map((i) => i.id)).toEqual(["kin"]);
  });

  it("caps at three (the template's row of three cards)", () => {
    const all = ["a", "b", "c", "d", "e"].map((id) => item({ id }));
    expect(relatedItems(all, current).map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("no relatives → an empty set (the page renders no row, never an empty shelf)", () => {
    expect(relatedItems([current], current)).toEqual([]);
  });
});

describe("gatedLine — the panel knows you are signed in", () => {
  it("a guest hears TASK-173's basket-rule words, VERBATIM", () => {
    expect(gatedLine(null)).toBe(
      "your download opens on the receipt page, and a receipt letter brings the door too — sign in, or your email below becomes your account, and it’s yours the moment payment settles.",
    );
  });

  it("signed in: the line names the account — no email ask, no second ceremony", () => {
    expect(gatedLine("firefly")).toBe(
      "yours on this account · firefly · the moment payment settles",
    );
  });

  it("the email field is withheld from a member (the account is already known)", async () => {
    const src = await read("src/components/store/BuyPanel.tsx");
    expect(src.includes("{!memberName && (")).toBe(true);
    expect(src.includes("readSession")).toBe(true);
  });
});

describe("readSession — the header's own session read, as one helper", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("a frens-space member is known by their handle", async () => {
    vi.stubGlobal("fetch", async (url: unknown) => {
      if (String(url) === "/api/frens/session") {
        return new Response(JSON.stringify({ ok: true, handle: "adminpacman", space: "frens" }), { status: 200 });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    const s = await readSession();
    expect(s).toEqual({ handle: "adminpacman", space: "frens", name: "adminpacman" });
  });

  it("an email member's known-by name wins (displayName || accountName), never the mailbox", async () => {
    vi.stubGlobal("fetch", async (url: unknown) => {
      if (String(url) === "/api/frens/session") {
        return new Response(JSON.stringify({ ok: true, handle: "firefly@example.com", space: "email" }), { status: 200 });
      }
      if (String(url) === "/api/member/profile") {
        return new Response(JSON.stringify({ ok: true, displayName: "firefly" }), { status: 200 });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    const s = await readSession();
    expect(s?.name).toBe("firefly");
  });

  it("an email member without a claimed name falls back to the mailbox prefix", async () => {
    vi.stubGlobal("fetch", async (url: unknown) => {
      if (String(url) === "/api/frens/session") {
        return new Response(JSON.stringify({ ok: true, handle: "guest@example.com", space: "email" }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: false }), { status: 404 });
    });
    const s = await readSession();
    expect(s?.name).toBe("guest");
  });

  it("signed out (or the read failing) → null — the guest words stand", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ ok: false }), { status: 401 }));
    expect(await readSession()).toBeNull();
    vi.stubGlobal("fetch", async () => { throw new Error("offline"); });
    expect(await readSession()).toBeNull();
  });
});

describe("struckLine — the sale strikes the regular price through, in words", () => {
  const BOTH = { btc: true, card: true };

  it("a sale stands → the REGULAR price's words, ready to strike", () => {
    expect(struckLine(item({ price: { fiat: { amount: 2500, currency: "USD" } }, sale: { fiat: { amount: 2000, currency: "USD" } } }), BOTH, "fiat"))
      .toBe("$25");
  });

  it("no sale → null — nothing strikes (derive-or-dash)", () => {
    expect(struckLine(item({}), BOTH, "fiat")).toBeNull();
  });

  it("the struck words follow the live rails too (bitcoin off → dollars)", () => {
    expect(struckLine(
      item({ price: { sats: 21000, fiat: { amount: 2500, currency: "USD" } }, sale: { sats: 11111 } }),
      { btc: false, card: true },
      "sats",
    )).toBe("$25");
  });

  it("TASK-186 — the struck words follow the visitor's preference too (sats word → sats struck)", () => {
    expect(struckLine(
      item({ price: { sats: 21000, fiat: { amount: 2500, currency: "USD" } }, sale: { sats: 11111 } }),
      BOTH,
      "sats",
    )).toBe("21,000 sats");
  });
});

describe("scalePrice — the quantity door carries the line total", () => {
  const unit = { sats: 1000, fiat: { amount: 2200, currency: "USD" } };

  it("qty 1 is the unit price itself", () => {
    expect(scalePrice(unit, 1)).toBe(unit);
  });

  it("qty 3 multiplies BOTH denominations — sats and fiat minor units", () => {
    expect(scalePrice(unit, 3)).toEqual({ sats: 3000, fiat: { amount: 6600, currency: "USD" } });
  });

  it("a denomination the item doesn't carry stays absent — never an invented rate", () => {
    expect(scalePrice({ sats: 1000 }, 4)).toEqual({ sats: 4000, fiat: undefined });
  });
});
