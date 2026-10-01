import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import type { OutgoingMail } from "@/lib/mail";
import type { SubscriberRecord } from "@/lib/subscribers";
import type { BookingRecord } from "@/lib/booking-orders";
import { unsubscribeToken } from "@/lib/subscribers";

/**
 * TASK-537 part 1 (gap 1) - the booking guest the vault has never seen.
 * T-519 gated every join-letter send on `isSubscribed`, which reads "no
 * record" as "not subscribed", so a guest who booked without ever joining
 * a list got no reminder and no start letter. Ruled lean: the BOOKING half
 * asks the honest question, "has this soul opted out?" (`isOptedOut`: true
 * ONLY when a record exists and says so). The reading half keeps
 * `isSubscribed` untouched. The one-click unsubscribe door must work for a
 * no-record guest too (`removeSubscriber` writes a tombstone), or we would
 * mail a person who cannot say no.
 *
 * The REAL subscribers module runs against a stateful fixture KV; the mail
 * rail, the booking store and the site config are mocked.
 */

const sent = vi.hoisted(() => [] as OutgoingMail[]);
const mailControl = vi.hoisted(() => ({ cap: 100 }));
const onceClaims = vi.hoisted(() => new Set<string>());
const bookingsState = vi.hoisted(() => [] as BookingRecord[]);
const taggedRecords = vi.hoisted(() => new Map<string, SubscriberRecord[]>());

vi.mock("@/lib/mail", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/mail")>();
  return {
    ...actual,
    mailConfigured: () => true,
    sendMail: async (_persona: string, mail: OutgoingMail) => {
      sent.push(mail);
      mailControl.cap = Math.max(0, mailControl.cap - 1);
    },
    capRemaining: async () => mailControl.cap,
    onceWithin: async (key: string) => {
      if (onceClaims.has(key)) return false;
      onceClaims.add(key);
      return true;
    },
  };
});

vi.mock("@/lib/subscribers", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/subscribers")>();
  return { ...actual, listSubscribersByTag: async (tag: string) => taggedRecords.get(tag) ?? [] };
});

vi.mock("@/lib/booking-orders", () => ({ listBookings: async () => bookingsState }));

const KV_URL = "http://kv.fixture";
const SITE = "https://guest-test.example";
const kvStore = new Map<string, string>();
const kvLog: unknown[][] = [];

beforeAll(() => {
  process.env.KV_REST_API_URL = KV_URL;
  process.env.KV_REST_API_TOKEN = "fixture-kv-token";
  process.env.SEAT_SECRET = "test-seat-secret";
  process.env.NEXT_PUBLIC_SITE_URL = SITE;
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit) => {
    if (String(url) === KV_URL) {
      const cmd = JSON.parse(String(init?.body)) as unknown[];
      kvLog.push(cmd);
      const [op, key] = cmd.map(String);
      let result: unknown = null;
      if (op === "GET") result = kvStore.get(key) ?? null;
      else if (op === "SET") { kvStore.set(key, String(cmd[2])); result = "OK"; }
      else if (op === "SADD" || op === "SREM" || op === "INCR" || op === "EXPIRE" || op === "DEL") result = 1;
      else if (op === "SMEMBERS") result = [];
      return new Response(JSON.stringify({ result }), { status: 200 });
    }
    throw new Error(`unexpected fetch: ${String(url)}`);
  });
});

beforeEach(() => {
  sent.length = 0;
  mailControl.cap = 100;
  onceClaims.clear();
  bookingsState.length = 0;
  taggedRecords.clear();
  kvStore.clear();
  kvLog.length = 0;
});
afterEach(() => vi.useRealTimers());

const recKey = (e: string) => `mail:sub:${e.toLowerCase()}`;
const putRec = (rec: SubscriberRecord) => kvStore.set(recKey(rec.email), JSON.stringify(rec));

function booking(over: Partial<BookingRecord> = {}): BookingRecord {
  return {
    id: "bk-guest-1",
    schemaVersion: 1,
    serviceId: "discovery-call",
    serviceTitle: "Discovery Call",
    startUtc: "2026-09-24T16:00:00.000Z",
    endUtc: "2026-09-24T16:30:00.000Z",
    artistTz: "America/Denver",
    visitorTz: "America/New_York",
    state: "confirmed",
    orderId: "ord-guest-1",
    customer: { email: "newguest@example.com", name: "Guest" },
    meetingUrl: `${SITE}/meet/bk-guest-1`,
    createdAtMs: Date.parse("2026-09-20T00:00:00.000Z"),
    ...over,
  } as BookingRecord;
}
const REMINDER_TICK = Date.parse("2026-09-24T14:00:00.000Z");
const START_TICK = Date.parse("2026-09-24T16:10:00.000Z");
const lib = () => import("@/lib/join-letters");
const subs = () => import("@/lib/subscribers");

describe("1a - isOptedOut says yes ONLY for a record that opted out", () => {
  it("false for no record, false for a live record, true for an opted-out record", async () => {
    const { isOptedOut } = await subs();
    expect(await isOptedOut("nobody@example.com")).toBe(false);
    putRec({ email: "live@example.com", joinedAtMs: 1, source: "footer" });
    expect(await isOptedOut("live@example.com")).toBe(false);
    putRec({ email: "gone@example.com", joinedAtMs: 1, source: "footer", optedOut: true });
    expect(await isOptedOut("gone@example.com")).toBe(true);
  });
});

