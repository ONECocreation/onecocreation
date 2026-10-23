import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { OutgoingMail } from "@/lib/mail";
import type { ReadingSchedule } from "@/lib/reading-schedule";
import type { AboutVideo } from "@/lib/about-content";

/**
 * T-638 (block 972,735) - the replays catch-up letter SENDS ON ITS OWN the
 * day a replay is added (his A on Desk card 972725). Pins: the compose (one
 * new, several new, title sanitising, NEW marks, no wrap), the send through
 * the existing list-send path once per replay set, the kill switch (off =
 * draft only), the baseline (sends nothing) and unsubscribed skipped.
 */

const sent = vi.hoisted(() => [] as OutgoingMail[]);
const queued = vi.hoisted(() => [] as { to: string; subject: string; html: string; guard?: { kind: string }; sendId?: string }[]);
const records = vi.hoisted(() => ({ init: [] as unknown[], forLetter: [] as unknown[], delivered: [] as string[], failEnqueue: false }));
const subs = vi.hoisted(() => ({ list: ["a@x.org", "b@x.org"] as string[], unsubscribed: new Set<string>() }));
const onceClaims = vi.hoisted(() => new Set<string>());
const replays = vi.hoisted(() => ({ result: [] as unknown }));
const cfg = vi.hoisted(() => ({ auto: undefined as boolean | undefined }));

vi.mock("@/lib/mail", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/mail")>();
  return {
    ...actual,
    sendMail: async (_p: string, mail: OutgoingMail) => void sent.push(mail),
    capRemaining: async () => 100,
    onceWithin: async (key: string) => {
      if (onceClaims.has(key)) return false;
      onceClaims.add(key);
      return true;
    },
  };
});
vi.mock("@/lib/mail-queue", () => ({
  enqueue: async (items: typeof queued) => {
    if (records.failEnqueue) throw new Error("queue down");
    queued.push(...items);
    return items.length;
  },
  initSendRecord: async (id: string, meta: unknown) => void records.init.push({ id, meta }),
  recordSendForLetter: async (key: string, id: string) => void records.forLetter.push({ key, id }),
}));
vi.mock("@/lib/mailbox", () => ({
  recordDelivery: async (to: string) => void records.delivered.push(to),
}));
vi.mock("@/lib/subscribers", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/subscribers")>();
  return { ...actual, listSubscribers: async () => subs.list.filter((e) => !subs.unsubscribed.has(e)) };
});
vi.mock("@/lib/site-config", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/site-config")>();
  return {
    ...actual,
    getSiteConfig: async () => ({ ...actual.defaultSiteConfig(), reading: SUNDAY, replaysAutoSend: cfg.auto }),
  };
});
vi.mock("@/lib/replays-source", () => ({ loadReplays: async () => replays.result }));

const store = new Map<string, string>();
function installKv() {
  vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
    const [op, k, v, ...rest] = JSON.parse(init.body) as string[];
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
const THU = Date.UTC(2026, 9, 8, 15, 0);
const THU_LATER = Date.UTC(2026, 9, 8, 21, 0);
const DAY = "2026-10-08";
const SEEN_KEY = "letters:replays-seen";
const vid = (id: string, title: string): AboutVideo => ({ id, title, ratio: "16/9" });
const A = vid("aaaaaaaaaaa", "Love, Part One");
const B = vid("bbbbbbbbbbb", "Prt 2 LOVE by Leo Buscaglia | Reading");
const C = vid("ccccccccccc", "Prt 3 LOVE by Leo Buscaglia");
const D = vid("ddddddddddd", "Reading four");

const mod = () => import("@/lib/reading-week-drafts");
const lettersMod = () => import("@/lib/letters");

beforeEach(() => {
  sent.length = 0;
  queued.length = 0;
  records.init.length = 0;
  records.forLetter.length = 0;
  records.delivered.length = 0;
  records.failEnqueue = false;
  subs.list = ["a@x.org", "b@x.org"];
  subs.unsubscribed.clear();
  onceClaims.clear();
  store.clear();
  replays.result = [];
  cfg.auto = undefined;
  process.env.KV_REST_API_URL = "https://kv.test";
  process.env.KV_REST_API_TOKEN = "t";
  process.env.OPERATOR_EMAILS = "admiral@example.org";
  process.env.OFFER_NOTIFY_EMAIL = "love@onecocreation.com";
  process.env.NEXT_PUBLIC_SITE_URL = "https://site.test";
  installKv();
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of ["KV_REST_API_URL", "KV_REST_API_TOKEN", "OPERATOR_EMAILS", "OFFER_NOTIFY_EMAIL", "NEXT_PUBLIC_SITE_URL"]) delete process.env[k];
});

async function tick(now = THU) {
  const { draftReadingLetters } = await mod();
  return draftReadingLetters(now);
}

