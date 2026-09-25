import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { StoreItem } from "@/lib/store";
import { getItem } from "@/lib/store";
import { clockWords, sameDayAt, ENCORE_TIME, QA_TIME, QA_ITEM_ID } from "@/lib/reading-day";
import ReadingDayBody, { type ReadingDayBodyProps } from "@/components/reading/ReadingDayBody";
import { tierSatisfies, TIERS, type Tier } from "@/lib/entitlement";
import { TIER_PAGES } from "@/lib/tiers-content";
import { tierForSubject } from "@/lib/member-tier";

/**
 * TASK-467 (block 968,561) — THE READING DAY BRICK. Love, the call
 * (walk-968482/walk.txt, 42:41–45:03): "just put this whole room brick
 * right in the other on the weekly reading page … with three buttons of
 * the times … the reading, then the second stage, then the q&a."
 *
 * Same split every other lane on this page keeps: `reading-day.ts`'s pure
 * helpers are pinned directly; `reading-day-doors.ts`'s async derivations
 * are exercised with `@/lib/store`'s `getItem` as the one mocked boundary
 * (tests/stage2-access.test.ts's own convention); `ReadingDayBody` (pure
 * presentation, props only) is rendered through `renderToStaticMarkup`
 * for every honest state (this repo runs no jsdom); `ReadingDay.tsx` (the
 * async server wrapper) gets ONE behavioral test proving the fail-closed
 * law, mocking only the session and the tier lookup — everything else
 * (site-config, the schedule, the store) runs real and falls back to its
 * own honest defaults, the same as `/reading` itself does in every other
 * suite. `src/app/reading/page.tsx`'s own source is pinned last: one
 * import, one mount, nothing else touched.
 */

vi.mock("@/lib/store", () => ({ getItem: vi.fn() }));
const mockGetItem = vi.mocked(getItem);

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const TZ = "America/Denver";
// Wednesday 1:11 PM MDT — the same measured instant reading-schedule.test.ts
// and reading-page.test.ts already use.
const READING_MS = Date.parse("2026-09-23T19:11:00.000Z");
const ENCORE_MS = Date.parse("2026-09-23T20:22:00.000Z"); // 2:22 PM MDT, same day
const QA_MS = Date.parse("2026-09-23T21:33:00.000Z"); // 3:33 PM MDT, same day

function item(over: Partial<StoreItem>): StoreItem {
  return {
    id: "fixture",
    schemaVersion: 2,
    title: "Fixture",
    blurb: "fixture",
    images: [],
    kind: "package",
    price: { fiat: { amount: 0, currency: "USD" } },
    fulfillment: "package",
    status: "live",
    ...over,
  };
}

beforeEach(() => {
  mockGetItem.mockReset();
  mockGetItem.mockResolvedValue(null);
});

describe("reading-day.ts — the ONE place the two clock times and the item id live", () => {
  it("clockWords: '1:11 PM MDT', computed, not a literal", () => {
    expect(clockWords(READING_MS, TZ)).toBe("1:11 PM MDT");
  });

  it("sameDayAt: the Encore (2:22 PM) and the Q&A (3:33 PM) land on the reading's OWN civil day", () => {
    expect(sameDayAt(READING_MS, TZ, ENCORE_TIME)).toBe(ENCORE_MS);
    expect(sameDayAt(READING_MS, TZ, QA_TIME)).toBe(QA_MS);
    expect(clockWords(ENCORE_MS, TZ)).toBe("2:22 PM MDT");
    expect(clockWords(QA_MS, TZ)).toBe("3:33 PM MDT");
  });

  it("the exported constants are the two HH:MM strings and the pass's item id", () => {
    expect(ENCORE_TIME).toBe("14:22");
    expect(QA_TIME).toBe("15:33");
    expect(QA_ITEM_ID).toBe("q-a-meetup-with-love");
  });
});

