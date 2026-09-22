import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import type { OutgoingMail } from "@/lib/mail";
import type { SubscriberRecord } from "@/lib/subscribers";
import type { ReadingSchedule } from "@/lib/reading-schedule";

/**
 * TASK-389 — the two reading emails (confirmation + day-of). Pins
 * `src/lib/reading-letters.ts`'s two pure builders, its two send paths, the
 * tick's added call, and the three additive `subscribers.ts` exports
 * (Build 4) it leans on — plus two route-level specs (the subscribe branch,
 * the mail tick) proving the wiring, not just the library in isolation.
 *
 * Covers the AMENDMENT (Number One, after `walk-968036/ASTRA-REVIEW-T389.md`,
 * block 968,132 later) point by point: R1 (direct sends, capacity checked
 * before each one), R2 (isSubscribed immediately before every send), R3
 * (per-recipient once-keys), R4 (the sweep is the sign-up path's retry), R5
 * (one schedule policy, absent ≠ no-op), R6 (the null Stage door), R7 (the
 * wall-clock helper lives here, booking-time.ts untouched — proven simply by
 * this file never importing anything private from it).
 *
 * The mail rail, the subscriber vault's send-time reads, and the site config
 * are all mocked so this spec pins the LETTERS and the ORCHESTRATION, not
 * SMTP or a real KV round-trip — except the one block that deliberately
 * exercises `listSubscribersByTag`/`markReadingConfirmed`'s REAL
 * implementation (Build 4 itself) against a stubbed KV, the same idiom
 * `tests/subscribers-source.test.ts` and `tests/free-reading-path.test.ts`
 * already use.
 */

/* ── hoisted, mutable mock state (reset in beforeEach) ─────────────────── */

const sent = vi.hoisted(() => [] as OutgoingMail[]);
const mailControl = vi.hoisted(() => ({ cap: 100, throwNextSend: false }));
const onceWithinClaims = vi.hoisted(() => new Set<string>());
const onceWithinCalls = vi.hoisted(() => [] as Array<{ key: string; windowMs: number }>);
const subscribedState = vi.hoisted(() => new Set<string>());
const recordsState = vi.hoisted(() => [] as SubscriberRecord[]);
const markCalls = vi.hoisted(() => [] as string[]);
const roomState = vi.hoisted(() => ({ path: "/rooms/heart-field" as string | null }));
const readingTagControl = vi.hoisted(() => ({ outcome: "joined" as "joined" | "already" | "unsubscribed" }));
const siteConfigState = vi.hoisted(() => ({ reading: undefined as ReadingSchedule | undefined }));

vi.mock("@/lib/mail", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/mail")>();
  return {
    ...actual,
    mailConfigured: () => true,
    sendMail: async (_persona: string, mail: OutgoingMail) => {
      if (mailControl.throwNextSend) {
        mailControl.throwNextSend = false;
        throw new Error("simulated SMTP failure");
      }
      sent.push(mail);
    },
    capRemaining: async () => mailControl.cap,
    onceWithin: async (key: string, windowMs: number) => {
      onceWithinCalls.push({ key, windowMs });
      if (onceWithinClaims.has(key)) return false;
      onceWithinClaims.add(key);
      return true;
    },
  };
});

vi.mock("@/lib/subscribers", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/subscribers")>();
  return {
    ...actual,
    subscribersConfigured: () => true,
    addReadingTag: async () => ({ outcome: readingTagControl.outcome }),
    isSubscribed: async (email: string) => subscribedState.has(email.toLowerCase()),
    listSubscribersByTag: async () => recordsState,
    markReadingConfirmed: async (email: string) => {
      markCalls.push(email.toLowerCase());
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

// R6: READING_ROOM_PATH is a module-level constant on the real module — a
// getter here is what lets a single test flip it to null and back, since a
// plain re-exported value would be frozen at whatever the factory saw once.
// Every other export (roomPath, freeRoom, etc. — site-config.ts and
// lead-magnet.ts both need them transitively) rides the real module.
vi.mock("@/lib/reading-room", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/reading-room")>();
  return {
    ...actual,
    get READING_ROOM_PATH() {
      return roomState.path;
    },
  };
});

vi.mock("@/lib/mail-queue", () => ({
  tick: async () => ({ sent: 0, failed: 0, requeued: 0, remainingInQueue: 0, capLeftThisHour: 100 }),
}));

vi.mock("@/lib/operator-auth", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/operator-auth")>();
  return { ...actual, operatorFromCookieHeader: () => true };
});

const SITE = "https://reading-test.example";

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = SITE;
});

