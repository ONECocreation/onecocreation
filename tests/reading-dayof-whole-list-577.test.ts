import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import type { OutgoingMail } from "@/lib/mail";

/**
 * T-577 (the Admiral, block 970,203): the reading-day reminder goes to the
 * WHOLE mailing list, not only the "reading" tag. The REAL subscribers.ts
 * runs against a stubbed KV; only the mail rail and the site config are
 * mocked. Pins: an untagged soul gets it, an opted-out one does not, a
 * reading-tagged one still gets exactly one, nothing after the start.
 */

const sent = vi.hoisted(() => [] as OutgoingMail[]);
const claims = vi.hoisted(() => new Set<string>());

vi.mock("@/lib/mail", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/mail")>();
  return {
    ...actual,
    mailConfigured: () => true,
    sendMail: async (_p: string, mail: OutgoingMail) => {
      sent.push(mail);
    },
    capRemaining: async () => 100,
    onceWithin: async (key: string) => {
      if (claims.has(key)) return false;
      claims.add(key);
      return true;
    },
  };
});

vi.mock("@/lib/site-config", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/site-config")>();
  return { ...actual, getSiteConfig: async () => ({ ...actual.defaultSiteConfig(), reading: undefined }) };
});

vi.mock("@/lib/mail-queue", () => ({
  tick: async () => ({ sent: 0, failed: 0, requeued: 0, remainingInQueue: 0, capLeftThisHour: 100 }),
}));

const STARTS_AT_MS = Date.parse("2026-09-23T19:11:00.000Z"); // Wednesday 1:11 PM MDT
const TICK_15Z = Date.parse("2026-09-23T15:00:00.000Z");
const SUBJECT = "Don't forget — the reading is today";

let vault: Map<string, string>;
let index: string[];

function seed(email: string, extra: Record<string, unknown> = {}) {
  index.push(email);
  vault.set(`mail:sub:${email.toLowerCase()}`, JSON.stringify({ email, joinedAtMs: 1, source: "footer", ...extra }));
}

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://reading-test.example";
});

beforeEach(() => {
  sent.length = 0;
  claims.clear();
  vault = new Map();
  index = [];
  process.env.KV_REST_API_URL = "https://kv.example";
  process.env.KV_REST_API_TOKEN = "test-token";
  vi.stubGlobal("fetch", async (_url: unknown, init?: { body?: string }) => {
    const cmd = JSON.parse(init?.body ?? "[]") as [string, ...string[]];
    if (cmd[0] === "GET") return Response.json({ result: vault.get(cmd[1]) ?? null });
    if (cmd[0] === "SMEMBERS") return Response.json({ result: index });
    return Response.json({ result: null });
  });
  vi.useFakeTimers();
  vi.setSystemTime(TICK_15Z);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
});

const dayOf = () => sent.filter((m) => m.subject === SUBJECT);

describe("T-577 the day-of reminder reaches the whole mailing list", () => {
  it("an untagged footer subscriber gets it", async () => {
    seed("footer@example.com");
    const { enqueueReadingDayOf } = await import("@/lib/reading-letters");
    const stats = await enqueueReadingDayOf(TICK_15Z);
    expect(stats.dayOfSent).toBe(1);
    expect(dayOf().map((m) => m.to)).toEqual(["footer@example.com"]);
  });

  it("an opted-out subscriber does not", async () => {
    seed("left@example.com", { optedOut: true });
    seed("stay@example.com");
    const { enqueueReadingDayOf } = await import("@/lib/reading-letters");
    await enqueueReadingDayOf(TICK_15Z);
    expect(dayOf().map((m) => m.to)).toEqual(["stay@example.com"]);
  });

  it("a reading-tagged subscriber still gets exactly one, across two ticks", async () => {
    seed("tagged@example.com", { source: "reading", tags: ["reading"] });
    seed("plain@example.com");
    const { enqueueReadingDayOf } = await import("@/lib/reading-letters");
    await enqueueReadingDayOf(TICK_15Z);
    await enqueueReadingDayOf(TICK_15Z);
    expect(dayOf().filter((m) => m.to === "tagged@example.com")).toHaveLength(1);
    expect(dayOf().filter((m) => m.to === "plain@example.com")).toHaveLength(1);
  });

  it("the same address twice in different case is one send", async () => {
    seed("Mixed@Example.com");
    index.push("mixed@example.com");
    const { enqueueReadingDayOf } = await import("@/lib/reading-letters");
    await enqueueReadingDayOf(TICK_15Z);
    expect(dayOf()).toHaveLength(1);
  });

  it("nothing goes out once the reading has started", async () => {
    seed("footer@example.com");
    vi.setSystemTime(STARTS_AT_MS);
    const { enqueueReadingDayOf } = await import("@/lib/reading-letters");
    const stats = await enqueueReadingDayOf(STARTS_AT_MS);
    expect(stats.dayOfSent).toBe(0);
    expect(dayOf()).toHaveLength(0);
  });

  it("listActiveSubscribers drops opted-out records and dedupes by lowercase email", async () => {
    seed("a@example.com");
    seed("b@example.com", { optedOut: true });
    index.push("A@example.com");
    const { listActiveSubscribers } = await import("@/lib/subscribers");
    expect((await listActiveSubscribers()).map((r) => r.email)).toEqual(["a@example.com"]);
  });
});