describe("reading-day-doors.ts — encoreFloorDoor: name/href via stage2PackageDoor, price from the live item", () => {
  it("the floor package's own live monthly price, sale-aware, never a literal tier name", async () => {
    const { STAGE2_MIN_TIER } = await import("@/lib/stage2-access");
    const floorPage = TIER_PAGES.find((p) => p.tier === STAGE2_MIN_TIER)!;
    mockGetItem.mockImplementation(async (id: string) => {
      if (id === floorPage.slug) return item({ id: floorPage.slug, price: { fiat: { amount: 3300, currency: "USD" } } });
      return null; // the one-week addon stage2PackageDoor also reads — absent here, honestly
    });
    const { encoreFloorDoor } = await import("@/lib/reading-day-doors");
    const door = await encoreFloorDoor();
    expect(door.tier).toBe(STAGE2_MIN_TIER);
    expect(door.name).toBe(TIERS[STAGE2_MIN_TIER].name);
    expect(door.itemId).toBe(floorPage.slug);
    expect(door.href).toBe(`/packages/${floorPage.slug}`);
    expect(door.price).toBe("$33");
  });

  it("a sale price wins over list, exactly like stage2PackageDoor's own law", async () => {
    const { STAGE2_MIN_TIER } = await import("@/lib/stage2-access");
    const floorPage = TIER_PAGES.find((p) => p.tier === STAGE2_MIN_TIER)!;
    mockGetItem.mockImplementation(async (id: string) => {
      if (id === floorPage.slug) {
        return item({
          id: floorPage.slug,
          price: { fiat: { amount: 3300, currency: "USD" } },
          sale: { fiat: { amount: 2200, currency: "USD" } },
        });
      }
      return null;
    });
    const { encoreFloorDoor } = await import("@/lib/reading-day-doors");
    const door = await encoreFloorDoor();
    expect(door.price).toBe("$22");
  });

  it("not live, missing, or a thrown read: price is null — never a dash, the row just omits the line", async () => {
    const { encoreFloorDoor } = await import("@/lib/reading-day-doors");

    mockGetItem.mockResolvedValue(null);
    expect((await encoreFloorDoor()).price).toBeNull();

    mockGetItem.mockRejectedValue(new Error("catalog down"));
    expect((await encoreFloorDoor()).price).toBeNull();
  });
});

describe("reading-day-doors.ts — qaDoor: the pass when live, Evening Star when it isn't (the Admiral's fallback ruling)", () => {
  it("the pass IS live: passLive true, its own item id and price, plus Evening Star's own live price for the quiet line", async () => {
    mockGetItem.mockImplementation(async (id: string) => {
      if (id === QA_ITEM_ID) return item({ id, price: { fiat: { amount: 3333, currency: "USD" } } });
      if (id === "evening-star") return item({ id, price: { fiat: { amount: 11100, currency: "USD" } } });
      return null;
    });
    const { qaDoor } = await import("@/lib/reading-day-doors");
    const door = await qaDoor();
    expect(door.passLive).toBe(true);
    expect(door.itemId).toBe(QA_ITEM_ID);
    expect(door.price).toBe("$33.33");
    expect(door.eveningStar).toEqual({ name: "Evening Star", price: "$111", href: "/packages/evening-star" });
  });

  it("the pass is HIDDEN: falls back to adding Evening Star itself — passLive false, itemId is Evening Star's own, price is Evening Star's own live price", async () => {
    mockGetItem.mockImplementation(async (id: string) => {
      if (id === QA_ITEM_ID) return item({ id, status: "hidden", price: { fiat: { amount: 3333, currency: "USD" } } });
      if (id === "evening-star") return item({ id, price: { fiat: { amount: 11100, currency: "USD" } } });
      return null;
    });
    const { qaDoor } = await import("@/lib/reading-day-doors");
    const door = await qaDoor();
    expect(door.passLive).toBe(false);
    expect(door.itemId).toBe("evening-star");
    expect(door.price).toBe("$111");
  });

  it("a thrown read on the pass falls back the exact same way, never crashes", async () => {
    mockGetItem.mockImplementation(async (id: string) => {
      if (id === QA_ITEM_ID) throw new Error("catalog down");
      if (id === "evening-star") return item({ id, price: { fiat: { amount: 11100, currency: "USD" } } });
      return null;
    });
    const { qaDoor } = await import("@/lib/reading-day-doors");
    const door = await qaDoor();
    expect(door.passLive).toBe(false);
    expect(door.itemId).toBe("evening-star");
    expect(door.price).toBe("$111");
  });

  it("neither item live: both prices null, never a dash", async () => {
    mockGetItem.mockResolvedValue(null);
    const { qaDoor } = await import("@/lib/reading-day-doors");
    const door = await qaDoor();
    expect(door.passLive).toBe(false);
    expect(door.price).toBeNull();
    expect(door.eveningStar.price).toBeNull();
  });
});

