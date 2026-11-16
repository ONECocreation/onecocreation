import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { testCopyRowWords, testCopyScheduledLine, testCopyWords } from "@/lib/letter-delivery-copy";

/**
 * Letters: a timed test copy to one address (block 976,142, the Admiral's A).
 *
 * The send route's `testTo` used to queue one copy at once and ignore `at`.
 * Now a test copy can carry a time: it waits in the SAME queue with
 * `notBefore` and leaves on the SAME tick a scheduled list send would, so
 * arriving on time proves that path. Its subject keeps "[test]", it goes to
 * exactly one address, and it never reads the list, checks a headcount,
 * writes the letter's list history, or touches a member's /letters mailbox.
 * It has its own send record (marked `test`), so the panel can show it and
 * Cancel it before it leaves. An untimed test copy still goes as before.
 */

/* ── the in-memory vault (extends letters-send.test.ts's own shape) ─────── */

const strings = new Map<string, string>();
const sets = new Map<string, Set<string>>();
const lists = new Map<string, string[]>();
const hashes = new Map<string, Map<string, string>>();
const commandLog: unknown[][] = [];

function vaultReset() {
  strings.clear();
  sets.clear();
  lists.clear();
  hashes.clear();
  commandLog.length = 0;
}

function vaultCmd(cmd: unknown[]): unknown {
  commandLog.push(cmd);
  const [op, k, ...rest] = cmd as [string, string, ...string[]];
  switch (op) {
    case "GET":
      return strings.get(k) ?? null;
    case "SET":
      strings.set(k, rest[0]);
      return "OK";
    case "DEL":
      strings.delete(k);
      hashes.delete(k);
      lists.delete(k);
      return 1;
    case "SADD": {
      const s = sets.get(k) ?? new Set<string>();
      s.add(rest[0]);
      sets.set(k, s);
      return 1;
    }
    case "SREM":
      sets.get(k)?.delete(rest[0]);
      return 1;
    case "SMEMBERS":
      return [...(sets.get(k) ?? [])];
    case "SCARD":
      return sets.get(k)?.size ?? 0;
    case "LPUSH": {
      const l = lists.get(k) ?? [];
      l.unshift(...rest);
      lists.set(k, l);
      return l.length;
    }
    case "RPOP":
      return lists.get(k)?.pop() ?? null;
    case "LLEN":
      return lists.get(k)?.length ?? 0;
    case "LRANGE": {
      const l = lists.get(k) ?? [];
      return l.slice(Number(rest[0]), Number(rest[1]) + 1);
    }
    case "LTRIM": {
      const l = lists.get(k) ?? [];
      lists.set(k, l.slice(Number(rest[0]), Number(rest[1]) + 1));
      return "OK";
    }
    case "INCR": {
      const n = Number(strings.get(k) ?? 0) + 1;
      strings.set(k, String(n));
      return n;
    }
    case "HSET": {
      const h = hashes.get(k) ?? new Map<string, string>();
      for (let i = 0; i + 1 < rest.length; i += 2) h.set(rest[i], rest[i + 1]);
      hashes.set(k, h);
      return Math.floor(rest.length / 2);
    }
    case "HGETALL": {
      const h = hashes.get(k);
      if (!h) return {};
      return Object.fromEntries(h.entries());
    }
    case "HINCRBY": {
      const h = hashes.get(k) ?? new Map<string, string>();
      const next = Number(h.get(rest[0]) ?? "0") + Number(rest[1]);
      h.set(rest[0], String(next));
      hashes.set(k, h);
      return next;
    }
    case "EXPIRE":
    case "PERSIST":
      return 1;
    default:
      return null;
  }
}

/* ── nodemailer mocked at the seam — controllable per-recipient failure ──── */

const sentMail: { to: string; subject: string }[] = [];
const failFor = new Set<string>(); // recipients whose send always throws

vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({
      sendMail: async (args: (typeof sentMail)[number]) => {
        if (failFor.has(args.to)) throw new Error("simulated SMTP refusal");
        sentMail.push(args);
      },
    }),
  },
}));

let cookie: string;

const sendPOST = async () => (await import("@/app/api/admin/letters/send/route")).POST;
const sendGET = async () => (await import("@/app/api/admin/letters/send/route")).GET;

