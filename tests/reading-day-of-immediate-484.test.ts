import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import type { OutgoingMail } from "@/lib/mail";
import type { SubscriberRecord } from "@/lib/subscribers";
import type { ReadingSchedule } from "@/lib/reading-schedule";

/**
 * TASK-484 — walk item #2: a LATE reading sign-up still gets letter #2
 * (the reading-day letter), and gets it as close to sign-up as the
 * schedule allows.
 *
 * FIRST — verify what already holds, before touching any code: does the
 * existing tick (`sendDayOfIfDue`, running on EVERY `/api/mail/tick` —
 * the Vercel crons plus the VPS crontab every 10 minutes) already reach a
 * late sign-up at the very next tick? Reading `sendDayOfIfDue`: it lists
 * EVERY `reading`-tagged subscriber on every call (`listSubscribersByTag`
 * — a fresh read each time, never a snapshot taken once) and sends
 * through `sendReadingDayOf`, whose own once-key is per recipient
 * (`reading-dayof:<startsAtMs>:<email>`, R3). A soul who joins BETWEEN
 * two ticks is simply unclaimed until the next one finds them — nothing
 * in the gate is keyed to "when did this soul join". The "verify it
 * holds" describe block below proves exactly that against the REAL
 * `enqueueReadingDayOf`, not a mock of it: **it already holds** — the
 * only real gap was TIME (up to 10 minutes, the VPS crontab's own
 * cadence), which is what this lane's `sendDayOfToOneIfDue` closes for
 * the one soul who just signed up.
 *
 * THEN — the new immediate path, wired into `/api/subscribe`'s own
 * `reading` branch, right after the confirmation send. Mocking idiom
 * lifted verbatim from `tests/reading-letters.test.ts` (the same rail/
 * vault/site-config seams), so this file proves the WIRING, not a
 * reimplementation of reading-letters.ts's own send paths.
 */

const sent = vi.hoisted(() => [] as OutgoingMail[]);
const mailControl = vi.hoisted(() => ({ cap: 100, throwNextSend: false, sendCalls: 0, failOnCall: 0 }));
const onceWithinClaims = vi.hoisted(() => new Set<string>());
const subscribedState = vi.hoisted(() => new Set<string>());
const recordsState = vi.hoisted(() => [] as SubscriberRecord[]);
const markCalls = vi.hoisted(() => [] as string[]);
const readingTagControl = vi.hoisted(() => ({ outcome: "joined" as "joined" | "already" | "unsubscribed" }));
const siteConfigState = vi.hoisted(() => ({ reading: undefined as ReadingSchedule | undefined }));

vi.mock("@/lib/mail", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/mail")>();
  return {
    ...actual,
    mailConfigured: () => true,
    sendMail: async (_persona: string, mail: OutgoingMail) => {
      mailControl.sendCalls++;
      if (mailControl.throwNextSend) {
        mailControl.throwNextSend = false;
        throw new Error("simulated SMTP failure");
      }
      if (mailControl.failOnCall === mailControl.sendCalls) {
        throw new Error(`simulated SMTP failure on call #${mailControl.sendCalls}`);
      }
      sent.push(mail);
    },
    capRemaining: async () => mailControl.cap,
    onceWithin: async (key: string) => {
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

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://reading-immediate-test.example";
});

beforeEach(() => {
  sent.length = 0;
  mailControl.cap = 100;
  mailControl.throwNextSend = false;
  mailControl.sendCalls = 0;
  mailControl.failOnCall = 0;
  onceWithinClaims.clear();
  subscribedState.clear();
  recordsState.length = 0;
  markCalls.length = 0;
  readingTagControl.outcome = "joined";
  siteConfigState.reading = undefined;
});

afterEach(() => {
  vi.useRealTimers();
});

// verbatim from tests/reading-letters.test.ts — cross-checked against
// nextReading's own pinned math (tests/reading-schedule.test.ts), not
// hand-derived; kept identical so both files agree on the same instants.
const STARTS_AT_MS = Date.parse("2026-09-23T19:11:00.000Z"); // Wednesday 1:11 PM MDT
const TICK_15Z = Date.parse("2026-09-23T15:00:00.000Z"); // 9:00 AM MDT, same zone-day, past 02:00, before start
const BEFORE_2AM = Date.parse("2026-09-23T07:00:00.000Z"); // 1:00 AM MDT, same zone-day — too early
const DAY_PRIOR_15Z = Date.parse("2026-09-22T15:00:00.000Z"); // Tuesday 9:00 AM MDT — not the reading's day

const readingLib = () => import("@/lib/reading-letters");

function rec(email: string): SubscriberRecord {
  return { email, joinedAtMs: Date.now(), source: "reading", tags: ["reading"], readingConfirmedAt: Date.now() };
}

describe("verify first: the existing tick already reaches a late sign-up (before any code change here)", () => {
  it("a soul who joins AFTER one tick's sweep still gets the day-of letter at the NEXT tick — the gate is never keyed to join time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TICK_15Z);
    const { enqueueReadingDayOf } = await readingLib();

    // tick #1: nobody on the list yet
    const first = await enqueueReadingDayOf(TICK_15Z);
    expect(first.dayOfSent).toBe(0);

    // a soul joins BETWEEN ticks — no code from this lane runs here, just
    // the vault gaining a record, exactly as a real sign-up would
    subscribedState.add("late@example.com");
    recordsState.push(rec("late@example.com"));

    // tick #2, a few minutes later, same zone-day, still before the start
    vi.setSystemTime(TICK_15Z + 5 * 60_000);
    const second = await enqueueReadingDayOf(TICK_15Z + 5 * 60_000);
    expect(second.dayOfSent).toBe(1);
    expect(sent.filter((m) => m.to === "late@example.com")).toHaveLength(1);
  });
});