/* ── ReadingDayBody — pure presentation, every honest state ──────────── */

const ENCORE_FLOOR = { tier: "A" as Tier, name: "Weekly Intuitive", itemId: "weekly-intuitive", href: "/packages/weekly-intuitive", price: "$33" };
const QA_OFFER_LIVE = { itemId: QA_ITEM_ID, passLive: true, price: "$33.33", eveningStar: { name: "Evening Star", price: "$111", href: "/packages/evening-star" } };

function bodyProps(overrides: Partial<ReadingDayBodyProps>): ReadingDayBodyProps {
  return {
    tz: TZ,
    readingStartsAtMs: READING_MS,
    encoreStartsAtMs: ENCORE_MS,
    qaStartsAtMs: QA_MS,
    signedIn: false,
    encoreEntitled: false,
    encoreFloor: ENCORE_FLOOR,
    qaEntitled: false,
    qaRoomHref: "/rooms/inner-sanctum",
    qaOffer: QA_OFFER_LIVE,
    ...overrides,
  };
}

function render(p: ReadingDayBodyProps): string {
  return renderToStaticMarkup(createElement(ReadingDayBody, p));
}

describe("ReadingDayBody — the three rows carry their own computed times and names", () => {
  it("every row's clock words and heading are present", () => {
    const html = render(bodyProps({}));
    expect(html).toContain(clockWords(READING_MS, TZ));
    expect(html).toContain(clockWords(ENCORE_MS, TZ));
    expect(html).toContain(clockWords(QA_MS, TZ));
    expect(html).toContain("The Reading");
    expect(html).toContain("The Encore in the Playground");
    expect(html).toContain("The Q&amp;A with Love");
  });
});

type Case = { label: string; signedIn: boolean; tier: Tier | null };
const CASES: Case[] = [
  { label: "signed out", signedIn: false, tier: null },
  { label: "free member (signed in, no package)", signedIn: true, tier: null },
  { label: "tier A", signedIn: true, tier: "A" },
  { label: "tier B", signedIn: true, tier: "B" },
  { label: "tier C", signedIn: true, tier: "C" },
];

describe("ReadingDayBody — signed out / free member / tier A / B / C each get the right open or locked buttons", () => {
  for (const c of CASES) {
    it(`${c.label}`, async () => {
      const { STAGE2_MIN_TIER } = await import("@/lib/stage2-access");
      const encoreEntitled = tierSatisfies(c.tier, STAGE2_MIN_TIER);
      const qaEntitled = tierSatisfies(c.tier, "C");
      const html = render(bodyProps({ signedIn: c.signedIn, encoreEntitled, qaEntitled }));

      if (c.signedIn) {
        expect(html).toContain("Go to the Heart Field"); // the stage card's own words for the same door (Lumen, 968,561)
        expect(html).not.toContain("Sign me up");
      } else {
        expect(html).toContain("Sign me up");
        expect(html).toContain('href="#sign-up"');
      }

      if (encoreEntitled) {
        expect(html).toContain("Join the Playground");
        expect(html).not.toContain("</svg>Unlock the Encore<");
      } else {
        expect(html).toContain("</svg>Unlock the Encore<"); // the visible label, right after the lock glyph
        expect(html).toContain(`aria-label="Unlock the Encore with ${ENCORE_FLOOR.name}"`); // the fuller words, for a screen reader
        expect(html).toContain(`Comes with ${ENCORE_FLOOR.name} and up.`); // and in PLAIN sighted text, right above
        expect(html).not.toContain("Join the Playground");
      }

      if (qaEntitled) {
        expect(html).toContain("Join the Q&amp;A");
        expect(html).not.toContain("Unlock the Q&amp;A");
      } else {
        expect(html).toContain("Unlock the Q&amp;A");
        expect(html).not.toContain("Join the Q&amp;A");
      }
    });
  }
});

