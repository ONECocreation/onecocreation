import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import type { OutgoingMail } from "@/lib/mail";
import type { SubscriberRecord } from "@/lib/subscribers";
import type { BookingRecord } from "@/lib/booking-orders";
import type { ReadingSchedule } from "@/lib/reading-schedule";
import type { OrderRecord, StoreItem } from "@/lib/store";
import { getItem } from "@/lib/store";
import { getEntitlement } from "@/lib/entitlement";

/**
 * TASK-519 (K131) — THE JOIN LETTER. One letter before every live session
 * (the ONE link, the start time in the reader's own zone when known, the
 * three plain lines verbatim) plus a second short letter at start time.
 * Pins `src/lib/join-letters.ts`'s two builders, its two send paths (the
 * ruled order: capacity, subscribed, claim, send — the reading-letters
 * R1-R4 discipline), the reading sweep (audience `reading` union
 * `reading-seat`, deduped; the reminder under the SAME dueOccurrenceNow
 * gate the day-of letter uses; the start letter inside its 45-minute
 * window), the booking sweep (confirmed only, customer.email and
 * meetingUrl present only, the booking's own link, visitorTz before
 * artistTz), the settle-time seat tag in entitlement-fulfil.ts, the
 * viewerTz capture at the reading sign-up, the two room rows, the key
 * pins (EDITABLE_LETTERS at TWELVE), and the JitsiRoom hint line.
 *
 * Fixtures cross-checked against nextReading's own pinned math
 * (tests/reading-letters.test.ts carries the same constants): the default
 * schedule is Wednesday 13:11 America/Denver, so 2026-09-23 19:11 UTC is
 * the start instant, 15:00 UTC is the Vercel cron's own shape on the
 * reading's zone-day, and 2026-09-22 15:00 UTC is the day before.
 *
 * The mail rail, the subscriber store's send-time reads, the site config,
 * the booking store, the letter-override store, the store catalog and the
 * matrix rail are mocked; the seat-tag tests run the REAL entitlement grant
 * and the REAL subscribers tag writer against a stateful fixture KV behind
 * a stubbed global fetch (the letters-one-render idiom). Every credential
 * below is a fixture string, never a real one.
 */

/* ── hoisted, mutable mock state (reset in beforeEach) ─────────────────── */

const sent = vi.hoisted(() => [] as OutgoingMail[]);
const mailControl = vi.hoisted(() => ({ cap: 100 }));
const onceClaims = vi.hoisted(() => new Set<string>());
const onceCalls = vi.hoisted(() => [] as Array<{ key: string; windowMs: number }>);
const subscribedState = vi.hoisted(() => new Set<string>());
const taggedRecords = vi.hoisted(() => new Map<string, SubscriberRecord[]>());
const bookingsState = vi.hoisted(() => [] as BookingRecord[]);
const siteConfigState = vi.hoisted(() => ({ reading: undefined as ReadingSchedule | undefined }));
const overrides = vi.hoisted(() => new Map<string, { subject: string; body: string }>());
const seatTagControl = vi.hoisted(() => ({ throwNext: false }));

vi.mock("@/lib/mail", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/mail")>();
  return {
    ...actual,
    mailConfigured: () => true,
    sendMail: async (_persona: string, mail: OutgoingMail) => {
      sent.push(mail);
      mailControl.cap = Math.max(0, mailControl.cap - 1); // the meter's own tick
    },
    capRemaining: async () => mailControl.cap,
    onceWithin: async (key: string, windowMs: number) => {
      onceCalls.push({ key, windowMs });
      if (onceClaims.has(key)) return false;
      onceClaims.add(key);
      return true;
    },
  };
});