describe("sendDayOfToOneIfDue — the one soul's immediate send", () => {
  it("before 02:00 on the reading's own day: notDue, nothing sent", async () => {
    subscribedState.add("a@example.com");
    const { sendDayOfToOneIfDue } = await readingLib();
    const result = await sendDayOfToOneIfDue("a@example.com", BEFORE_2AM);
    expect(result).toBe("notDue");
    expect(sent).toHaveLength(0);
  });

  it("after 02:00, before the reading starts: sent, exactly once", async () => {
    subscribedState.add("a@example.com");
    vi.useFakeTimers();
    vi.setSystemTime(TICK_15Z);
    const { sendDayOfToOneIfDue } = await readingLib();
    const result = await sendDayOfToOneIfDue("a@example.com", TICK_15Z);
    expect(result).toBe("sent");
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe("Don't forget — the reading is today");
  });

  it("once the reading has begun: notDue, nothing sent", async () => {
    subscribedState.add("a@example.com");
    const { sendDayOfToOneIfDue } = await readingLib();
    const result = await sendDayOfToOneIfDue("a@example.com", STARTS_AT_MS);
    expect(result).toBe("notDue");
    expect(sent).toHaveLength(0);
  });

  it("on a day that isn't the reading's own day: notDue, even well past 02:00 local", async () => {
    subscribedState.add("a@example.com");
    const { sendDayOfToOneIfDue } = await readingLib();
    const result = await sendDayOfToOneIfDue("a@example.com", DAY_PRIOR_15Z);
    expect(result).toBe("notDue");
    expect(sent).toHaveLength(0);
  });

  it("a sign-up, then a tick: still exactly one day-of — the shared once-key stops the double-send", async () => {
    subscribedState.add("a@example.com");
    recordsState.push(rec("a@example.com"));
    vi.useFakeTimers();
    vi.setSystemTime(TICK_15Z);
    const { sendDayOfToOneIfDue, enqueueReadingDayOf } = await readingLib();

    const immediate = await sendDayOfToOneIfDue("a@example.com", TICK_15Z);
    expect(immediate).toBe("sent");

    vi.setSystemTime(TICK_15Z + 60_000);
    const tick = await enqueueReadingDayOf(TICK_15Z + 60_000);
    expect(tick.dayOfSent).toBe(0); // the once-key this call already claimed stops the sweep's own attempt
    expect(sent.filter((m) => m.subject === "Don't forget — the reading is today")).toHaveLength(1);
  });
});

describe("the subscribe route — a genuinely new reading sign-up gets the confirmation first, then #2 if due", () => {
  const routeMod = () => import("@/app/api/subscribe/route");
  function join(email = "reader@example.com") {
    return new Request("http://test/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "reading" }),
    });
  }

  it("outcome:'joined', due right now: the confirmation goes out FIRST, then #2 — never reordered", async () => {
    subscribedState.add("reader@example.com");
    vi.useFakeTimers();
    vi.setSystemTime(TICK_15Z);
    readingTagControl.outcome = "joined";
    const { POST } = await routeMod();
    const res = await POST(join());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, outcome: "joined" });
    expect(sent).toHaveLength(2);
    expect(sent[0].subject).toBe("You're on the list for the reading");
    expect(sent[1].subject).toBe("Don't forget — the reading is today");
    expect(markCalls).toEqual(["reader@example.com"]); // the confirmation's own stamp, unaffected
  });

  it("outcome:'joined', NOT due (before 02:00): the confirmation still goes, #2 does not", async () => {
    subscribedState.add("reader@example.com");
    vi.useFakeTimers();
    vi.setSystemTime(BEFORE_2AM);
    readingTagControl.outcome = "joined";
    const { POST } = await routeMod();
    await POST(join());
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe("You're on the list for the reading");
  });

  it("outcome:'already' — neither letter, this is not a fresh sign-up", async () => {
    subscribedState.add("reader@example.com");
    vi.useFakeTimers();
    vi.setSystemTime(TICK_15Z);
    readingTagControl.outcome = "already";
    const { POST } = await routeMod();
    await POST(join());
    expect(sent).toHaveLength(0);
  });

  it("a day-of send failure never crashes the response — swallowed exactly like the confirmation's own guard", async () => {
    subscribedState.add("reader@example.com");
    vi.useFakeTimers();
    vi.setSystemTime(TICK_15Z);
    readingTagControl.outcome = "joined";
    // the confirmation (sendMail call #1) sends fine; the day-of attempt
    // right after it (call #2) throws — proves the route swallows THAT
    // failure specifically, never touching the confirmation's own success.
    mailControl.failOnCall = 2;
    const { POST } = await routeMod();
    const res = await POST(join());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, outcome: "joined" });
    expect(sent).toHaveLength(1); // the confirmation alone — the day-of copy never landed
    expect(sent[0].subject).toBe("You're on the list for the reading");
  });
});
