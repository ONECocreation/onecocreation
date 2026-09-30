import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import type { OutgoingMail } from "@/lib/mail";
import type { ReadingSchedule } from "@/lib/reading-schedule";

/**
 * TASK-534 (Wednesday half) - the weekly "next reading" DRAFT. Pins the
 * Tuesday rule (truth table, DST, non-Denver zones), derive-or-dash, the
 * Housewarming-off week, the words (Love's voice, no em dash, no arrow, no
 * emoji), the once-key (two ticks make ONE draft, a failed create releases
 * the marker), the review copy (direct, cap-checked before each send, once
 * per recipient, recipients are only the operator set), the operator-only
 * ?draft=now poke, and THE LAW: no path from a draft to the list.
 *
 * The KV vault is a global-fetch stub (the same idiom tests/reading-letters
 * uses), so the REAL letters.ts createLetter/saveLetterOverride run.
 */

const sent = vi.hoisted(() => [] as OutgoingMail[]);
const sentPersonas = vi.hoisted(() => [] as string[]);
const mailControl = vi.hoisted(() => ({ cap: 100, capCalls: 0 }));
const onceClaims = vi.hoisted(() => new Set<string>());
const cfg = vi.hoisted(() => ({ reading: undefined as ReadingSchedule | undefined, housewarming: undefined as boolean | undefined }));

vi.mock("@/lib/mail", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/mail")>();
  return {
    ...actual,
    sendMail: async (persona: string, mail: OutgoingMail) => {
      sentPersonas.push(persona);
      sent.push(mail);
      mailControl.cap -= 1;
    },
    capRemaining: async () => {
      mailControl.capCalls++;
      return mailControl.cap;
    },
    onceWithin: async (key: string) => {
      if (onceClaims.has(key)) return false;
      onceClaims.add(key);
      return true;
    },
  };
});

vi.mock("@/lib/site-config", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/site-config")>();
  return {
    ...actual,
    getSiteConfig: async () => ({ ...actual.defaultSiteConfig(), reading: cfg.reading, housewarming: cfg.housewarming }),
  };
});

vi.mock("@/lib/mail-queue", () => ({
  tick: async () => ({ sent: 0, failed: 0, requeued: 0, remainingInQueue: 0, capLeftThisHour: 100 }),
}));
vi.mock("@/lib/reading-letters", () => ({
  enqueueReadingDayOf: async () => ({ dayOfSent: 0, confirmSent: 0, skippedCap: 0, skippedLate: 0 }),
}));

/* the vault stub */
const store = new Map<string, string>();
const kvFail = vi.hoisted(() => ({ substr: null as string | null, once: false }));
function installKv() {
  vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
    const cmd = JSON.parse(init.body) as string[];
    const [op, k, v, ...rest] = cmd;
    if (kvFail.substr && op === "SET" && k.includes(kvFail.substr) && kvFail.once) {
      kvFail.once = false;
      return { ok: false, status: 500, json: async () => ({}) };
    }
    let result: unknown = null;
    if (op === "GET") result = store.get(k) ?? null;
    else if (op === "DEL") result = store.delete(k) ? 1 : 0;
    else if (op === "SET") {
      if (rest.includes("NX") && store.has(k)) result = null;
      else {
        store.set(k, v);
        result = "OK";
      }
    }
    return { ok: true, status: 200, json: async () => ({ result }) };
  });
}

const SUNDAY: ReadingSchedule = { on: true, weekday: 0, time: "13:11", tz: "America/Denver", durationMin: 120 };
/* Tuesday Oct 6 2026 09:00 MDT, five days before Sunday Oct 11 1:11 PM MDT. */
const TUE_0900_MDT = Date.UTC(2026, 9, 6, 15, 0);
const SUN_READING = Date.UTC(2026, 9, 11, 19, 11);

const mod = () => import("@/lib/reading-week-drafts");
const lettersMod = () => import("@/lib/letters");