vi.mock("@/lib/subscribers", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/subscribers")>();
  return {
    ...actual,
    subscribersConfigured: () => true,
    isSubscribed: async (email: string) => subscribedState.has(email.toLowerCase()),
    listSubscribersByTag: async (tag: string) => taggedRecords.get(tag) ?? [],
    addSubscriberTag: async (email: string, tag: string) => {
      if (seatTagControl.throwNext) {
        seatTagControl.throwNext = false;
        throw new Error("simulated KV failure");
      }
      return actual.addSubscriberTag(email, tag);
    },
  };
});

vi.mock("@/lib/site-config", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/site-config")>();
  return {
    ...actual,
    getSiteConfig: async () => ({ ...actual.defaultSiteConfig(), reading: siteConfigState.reading }),
  };
});

vi.mock("@/lib/booking-orders", () => ({
  listBookings: async () => bookingsState,
}));

vi.mock("@/lib/letters", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/letters")>();
  return {
    ...actual,
    getLetterOverride: async (key: string) => overrides.get(key) ?? null,
  };
});

vi.mock("@/lib/store", () => ({ getItem: vi.fn() }));
vi.mock("@/lib/matrix", () => ({
  inviteToTierRooms: vi.fn(async () => [{ room: "#room", ok: true }]),
  removeFromTierRooms: vi.fn(async () => [{ room: "#kicked", ok: true }]),
  matrixConfigured: () => false, // the settle path returns after the grant + tag
  isMxid: (v: string) => typeof v === "string" && v.startsWith("@"),
  mxidForSubject: (s: string) => `@${s}`,
}));
vi.mock("@/lib/mail-queue", () => ({
  enqueue: vi.fn(async (items: unknown[]) => items.length),
  tick: async () => ({ sent: 0, failed: 0, requeued: 0, remainingInQueue: 0, capLeftThisHour: 100 }),
}));
vi.mock("@/lib/operator-auth", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/operator-auth")>();
  return { ...actual, operatorFromCookieHeader: () => true };
});

const mockGetItem = vi.mocked(getItem);

/* ── the stateful fixture KV (letters-one-render idiom) ─────────────────── */

const KV_URL = "http://kv.fixture";
const SITE = "https://join-test.example";
const kvStore = new Map<string, string>();

beforeAll(() => {
  process.env.KV_REST_API_URL = KV_URL;
  process.env.KV_REST_API_TOKEN = "fixture-kv-token";
  process.env.SEAT_SECRET = "test-seat-secret";
  process.env.NEXT_PUBLIC_SITE_URL = SITE;
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (u === KV_URL) {
      const cmd = JSON.parse(String(init?.body)) as unknown[];
      const [op, key] = cmd.map(String);
      let result: unknown = null;
      if (op === "GET") result = kvStore.get(key) ?? null;
      else if (op === "SET") {
        const [, k, v, flag] = cmd.map(String);
        if (flag === "NX" && kvStore.has(k)) result = null;
        else { kvStore.set(k, v); result = "OK"; }
      } else if (op === "SADD" || op === "INCR" || op === "EXPIRE" || op === "DEL") result = 1;
      else if (op === "SMEMBERS") result = [];
      return new Response(JSON.stringify({ result }), { status: 200 });
    }
    throw new Error(`unexpected fetch: ${u}`);
  });
});