describe("1b - the booking half asks 'has not opted out'", () => {
  it("a confirmed booking whose customer has NO record gets the reminder inside 24 hours", async () => {
    bookingsState.push(booking());
    vi.useFakeTimers();
    vi.setSystemTime(REMINDER_TICK);
    const { enqueueJoinLetters } = await lib();
    const stats = await enqueueJoinLetters(REMINDER_TICK);
    expect(stats.reminderSent).toBe(1);
    expect(sent.map((m) => m.to)).toEqual(["newguest@example.com"]);
  });

  it("and the start letter inside 45 minutes", async () => {
    bookingsState.push(booking());
    vi.useFakeTimers();
    vi.setSystemTime(START_TICK);
    const { enqueueJoinLetters } = await lib();
    const stats = await enqueueJoinLetters(START_TICK);
    expect(stats.startSent).toBe(1);
    expect(sent).toHaveLength(1);
  });

  it("an opted-out record gets neither", async () => {
    putRec({ email: "newguest@example.com", joinedAtMs: 1, source: "footer", optedOut: true });
    bookingsState.push(booking());
    const { enqueueJoinLetters } = await lib();
    vi.useFakeTimers();
    vi.setSystemTime(REMINDER_TICK);
    expect((await enqueueJoinLetters(REMINDER_TICK)).skippedUnsubscribed).toBe(1);
    vi.setSystemTime(START_TICK);
    expect((await enqueueJoinLetters(START_TICK)).skippedUnsubscribed).toBe(1);
    expect(sent).toHaveLength(0);
  });

  it("the once-key still holds: a second tick sends nothing new", async () => {
    bookingsState.push(booking());
    vi.useFakeTimers();
    vi.setSystemTime(REMINDER_TICK);
    const { enqueueJoinLetters } = await lib();
    await enqueueJoinLetters(REMINDER_TICK);
    const again = await enqueueJoinLetters(REMINDER_TICK);
    expect(again.reminderSent).toBe(0);
    expect(again.skippedClaimed).toBe(1);
    expect(sent).toHaveLength(1);
  });

  it("the reading half is unchanged: an opted-out reading soul gets nothing, and a no-record soul gets nothing", async () => {
    // 2026-09-23 15:00Z is the reading's own zone-day, so the reminder is due
    const TICK = Date.parse("2026-09-23T15:00:00.000Z");
    putRec({ email: "left@example.com", joinedAtMs: 1, source: "reading", tags: ["reading"], optedOut: true });
    taggedRecords.set("reading", [
      { email: "left@example.com", joinedAtMs: 1, source: "reading", tags: ["reading"] },
      { email: "ghost@example.com", joinedAtMs: 1, source: "reading", tags: ["reading"] },
    ]);
    vi.useFakeTimers();
    vi.setSystemTime(TICK);
    const { enqueueJoinLetters } = await lib();
    const stats = await enqueueJoinLetters(TICK);
    expect(stats.reminderSent).toBe(0);
    expect(stats.skippedUnsubscribed).toBe(2);
    expect(sent).toHaveLength(0);
  });
});

describe("1c - the unsubscribe door works for a guest with no record", () => {
  it("unsubscribing an unknown email makes isOptedOut true and isSubscribed false, and the index is untouched", async () => {
    const { removeSubscriber, isOptedOut, isSubscribed } = await subs();
    await removeSubscriber("Stranger@Example.com");
    expect(await isOptedOut("stranger@example.com")).toBe(true);
    expect(await isSubscribed("stranger@example.com")).toBe(false);
    const rec = JSON.parse(kvStore.get(recKey("stranger@example.com"))!) as SubscriberRecord;
    expect(rec).toMatchObject({ email: "stranger@example.com", source: "unsubscribed", optedOut: true });
    expect(typeof rec.joinedAtMs).toBe("number");
    expect(kvLog.some((c) => c[0] === "SADD" || c[0] === "SREM")).toBe(false);
  });

  it("a known record behaves byte-identically to before: opted out, kept, removed from the index", async () => {
    putRec({ email: "known@example.com", joinedAtMs: 7, source: "footer", tags: ["reading"] });
    const { removeSubscriber } = await subs();
    await removeSubscriber("known@example.com");
    expect(JSON.parse(kvStore.get(recKey("known@example.com"))!)).toEqual({
      email: "known@example.com", joinedAtMs: 7, source: "footer", tags: ["reading"], optedOut: true,
    });
    expect(kvLog).toContainEqual(["SREM", "mail:subscribers", "known@example.com"]);
  });

  it("the route answers the same page for a known and an unknown guest, and the unknown guest is then skipped", async () => {
    const { GET } = await import("@/app/api/unsubscribe/route");
    putRec({ email: "known@example.com", joinedAtMs: 7, source: "footer" });
    const hit = async (e: string) => {
      const res = await GET(new Request(`${SITE}/api/unsubscribe?e=${encodeURIComponent(e)}&t=${unsubscribeToken(e)}`));
      return { status: res.status, body: await res.text() };
    };
    const known = await hit("known@example.com");
    const unknown = await hit("newguest@example.com");
    expect(unknown).toEqual(known);
    expect(unknown.status).toBe(200);

    bookingsState.push(booking());
    vi.useFakeTimers();
    vi.setSystemTime(REMINDER_TICK);
    const { enqueueJoinLetters } = await lib();
    await enqueueJoinLetters(REMINDER_TICK);
    expect(sent).toHaveLength(0);
  });
});
