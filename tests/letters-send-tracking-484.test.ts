import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";

/**
 * TASK-484 — the /a/letters send panel's real sent state (walk item S7).
 *
 * The Admiral pressed the list send this morning and saw no confirmation;
 * the mail queue afterwards held 2 items, not 6. Reading `sendList()`
 * (src/app/a/letters/[key]/page.tsx) and the send route end to end: the
 * route ALREADY produced a `note` string for every outcome (a 409, the
 * 429 dedupe, a fetch failure falling back to a literal string, the
 * success line) — the miss was that the panel piled every one of those,
 * for BOTH buttons, into one shared `note` state rendered in exactly one
 * place, always `var(--muted)`, success and failure alike, with no visual
 * break between "it worked" and "it didn't". A stale panel's displayed
 * segment count (fetched once, at page load) racing the route's own
 * fresh `list.length` read (at click time) is the most likely account of
 * "queued 2, not 6" without a captured screenshot of the exact moment —
 * the 409 path (a real send never firing) is far more probable than a
 * partial send, and this lane makes that whole class of doubt moot: a
 * real send's own tally is now read back from the vault, never guessed
 * from the queue's raw depth.
 *
 * This file pins the NEW real-sent-state plumbing: the send route hands
 * back a `sendId`, `initSendRecord`/`recordSendForLetter` write it,
 * `tick()` bumps its sent/dropped tally as it drains, the route's own GET
 * reads it back both ways (`?sendId=`, `?key=`), and a KV outage anywhere
 * in that chain degrades honestly (never blocks or crashes the send
 * itself, which already queued).
 *
 * The in-memory vault below is `tests/letters-send.test.ts`'s own idiom
 * (a plain command interpreter behind the same REST shape), extended with
 * the hash ops (`HSET`/`HGETALL`/`HINCRBY`) this lane's records need —
 * neither of the other two files' own stubs carries those.
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

describe("POST /api/admin/letters/send — a real list send carries a sendId", () => {
  it("hands back a sendId, and writes queued=N/sent=0/dropped=0 for it", async () => {
    await seedList();
    const key = await composeAndWrite();
    const d = await (await sendPOST())(
      req("/api/admin/letters/send", { method: "POST", body: JSON.stringify({ key, source: "meditation", confirm: 2 }) }),
    ).then((r) => r.json());
    expect(d.ok).toBe(true);
    expect(typeof d.sendId).toBe("string");
    expect(d.sendId.length).toBeGreaterThan(0);

    const rec = JSON.parse(JSON.stringify(Object.fromEntries((hashes.get(`letters:send:${d.sendId}`) ?? new Map()).entries())));
    expect(rec.queued).toBe("2");
    expect(rec.sent).toBe("0");
    expect(rec.dropped).toBe("0");
    expect(rec.key).toBe(key);
    expect(rec.segment).toBe("meditation");
  });

  it("a test copy carries no sendId and writes no send record", async () => {
    await seedList();
    const key = await composeAndWrite();
    const d = await (await sendPOST())(
      req("/api/admin/letters/send", { method: "POST", body: JSON.stringify({ key, testTo: "love@example.com" }) }),
    ).then((r) => r.json());
    expect(d).toEqual({ ok: true, queued: 1, test: true });
    expect(hashes.size).toBe(0);
  });

  it("EXPIREs the send record for the full 14-day TTL", async () => {
    await seedList();
    const key = await composeAndWrite();
    await (await sendPOST())(
      req("/api/admin/letters/send", { method: "POST", body: JSON.stringify({ key, source: "meditation", confirm: 2 }) }),
    ).then((r) => r.json());
    const expires = commandLog.filter((c) => c[0] === "EXPIRE" && String(c[1]).startsWith("letters:send:"));
    expect(expires.length).toBeGreaterThan(0);
    for (const c of expires) expect(c[2]).toBe(String(14 * 24 * 3600));
  });
});

describe("tick() bumps a send record's sent/dropped tally", () => {
  it("every queued copy that actually sends bumps sent by one", async () => {
    await seedList();
    const key = await composeAndWrite();
    const { sendId } = await (await sendPOST())(
      req("/api/admin/letters/send", { method: "POST", body: JSON.stringify({ key, source: "meditation", confirm: 2 }) }),
    ).then((r) => r.json());

    const { tick } = await import("@/lib/mail-queue");
    const out = await tick();
    expect(out.sent).toBe(2);

    const { getSendRecord } = await import("@/lib/mail-queue");
    const rec = await getSendRecord(sendId);
    expect(rec).toMatchObject({ queued: 2, sent: 2, dropped: 0 });
  });

  it("a recipient who left the list before the tick counts as dropped, not sent", async () => {
    await seedList();
    const key = await composeAndWrite();
    const { sendId } = await (await sendPOST())(
      req("/api/admin/letters/send", { method: "POST", body: JSON.stringify({ key, source: "meditation", confirm: 2 }) }),
    ).then((r) => r.json());

    const { removeSubscriber } = await import("@/lib/subscribers");
    await removeSubscriber("ana@example.com"); // left AFTER the send was queued

    const { tick, getSendRecord } = await import("@/lib/mail-queue");
    await tick();
    const rec = await getSendRecord(sendId);
    expect(rec).toMatchObject({ queued: 2, sent: 1, dropped: 1 });
  });

  it("a permanent SMTP failure (exhausts MAX_ATTEMPTS) counts as dropped, never sent", async () => {
    await seedList();
    const key = await composeAndWrite();
    failFor.add("ana@example.com");
    const { sendId } = await (await sendPOST())(
      req("/api/admin/letters/send", { method: "POST", body: JSON.stringify({ key, source: "meditation", confirm: 2 }) }),
    ).then((r) => r.json());

    const { tick, getSendRecord } = await import("@/lib/mail-queue");
    // ana's copy retries up to MAX_ATTEMPTS (3) across ticks before it is
    // dropped for good; ben's own copy is independent and unaffected.
    await tick();
    await tick();
    await tick();
    const rec = await getSendRecord(sendId);
    expect(rec?.sent).toBe(1); // ben
    expect(rec?.dropped).toBe(1); // ana, after exhausting attempts
  });
});

describe("GET /api/admin/letters/send — the real sent state, read back", () => {
  it("refuses an unauthenticated request", async () => {
    const res = await (await sendGET())(new Request("http://localhost/api/admin/letters/send?sendId=x"));
    expect(res.status).toBe(401);
  });

  it("?sendId= returns {queued, sent, dropped} for that one send", async () => {
    await seedList();
    const key = await composeAndWrite();
    const { sendId } = await (await sendPOST())(
      req("/api/admin/letters/send", { method: "POST", body: JSON.stringify({ key, source: "meditation", confirm: 2 }) }),
    ).then((r) => r.json());
    const before = await (await sendGET())(req(`/api/admin/letters/send?sendId=${sendId}`)).then((r) => r.json());
    expect(before).toMatchObject({ ok: true, queued: 2, sent: 0, dropped: 0 });

    const { tick } = await import("@/lib/mail-queue");
    await tick();
    const after = await (await sendGET())(req(`/api/admin/letters/send?sendId=${sendId}`)).then((r) => r.json());
    expect(after).toMatchObject({ ok: true, queued: 2, sent: 2, dropped: 0 });
  });

  it("an unknown sendId 404s with a plain reason, never a thrown error", async () => {
    const res = await (await sendGET())(req("/api/admin/letters/send?sendId=nope-never-sent"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, reason: "unknown send" });
  });

  it("neither sendId nor key present is a plain 400", async () => {
    const res = await (await sendGET())(req("/api/admin/letters/send"));
    expect(res.status).toBe(400);
  });

  it("?key= lists the last few sends for that letter, newest first, with their own counts", async () => {
    await seedList();
    const key = await composeAndWrite();
    const first = await (await sendPOST())(
      req("/api/admin/letters/send", { method: "POST", body: JSON.stringify({ key, source: "meditation", confirm: 2 }) }),
    ).then((r) => r.json());
    const second = await (await sendPOST())(
      req("/api/admin/letters/send", { method: "POST", body: JSON.stringify({ key, source: "readwithlove", confirm: 1 }) }),
    ).then((r) => r.json());

    const d = await (await sendGET())(req(`/api/admin/letters/send?key=${key}`)).then((r) => r.json());
    expect(d.ok).toBe(true);
    expect(d.sends.map((s: { sendId: string }) => s.sendId)).toEqual([second.sendId, first.sendId]); // newest first
    expect(d.sends[0]).toMatchObject({ queued: 1, sent: 0, dropped: 0, segment: "readwithlove" });
    expect(d.sends[1]).toMatchObject({ queued: 2, sent: 0, dropped: 0, segment: "meditation" });
  });

  it("?key= for a letter never sent to returns an empty list, not an error", async () => {
    const { createLetter } = await import("@/lib/letters");
    const { key } = await createLetter({ title: "Never Sent", audience: "list" });
    const d = await (await sendGET())(req(`/api/admin/letters/send?key=${key}`)).then((r) => r.json());
    expect(d).toEqual({ ok: true, sends: [] });
  });
});

describe("mail-queue.ts's record helpers fail closed on a KV outage", () => {
  it("initSendRecord/recordSendForLetter/getSendRecord/recentSendsForLetter never throw with no vault configured", async () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    const { initSendRecord, recordSendForLetter, getSendRecord, recentSendsForLetter } = await import("@/lib/mail-queue");
    await expect(initSendRecord("x", { key: "k", queued: 1, segment: "all", scheduledFor: "next tick" })).resolves.toBeUndefined();
    await expect(recordSendForLetter("k", "x")).resolves.toBeUndefined();
    await expect(getSendRecord("x")).resolves.toBeNull();
    await expect(recentSendsForLetter("k")).resolves.toEqual([]);
    process.env.KV_REST_API_URL = "https://kv.example";
    process.env.KV_REST_API_TOKEN = "test-token";
  });
});