beforeEach(() => {
  sent.length = 0;
  mailControl.cap = 100;
  mailControl.throwNextSend = false;
  onceWithinClaims.clear();
  onceWithinCalls.length = 0;
  subscribedState.clear();
  recordsState.length = 0;
  markCalls.length = 0;
  roomState.path = "/rooms/heart-field";
  readingTagControl.outcome = "joined";
  siteConfigState.reading = undefined;
});

afterEach(() => {
  vi.useRealTimers();
});

const lib = () => import("@/lib/reading-letters");

function rec(email: string, extra: Partial<SubscriberRecord> = {}): SubscriberRecord {
  return { email, joinedAtMs: Date.now(), source: "reading", tags: ["reading"], ...extra };
}

/* ── fixtures — all cross-checked against nextReading's own pinned math
   (tests/reading-schedule.test.ts) rather than hand-derived ─────────────── */

// Verbatim shape of DEFAULT_READING_SCHEDULE (Wednesday, 1:11 PM, Denver, on).
const BASE: ReadingSchedule = { on: true, weekday: 3, time: "13:11", tz: "America/Denver", durationMin: 60 };
const STARTS_AT_MS = Date.parse("2026-09-23T19:11:00.000Z"); // Wednesday 1:11 PM MDT
const TICK_15Z = Date.parse("2026-09-23T15:00:00.000Z"); // the Vercel cron's own shape — 9:00 AM MDT, same zone-day
const BEFORE_2AM = Date.parse("2026-09-23T07:00:00.000Z"); // 1:00 AM MDT, same zone-day — too early
const DAY_PRIOR_15Z = Date.parse("2026-09-22T15:00:00.000Z"); // Tuesday 9:00 AM MDT — not the reading's day

/* ═══════════════════════ the two pure builders ═══════════════════════ */

describe("readingConfirmationLetter — the pure builder", () => {
  it("carries the subject, the Stage link built from siteBase()+READING_ROOM_PATH, and an unsubscribe URL", async () => {
    const { readingConfirmationLetter } = await lib();
    const mail = readingConfirmationLetter("reader@example.com");
    expect(mail.to).toBe("reader@example.com");
    expect(mail.subject).toBe("You're on the list for the reading");
    expect(mail.html).toContain(`href="${SITE}/rooms/heart-field"`);
    expect(mail.unsubscribeUrl).toBeTruthy();
    expect(mail.html).toContain(mail.unsubscribeUrl!);
  });

  it("R6: no free room in the registry (READING_ROOM_PATH null) links /reading and says the room link follows — never a broken siteBase()+null href", async () => {
    roomState.path = null;
    const { readingConfirmationLetter } = await lib();
    const mail = readingConfirmationLetter("reader@example.com");
    expect(mail.html).toContain(`href="${SITE}/reading"`);
    expect(mail.html).not.toContain(`${SITE}null`);
    expect(mail.html.toLowerCase()).toContain("room link follows");
  });
});