describe("ReadingDayBody — a locked row names who it's for even when the store gives no price (Number One's review)", () => {
  it("no prices at all: the Encore row still says its tier, the Q&A row still names Evening Star", () => {
    const html = render(
      bodyProps({
        encoreEntitled: false,
        qaEntitled: false,
        encoreFloor: { ...ENCORE_FLOOR, price: null },
        qaOffer: { ...QA_OFFER_LIVE, passLive: false, price: null, eveningStar: { ...QA_OFFER_LIVE.eveningStar, price: null } },
      }),
    );
    expect(html).toContain(`Comes with ${ENCORE_FLOOR.name} and up.</em>`);
    expect(html).toMatch(/Comes with <a href="\/packages\/evening-star">Evening Star<\/a>\.<\/em>/);
    expect(html).not.toContain("a month");
    expect(html).not.toContain("—");
  });

  it("both unlock labels name their part, the same shape", () => {
    const html = render(bodyProps({ encoreEntitled: false, qaEntitled: false }));
    expect(html).toContain("</svg>Unlock the Encore<");
    expect(html).toContain("</svg>Unlock the Q&amp;A<");
  });
});

describe("ReadingDayBody — the lock icon is aria-hidden, decorative only; the words say who it's for", () => {
  it("both locked rows carry the lock svg, aria-hidden, and the meaning in plain words (the row's own line, or the button's own label)", () => {
    const html = render(bodyProps({ encoreEntitled: false, qaEntitled: false }));
    const locks = html.match(/class="kit-lock-icon"/g) ?? [];
    expect(locks.length).toBe(2);
    expect(html).toContain('aria-hidden="true"');
    // the Encore's label names the part ("Unlock the Encore", matching
    // "Unlock the Q&A"); the tier's name lives in the row's own quiet line
    // (button text never wraps, R-071; "Unlock with {name}" measured wider
    // than the card, see the register)
    expect(html).toContain("</svg>Unlock the Encore<");
    expect(html).toContain(`Comes with ${ENCORE_FLOOR.name} and up.`);
    // the Q&A's own label carries the full meaning right in its own words
    expect(html).toContain("Unlock the Q&amp;A");
  });

  it("an entitled row carries no lock icon", () => {
    const html = render(bodyProps({ encoreEntitled: true, qaEntitled: true, signedIn: true }));
    expect(html).not.toContain("kit-lock-icon");
  });
});

describe("ReadingDayBody — no em dash, in any rendered state", () => {
  const STATES: ReadingDayBodyProps[] = [
    bodyProps({}),
    bodyProps({ signedIn: true }),
    bodyProps({ encoreEntitled: true }),
    bodyProps({ qaEntitled: true, signedIn: true }),
    bodyProps({ encoreFloor: { ...ENCORE_FLOOR, price: null } }),
    bodyProps({ qaOffer: { ...QA_OFFER_LIVE, price: null, eveningStar: { ...QA_OFFER_LIVE.eveningStar, price: null } } }),
    bodyProps({ qaOffer: { itemId: "evening-star", passLive: false, price: "$111", eveningStar: { name: "Evening Star", price: "$111", href: "/packages/evening-star" } } }),
    bodyProps({ qaOffer: { itemId: "evening-star", passLive: false, price: null, eveningStar: { name: "Evening Star", price: null, href: "/packages/evening-star" } } }),
    bodyProps({ encoreEntitled: true, qaEntitled: true, signedIn: true }),
  ];
  for (const [i, p] of STATES.entries()) {
    it(`state ${i}`, () => {
      const html = render(p);
      expect(html).not.toContain("—");
      expect(html).not.toContain("–");
    });
  }
});