const req = (url: string, init?: RequestInit) =>
  new Request(`http://localhost${url}`, {
    ...init,
    headers: { cookie, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

beforeAll(async () => {
  process.env.KV_REST_API_URL = "https://kv.example";
  process.env.KV_REST_API_TOKEN = "test-token";
  process.env.NEXT_PUBLIC_SITE_URL = "https://test-site.example";
  process.env.SEAT_SECRET = "test-seat-secret";
  process.env.MAIL_HOURLY_CAP = "100";
  process.env.SMTP_HOST = "smtp.example";
  process.env.SMTP_USER_NEWS = "news@example";
  process.env.SMTP_PASS_NEWS = "test";
  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  cookie = `fe-operator=${makeOperatorToken(pk)}`;
  vi.stubGlobal("fetch", async (_url: unknown, init?: { body?: string }) =>
    Response.json({ result: vaultCmd(JSON.parse(init?.body ?? "[]")) }),
  );
});

beforeEach(() => {
  vaultReset();
  sentMail.length = 0;
  failFor.clear();
});

async function seedList() {
  const { addSubscriber } = await import("@/lib/subscribers");
  await addSubscriber("ana@example.com", "meditation");
  await addSubscriber("ben@example.com", "meditation");
  await addSubscriber("cleo@example.com", "readwithlove");
}

async function composeAndWrite() {
  const { createLetter, saveLetterOverride } = await import("@/lib/letters");
  const { key } = await createLetter({ title: "Sunday Letter", audience: "list" });
  await saveLetterOverride(key, { subject: "Sunday Letter", body: "Beautiful soul,\n\nthis week in the field.", audience: "members" });
  return key;
}


const LIST_SIDE = /^(mail:sub|mail:subscribers|mailbox:|letters:sends:|letters:schedule-intents|letters:delivery-notices)/;
const listSideWrites = () =>
  commandLog.filter((c) => ["SET", "SADD", "SREM", "LPUSH", "LTRIM", "LREM", "HSET", "HDEL", "HINCRBY", "DEL"].includes(String(c[0])) && LIST_SIDE.test(String(c[1])));
const queue = () => (lists.get("mail:queue") ?? []).map((r) => JSON.parse(r));

async function testPOST(key: string, extra: Record<string, unknown>) {
  return (await sendPOST())(req("/api/admin/letters/send", { method: "POST", body: JSON.stringify({ key, testTo: "love@example.com", ...extra }) }));
}
async function tickNow() {
  const { tick } = await import("@/lib/mail-queue");
  return tick();
}

describe("a timed test copy rides the queue with notBefore", () => {
  it("queues exactly one copy to the one address, with notBefore, [test] subject and a sendId", async () => {
    await seedList();
    const key = await composeAndWrite();
    const at = new Date(Date.now() + 3_600_000).toISOString();
    commandLog.length = 0;
    const d = await (await testPOST(key, { at })).json();
    expect(d.ok).toBe(true);
    expect(d.test).toBe(true);
    expect(d.queued).toBe(1);
    expect(d.scheduledFor).toBe(at);
    expect(typeof d.sendId).toBe("string");
    const q = queue();
    expect(q).toHaveLength(1);
    expect(q[0].to).toBe("love@example.com");
    expect(q[0].subject).toBe("[test] Sunday Letter");
    expect(q[0].notBefore).toBe(Date.parse(at));
    expect(q[0].sendId).toBe(d.sendId);
    expect(q[0].guard).toBeUndefined();
  });

  it("never writes the list, a headcount, the letter's list history, a mailbox, a notice or a saved time", async () => {
    await seedList();
    const key = await composeAndWrite();
    commandLog.length = 0;
    const at = new Date(Date.now() + 3_600_000).toISOString();
    const d = await (await testPOST(key, { at })).json();
    expect(d.ok).toBe(true);
    expect(listSideWrites()).toEqual([]);
    expect(commandLog.some((c) => String(c[1] ?? "").startsWith("mail:sub"))).toBe(false); // the list is never even read
    expect(d.recipients).toBeUndefined();
    expect(lists.get(`letters:sends:${key}`)).toBeUndefined();
    expect([...lists.keys()].some((k) => k.startsWith("mailbox:"))).toBe(false);
    // and the letter's own Draft line does not move
    const { letterDeliverySummary } = await import("@/lib/letter-delivery");
    expect((await letterDeliverySummary(key)).state).toBe("draft");
  });

  it("waits before its time, then the tick sends it: one mail, to one address, [test] kept", async () => {
    await seedList();
    const key = await composeAndWrite();
    const at = new Date(Date.now() + 60_000).toISOString();
    const d = await (await testPOST(key, { at })).json();
    let r = await tickNow();
    expect(r.sent).toBe(0);
    expect(sentMail).toHaveLength(0);
    expect(r.remainingInQueue).toBe(1);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.parse(at) + 1000);
    try { r = await tickNow(); } finally { vi.useRealTimers(); }
    expect(r.sent).toBe(1);
    expect(sentMail).toHaveLength(1);
    expect(sentMail[0].to).toBe("love@example.com");
    expect(sentMail[0].subject).toBe("[test] Sunday Letter");
    const { getSendRecord } = await import("@/lib/mail-queue");
    expect(await getSendRecord(d.sendId)).toMatchObject({ test: true, queued: 1, sent: 1, dropped: 0 });
    expect([...lists.keys()].some((k) => k.startsWith("mailbox:"))).toBe(false);
  });

  it("refuses a time that has passed, and a broken time, queueing nothing", async () => {
    const key = await composeAndWrite();
    const past = await testPOST(key, { at: new Date(Date.now() - 60_000).toISOString() });
    expect(past.status).toBe(400);
    expect((await past.json()).reason).toBe("Pick a time that has not passed yet.");
    const broken = await testPOST(key, { at: "tomorrow-ish" });
    expect(broken.status).toBe(400);
    expect(queue()).toHaveLength(0);
  });
});

describe("a timed test copy can be seen and cancelled before it leaves", () => {
  it("GET ?key= lists it under testSends, never under the list's sends", async () => {
    const key = await composeAndWrite();
    const at = new Date(Date.now() + 3_600_000).toISOString();
    const d = await (await testPOST(key, { at })).json();
    const g = await (await sendGET())(req(`/api/admin/letters/send?key=${encodeURIComponent(key)}`)).then((r) => r.json());
    expect(g.sends).toEqual([]);
    expect(g.testSends).toHaveLength(1);
    expect(g.testSends[0]).toMatchObject({ sendId: d.sendId, test: true, queued: 1, sent: 0, scheduledFor: at, segment: "test" });
  });

  it("Cancel drops it at the tick: nothing is mailed, and no mailbox is touched", async () => {
    await seedList();
    const key = await composeAndWrite();
    const at = new Date(Date.now() + 60_000).toISOString();
    const d = await (await testPOST(key, { at })).json();
    commandLog.length = 0;
    const { PATCH } = await import("@/app/api/admin/letters/send/route");
    const c = await PATCH(req("/api/admin/letters/send", { method: "PATCH", body: JSON.stringify({ sendId: d.sendId, action: "cancel" }) })).then((r) => r.json());
    expect(c).toMatchObject({ ok: true, cancelled: true, test: true });
    expect(listSideWrites()).toEqual([]);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.parse(at) + 1000);
    let r;
    try { r = await tickNow(); } finally { vi.useRealTimers(); }
    expect(r.sent).toBe(0);
    expect(sentMail).toHaveLength(0);
    expect(r.remainingInQueue).toBe(0);
  });
});

describe("an untimed test copy still goes as before", () => {
  it("one copy, no notBefore, no sendId, no record; the next tick sends it", async () => {
    await seedList();
    const key = await composeAndWrite();
    commandLog.length = 0;
    const d = await (await testPOST(key, {})).json();
    expect(d).toEqual({ ok: true, queued: 1, test: true });
    const q = queue();
    expect(q).toHaveLength(1);
    expect(q[0].notBefore).toBeUndefined();
    expect(q[0].sendId).toBeUndefined();
    expect(hashes.size).toBe(0);
    expect(listSideWrites()).toEqual([]);
    const r = await tickNow();
    expect(r.sent).toBe(1);
    expect(sentMail.map((m) => [m.to, m.subject])).toEqual([["love@example.com", "[test] Sunday Letter"]]);
  });
});

describe("the panel: a time for the test copy, its row and its Cancel, words from the copy file", () => {
  const SRC = fs.readFileSync(path.join(process.cwd(), "src/app/a/letters/[key]/page.tsx"), "utf8");
  it("the test card has its own Mountain Time field and posts it as `at`", () => {
    expect(SRC).toContain("aria-label={testCopyWords.timeLabel}");
    expect(SRC).toContain("body: JSON.stringify({ key, testTo, at: at ?? undefined })");
    expect(SRC).toContain("testCopyWords.scheduleButton");
  });
  it("timed test copies are listed in the test card with a Cancel while nothing has gone out", () => {
    expect(SRC).toContain('data-list="test-sends"');
    expect(SRC).toContain("testCopyRowWords(t)");
    expect(SRC).toContain('changeSend(t.sendId, "cancel")');
  });
  it("the words read plainly, with no em dash", () => {
    const at = "2026-11-20T18:30:00.000Z";
    expect(testCopyScheduledLine("love@example.com", at)).toBe(
      "Test copy for love@example.com scheduled for November 20, 2026 at 11:30 AM Mountain Time. It goes out on the first mail run at or after that time. Only this address gets it.",
    );
    expect(testCopyRowWords({ scheduledFor: at, sent: 0, dropped: 0 })).toBe("Test copy · waiting for November 20, 2026 at 11:30 AM Mountain Time");
    expect(testCopyRowWords({ scheduledFor: at, sent: 0, dropped: 0, cancelled: true })).toBe("Test copy · cancelled");
    expect(testCopyRowWords({ scheduledFor: at, sent: 1, dropped: 0 })).toBe("Test copy · sent");
    expect(testCopyRowWords({ scheduledFor: at, sent: 0, dropped: 1 })).toBe("Test copy · not sent");
    for (const w of [...Object.values(testCopyWords), testCopyScheduledLine("a@b.c", at)]) expect(w).not.toMatch(/—/);
  });
});