describe("readingDayOfLetter — the pure builder", () => {
  it("says the time in words ('today at <clock> Mountain'), never a countdown, with the Stage link and an unsubscribe URL", async () => {
    const { readingDayOfLetter } = await lib();
    const mail = readingDayOfLetter("reader@example.com", STARTS_AT_MS, "America/Denver");
    expect(mail.subject).toBe("Don't forget — the reading is today");
    expect(mail.html).toContain("today at 1:11 PM Mountain");
    expect(mail.html).not.toMatch(/this morning|tonight/i);
    expect(mail.html).toContain(`href="${SITE}/rooms/heart-field"`);
    expect(mail.unsubscribeUrl).toBeTruthy();
    expect(mail.html).toContain(mail.unsubscribeUrl!);
  });

  it("R6: no free room in the registry links /reading instead of a broken siteBase()+null href", async () => {
    roomState.path = null;
    const { readingDayOfLetter } = await lib();
    const mail = readingDayOfLetter("reader@example.com", STARTS_AT_MS, "America/Denver");
    expect(mail.html).toContain(`href="${SITE}/reading"`);
    expect(mail.html).not.toContain(`${SITE}null`);
  });
});

describe("reading-letters.ts never hardcodes a weekday (grep-lintable)", () => {
  it("the source file names no weekday literally — the schedule source decides the day, never the code", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src/lib/reading-letters.ts"), "utf8");
    expect(src).not.toMatch(/\b(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b/);
  });
});

/* ═══════════════════════ the two send paths ═══════════════════════ */

describe("sendReadingConfirmation — the shared send path (R2/R3/R4)", () => {
  it("sends and stamps when subscribed, capacity remains, and the claim succeeds", async () => {
    subscribedState.add("reader@example.com");
    const { sendReadingConfirmation } = await lib();
    const result = await sendReadingConfirmation("reader@example.com");
    expect(result).toBe("sent");
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe("You're on the list for the reading");
    expect(markCalls).toEqual(["reader@example.com"]);
  });

  it("R2: an unsubscribed address gets nothing — checked immediately before the send, not the tag outcome or a list snapshot", async () => {
    // deliberately not added to subscribedState
    const { sendReadingConfirmation } = await lib();
    const result = await sendReadingConfirmation("reader@example.com");
    expect(result).toBe("skippedUnsubscribed");
    expect(sent).toHaveLength(0);
    expect(markCalls).toHaveLength(0);
  });

  it("R4: a spent meter sends nothing and leaves the record unclaimed/unstamped — the sweep is the retry, never a burned claim", async () => {
    subscribedState.add("reader@example.com");
    mailControl.cap = 0;
    const { sendReadingConfirmation } = await lib();
    const result = await sendReadingConfirmation("reader@example.com");
    expect(result).toBe("skippedCap");
    expect(sent).toHaveLength(0);
    expect(markCalls).toHaveLength(0);
    expect(onceWithinClaims.has("reading-confirm:reader@example.com")).toBe(false);
  });

  it("R3: the shared per-recipient claim stops a second call for the same email — the sign-up path and the sweep can never double-send", async () => {
    subscribedState.add("reader@example.com");
    const { sendReadingConfirmation } = await lib();
    const first = await sendReadingConfirmation("reader@example.com");
    const second = await sendReadingConfirmation("reader@example.com");
    expect(first).toBe("sent");
    expect(second).toBe("skippedClaimed");
    expect(sent).toHaveLength(1);
  });

  it("R3: the claim key is exactly reading-confirm:<email>, held for 24 hours", async () => {
    subscribedState.add("reader@example.com");
    const { sendReadingConfirmation } = await lib();
    await sendReadingConfirmation("reader@example.com");
    expect(onceWithinCalls).toContainEqual({ key: "reading-confirm:reader@example.com", windowMs: 24 * 3600_000 });
  });
});