describe("the compose", () => {
  it("one new replay: subject, opener, full numbered list in site order, NEW on the newest only, one button", async () => {
    const { replaysCatchUpLetter } = await mod();
    const w = replaysCatchUpLetter([A, B, C], [C.id]);
    expect(w.subject).toBe("Catch up on the replays: Prt 3 LOVE by Leo Buscaglia");
    const lines = w.body.split("\n");
    expect(w.body).toContain("A new reading is in the Replays today: **Prt 3 LOVE by Leo Buscaglia**.");
    expect(w.body).toContain("Missed one? Get caught up. Every reading is kept for you, to play again whenever you like.");
    expect(lines.filter((l) => l.startsWith("!item:"))).toEqual([
      "!item: Love, Part One",
      "!item: Prt 2 LOVE by Leo Buscaglia",
      "!item: Prt 3 LOVE by Leo Buscaglia | NEW",
    ]);
    expect(lines.filter((l) => l.startsWith("!pill:"))).toEqual(["!pill: Watch the replays | /replays"]);
    expect(w.body).toContain("All it takes to watch is your email and a six-digit code.");
    expect(w.body.endsWith("Smiles\n Love\n🌈💫\n\nAs Always. IAM, WE ARE One.\nOneCocreation")).toBe(true);
  });

  it("several new: every new one marked NEW and the subject is 'New replays are here'", async () => {
    const { replaysCatchUpLetter } = await mod();
    const w = replaysCatchUpLetter([A, B, C, D], [C.id, D.id]);
    expect(w.subject).toBe("New replays are here");
    const items = w.body.split("\n").filter((l) => l.startsWith("!item:"));
    expect(items.filter((l) => l.endsWith("| NEW"))).toHaveLength(2);
    expect(items).toHaveLength(4);
  });

  it("titles go through replayTitle and the part before ' | ' is shown; a hostile title cannot become a link, directive or bar", async () => {
    const { replaysCatchUpLetter } = await mod();
    const w = replaysCatchUpLetter(
      [A, vid("hhhhhhhhhhh", "[click](https://evil.example)"), vid("iiiiiiiiiii", "!cta: x | https://evil.example"), vid("jjjjjjjjjjj", "a|b\nBcc: x@y.z")],
      ["jjjjjjjjjjj"],
    );
    expect(w.body).not.toMatch(/\]\(/);
    expect(w.body).not.toMatch(/^!cta:/m);
    const directives = w.body.split("\n").filter((l) => l.startsWith("!"));
    expect(directives.every((l) => /^!(hero|item|pill):/.test(l))).toBe(true);
    for (const l of directives.filter((d) => d.startsWith("!item:"))) expect((l.match(/\|/g) ?? []).length).toBeLessThanOrEqual(1);
    const { letterHtml } = await lettersMod();
    expect(letterHtml(w.body)).not.toMatch(/href="https:\/\/evil\.example/);
    expect(w.subject).not.toMatch(/[\[\]()\n|]/);
  });

  it("no em dash, arrow or emoji but Love's own", async () => {
    const { replaysCatchUpLetter } = await mod();
    const w = replaysCatchUpLetter([A, B, C], [C.id]);
    expect((w.subject + w.body).replace("🌈💫", "")).not.toMatch(/[—–→➡➔⮕\u{1F300}-\u{1FAFF}☀-➿]/u);
  });

  it("the rendered list: numbered 1..n, NEW is its own nowrap cell (it can never wrap to its own line), one button", async () => {
    const { replaysCatchUpLetter } = await mod();
    const { letterHtml } = await lettersMod();
    const w = replaysCatchUpLetter([A, B, C], [C.id]);
    const html = letterHtml(w.body, { unsubscribeUrl: "https://site.test/u" });
    expect(html).toContain(">1</td>");
    expect(html).toContain(">2</td>");
    expect(html).toContain(">3</td>");
    expect(html.match(/>NEW</g)).toHaveLength(1);
    expect(html).toMatch(/<td[^>]*white-space:nowrap[^>]*><span[^>]*white-space:nowrap[^>]*>NEW<\/span><\/td>/);
    expect(html.match(/Watch the replays/g)).toHaveLength(1);
    expect(html).toContain("/replays");
    expect(html).not.toContain("@@ITEMS");
    expect(html).not.toContain("!item:");
  });
});

describe("the automatic send", () => {
  it("the BASELINE sends nothing: first run records the ids, no letter, no queue, no mail", async () => {
    replays.result = [A, B, C];
    const stats = await tick();
    expect(stats.replay).toBe("baselined");
    expect(queued).toHaveLength(0);
    expect(sent).toHaveLength(0);
    expect(records.init).toHaveLength(0);
    expect(JSON.parse(store.get(SEEN_KEY) ?? "[]").sort()).toEqual([A.id, B.id, C.id]);
  });

  it("a new replay goes to the whole list through the list-send path, with the review copy to Love", async () => {
    replays.result = [A, B];
    await tick();
    replays.result = [A, B, C];
    const stats = await tick(THU_LATER);
    expect(stats.replay).toBe("sent");
    expect(stats.replayQueued).toBe(2);
    expect(queued.map((q) => q.to).sort()).toEqual(["a@x.org", "b@x.org"]);
    for (const q of queued) {
      expect(q.subject).toBe("Catch up on the replays: Prt 3 LOVE by Leo Buscaglia");
      expect(q.guard).toEqual({ kind: "subscribed" });
      expect(q.html).toContain("Watch the replays");
      expect(q.html).toContain("/api/unsubscribe");
    }
    expect(new Set(queued.map((q) => q.sendId)).size).toBe(1);
    const key = `after-reading-${DAY}-1`;
    expect(records.forLetter).toEqual([{ key, id: queued[0].sendId }]);
    expect(records.init).toHaveLength(1);
    expect(records.delivered.sort()).toEqual(["a@x.org", "b@x.org"]);
    /* the sent record lives in the letters room, published (not a draft) */
    const { getLetterOverride, getLetterMeta } = await lettersMod();
    expect((await getLetterOverride(key))?.subject).toBe(queued[0].subject);
    const meta = await getLetterMeta(key);
    expect(meta?.draft).toBeFalsy();
    expect(meta?.reviewedAtMs).toBeTruthy();
    /* the review copy to the operator set says it already went out */
    expect(sent.map((m) => m.to).sort()).toEqual(["admiral@example.org", "love@onecocreation.com"]);
    for (const m of sent) {
      expect(m.subject).toBe(`Sent to the list: ${queued[0].subject}`);
      expect(m.html).toContain("went to the list on its own");
    }
  });

  it("ONCE per replay-id set: the next ticks send nothing more", async () => {
    replays.result = [A];
    await tick();
    replays.result = [A, B];
    await tick(THU_LATER);
    await tick(THU_LATER + 60_000);
    await tick(THU_LATER + 120_000);
    expect(queued).toHaveLength(2);
    expect(records.init).toHaveLength(1);
  });

  it("the once-key alone stops a second send when the seen-set was not written", async () => {
    replays.result = [A];
    await tick();
    replays.result = [A, B];
    await tick(THU_LATER);
    store.set(SEEN_KEY, JSON.stringify([A.id])); // as if the write had been lost
    const again = await tick(THU_LATER + 60_000);
    expect(again.replay).toBe("already");
    expect(queued).toHaveLength(2);
  });

  it("several new at once make ONE send: 'New replays are here', all marked NEW", async () => {
    replays.result = [A];
    await tick();
    replays.result = [A, B, C];
    await tick(THU_LATER);
    expect(records.init).toHaveLength(1);
    expect(queued[0].subject).toBe("New replays are here");
    expect(queued[0].html.match(/>NEW</g)).toHaveLength(2);
  });

  it("an unsubscribed address is never queued, and every copy carries the subscribed guard for one who leaves while waiting", async () => {
    subs.unsubscribed.add("b@x.org");
    replays.result = [A];
    await tick();
    replays.result = [A, B];
    await tick(THU_LATER);
    expect(queued.map((q) => q.to)).toEqual(["a@x.org"]);
    expect(records.delivered).toEqual(["a@x.org"]);
    expect(queued.every((q) => q.guard?.kind === "subscribed")).toBe(true);
  });

  it("the KILL SWITCH off (replaysAutoSend false) is today's behaviour: a draft and a review copy, nothing to the list", async () => {
    cfg.auto = false;
    replays.result = [A];
    await tick();
    replays.result = [A, B];
    const stats = await tick(THU_LATER);
    expect(stats.replay).toBe("drafted");
    expect(queued).toHaveLength(0);
    expect(records.init).toHaveLength(0);
    expect(sent.map((m) => m.subject)).toEqual(Array(2).fill("Draft for your review: The replay is here: Prt 2 LOVE by Leo Buscaglia | Reading"));
    const { getLetterMeta } = await lettersMod();
    expect((await getLetterMeta(`after-reading-${DAY}-1`))?.reviewedAtMs).toBeFalsy();
  });

  it("a switch saved true, and an absent switch, both send (default ON)", async () => {
    for (const auto of [true, undefined]) {
      queued.length = 0;
      store.clear();
      onceClaims.clear();
      cfg.auto = auto;
      replays.result = [A];
      await tick();
      replays.result = [A, B];
      expect((await tick(THU_LATER)).replay).toBe("sent");
      expect(queued).toHaveLength(2);
    }
  });

  it("if the list send throws, the letter stays a draft for Love and the list is not mailed (no double-send retry)", async () => {
    replays.result = [A];
    await tick();
    replays.result = [A, B];
    records.failEnqueue = true;
    const stats = await tick(THU_LATER);
    expect(stats.replay).toBe("drafted");
    expect(queued).toHaveLength(0);
    expect(sent.every((m) => m.subject.startsWith("Draft for your review:"))).toBe(true);
    records.failEnqueue = false;
    await tick(THU_LATER + 60_000);
    expect(queued).toHaveLength(0);
  });

  it("the switch round-trips through site config: absent = ON, only a saved boolean persists", async () => {
    const real = await vi.importActual<typeof import("@/lib/site-config")>("@/lib/site-config");
    expect(real.defaultSiteConfig().replaysAutoSend).toBeUndefined();
    const { replaysAutoSendPatchError } = await import("@/app/api/admin/site/route");
    expect(replaysAutoSendPatchError(false)).toBeNull();
    expect(replaysAutoSendPatchError("no")).not.toBeNull();
  });
});