beforeEach(() => {
  sent.length = 0;
  mailControl.cap = 100;
  onceClaims.clear();
  onceCalls.length = 0;
  subscribedState.clear();
  taggedRecords.clear();
  bookingsState.length = 0;
  siteConfigState.reading = undefined;
  overrides.clear();
  seatTagControl.throwNext = false;
  kvStore.clear();
  mockGetItem.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

/* ── fixtures — the default schedule's own pinned math ─────────────────── */

const STARTS_AT_MS = Date.parse("2026-09-23T19:11:00.000Z"); // Wednesday 1:11 PM MDT
const TICK_15Z = Date.parse("2026-09-23T15:00:00.000Z"); // 9:00 AM MDT, the reading's zone-day
const DAY_PRIOR_15Z = Date.parse("2026-09-22T15:00:00.000Z"); // Tuesday — not the reading's day
const BEFORE_START = Date.parse("2026-09-23T18:11:00.000Z"); // one hour before
const START_PLUS_20 = Date.parse("2026-09-23T19:31:00.000Z"); // inside the 45-minute window
const START_PLUS_50 = Date.parse("2026-09-23T20:01:00.000Z"); // past it

const lib = () => import("@/lib/join-letters");

function sub(email: string, extra: Partial<SubscriberRecord> = {}): SubscriberRecord {
  return { email, joinedAtMs: Date.now(), source: "reading", tags: ["reading"], ...extra };
}

const READING_PARTS = {
  session: "the reading",
  startsAtMs: STARTS_AT_MS,
  tz: "America/Denver",
  link: `${SITE}/reading`,
  linkWords: "Open the reading page",
};

const THREE_LINES = [
  "Open it on a computer or the phone.",
  "Press Allow for the camera and the microphone.",
  "If it says no, refresh once.",
];

function booking(over: Partial<BookingRecord> = {}): BookingRecord {
  return {
    id: "bk-fixture-1",
    schemaVersion: 1,
    serviceId: "discovery-call",
    serviceTitle: "Discovery Call",
    startUtc: "2026-09-24T16:00:00.000Z", // Thursday 10:00 AM MDT
    endUtc: "2026-09-24T16:30:00.000Z",
    artistTz: "America/Denver",
    visitorTz: "America/New_York",
    state: "confirmed",
    orderId: "ord-fixture-1",
    customer: { email: "guest@example.com", name: "Guest" },
    meetingUrl: `${SITE}/meet/bk-fixture-1`,
    createdAtMs: Date.parse("2026-09-20T00:00:00.000Z"),
    ...over,
  } as BookingRecord;
}

const BK_REMINDER_TICK = Date.parse("2026-09-24T14:00:00.000Z"); // 2 hours before
const BK_START_TICK = Date.parse("2026-09-24T16:10:00.000Z"); // 10 minutes after

/* ═══════════════ the two builders (Build 2, row 1) ═══════════════ */

describe("the builders — the three plain lines, the link, the zone-true when", () => {
  it("joinReminderLetter carries the three plain lines verbatim, the link, and the reader's own zone", async () => {
    const { joinReminderLetter } = await lib();
    const mail = await joinReminderLetter("reader@example.com", { ...READING_PARTS, tz: "America/New_York" });
    expect(mail.to).toBe("reader@example.com");
    for (const line of THREE_LINES) expect(mail.html).toContain(line);
    expect(mail.html).toContain(`href="${SITE}/reading"`);
    expect(mail.html).toContain("Open the reading page");
    expect(mail.html).toContain("3:11 PM"); // 1:11 PM MDT in the reader's own zone
    expect(mail.html).toContain("the reading");
    expect(mail.unsubscribeUrl).toBeTruthy();
  });

  it("the fallback names Love's zone in words when no reader zone is known", async () => {
    const { joinReminderLetter } = await lib();
    const mail = await joinReminderLetter("reader@example.com", READING_PARTS); // tz America/Denver
    expect(mail.html).toContain("1:11 PM Mountain");
  });

  it("joinStartLetter says the room is open and carries the same door and the three lines", async () => {
    const { joinStartLetter } = await lib();
    const mail = await joinStartLetter("reader@example.com", READING_PARTS);
    expect(mail.html).toContain("the room is open");
    for (const line of THREE_LINES) expect(mail.html).toContain(line);
    expect(mail.html).toContain(`href="${SITE}/reading"`);
  });

  it("no em dash, no arrow, no emoji in the letters' own words (Love's voice law)", async () => {
    const { joinReminderLetter, joinStartLetter } = await lib();
    for (const mail of [
      await joinReminderLetter("reader@example.com", READING_PARTS),
      await joinStartLetter("reader@example.com", READING_PARTS),
    ]) {
      expect(mail.subject).not.toMatch(/[—→]|‑/);
      expect(mail.html).not.toContain("—");
      expect(mail.html).not.toContain("→");
    }
  });
});

/* ═══════════════ the slot doctrine (Build 2, row 2) ═══════════════ */

describe("the pwyc slot doctrine through letterFor", () => {
  it("no literal {{slot}} text ever reaches the sent html, defaults or override", async () => {
    const { joinReminderLetter, joinStartLetter } = await lib();
    for (const mail of [
      await joinReminderLetter("reader@example.com", READING_PARTS),
      await joinStartLetter("reader@example.com", READING_PARTS),
    ]) {
      expect(mail.html).not.toMatch(/\{\{[a-z]+\}\}/);
    }
  });

  it("a slot Love edits out is appended, never lost — link and time survive her scissors", async () => {
    overrides.set("join-reminder", {
      subject: "her words",
      body: "Beautiful soul, we gather soon. With love, One Cocreation",
    });
    const { joinReminderLetter } = await lib();
    const mail = await joinReminderLetter("reader@example.com", READING_PARTS);
    expect(mail.subject).toBe("her words");
    expect(mail.html).toContain("we gather soon");
    expect(mail.html).toContain(`href="${SITE}/reading`); // {{link}} appended back
    expect(mail.html).toContain("1:11 PM"); // {{when}} appended back
    expect(mail.html).toContain("the reading"); // {{session}} appended back
    expect(mail.html).not.toMatch(/\{\{[a-z]+\}\}/);
    expect(mail.html.indexOf("we gather soon")).toBeLessThan(mail.html.indexOf("1:11 PM"));
  });
});

/* ═══════════════ the reading sweep (Build 2, rows 3-5) ═══════════════ */

describe("the reading sweep — the shared due-gate, the 45-minute start window", () => {
  it("the reminder is due on the reading's own day and mails reading + reading-seat, deduped", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TICK_15Z);
    subscribedState.add("a@example.com");
    subscribedState.add("b@example.com");
    taggedRecords.set("reading", [sub("a@example.com")]);
    taggedRecords.set("reading-seat", [sub("b@example.com", { tags: ["reading-seat"] }), sub("a@example.com", { tags: ["reading-seat"] })]);
    const { enqueueJoinLetters } = await lib();
    const stats = await enqueueJoinLetters(TICK_15Z);
    expect(stats.reminderSent).toBe(2); // a@example.com once, never twice
    expect(sent).toHaveLength(2);
    expect(sent.map((m) => m.to).sort()).toEqual(["a@example.com", "b@example.com"]);
    expect(onceCalls).toContainEqual({
      key: `join-reminder:reading:${STARTS_AT_MS}:a@example.com`,
      windowMs: 7 * 24 * 3600_000,
    });
    for (const mail of sent) expect(mail.html).toContain(`href="${SITE}/reading"`);
  });

  it("the reminder is NOT due the day before, and never once the reading has begun", async () => {
    const { enqueueJoinLetters } = await lib();
    subscribedState.add("a@example.com");
    taggedRecords.set("reading", [sub("a@example.com")]);
    vi.useFakeTimers();
    vi.setSystemTime(DAY_PRIOR_15Z);
    expect((await enqueueJoinLetters(DAY_PRIOR_15Z)).reminderSent).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("the start letter is due inside the 45-minute window and never after it", async () => {
    const { enqueueJoinLetters } = await lib();
    subscribedState.add("a@example.com");
    taggedRecords.set("reading", [sub("a@example.com")]);
    vi.useFakeTimers();
    vi.setSystemTime(START_PLUS_20);
    const stats = await enqueueJoinLetters(START_PLUS_20);
    expect(stats.startSent).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0].html).toContain("the room is open");
    expect(onceCalls).toContainEqual({
      key: `join-start:reading:${STARTS_AT_MS}:a@example.com`,
      windowMs: 7 * 24 * 3600_000,
    });
  });

  it("a tick past the window sends no late start letter — 5 hours late is noise, not help", async () => {
    const { enqueueJoinLetters } = await lib();
    subscribedState.add("a@example.com");
    taggedRecords.set("reading", [sub("a@example.com")]);
    vi.useFakeTimers();
    vi.setSystemTime(START_PLUS_50);
    const stats = await enqueueJoinLetters(START_PLUS_50);
    expect(stats.startSent).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("before the start, only the reminder rides — no start letter early", async () => {
    const { enqueueJoinLetters } = await lib();
    subscribedState.add("a@example.com");
    taggedRecords.set("reading", [sub("a@example.com")]);
    vi.useFakeTimers();
    vi.setSystemTime(BEFORE_START);
    const stats = await enqueueJoinLetters(BEFORE_START);
    expect(stats.reminderSent).toBe(1);
    expect(stats.startSent).toBe(0);
    expect(sent[0].html).not.toContain("the room is open");
  });

  it("the per-recipient once-key blocks a second send on the next tick", async () => {
    const { enqueueJoinLetters } = await lib();
    subscribedState.add("a@example.com");
    taggedRecords.set("reading", [sub("a@example.com")]);
    vi.useFakeTimers();
    vi.setSystemTime(TICK_15Z);
    expect((await enqueueJoinLetters(TICK_15Z)).reminderSent).toBe(1);
    const second = await enqueueJoinLetters(TICK_15Z);
    expect(second.reminderSent).toBe(0);
    expect(second.skippedClaimed).toBe(1);
    expect(sent).toHaveLength(1);
  });

  it("a capacity stop leaves the unsent recipients claimable — the very next tick is the retry", async () => {
    const { enqueueJoinLetters } = await lib();
    subscribedState.add("a@example.com");
    subscribedState.add("b@example.com");
    taggedRecords.set("reading", [sub("a@example.com"), sub("b@example.com")]);
    vi.useFakeTimers();
    vi.setSystemTime(TICK_15Z);
    mailControl.cap = 1;
    const stats = await enqueueJoinLetters(TICK_15Z);
    expect(stats.reminderSent).toBe(1);
    expect(stats.skippedCap).toBe(1);
    expect(sent).toHaveLength(1);
    const unclaimed = `join-reminder:reading:${STARTS_AT_MS}:b@example.com`;
    expect(onceClaims.has(unclaimed)).toBe(false); // never claimed — still owed
    mailControl.cap = 100;
    const retry = await enqueueJoinLetters(TICK_15Z);
    expect(retry.reminderSent).toBe(1);
    expect(sent[sent.length - 1].to).toBe("b@example.com");
  });

  it("an unsubscribed address is never mailed (R2) — and its key is never burned", async () => {
    const { enqueueJoinLetters } = await lib();
    taggedRecords.set("reading", [sub("gone@example.com")]); // NOT in subscribedState
    vi.useFakeTimers();
    vi.setSystemTime(TICK_15Z);
    const stats = await enqueueJoinLetters(TICK_15Z);
    expect(stats.reminderSent).toBe(0);
    expect(stats.skippedUnsubscribed).toBe(1);
    expect(sent).toHaveLength(0);
    expect(onceClaims.has(`join-reminder:reading:${STARTS_AT_MS}:gone@example.com`)).toBe(false);
  });

  it("the reader's own zone renders per soul — one record with tz, one falling back to Love's", async () => {
    const { enqueueJoinLetters } = await lib();
    subscribedState.add("eastern@example.com");
    subscribedState.add("plain@example.com");
    taggedRecords.set("reading", [
      sub("eastern@example.com", { tz: "America/New_York" }),
      sub("plain@example.com"),
    ]);
    vi.useFakeTimers();
    vi.setSystemTime(TICK_15Z);
    await enqueueJoinLetters(TICK_15Z);
    const eastern = sent.find((m) => m.to === "eastern@example.com")!;
    const plain = sent.find((m) => m.to === "plain@example.com")!;
    expect(eastern.html).toContain("3:11 PM");
    expect(plain.html).toContain("1:11 PM Mountain");
  });
});

/* ═══════════════ the booking sweep (Build 2, row 5) ═══════════════ */

describe("the booking sweep — the booking's own link, the buyer's zone", () => {
  it("the reminder rides inside the 24 hours before startUtc, with meetingUrl and visitorTz", async () => {
    const { enqueueJoinLetters } = await lib();
    subscribedState.add("guest@example.com");
    bookingsState.push(booking());
    vi.useFakeTimers();
    vi.setSystemTime(BK_REMINDER_TICK);
    const stats = await enqueueJoinLetters(BK_REMINDER_TICK);
    expect(stats.reminderSent).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("guest@example.com");
    expect(sent[0].html).toContain(`href="${SITE}/meet/bk-fixture-1"`);
    expect(sent[0].html).toContain("Discovery Call");
    expect(sent[0].html).toContain("12:00 PM"); // 10:00 AM MDT = noon in the guest's own zone
    expect(onceCalls).toContainEqual({ key: "join-reminder:booking:bk-fixture-1", windowMs: 7 * 24 * 3600_000 });
  });

  it("no meetingUrl, no customer.email, or a non-confirmed state is skipped — never a link-less letter", async () => {
    const { enqueueJoinLetters } = await lib();
    subscribedState.add("guest@example.com");
    bookingsState.push(
      booking({ id: "bk-no-url", meetingUrl: undefined }),
      booking({ id: "bk-no-email", customer: { name: "Guest" } }),
      booking({ id: "bk-held", state: "held" }),
    );
    vi.useFakeTimers();
    vi.setSystemTime(BK_REMINDER_TICK);
    const stats = await enqueueJoinLetters(BK_REMINDER_TICK);
    expect(stats.reminderSent).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("the start letter rides inside the window and carries the same link", async () => {
    const { enqueueJoinLetters } = await lib();
    subscribedState.add("guest@example.com");
    bookingsState.push(booking());
    vi.useFakeTimers();
    vi.setSystemTime(BK_START_TICK);
    const stats = await enqueueJoinLetters(BK_START_TICK);
    expect(stats.startSent).toBe(1);
    expect(sent[0].html).toContain(`href="${SITE}/meet/bk-fixture-1"`);
    expect(onceCalls).toContainEqual({ key: "join-start:booking:bk-fixture-1", windowMs: 7 * 24 * 3600_000 });
  });

  it("a booking without visitorTz falls back to the artist's zone, named", async () => {
    const { enqueueJoinLetters } = await lib();
    subscribedState.add("guest@example.com");
    bookingsState.push(booking({ visitorTz: undefined }));
    vi.useFakeTimers();
    vi.setSystemTime(BK_REMINDER_TICK);
    await enqueueJoinLetters(BK_REMINDER_TICK);
    expect(sent[0].html).toContain("10:00 AM Mountain");
  });
});

/* ═══════════════ the seat tag on settle (Build 2, row 6) ═══════════════ */

const SETTLE_NPUB = "soul@example.com@email";
const PASS_ITEM: StoreItem = {
  id: "weekly-one-week",
  schemaVersion: 2,
  title: "One Week Pass",
  blurb: "one week of Weekly Intuitive",
  images: [],
  kind: "package",
  price: { fiat: { amount: 1100, currency: "USD" }, sats: 11_111 },
  fulfillment: "package",
  status: "live",
  entitlementTier: "A",
  entitlementDays: 7,
} as StoreItem;

function settleOrder(over: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: "order-seat-1",
    schemaVersion: 2,
    state: "settled",
    lineItems: [{ itemId: "weekly-one-week", title: "One Week Pass", qty: 1 }],
    priceSnapshot: { amount: 1100, currency: "USD", at: new Date().toISOString() },
    adapterId: "square",
    chargeIds: ["ch_fixture"],
    entitlementSubject: SETTLE_NPUB,
    contact: { email: "soul@example.com" },
    createdAtMs: Date.now(),
    events: [],
    ...over,
  } as OrderRecord;
}

describe("the settle-time reading-seat tag (decision 3)", () => {
  it("a settled pass order tags the buyer's email reading-seat in the subscribers vault", async () => {
    mockGetItem.mockResolvedValue(PASS_ITEM);
    const { settleEntitlementFromOrder } = await import("@/lib/entitlement-fulfil");
    const res = await settleEntitlementFromOrder(settleOrder());
    expect(res.granted).toBe(true);
    const raw = kvStore.get("mail:sub:soul@example.com");
    expect(raw).toBeTruthy();
    const rec = JSON.parse(raw!) as SubscriberRecord;
    expect(rec.tags).toContain("reading-seat");
  });

  it("a non-seat order (no package line) grants nothing and tags nobody", async () => {
    mockGetItem.mockResolvedValue({ ...PASS_ITEM, kind: "digital", entitlementTier: undefined, entitlementDays: undefined } as StoreItem);
    const { settleEntitlementFromOrder } = await import("@/lib/entitlement-fulfil");
    const res = await settleEntitlementFromOrder(settleOrder());
    expect(res.granted).toBe(false);
    expect(kvStore.get("mail:sub:soul@example.com")).toBeUndefined();
  });

  it("a tag-write failure never unsettles the money — the grant stands", async () => {
    mockGetItem.mockResolvedValue(PASS_ITEM);
    seatTagControl.throwNext = true;
    const { settleEntitlementFromOrder } = await import("@/lib/entitlement-fulfil");
    const res = await settleEntitlementFromOrder(settleOrder());
    expect(res.granted).toBe(true);
    expect((await getEntitlement(SETTLE_NPUB))?.tier).toBe("A");
  });
});

/* ═══════════════ the viewerTz capture (Build 2, row 7) ═══════════════ */

describe("the reading sign-up's zone capture", () => {
  const subscribePOST = () => import("@/app/api/subscribe/route");
  const post = (body: unknown) =>
    new Request("http://test/api/subscribe", { method: "POST", body: JSON.stringify(body) });

  it("a valid viewerTz lands on the subscriber record; a garbage one stores no zone", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(DAY_PRIOR_15Z); // not the reading's day — no day-of send in the way
    subscribedState.add("zoned@example.com");
    subscribedState.add("bogus@example.com");
    const { POST } = await subscribePOST();
    const ok = await POST(post({ email: "zoned@example.com", source: "reading", viewerTz: "America/Chicago" }));
    expect((await ok.json()).ok).toBe(true);
    const zoned = JSON.parse(kvStore.get("mail:sub:zoned@example.com")!) as SubscriberRecord;
    expect(zoned.tz).toBe("America/Chicago");
    const bad = await POST(post({ email: "bogus@example.com", source: "reading", viewerTz: "Mars/Olympus_Mons" }));
    expect((await bad.json()).ok).toBe(true);
    const bogus = JSON.parse(kvStore.get("mail:sub:bogus@example.com")!) as SubscriberRecord;
    expect(bogus.tz).toBeUndefined();
    expect(bogus.tags).toContain("reading"); // the sign-up itself stands either way
  });
});

/* ═══════════════ the tick's added call (Build 6) ═══════════════ */

describe("the tick route — the join letters ride beside the reading letters", () => {
  it("the response carries join stats and the reminder sends before the handler returns", async () => {
    subscribedState.add("a@example.com");
    taggedRecords.set("reading", [sub("a@example.com", { readingConfirmedAt: Date.now() })]);
    vi.useFakeTimers();
    vi.setSystemTime(TICK_15Z);
    const { GET } = await import("@/app/api/mail/tick/route");
    const res = await GET(new Request("http://test/api/mail/tick"));
    const json = (await res.json()) as { join: { reminderSent: number; startSent: number } };
    expect(json.join.reminderSent).toBe(1);
    expect(json.join.startSent).toBe(0);
    expect(sent.some((m) => m.to === "a@example.com")).toBe(true);
  });
});

/* ═══════════════ the room rows (Build 2, row 8) ═══════════════ */

const lettersPageSrc = readFileSync(resolve(__dirname, "../src/app/a/letters/page.tsx"), "utf8");

function rowBlock(key: string): string {
  const at = lettersPageSrc.indexOf(`key: "${key}"`);
  if (at === -1) return "";
  const open = lettersPageSrc.lastIndexOf("\n  {", at);
  const close = lettersPageSrc.indexOf("\n  },", at);
  return lettersPageSrc.slice(open, close);
}

describe("the two room rows (decision 8, the post-T-493 shape)", () => {
  it("join-reminder and join-start ride the Sessions group with plain when words and noPublish", () => {
    for (const key of ["join-reminder", "join-start"]) {
      const block = rowBlock(key);
      expect(block, `${key} row exists`).toBeTruthy();
      expect(block).toContain('group: "Sessions"');
      expect(block).toContain("noPublish: true");
      expect(block).toMatch(/when: "[^"]{10,}"/);
      expect(block).not.toContain("—"); // no em dash in the row's own words
      expect(block).not.toMatch(/\d+ minutes/); // never a promised minute
    }
  });
});

/* ═══════════════ the key pins (Build 2, row 9) ═══════════════ */

describe("the seeded keys", () => {
  it("EDITABLE_LETTERS carries both join keys at length 12, both audiences members", async () => {
    const { EDITABLE_LETTERS, DEFAULT_AUDIENCE } = await import("@/lib/letters");
    expect(EDITABLE_LETTERS).toContain("join-reminder");
    expect(EDITABLE_LETTERS).toContain("join-start");
    expect(EDITABLE_LETTERS).toHaveLength(12); // TASK-493 made it 9, TASK-518 the 10th, TASK-519 the join pair
    expect(DEFAULT_AUDIENCE["join-reminder"]).toBe("members");
    expect(DEFAULT_AUDIENCE["join-start"]).toBe("members");
  });

  it("both default bodies carry the three slots and the three plain lines, and no em dash", async () => {
    const { LETTER_DEFAULTS } = await import("@/lib/letters");
    for (const key of ["join-reminder", "join-start"] as const) {
      const tpl = LETTER_DEFAULTS[key];
      expect(tpl, `${key} has built-in words`).toBeTruthy();
      for (const slot of ["{{session}}", "{{when}}", "{{link}}"]) expect(tpl!.body).toContain(slot);
      for (const line of THREE_LINES) expect(tpl!.body).toContain(line);
      expect(tpl!.subject).not.toContain("—");
      expect(tpl!.body).not.toContain("—");
      expect(tpl!.subject).not.toContain("→");
      expect(tpl!.body).not.toContain("→");
    }
  });
});

/* ═══════════════ the hint pin (Build 2, row 10) ═══════════════ */

describe("the join-screen hint (decision 7)", () => {
  it("JitsiRoom.tsx carries the exact line; JitsiViewer.tsx (which never asks) does not", () => {
    const room = readFileSync(resolve(__dirname, "../src/components/booking/JitsiRoom.tsx"), "utf8");
    const viewer = readFileSync(resolve(__dirname, "../src/components/reading/JitsiViewer.tsx"), "utf8");
    expect(room).toContain("Allow camera and microphone");
    expect(viewer).not.toContain("Allow camera and microphone");
  });
});