describe("sendReadingDayOf — per-recipient send (R1/R2/R3)", () => {
  it("sends when subscribed, capacity remains, before the start, and the claim succeeds", async () => {
    subscribedState.add("reader@example.com");
    vi.useFakeTimers();
    vi.setSystemTime(TICK_15Z);
    const { sendReadingDayOf } = await lib();
    const result = await sendReadingDayOf("reader@example.com", STARTS_AT_MS, "America/Denver");
    expect(result).toBe("sent");
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe("Don't forget — the reading is today");
  });

  it("R1: silent once the reading has begun — evaluated at the moment of the send (a fresh Date.now(), never a stale nowMs)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(STARTS_AT_MS); // the exact start instant
    const { sendReadingDayOf } = await lib();
    const result = await sendReadingDayOf("reader@example.com", STARTS_AT_MS, "America/Denver");
    expect(result).toBe("skippedLate");
    expect(sent).toHaveLength(0);
  });

  it("R1: capacity is checked before every send and stops it when spent", async () => {
    mailControl.cap = 0;
    vi.useFakeTimers();
    vi.setSystemTime(TICK_15Z);
    const { sendReadingDayOf } = await lib();
    const result = await sendReadingDayOf("reader@example.com", STARTS_AT_MS, "America/Denver");
    expect(result).toBe("skippedCap");
    expect(sent).toHaveLength(0);
  });

  it("R2: an unsubscribed address gets nothing", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TICK_15Z);
    const { sendReadingDayOf } = await lib();
    const result = await sendReadingDayOf("nope@example.com", STARTS_AT_MS, "America/Denver");
    expect(result).toBe("skippedUnsubscribed");
    expect(sent).toHaveLength(0);
  });

  it("R3: the once-key is PER RECIPIENT (reading-dayof:<startsAtMs>:<email>, 7 days) — one recipient's claim never blocks another's", async () => {
    subscribedState.add("a@example.com");
    subscribedState.add("b@example.com");
    vi.useFakeTimers();
    vi.setSystemTime(TICK_15Z);
    const { sendReadingDayOf } = await lib();
    const a = await sendReadingDayOf("a@example.com", STARTS_AT_MS, "America/Denver");
    const b = await sendReadingDayOf("b@example.com", STARTS_AT_MS, "America/Denver");
    expect(a).toBe("sent");
    expect(b).toBe("sent");
    expect(sent).toHaveLength(2);
    expect(onceWithinCalls).toContainEqual({ key: `reading-dayof:${STARTS_AT_MS}:a@example.com`, windowMs: 7 * 24 * 3600_000 });
    expect(onceWithinCalls).toContainEqual({ key: `reading-dayof:${STARTS_AT_MS}:b@example.com`, windowMs: 7 * 24 * 3600_000 });
  });

  it("R3: the same recipient never gets a second send for the same startsAtMs", async () => {
    subscribedState.add("a@example.com");
    vi.useFakeTimers();
    vi.setSystemTime(TICK_15Z);
    const { sendReadingDayOf } = await lib();
    const first = await sendReadingDayOf("a@example.com", STARTS_AT_MS, "America/Denver");
    const second = await sendReadingDayOf("a@example.com", STARTS_AT_MS, "America/Denver");
    expect(first).toBe("sent");
    expect(second).toBe("skippedClaimed");
    expect(sent).toHaveLength(1);
  });
});

/* ═══════════════════════ the tick's added call ═══════════════════════ */