describe("ReadingDayBody — one button size on the whole card", () => {
  it("every kit-btn on the card wears kit-btn-sm, in every state", async () => {
    const { STAGE2_MIN_TIER } = await import("@/lib/stage2-access");
    for (const c of CASES) {
      const html = render(
        bodyProps({
          signedIn: c.signedIn,
          encoreEntitled: tierSatisfies(c.tier, STAGE2_MIN_TIER),
          qaEntitled: tierSatisfies(c.tier, "C"),
        }),
      );
      const classes = [...html.matchAll(/class="([^"]*\bkit-btn\b[^"]*)"/g)].map((m) => m[1]);
      expect(classes.length).toBeGreaterThan(0);
      for (const cls of classes) expect(cls).toContain("kit-btn-sm");
    }
  });
});

describe("ReadingDayBody — no arrow, no emoji, anywhere on the card", () => {
  it("plain words only, in every state", () => {
    for (const p of [bodyProps({}), bodyProps({ encoreEntitled: true, qaEntitled: true, signedIn: true })]) {
      const html = render(p);
      expect(html).not.toMatch(/[←-⇿⬀-⯿]/); // arrows
      expect(html).not.toMatch(/[\u{1F000}-\u{1FFFF}]/u); // emoji blocks
      expect(html).not.toMatch(/[☀-➿]/); // misc symbols/dingbats (emoji-adjacent)
    }
  });
});

/* ── ReadingDay.tsx — the async server wrapper: fail-closed on a throw ── */

vi.mock("@/lib/member-tier", () => ({ tierForSubject: vi.fn() }));
const mockTier = vi.mocked(tierForSubject);

const authState = vi.hoisted(() => ({ signedIn: true }));
vi.mock("@/lib/member-auth", () => ({
  sessionsFromCookieHeader: () =>
    authState.signedIn ? [{ token: "fixture-token", handle: "readingday-tester", space: "onecocreation" }] : [],
}));
vi.mock("next/headers", () => ({ headers: async () => ({ get: () => null }) }));

describe("ReadingDay — fail-closed: a thrown tier lookup locks BOTH the Encore and the Q&A rows", () => {
  const prevEnv = { ...process.env };

  beforeEach(() => {
    mockTier.mockReset();
    mockGetItem.mockReset();
    mockGetItem.mockResolvedValue(null);
    // the same defensive clear packages-cards-level.test.ts uses, so
    // getSiteConfig()/getItem() both fall back to their own honest
    // defaults regardless of what another test in this run left behind
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.REDIS_URL;
  });

  afterEach(() => {
    process.env = { ...prevEnv };
  });

  it("control: a resolved tier THREADS through (tier C opens both rows) — proves the pipe actually carries the tier", async () => {
    authState.signedIn = true;
    mockTier.mockResolvedValue("C");
    const ReadingDay = (await import("@/components/reading/ReadingDay")).default;
    const el = await ReadingDay();
    expect(el).not.toBeNull();
    const props = el!.props as { encoreEntitled: boolean; qaEntitled: boolean; signedIn: boolean };
    expect(props.signedIn).toBe(true);
    expect(props.encoreEntitled).toBe(true);
    expect(props.qaEntitled).toBe(true);
  });

  it("a thrown tier lookup reads as no standing at all — both rows lock, never open on a guess", async () => {
    authState.signedIn = true;
    mockTier.mockRejectedValue(new Error("registry vault down"));
    const ReadingDay = (await import("@/components/reading/ReadingDay")).default;
    const el = await ReadingDay();
    expect(el).not.toBeNull();
    const props = el!.props as { encoreEntitled: boolean; qaEntitled: boolean };
    expect(props.encoreEntitled).toBe(false);
    expect(props.qaEntitled).toBe(false);
  });

  it("signed out: tierForSubject is never even called, and both rows lock", async () => {
    authState.signedIn = false;
    const ReadingDay = (await import("@/components/reading/ReadingDay")).default;
    const el = await ReadingDay();
    expect(el).not.toBeNull();
    const props = el!.props as { encoreEntitled: boolean; qaEntitled: boolean; signedIn: boolean };
    expect(props.signedIn).toBe(false);
    expect(props.encoreEntitled).toBe(false);
    expect(props.qaEntitled).toBe(false);
    expect(mockTier).not.toHaveBeenCalled();
  });
});

