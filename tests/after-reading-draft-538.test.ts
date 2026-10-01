import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import type { OutgoingMail } from "@/lib/mail";
import type { ReadingSchedule } from "@/lib/reading-schedule";
import type { AboutVideo } from "@/lib/about-content";

/**
 * TASK-538 - the after-reading (replay) DRAFT, the recap half of T-534.
 * Pins the trigger (a replay id the site has not seen; the FIRST run only
 * baselines), the seen-set rules (written only AFTER the draft exists, never
 * reset by a fail-closed loader), the once-key, the words, the untrusted
 * title stripping, the review copy, failure isolation, and THE LAW.
 */

const sent = vi.hoisted(() => [] as OutgoingMail[]);
const mailControl = vi.hoisted(() => ({ cap: 100 }));
const onceClaims = vi.hoisted(() => new Set<string>());
const replays = vi.hoisted(() => ({ result: [] as unknown, throws: false }));
const cfg = vi.hoisted(() => ({ reading: undefined as ReadingSchedule | undefined }));

vi.mock("@/lib/mail", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/mail")>();
  return {
    ...actual,
    sendMail: async (_persona: string, mail: OutgoingMail) => {
      sent.push(mail);
      mailControl.cap -= 1;
    },
    capRemaining: async () => mailControl.cap,
    onceWithin: async (key: string) => {
      if (onceClaims.has(key)) return false;
      onceClaims.add(key);
      return true;
    },
  };
});
vi.mock("@/lib/site-config", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/site-config")>();
  return { ...actual, getSiteConfig: async () => ({ ...actual.defaultSiteConfig(), reading: cfg.reading }) };
});
vi.mock("@/lib/replays-source", () => ({
  loadReplays: async () => {
    if (replays.throws) throw new Error("loader exploded");
    return replays.result;
  },
}));

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
/* Thursday Oct 8 2026 09:00 MDT: not a Tuesday, so the weekly half is skipped
   and these tests see only the recap half. */
const THU = Date.UTC(2026, 9, 8, 15, 0);
const THU_LATER = Date.UTC(2026, 9, 8, 21, 0);
const DAY = "2026-10-08";
const SEEN_KEY = "letters:replays-seen";

const vid = (id: string, title: string): AboutVideo => ({ id, title, ratio: "16/9" });
const A = vid("aaaaaaaaaaa", "Reading one");
const B = vid("bbbbbbbbbbb", "Reading two");
const C = vid("ccccccccccc", "Reading three");
const D = vid("ddddddddddd", "Reading four");
const E = vid("eeeeeeeeeee", "Reading five");

const mod = () => import("@/lib/reading-week-drafts");
const lettersMod = () => import("@/lib/letters");
const seen = (): string[] => JSON.parse(store.get(SEEN_KEY) ?? "[]");

beforeEach(() => {
  sent.length = 0;
  onceClaims.clear();
  store.clear();
  mailControl.cap = 100;
  replays.result = [];
  replays.throws = false;
  cfg.reading = SUNDAY;
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
  for (const k of ["KV_REST_API_URL", "KV_REST_API_TOKEN", "OPERATOR_EMAILS", "OFFER_NOTIFY_EMAIL", "NEXT_PUBLIC_SITE_URL"])
    delete process.env[k];
});

async function tick(now = THU) {
  const { draftReadingLetters } = await mod();
  return draftReadingLetters(now);
}
async function body(key: string) {
  const { getLetterOverride } = await lettersMod();
  return getLetterOverride(key);
}