describe("enqueueReadingDayOf — the day-of gate (R5, decision A's tick, the pure function of schedule/nowMs/once-marker)", () => {
  it("fires at a 15:00-UTC-shaped tick on the occurrence's zone-day, with capacity, for every reading-tagged subscriber", async () => {
    subscribedState.add("a@example.com");
    subscribedState.add("b@example.com");
    recordsState.push(rec("a@example.com"), rec("b@example.com"));
    const { enqueueReadingDayOf } = await lib();
    const stats = await enqueueReadingDayOf(TICK_15Z);
    expect(stats.dayOfSent).toBe(2);
    expect(sent.filter((m) => m.subject === "Don't forget — the reading is today")).toHaveLength(2);
  });

  it("silent before 02:00 local, even on the reading's own day", async () => {
    subscribedState.add("a@example.com");
    recordsState.push(rec("a@example.com"));
    const { enqueueReadingDayOf } = await lib();
    const stats = await enqueueReadingDayOf(BEFORE_2AM);
    expect(stats.dayOfSent).toBe(0);
  });

  it("silent the day prior, even past 02:00 that day", async () => {
    subscribedState.add("a@example.com");
    recordsState.push(rec("a@example.com"));
    const { enqueueReadingDayOf } = await lib();
    const stats = await enqueueReadingDayOf(DAY_PRIOR_15Z);
    expect(stats.dayOfSent).toBe(0);
  });

  it("silent once the reading has begun (nowMs >= startsAtMs) — the outer gate returns before ever listing recipients", async () => {
    subscribedState.add("a@example.com");
    // already confirmed — isolates this test to the day-of half; the
    // backlog sweep (decision E) runs unconditionally every call and is
    // covered on its own further below.
    recordsState.push(rec("a@example.com", { readingConfirmedAt: Date.now() }));
    const { enqueueReadingDayOf } = await lib();
    const stats = await enqueueReadingDayOf(STARTS_AT_MS);
    expect(stats.dayOfSent).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("R5: an explicit on:false silences the day-of letter", async () => {
    siteConfigState.reading = { ...BASE, on: false };
    subscribedState.add("a@example.com");
    recordsState.push(rec("a@example.com"));
    const { enqueueReadingDayOf } = await lib();
    const stats = await enqueueReadingDayOf(TICK_15Z);
    expect(stats.dayOfSent).toBe(0);
  });

  it("R5: an ABSENT schedule (never saved) falls back to DEFAULT_READING_SCHEDULE, which is on — 'absent = no-op' is withdrawn", async () => {
    siteConfigState.reading = undefined; // never saved — sanitizeReading's own honest absence
    subscribedState.add("a@example.com");
    recordsState.push(rec("a@example.com"));
    const { enqueueReadingDayOf } = await lib();
    // TICK_15Z/STARTS_AT_MS were measured against BASE, which is byte-identical
    // to DEFAULT_READING_SCHEDULE's own shape (Wednesday, 1:11 PM, Denver, on).
    const stats = await enqueueReadingDayOf(TICK_15Z);
    expect(stats.dayOfSent).toBe(1);
  });

  it("never twice for the same startsAtMs, across two separate tick calls", async () => {
    subscribedState.add("a@example.com");
    recordsState.push(rec("a@example.com"));
    const { enqueueReadingDayOf } = await lib();
    const first = await enqueueReadingDayOf(TICK_15Z);
    const second = await enqueueReadingDayOf(TICK_15Z);
    expect(first.dayOfSent).toBe(1);
    expect(second.dayOfSent).toBe(0);
    expect(sent.filter((m) => m.subject === "Don't forget — the reading is today")).toHaveLength(1);
  });
});

describe("the DST fixtures (T-385 idiom — tests/reading-schedule.test.ts's Denver gap/fold schedules, verbatim; consistency with nextReading, not a second policy)", () => {
  /**
   * Both fixtures schedule a reading BEFORE 02:00 local ("02:30"/"01:30"
   * nominal, resolving — per nextReading's own pinned, DST-forced-forward
   * math — to an occurrence whose own local reading is 1:30 AM). That sits
   * before this lane's 02:00 gate can ever open, so for these two specific
   * fixtures no day-of letter fires at ANY tick — the finding is honestly
   * a property of the RULE (a reading nominally earlier than 02:00 has no
   * open [02:00, start) window), not a bug this lane owns fixing. What this
   * spec pins is that the gate degrades honestly around the DST boundary:
   * never throws, never sends, across a spread of instants straddling it.
   */
  it("the spring gap (2026-03-08, Denver springs forward at 2am): no send at any sampled instant, nothing throws", async () => {
    const schedule: ReadingSchedule = { on: true, weekday: 0, time: "02:30", tz: "America/Denver", durationMin: 60 };
    siteConfigState.reading = schedule;
    subscribedState.add("a@example.com");
    // already confirmed — isolates this DST spec to the day-of half, not
    // decision E's unconditional backlog sweep (covered separately above).
    recordsState.push(rec("a@example.com", { readingConfirmedAt: Date.now() }));
    const { enqueueReadingDayOf } = await lib();
    const springStartsAtMs = Date.parse("2026-03-08T08:30:00.000Z"); // pinned in tests/reading-schedule.test.ts
    const sample = [springStartsAtMs - 3600_000, springStartsAtMs - 1, springStartsAtMs, springStartsAtMs + 5 * 60_000];
    for (const nowMs of sample) {
      sent.length = 0;
      onceWithinClaims.clear();
      await expect(enqueueReadingDayOf(nowMs)).resolves.toBeDefined();
      expect(sent).toHaveLength(0);
    }
  });

  it("the autumn fold (2026-11-01, Denver falls back at 2am): no send at any sampled instant, nothing throws", async () => {
    const schedule: ReadingSchedule = { on: true, weekday: 0, time: "01:30", tz: "America/Denver", durationMin: 60 };
    siteConfigState.reading = schedule;
    subscribedState.add("a@example.com");
    // already confirmed — isolates this DST spec to the day-of half, not
    // decision E's unconditional backlog sweep (covered separately above).
    recordsState.push(rec("a@example.com", { readingConfirmedAt: Date.now() }));
    const { enqueueReadingDayOf } = await lib();
    const fallStartsAtMs = Date.parse("2026-11-01T07:30:00.000Z"); // pinned in tests/reading-schedule.test.ts
    const sample = [fallStartsAtMs - 3600_000, fallStartsAtMs - 1, fallStartsAtMs, fallStartsAtMs + 5 * 60_000];
    for (const nowMs of sample) {
      sent.length = 0;
      onceWithinClaims.clear();
      await expect(enqueueReadingDayOf(nowMs)).resolves.toBeDefined();
      expect(sent).toHaveLength(0);
    }
  });
});

/* ═══════════════════════ decision E — the confirmation backlog sweep ═══ */

describe("the confirmation backlog sweep (decision E, R2/R3/R4)", () => {
  // BEFORE_2AM isolates the sweep from the day-of half (which no-ops that
  // early) so each test's `confirmSent`/`sent` reflect the sweep alone.

  it("a reading-tagged record with no readingConfirmedAt mark gets exactly one confirmation, across two ticks", async () => {
    subscribedState.add("soul@example.com");
    recordsState.push(rec("soul@example.com"));
    const { enqueueReadingDayOf } = await lib();

    const first = await enqueueReadingDayOf(BEFORE_2AM);
    expect(first.confirmSent).toBe(1);
    expect(sent.filter((m) => m.subject === "You're on the list for the reading")).toHaveLength(1);
    expect(markCalls).toEqual(["soul@example.com"]);

    sent.length = 0;
    const second = await enqueueReadingDayOf(BEFORE_2AM);
    expect(second.confirmSent).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("a stamped record gets none", async () => {
    subscribedState.add("done@example.com");
    recordsState.push(rec("done@example.com", { readingConfirmedAt: Date.now() - 1000 }));
    const { enqueueReadingDayOf } = await lib();
    const stats = await enqueueReadingDayOf(BEFORE_2AM);
    expect(stats.confirmSent).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("an opted-out tagged record gets none — the rail's isSubscribed guard, not re-implemented here", async () => {
    // deliberately NOT added to subscribedState: isSubscribed(email) reports false
    recordsState.push(rec("left@example.com", { optedOut: true }));
    const { enqueueReadingDayOf } = await lib();
    const stats = await enqueueReadingDayOf(BEFORE_2AM);
    expect(stats.confirmSent).toBe(0);
    expect(sent).toHaveLength(0);
    expect(markCalls).toHaveLength(0);
  });
});

/* ═══════════════════ subscribers.ts additions (Build 4) ═══════════════ */

describe("subscribers.ts additions (Build 4) — the real implementation against a stubbed KV", () => {
  let vault: Map<string, string>;
  let index: string[];

  beforeEach(() => {
    vault = new Map<string, string>();
    index = [];
    process.env.KV_REST_API_URL = "https://kv.example";
    process.env.KV_REST_API_TOKEN = "test-token";
    vi.stubGlobal("fetch", async (_url: unknown, init?: { body?: string }) => {
      const cmd = JSON.parse(init?.body ?? "[]") as [string, ...string[]];
      switch (cmd[0]) {
        case "GET":
          return Response.json({ result: vault.get(cmd[1]) ?? null });
        case "SET":
          vault.set(cmd[1], cmd[2]);
          return Response.json({ result: "OK" });
        case "SADD":
          if (!index.includes(cmd[2])) index.push(cmd[2]);
          return Response.json({ result: 1 });
        case "SMEMBERS":
          return Response.json({ result: index });
        default:
          return Response.json({ result: null });
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  it("listSubscribersByTag returns every tag-carrying record regardless of source, and never rewrites a field", async () => {
    const real = await vi.importActual<typeof import("@/lib/subscribers")>("@/lib/subscribers");
    await real.addSubscriber("footer-soul@example.com", "footer");
    await real.addReadingTag("footer-soul@example.com"); // tags an existing record without touching its source
    await real.addReadingTag("fresh@example.com"); // brand-new, arrived through the reading door itself
    const before = vault.get("mail:sub:footer-soul@example.com");

    const records = await real.listSubscribersByTag("reading");
    const emails = records.map((r) => r.email).sort();
    expect(emails).toEqual(["footer-soul@example.com", "fresh@example.com"]);
    const footerRec = records.find((r) => r.email === "footer-soul@example.com")!;
    expect(footerRec.source).toBe("footer"); // untouched — the door they first arrived through
    expect(footerRec.tags).toEqual(["reading"]);
    expect(vault.get("mail:sub:footer-soul@example.com")).toBe(before); // listing never writes
  });

  it("markReadingConfirmed stamps readingConfirmedAt and leaves source/optedOut/tags untouched", async () => {
    const real = await vi.importActual<typeof import("@/lib/subscribers")>("@/lib/subscribers");
    await real.addReadingTag("stamped@example.com");
    await real.markReadingConfirmed("stamped@example.com");
    const stored = JSON.parse(vault.get("mail:sub:stamped@example.com")!) as SubscriberRecord;
    expect(typeof stored.readingConfirmedAt).toBe("number");
    expect(stored.source).toBe("reading");
    expect(stored.tags).toEqual(["reading"]);
    expect(stored.optedOut).toBeUndefined();
  });

  it("markReadingConfirmed on an unknown email is a quiet no-op, not an error", async () => {
    const real = await vi.importActual<typeof import("@/lib/subscribers")>("@/lib/subscribers");
    await expect(real.markReadingConfirmed("ghost@example.com")).resolves.toBeUndefined();
  });
});

/* ═══════════ route-level: the subscribe branch sends on outcome:'joined' only ═══════════ */

describe("the subscribe route sends the confirmation on outcome:'joined' only (R2/R3/R4, route-level)", () => {
  const routeMod = () => import("@/app/api/subscribe/route");
  function join(source: string, email = "reader@example.com") {
    return new Request("http://test/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source }),
    });
  }

  it("outcome:'joined' — the confirmation goes out exactly once, the branch's return shape is unchanged", async () => {
    readingTagControl.outcome = "joined";
    subscribedState.add("reader@example.com");
    const { POST } = await routeMod();
    const res = await POST(join("reading"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, outcome: "joined" });
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe("You're on the list for the reading");
    expect(markCalls).toEqual(["reader@example.com"]);
  });

  it("outcome:'already' — no second confirmation", async () => {
    readingTagControl.outcome = "already";
    subscribedState.add("reader@example.com");
    const { POST } = await routeMod();
    const res = await POST(join("reading"));
    expect(await res.json()).toEqual({ ok: true, outcome: "already" });
    expect(sent).toHaveLength(0);
  });

  it("outcome:'unsubscribed' — no letter, ever", async () => {
    readingTagControl.outcome = "unsubscribed";
    subscribedState.add("reader@example.com");
    const { POST } = await routeMod();
    const res = await POST(join("reading"));
    expect(await res.json()).toEqual({ ok: true, outcome: "unsubscribed" });
    expect(sent).toHaveLength(0);
  });

  it("a send failure never crashes the response — swallowed exactly like the route's existing rail-dark guard", async () => {
    readingTagControl.outcome = "joined";
    subscribedState.add("reader@example.com");
    mailControl.throwNextSend = true;
    const { POST } = await routeMod();
    const res = await POST(join("reading"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, outcome: "joined" });
  });
});

/* ═══════════ route-level: the tick's reading orchestration (Astra §4) ═══════════ */

describe("the tick route — reading day-of orchestration (Astra §4, R1)", () => {
  const tickRoute = () => import("@/app/api/mail/tick/route");
  const tickRequest = () => new Request("http://test/api/mail/tick", { method: "GET" });

  it("a 15:00-UTC-shaped tick on the reading's zone-day, with capacity, sends the eligible reminders BEFORE the handler returns", async () => {
    subscribedState.add("a@example.com");
    // already confirmed — isolates this spec to the day-of half; decision
    // E's backlog sweep (unconditional every tick) is covered on its own.
    recordsState.push(rec("a@example.com", { readingConfirmedAt: Date.now() }));
    vi.useFakeTimers();
    vi.setSystemTime(TICK_15Z);
    const { GET } = await tickRoute();
    const res = await GET(tickRequest());
    // already true the instant GET resolves — proves the send is awaited
    // inside the handler, never fired-and-forgotten past the response.
    expect(sent).toHaveLength(1);
    const json = (await res.json()) as { reading: { dayOfSent: number } };
    expect(json.reading.dayOfSent).toBe(1);
  });

  it("a tick at/after startsAtMs sends none", async () => {
    subscribedState.add("a@example.com");
    recordsState.push(rec("a@example.com", { readingConfirmedAt: Date.now() }));
    vi.useFakeTimers();
    vi.setSystemTime(STARTS_AT_MS);
    const { GET } = await tickRoute();
    const res = await GET(tickRequest());
    expect(sent).toHaveLength(0);
    const json = (await res.json()) as { reading: { dayOfSent: number } };
    expect(json.reading.dayOfSent).toBe(0);
  });

  it("a tick with the meter spent sends none and reports skippedCap", async () => {
    subscribedState.add("a@example.com");
    recordsState.push(rec("a@example.com"));
    mailControl.cap = 0;
    vi.useFakeTimers();
    vi.setSystemTime(TICK_15Z);
    const { GET } = await tickRoute();
    const res = await GET(tickRequest());
    expect(sent).toHaveLength(0);
    const json = (await res.json()) as { reading: { dayOfSent: number; skippedCap: number } };
    expect(json.reading.dayOfSent).toBe(0);
    expect(json.reading.skippedCap).toBeGreaterThan(0);
  });
});

/* ═══════════════════ vercel.json — the no-new-scheduler law ═══════════════ */

describe("vercel.json still carries exactly ONE cron line", () => {
  it("crons has exactly one entry, the existing daily tick, unmodified", () => {
    const raw = fs.readFileSync(path.join(process.cwd(), "vercel.json"), "utf8");
    const parsed = JSON.parse(raw) as { crons: Array<{ path: string; schedule: string }> };
    expect(parsed.crons).toHaveLength(1);
    expect(parsed.crons[0]).toEqual({ path: "/api/mail/tick", schedule: "0 15 * * *" });
  });
});