beforeEach(() => {
  sent.length = 0;
  sentPersonas.length = 0;
  onceClaims.clear();
  store.clear();
  mailControl.cap = 100;
  mailControl.capCalls = 0;
  cfg.reading = SUNDAY;
  cfg.housewarming = undefined;
  kvFail.substr = null;
  process.env.KV_REST_API_URL = "https://kv.test";
  process.env.KV_REST_API_TOKEN = "t";
  process.env.OPERATOR_EMAILS = "Love@OneCocreation.com, admiral@example.org ,";
  process.env.OFFER_NOTIFY_EMAIL = "love@onecocreation.com";
  process.env.NEXT_PUBLIC_SITE_URL = "https://site.test";
  installKv();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.OPERATOR_EMAILS;
  delete process.env.OFFER_NOTIFY_EMAIL;
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

describe("the Tuesday rule (draftableReading)", () => {
  it("drafts on the schedule zone's Tuesday for a reading more than 24h and within 8 days away", async () => {
    const { draftableReading } = await mod();
    expect(draftableReading(SUNDAY, TUE_0900_MDT)).toEqual({ startsAtMs: SUN_READING, tz: "America/Denver" });
  });

  it("does not draft on any other weekday", async () => {
    const { draftableReading } = await mod();
    for (const d of [5, 7, 8, 9, 10, 11]) {
      // Oct 5 = Monday ... Oct 11 = Sunday, all at 09:00 MDT
      expect(draftableReading(SUNDAY, Date.UTC(2026, 9, d, 15, 0))).toBeNull();
    }
  });

  it("uses the schedule's own zone for 'Tuesday' (Tuesday evening Denver is already Wednesday UTC)", async () => {
    const { draftableReading } = await mod();
    // Wed 05:30 UTC = Tue 23:30 MDT
    expect(draftableReading(SUNDAY, Date.UTC(2026, 9, 7, 5, 30))).not.toBeNull();
    // Tue 05:30 UTC = Mon 23:30 MDT
    expect(draftableReading(SUNDAY, Date.UTC(2026, 9, 6, 5, 30))).toBeNull();
  });

  it("skips when the schedule is off (no reading is published)", async () => {
    const { draftableReading } = await mod();
    expect(draftableReading({ ...SUNDAY, on: false }, TUE_0900_MDT)).toBeNull();
  });

  it("skips when the reading is less than 24 hours away, and the poke does not lift that", async () => {
    const { draftableReading } = await mod();
    const wed: ReadingSchedule = { ...SUNDAY, weekday: 3 };
    // Wednesday Oct 7 1:11 PM MDT is 28h after Tuesday 09:00 MDT: drafts.
    expect(draftableReading(wed, TUE_0900_MDT)).not.toBeNull();
    // Tuesday reading, Tuesday 02:05 MDT: 11h away, skipped even when forced.
    const tue: ReadingSchedule = { ...SUNDAY, weekday: 2 };
    const t0205 = Date.UTC(2026, 9, 6, 8, 5);
    expect(draftableReading(tue, t0205)).toBeNull();
    expect(draftableReading(tue, t0205, true)).toBeNull();
  });

  it("skips a reading already under way", async () => {
    const { draftableReading } = await mod();
    const tue: ReadingSchedule = { ...SUNDAY, weekday: 2 };
    expect(draftableReading(tue, Date.UTC(2026, 9, 6, 20, 0), true)).toBeNull();
  });

  it("the poke bypasses only the weekday check", async () => {
    const { draftableReading } = await mod();
    const thu = Date.UTC(2026, 9, 8, 15, 0);
    expect(draftableReading(SUNDAY, thu)).toBeNull();
    expect(draftableReading(SUNDAY, thu, true)).toEqual({ startsAtMs: SUN_READING, tz: "America/Denver" });
  });

  it("holds across the November clock change (Sunday Nov 8, MST) and for a non-Denver zone", async () => {
    const { draftableReading } = await mod();
    // Tuesday Nov 3 09:00 MST = 16:00 UTC; Sunday Nov 8 13:11 MST = 20:11 UTC
    expect(draftableReading(SUNDAY, Date.UTC(2026, 10, 3, 16, 0))).toEqual({ startsAtMs: Date.UTC(2026, 10, 8, 20, 11), tz: "America/Denver" });
    // Auckland: Tuesday Oct 6 09:00 NZDT is Monday Oct 5 20:00 UTC
    const nz: ReadingSchedule = { ...SUNDAY, tz: "Pacific/Auckland", time: "10:00" };
    const got = draftableReading(nz, Date.UTC(2026, 9, 5, 20, 0));
    expect(got?.tz).toBe("Pacific/Auckland");
    expect(draftableReading(nz, Date.UTC(2026, 9, 6, 20, 0))).toBeNull(); // Wednesday there
  });
});

describe("the words (derived, Love's voice)", () => {
  it("derives the date words from the instant and the schedule's zone", async () => {
    const { whenWords, nextReadingKey } = await mod();
    expect(whenWords(SUN_READING, "America/Denver")).toBe("Sunday, October 11 at 1:11 PM Mountain");
    expect(whenWords(Date.UTC(2026, 9, 11, 17, 30), "America/New_York")).toBe("Sunday, October 11 at 1:30 PM EDT");
    expect(nextReadingKey(SUN_READING, "America/Denver")).toBe("next-reading-2026-10-11");
    // 20:00 UTC on Oct 11 is already Oct 12 in Auckland: the key follows the zone
    expect(nextReadingKey(Date.UTC(2026, 9, 11, 20, 0), "Pacific/Auckland")).toBe("next-reading-2026-10-12");
  });

  it("writes the ruled subject and body, ends with Love's sign-off, and no em dash, arrow or emoji", async () => {
    const { nextReadingLetter } = await mod();
    const l = nextReadingLetter(SUN_READING, "America/Denver");
    expect(l.subject).toBe("The next reading: Sunday, October 11 at 1:11 PM Mountain");
    expect(l.body).toContain("Hello, beautiful soul.");
    expect(l.body).toContain("The next reading is Sunday, October 11 at 1:11 PM Mountain. Come and read with me, free.");
    expect(l.body).toContain("!cta: Join the reading | /reading");
    expect(l.body).toContain("[Watch the replays](/replays)");
    expect(l.body.endsWith("With love,\nLove · ONE Cocreation")).toBe(true);
    for (const s of [l.subject, l.body]) {
      expect(s).not.toMatch(/[—–]/);
      expect(s).not.toMatch(/[←-⇿➡➔\u{1F300}-\u{1FAFF}☀-➿]/u);
    }
    expect(l.body).not.toContain("/pac");
  });
});

describe("the Housewarming-off week (T-499 switch)", () => {
  it("says the reading's own time and never promises a Housewarming, switch on or off", async () => {
    const { draftReadingLetters } = await mod();
    const { getLetterOverride } = await lettersMod();
    for (const hw of [false, true, undefined]) {
      store.clear();
      onceClaims.clear();
      cfg.housewarming = hw;
      const stats = await draftReadingLetters(TUE_0900_MDT);
      expect(stats.nextReading).toBe("drafted");
      const o = await getLetterOverride("next-reading-2026-10-11");
      expect(o?.subject).toContain("1:11 PM Mountain");
      expect(o?.body).not.toMatch(/housewarming|12:12/i);
    }
  });
});

describe("derive-or-dash", () => {
  it("a schedule that is off makes no draft and mails nothing", async () => {
    const { draftReadingLetters } = await mod();
    cfg.reading = { ...SUNDAY, on: false };
    const stats = await draftReadingLetters(TUE_0900_MDT);
    expect(stats).toEqual({ nextReading: "skipped", replay: "held", reviewSent: 0 });
    expect(store.size).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("a week with no reading in the window (Wednesday tick) makes nothing", async () => {
    const { draftReadingLetters } = await mod();
    const stats = await draftReadingLetters(Date.UTC(2026, 9, 7, 15, 0));
    expect(stats.nextReading).toBe("skipped");
    expect(sent).toHaveLength(0);
  });

  it("reads DEFAULT_READING_SCHEDULE (Wednesday 1:11 PM Mountain) when the site has none saved", async () => {
    const { draftReadingLetters } = await mod();
    const { getLetterOverride } = await lettersMod();
    cfg.reading = undefined;
    const stats = await draftReadingLetters(TUE_0900_MDT);
    expect(stats.key).toBe("next-reading-2026-10-07");
    expect((await getLetterOverride("next-reading-2026-10-07"))?.subject).toBe("The next reading: Wednesday, October 7 at 1:11 PM Mountain");
  });
});

describe("the once-key", () => {
  it("two ticks (and three on a Tuesday) make ONE draft and one review copy per recipient", async () => {
    const { draftReadingLetters } = await mod();
    const { composedLetterKeys } = await lettersMod();
    const a = await draftReadingLetters(TUE_0900_MDT);
    const b = await draftReadingLetters(TUE_0900_MDT + 5 * 60_000);
    expect(a.nextReading).toBe("drafted");
    expect(b.nextReading).toBe("already");
    expect(await composedLetterKeys()).toEqual(["next-reading-2026-10-11"]);
    expect(a.reviewSent).toBe(2);
    expect(b.reviewSent).toBe(0);
    expect(sent).toHaveLength(2);
    expect([...store.keys()].some((k) => k === "letters:draft-once:next-reading:2026-10-11")).toBe(true);
  });

  it("a failed create releases the marker, so the next tick retries and still makes one draft", async () => {
    const { draftReadingLetters } = await mod();
    const { composedLetterKeys } = await lettersMod();
    kvFail.substr = "letters:meta:";
    kvFail.once = true;
    const a = await draftReadingLetters(TUE_0900_MDT);
    expect(a.nextReading).toBe("error");
    expect(store.has("letters:draft-once:next-reading:2026-10-11")).toBe(false);
    expect(sent).toHaveLength(0);
    const b = await draftReadingLetters(TUE_0900_MDT + 60_000);
    expect(b.nextReading).toBe("drafted");
    expect(await composedLetterKeys()).toEqual(["next-reading-2026-10-11"]);
  });

  it("a half-made letter (created, body never saved) is filled, never duplicated or overwritten", async () => {
    const { draftReadingLetters } = await mod();
    const { createLetter, getLetterOverride, saveLetterOverride } = await lettersMod();
    await createLetter({ key: "next-reading-2026-10-11", title: "x", audience: "list" });
    const a = await draftReadingLetters(TUE_0900_MDT);
    expect(a.nextReading).toBe("drafted");
    expect((await getLetterOverride("next-reading-2026-10-11"))?.body).toContain("Hello, beautiful soul.");
    // Love edits; a later poke must not touch her words
    await saveLetterOverride("next-reading-2026-10-11", { subject: "Mine", body: "Her words", audience: "members" });
    store.delete("letters:draft-once:next-reading:2026-10-11");
    const b = await draftReadingLetters(TUE_0900_MDT);
    expect(b.nextReading).toBe("already");
    expect((await getLetterOverride("next-reading-2026-10-11"))?.body).toBe("Her words");
  });

  it("no vault means no draft (fails closed, never a duplicate)", async () => {
    const { draftReadingLetters } = await mod();
    delete process.env.KV_REST_API_URL;
    const stats = await draftReadingLetters(TUE_0900_MDT);
    expect(stats.nextReading).toBe("already");
    expect(sent).toHaveLength(0);
  });
});

describe("the review copy", () => {
  it("goes direct from news@ to exactly the operator recipient set, marked as prepared automatically", async () => {
    const { draftReadingLetters } = await mod();
    await draftReadingLetters(TUE_0900_MDT);
    expect(sentPersonas).toEqual(["news", "news"]);
    expect(sent.map((m) => m.to).sort()).toEqual(["admiral@example.org", "love@onecocreation.com"]);
    for (const m of sent) {
      expect(m.subject).toBe("Draft for your review: The next reading: Sunday, October 11 at 1:11 PM Mountain");
      expect(m.html).toContain("This letter was prepared automatically for Love&#39;s review. Nothing has gone to the list.");
      expect(m.html).toContain('href="https://site.test/a/letters/next-reading-2026-10-11"');
      expect(m.html).toContain("Open it to edit and send");
      expect(m.html).toContain("Hello, beautiful soul.");
      expect(m.html).not.toMatch(/[—]/);
      expect(m.unsubscribeUrl).toBeUndefined();
    }
  });

  it("checks the hourly cap before EACH send", async () => {
    const { draftReadingLetters } = await mod();
    mailControl.cap = 1;
    const stats = await draftReadingLetters(TUE_0900_MDT);
    expect(stats.reviewSent).toBe(1);
    expect(mailControl.capCalls).toBeGreaterThanOrEqual(2);
    expect(sent).toHaveLength(1);
  });

  it("sends once per recipient per letter (a later poke re-mails nobody)", async () => {
    const { draftReadingLetters } = await mod();
    await draftReadingLetters(TUE_0900_MDT);
    const again = await draftReadingLetters(TUE_0900_MDT + 3600_000, { force: true });
    expect(again.reviewSent).toBe(0);
    expect(sent).toHaveLength(2);
  });

  it("recipients: notice address plus OPERATOR_EMAILS, lowercased, deduped, malformed dropped", async () => {
    const { reviewRecipients } = await mod();
    expect(reviewRecipients("A@x.org, a@x.org ,love@onecocreation.com, bad, x@y\nz.org, a@b.co;evil@e.org", "Love@OneCocreation.com")).toEqual([
      "love@onecocreation.com",
      "a@x.org",
    ]);
    expect(reviewRecipients(undefined, "love@onecocreation.com")).toEqual(["love@onecocreation.com"]);
  });

  it("an unset notice address still falls back to love@ (never an empty set by omission)", async () => {
    const { reviewRecipients } = await mod();
    delete process.env.OFFER_NOTIFY_EMAIL;
    expect(reviewRecipients("")).toEqual(["love@onecocreation.com"]);
  });

  it("a hostile subject or key cannot break out of the review html", async () => {
    const { reviewCopyHtml } = await mod();
    const html = reviewCopyHtml('k"><script>x</script>', "Hi <script>alert(1)</script>\n\n!cta: x | javascript:alert(1)");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('href="javascript:');
  });
});

describe("THE LAW: nothing reaches the list", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "src/lib/reading-week-drafts.ts"), "utf8");
  it("the module imports no queue, no list send, no subscriber reads (siteBase only)", () => {
    expect(src).not.toMatch(/mail-queue/);
    expect(src).not.toMatch(/\benqueue\b/);
    expect(src).not.toMatch(/admin\/letters/);
    expect(src).not.toMatch(/listSubscribers|isSubscribed|subscriberSegments/);
    expect(src).toMatch(/import \{ siteBase \} from "@\/lib\/subscribers"/);
    expect(src).not.toMatch(/sendMail\("bookings"/);
  });
  it("no string that reaches a letter carries an em dash or an arrow glyph", () => {
    const strings = src.match(/"[^"\n]*"|`[^`]*`/g) ?? [];
    for (const s of strings) expect(s).not.toMatch(/[—→➡➔⮕]/);
  });
  it("every mail the whole tick run sends is to the operator recipient set only", async () => {
    const { draftReadingLetters } = await mod();
    await draftReadingLetters(TUE_0900_MDT, { force: true });
    const allowed = new Set(["love@onecocreation.com", "admiral@example.org"]);
    for (const m of sent) expect(allowed.has(m.to)).toBe(true);
  });
});

describe("the tick route and the ?draft=now poke", () => {
  async function call(url: string, headers: Record<string, string>) {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(Date.UTC(2026, 9, 8, 15, 0))); // a Thursday
    const { GET } = await import("@/app/api/mail/tick/route");
    return GET(new Request(url, { headers }));
  }
  beforeEach(() => {
    process.env.SEAT_SECRET = "seat-secret";
    process.env.CRON_SECRET = "cron-secret";
  });
  afterEach(() => {
    delete process.env.SEAT_SECRET;
    delete process.env.CRON_SECRET;
  });

  it("the public cron path never pokes: a Thursday cron tick drafts nothing, even with ?draft=now", async () => {
    const res = await call("https://site.test/api/mail/tick?draft=now", { authorization: "Bearer cron-secret" });
    const j = await res.json();
    expect(j.ok).toBe(true);
    expect(j.drafts.nextReading).toBe("skipped");
    expect(sent).toHaveLength(0);
  });

  it("the seat secret can poke: it makes this week's draft on a non-Tuesday", async () => {
    const res = await call("https://site.test/api/mail/tick?draft=now", { "x-seat-secret": "seat-secret" });
    const j = await res.json();
    expect(j.drafts.nextReading).toBe("drafted");
    expect(j.drafts.key).toBe("next-reading-2026-10-11");
    expect(j.drafts.reviewSent).toBe(2);
  });

  it("no key at all is 401 and drafts nothing", async () => {
    const res = await call("https://site.test/api/mail/tick?draft=now", {});
    expect(res.status).toBe(401);
    expect(store.size).toBe(0);
  });

  it("a draft failure never fails the tick (ok stays true)", async () => {
    vi.doMock("@/lib/reading-week-drafts", () => ({
      draftReadingLetters: async () => {
        throw new Error("boom");
      },
    }));
    vi.resetModules();
    const res = await call("https://site.test/api/mail/tick", { authorization: "Bearer cron-secret" });
    expect((await res.json()).ok).toBe(true);
    vi.doUnmock("@/lib/reading-week-drafts");
    vi.resetModules();
  });

  it("route source: drafts run after the day-of call in their own try/catch, and only seat/operator callers poke", () => {
    const r = fs.readFileSync(path.join(__dirname, "..", "src/app/api/mail/tick/route.ts"), "utf8");
    expect(r.indexOf("enqueueReadingDayOf(")).toBeLessThan(r.indexOf("draftReadingLetters("));
    expect(r).toMatch(/pokeAllowed/);
  });
});

describe("the Reading group of /a/letters", () => {
  it("adopts both draft prefixes through the one client-safe list", async () => {
    const { isReadingDraftKey, READING_DRAFT_PREFIXES } = await import("@/lib/reading-draft-keys");
    expect(READING_DRAFT_PREFIXES).toEqual(["next-reading-", "after-reading-"]);
    expect(isReadingDraftKey("next-reading-2026-10-11")).toBe(true);
    expect(isReadingDraftKey("after-reading-2026-10-11-1")).toBe(true);
    expect(isReadingDraftKey("weekly-reading-with-love")).toBe(false);
  });
  it("the room renders those letters inside the Reading group with the review tag", () => {
    const p = fs.readFileSync(path.join(__dirname, "..", "src/app/a/letters/page.tsx"), "utf8");
    expect(p).toMatch(/isReadingDraftKey/);
    expect(p).toContain("draft, waiting for your review");
    expect(p).not.toMatch(/reading-week-drafts/);
  });
  it("the send panel and the send route are untouched by this lane", () => {
    const panel = fs.readFileSync(path.join(__dirname, "..", "src/app/a/letters/[key]/page.tsx"), "utf8");
    expect(panel).toMatch(/type \{?.*\}? to send|to send to/i);
  });
});