describe("the trigger: a replay id the site has not seen", () => {
  it("the FIRST run baselines the seen-set and drafts nothing (no letter, no mail)", async () => {
    replays.result = [A, B, C];
    const stats = await tick();
    expect(stats.replay).toBe("baselined");
    expect(seen().sort()).toEqual([A.id, B.id, C.id]);
    expect((await (await lettersMod()).composedLetterKeys()).length).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("the second run with one new id makes one draft: subject 'The replay is here: <title>'", async () => {
    replays.result = [A, B];
    await tick();
    replays.result = [A, B, C];
    const stats = await tick(THU_LATER);
    expect(stats.replay).toBe("drafted");
    expect(stats.key).toBeUndefined(); // the weekly slot's key stays the weekly one
    const key = `after-reading-${DAY}-1`;
    const o = await body(key);
    expect(o?.subject).toBe("The replay is here: Reading three");
    expect(o?.audience).toBe("members");
    expect(o?.body).toContain("Hello, beautiful soul.");
    expect(o?.body).toContain("Reading three");
    expect(o?.body).toContain("!cta: Watch the replay | /replays");
    expect(o?.body).toContain("A free membership is all it takes to watch: your email and a six-digit code.");
    expect(o?.body?.endsWith("With love,\nLove · ONE Cocreation")).toBe(true);
    expect(seen().sort()).toEqual([A.id, B.id, C.id]);
  });

  it("several new ids make 'New replays are here' and list at most three titles", async () => {
    replays.result = [A];
    await tick();
    replays.result = [A, B, C, D, E];
    await tick(THU_LATER);
    const o = await body(`after-reading-${DAY}-1`);
    expect(o?.subject).toBe("New replays are here");
    expect(o?.body).toContain("Reading two");
    expect(o?.body).toContain("Reading three");
    expect(o?.body).toContain("Reading four");
    expect(o?.body).not.toContain("Reading five");
    expect(seen()).toHaveLength(5); // all four new ids are now seen, not only the three named
  });

  it("two ticks make ONE draft (the seen-set moved on) and one review copy per recipient", async () => {
    replays.result = [A];
    await tick();
    replays.result = [A, B];
    await tick(THU_LATER);
    await tick(THU_LATER + 60_000);
    const keys = (await (await lettersMod()).composedLetterKeys()).filter((k) => k.startsWith("after-reading-"));
    expect(keys).toEqual([`after-reading-${DAY}-1`]);
    expect(sent).toHaveLength(2);
    expect(sent.map((m) => m.to).sort()).toEqual(["admiral@example.org", "love@onecocreation.com"]);
    for (const m of sent) expect(m.subject).toBe("Draft for your review: The replay is here: Reading two");
  });

  it("the once-key alone stops a duplicate when the seen-set write failed after the draft existed", async () => {
    replays.result = [A];
    await tick();
    replays.result = [A, B];
    kvFail.substr = SEEN_KEY;
    kvFail.once = true;
    const first = await tick(THU_LATER);
    expect(first.replay).toBe("drafted");
    expect(seen()).toEqual([A.id]); // the write failed
    const second = await tick(THU_LATER + 60_000);
    expect(second.replay).toBe("already");
    expect(seen().sort()).toEqual([A.id, B.id]); // and now it caught up
    const keys = (await (await lettersMod()).composedLetterKeys()).filter((k) => k.startsWith("after-reading-"));
    expect(keys).toHaveLength(1);
  });

  it("a second batch the same day takes the next number", async () => {
    replays.result = [A];
    await tick();
    replays.result = [A, B];
    await tick(THU_LATER);
    replays.result = [A, B, C];
    await tick(THU_LATER + 3_600_000);
    expect(await body(`after-reading-${DAY}-2`)).toBeTruthy();
  });

  it("a failed createLetter leaves the seen-set unwritten and the next tick retries", async () => {
    replays.result = [A];
    await tick();
    replays.result = [A, B];
    kvFail.substr = "letters:composed";
    kvFail.once = true;
    const first = await tick(THU_LATER);
    expect(first.replay).toBe("error");
    expect(seen()).toEqual([A.id]);
    expect(sent).toHaveLength(0);
    const second = await tick(THU_LATER + 60_000);
    expect(second.replay).toBe("drafted");
    expect(seen().sort()).toEqual([A.id, B.id]);
    const keys = (await (await lettersMod()).composedLetterKeys()).filter((k) => k.startsWith("after-reading-"));
    expect(keys).toHaveLength(1);
  });

  it("no vault: no draft, no mail (fails closed)", async () => {
    replays.result = [A];
    delete process.env.KV_REST_API_URL;
    const stats = await tick();
    expect(stats.replay).toBe("error");
    expect(sent).toHaveLength(0);
  });
});

describe("a fail-closed loader never resets the seen-set and never drafts", () => {
  it("an empty result and a null result leave the seen-set whole and draft nothing", async () => {
    replays.result = [A, B];
    await tick();
    for (const bad of [[], null, undefined, "nope"]) {
      replays.result = bad;
      const stats = await tick(THU_LATER);
      expect(stats.replay).toBe("skipped");
      expect(seen().sort()).toEqual([A.id, B.id]);
    }
    replays.result = [A, B]; // the feed comes back: nothing is new, nothing drafts
    const back = await tick(THU_LATER + 60_000);
    expect(back.replay).toBe("skipped");
    expect(sent).toHaveLength(0);
  });

  it("a feed that is empty on the very first run baselines nothing (the next real list baselines)", async () => {
    replays.result = [];
    expect((await tick()).replay).toBe("skipped");
    expect(store.has(SEEN_KEY)).toBe(false);
    replays.result = [A, B];
    expect((await tick(THU_LATER)).replay).toBe("baselined");
  });

  it("ids that vanish from the list stay seen, so their return drafts nothing", async () => {
    replays.result = [A, B];
    await tick();
    replays.result = [A];
    await tick(THU_LATER);
    expect(seen().sort()).toEqual([A.id, B.id]);
    replays.result = [A, B];
    expect((await tick(THU_LATER + 60_000)).replay).toBe("skipped");
  });

  it("a corrupt stored seen-set is an error, never a re-baseline", async () => {
    store.set(SEEN_KEY, "{not json");
    replays.result = [A];
    expect((await tick()).replay).toBe("error");
    expect(store.get(SEEN_KEY)).toBe("{not json");
    expect(sent).toHaveLength(0);
  });
});

describe("untrusted titles are stripped before composing", () => {
  it("the pure stripper removes [ ] ( ) * _, leading !, control chars, and caps at 100", async () => {
    const { replayTitle } = await mod();
    expect(replayTitle("[click](https://evil.example)")).toBe("clickhttps://evil.example");
    expect(replayTitle("!!cta: x | https://evil.example")).toBe("cta: x | https://evil.example");
    expect(replayTitle("  !hero: https://evil.example")).toBe("hero: https://evil.example");
    expect(replayTitle("a\u0000b\u0007c\r\nd‮e")).toBe("abc de");
    expect(replayTitle("**bold** _it_")).toBe("bold it");
    expect(replayTitle("x".repeat(250))).toHaveLength(100);
    expect(replayTitle("!!!")).toBe("");
  });

  it("a hostile playlist title cannot become a link or a directive in the letter or its subject", async () => {
    replays.result = [A];
    await tick();
    replays.result = [
      A,
      vid("hhhhhhhhhhh", "[click](https://evil.example)"),
      vid("iiiiiiiiiii", "!cta: x | https://evil.example"),
    ];
    await tick(THU_LATER);
    const o = await body(`after-reading-${DAY}-1`);
    expect(o?.body).not.toMatch(/\]\(/);
    expect(o?.body).not.toMatch(/^!cta: x/m);
    expect(o?.body).not.toMatch(/\[click\]/);
    // the ONLY directive line is the ruled one
    expect((o?.body ?? "").split("\n").filter((l) => l.trim().startsWith("!"))).toEqual(["!cta: Watch the replay | /replays"]);
    const { letterHtml } = await lettersMod();
    const html = letterHtml(o?.body ?? "");
    expect(html).not.toMatch(/href="https:\/\/evil\.example/);
    expect(o?.subject).toBe("New replays are here");
    // the review copy carries the same stripped words
    expect(sent.every((m) => !m.html.includes("href=\"https://evil.example"))).toBe(true);
  });

  it("a single hostile title is stripped in the subject too, and an empty one falls back", async () => {
    replays.result = [A];
    await tick();
    replays.result = [A, vid("jjjjjjjjjjj", "[x](https://evil.example)\nBcc: a@b.c")];
    await tick(THU_LATER);
    const o = await body(`after-reading-${DAY}-1`);
    expect(o?.subject).not.toMatch(/[\[\]()\n]/);
    expect(o?.subject.startsWith("The replay is here: ")).toBe(true);
    const { afterReadingLetter } = await mod();
    expect(afterReadingLetter(["!!!"]).subject).toBe("The replay is here");
  });
});

describe("failure isolation", () => {
  it("a recap failure never changes the next-reading outcome and never throws", async () => {
    const { draftReadingLetters } = await mod();
    replays.throws = true;
    const TUE_0900_MDT = Date.UTC(2026, 9, 6, 15, 0);
    const stats = await draftReadingLetters(TUE_0900_MDT);
    expect(stats.nextReading).toBe("drafted");
    expect(stats.replay).toBe("error");
    expect(stats.reviewSent).toBe(2); // the weekly copy still went out
  });

  it("the weekly half failing does not stop the recap half", async () => {
    replays.result = [A];
    await tick();
    replays.result = [A, B];
    cfg.reading = { ...SUNDAY, on: false };
    const stats = await tick(THU_LATER);
    expect(stats.nextReading).toBe("skipped");
    expect(stats.replay).toBe("drafted");
  });
});

describe("THE LAW and the words", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "src/lib/reading-week-drafts.ts"), "utf8");
  it("still no queue, no list send, no subscriber reads; loadReplays is called, replays-source never edited", () => {
    expect(src).not.toMatch(/mail-queue/);
    expect(src).not.toMatch(/\benqueue\b/);
    expect(src).not.toMatch(/admin\/letters/);
    expect(src).not.toMatch(/listSubscribers|isSubscribed|subscriberSegments/);
    expect(src).toMatch(/import \{ loadReplays \} from "@\/lib\/replays-source"/);
  });
  it("no em dash or arrow glyph in any string of the module", () => {
    const strings = src.match(/"[^"\n]*"|`[^`]*`/g) ?? [];
    for (const s of strings) expect(s).not.toMatch(/[—→➡➔⮕]/);
  });
  it("the composed words carry no em dash, arrow or emoji", async () => {
    const { afterReadingLetter } = await mod();
    const w = afterReadingLetter(["One", "Two"]);
    expect(w.subject + w.body).not.toMatch(/[—–→➡➔⮕\u{1F300}-\u{1FAFF}☀-➿]/u);
  });
  it("every mail the recap run sends goes to the operator set only", async () => {
    replays.result = [A];
    await tick();
    replays.result = [A, B];
    await tick(THU_LATER);
    const allowed = new Set(["love@onecocreation.com", "admiral@example.org"]);
    for (const m of sent) expect(allowed.has(m.to)).toBe(true);
  });
  it("the key joins the Reading group through the existing prefix list", async () => {
    const { isReadingDraftKey } = await import("@/lib/reading-draft-keys");
    expect(isReadingDraftKey(`after-reading-${DAY}-1`)).toBe(true);
  });
});