/* ── src/app/reading/page.tsx — the page gains only the mount ────────── */

const PAGE_PATH = "src/app/reading/page.tsx";

describe("the page source gains only the mount (one import, one bare <ReadingDay />)", () => {
  it("exactly one import of ReadingDay, exactly one <ReadingDay /> mount, no props", async () => {
    const src = await read(PAGE_PATH);
    expect(src.match(/from "@\/components\/reading\/ReadingDay"/g)?.length).toBe(1);
    expect(src).toContain('import ReadingDay from "@/components/reading/ReadingDay"');
    const mounts = [...src.matchAll(/<ReadingDay(\s*\/>|\s[^>]*\/>)/g)];
    expect(mounts.length).toBe(1);
    expect(mounts[0][0]).toBe("<ReadingDay />"); // no props threaded from the page
  });

  it("sits right before the WHAT YOU WILL EXPERIENCE section, right after the sign-up section", async () => {
    const src = await read(PAGE_PATH);
    // TASK-468 replaced the old <ReadingSignUp variant="public"> with the one box
    const signUp = src.indexOf("<ReadingSignInBox");
    const mount = src.indexOf("<ReadingDay");
    const experience = src.indexOf("WHAT YOU WILL EXPERIENCE");
    expect(signUp).toBeGreaterThan(-1);
    expect(mount).toBeGreaterThan(signUp);
    expect(experience).toBeGreaterThan(mount);
  });

  it("still carries no payment word and no TIERS import — the law this page's own house test pins", async () => {
    const src = await read(PAGE_PATH);
    // TASK-466 gave the page ONE sanctioned tier read (the Playground lock,
    // pinned in tests/reading-page.test.ts); this lane adds none of its own
    expect(src.match(/tierForSubject\(/g)?.length ?? 0).toBe(1);
    expect(src).not.toMatch(/\bpayment\b/i);
    expect(src).not.toMatch(/\bTIERS\b/);
  });
});

/* ── item ids and times come only from reading-day.ts ─────────────────── */

const OTHER_SOURCE_FILES = [
  "src/lib/reading-day-doors.ts",
  "src/components/reading/ReadingDay.tsx",
  "src/components/reading/ReadingDayBody.tsx",
  "src/components/reading/ReadingDayUnlockButton.tsx",
  PAGE_PATH,
];

describe("item ids and clock times come only from reading-day.ts", () => {
  it("reading-day.ts carries the Q&A item id and the two HH:MM literals", async () => {
    const src = await read("src/lib/reading-day.ts");
    expect(src).toContain('"q-a-meetup-with-love"');
    expect(src).toContain('"14:22"');
    expect(src).toContain('"15:33"');
  });

  it("no other lane file repeats those literals — every consumer imports the constant", async () => {
    for (const rel of OTHER_SOURCE_FILES) {
      const src = await read(rel);
      expect(src).not.toContain("q-a-meetup-with-love");
      expect(src).not.toContain('"14:22"');
      expect(src).not.toContain('"15:33"');
    }
  });
});
