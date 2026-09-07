import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";

/**
 * TASK-131 (0018.06.16 a₿): compose a letter and send it to the list — all,
 * or one door's segment. The KV rail is an in-memory stub speaking the
 * vault's command set; the route handlers run for real behind a real
 * operator cookie; nodemailer is mocked so the List-Unsubscribe law is
 * pinned at the sendMail seam without touching a network.
 *
 * Truth pinned: create → appears in the list · segment filter counts · a
 * segment send enqueues exactly N, skips the opted-out, every copy with its
 * own unsubscribe URL · the typed-count confirmation · testTo sends one · a
 * public composed letter shows on the shelf listing (/news's data source) ·
 * an unsubscribe that lands while a letter waits in the queue kills that copy.
 */

/* ── the in-memory vault ─────────────────────────────────────────────────── */

const strings = new Map<string, string>();
const sets = new Map<string, Set<string>>();
const lists = new Map<string, string[]>();

function vaultReset() {
  strings.clear();
  sets.clear();
  lists.clear();
}

function vaultCmd(cmd: [string, ...string[]]): unknown {
  const [op, k, ...rest] = cmd;
  switch (op) {
    case "GET":
      return strings.get(k) ?? null;
    case "SET":
      strings.set(k, rest[0]);
      return "OK";
    case "DEL":
      strings.delete(k);
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
    case "EXPIRE":
      return 1;
    default:
      return null;
  }
}

/* ── nodemailer mocked at the seam — captures what sendMail hands over ───── */

const sentMail: { to: string; subject: string; headers?: Record<string, string> }[] = [];
vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({
      sendMail: async (args: (typeof sentMail)[number]) => {
        sentMail.push(args);
      },
    }),
  },
}));

let cookie: string;

const lettersGET = async () => (await import("@/app/api/admin/letters/route")).GET;
const lettersPOST = async () => (await import("@/app/api/admin/letters/route")).POST;
const sendPOST = async () => (await import("@/app/api/admin/letters/send/route")).POST;

const req = (url: string, init?: RequestInit) =>
  new Request(`http://localhost${url}`, {
    ...init,
    headers: { cookie, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

const queueItems = () =>
  (lists.get("mail:queue") ?? []).map((raw) => JSON.parse(raw) as {
    to: string;
    subject: string;
    html: string;
    notBefore?: number;
    guard?: { kind: string };
  });

beforeAll(async () => {
  process.env.KV_REST_API_URL = "https://kv.example";
  process.env.KV_REST_API_TOKEN = "test-token";
  process.env.NEXT_PUBLIC_SITE_URL = "https://test-site.example";
  process.env.SEAT_SECRET = "test-seat-secret";
  process.env.MAIL_HOURLY_CAP = "3"; // a small cap so the estimate is exercised
  // the mail rail "configured" — nodemailer above is a mock, nothing connects
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
});

async function seedList() {
  const { addSubscriber } = await import("@/lib/subscribers");
  await addSubscriber("ana@example.com", "meditation");
  await addSubscriber("ben@example.com", "meditation");
  await addSubscriber("cleo@example.com", "readwithlove");
  await addSubscriber("dan@example.com", "waitlist-a");
}

describe("compose (TASK-131)", () => {
  it("create → the letter appears in the room's list, seeded set untouched", async () => {
    const res = await (await lettersPOST())(
      req("/api/admin/letters", {
        method: "POST",
        body: JSON.stringify({ title: "Lions Gate Gathering", audience: "list" }),
      }),
    );
    const d = await res.json();
    expect(d).toEqual({ ok: true, key: "lions-gate-gathering" });

    const list = await (await lettersGET())(req("/api/admin/letters")).then((r) => r.json());
    const keys = list.letters.map((l: { key: string }) => l.key);
    expect(keys).toContain("news-sample"); // the seeded six still lead
    expect(keys).toContain("lions-gate-gathering");
    const composed = list.letters.find((l: { key: string }) => l.key === "lions-gate-gathering");
    expect(composed.kind).toBe("composed");
    expect(composed.title).toBe("Lions Gate Gathering");
    expect(composed.audience).toBe("members"); // "list" rides the house's members vocabulary

    const { EDITABLE_LETTERS } = await import("@/lib/letters");
    expect(EDITABLE_LETTERS).toHaveLength(6); // the seeded set did not grow
  });

  it("rejects a clashing key and a non-slug key", async () => {
    const POST = await lettersPOST();
    const clash = await POST(req("/api/admin/letters", {
      method: "POST",
      body: JSON.stringify({ title: "Again", key: "news-sample", audience: "list" }),
    })).then((r) => r.json());
    expect(clash.ok).toBe(false);
    const bad = await POST(req("/api/admin/letters", {
      method: "POST",
      body: JSON.stringify({ title: "Bad", key: "No Spaces!", audience: "list" }),
    })).then((r) => r.json());
    expect(bad.ok).toBe(false);
  });
});

describe("segments", () => {
  it("segment filter + counts are derived from the records, never hardcoded", async () => {
    await seedList();
    const { listSubscribers, subscriberSegments, removeSubscriber } = await import("@/lib/subscribers");
    expect(await listSubscribers()).toHaveLength(4);
    const med = await listSubscribers({ source: "meditation" });
    expect(med.sort()).toEqual(["ana@example.com", "ben@example.com"]);
    expect(await listSubscribers({ source: "waitlist-a" })).toEqual(["dan@example.com"]);
    expect(await listSubscribers({ source: "nobody" })).toEqual([]);

    const segments = await subscriberSegments();
    expect(segments).toEqual([
      { source: "meditation", count: 2 },
      { source: "readwithlove", count: 1 },
      { source: "waitlist-a", count: 1 },
    ]);

    // an opted-out soul leaves every count
    await removeSubscriber("ana@example.com");
    expect((await subscriberSegments()).find((s) => s.source === "meditation")?.count).toBe(1);

    // and the API hands the panel All + every door with live counts
    const d = await (await lettersGET())(req("/api/admin/letters")).then((r) => r.json());
    expect(d.segments[0]).toEqual({ source: "all", count: 3 });
    expect(d.segments.map((s: { source: string }) => s.source)).toEqual(
      expect.arrayContaining(["all", "meditation", "readwithlove", "waitlist-a"]),
    );
  });
});

describe("send", () => {
  async function composeAndWrite(audience: "public" | "list" = "list") {
    const { createLetter, saveLetterOverride } = await import("@/lib/letters");
    const { key } = await createLetter({ title: "Sunday Letter", audience });
    await saveLetterOverride(key, {
      subject: "Sunday Letter — this week's field notes",
      body: "Beautiful soul,\n\nthis week in the field.",
      audience: audience === "public" ? "public" : "members",
    });
    return key;
  }

  it("send to one segment enqueues exactly N, skips the opted-out, each with its own unsubscribe URL", async () => {
    await seedList();
    const { removeSubscriber } = await import("@/lib/subscribers");
    await removeSubscriber("ben@example.com"); // left the list before the send
    const key = await composeAndWrite();

    const res = await (await sendPOST())(
      req("/api/admin/letters/send", {
        method: "POST",
        body: JSON.stringify({ key, source: "meditation", confirm: 1 }),
      }),
    );
    const d = await res.json();
    expect(d.ok).toBe(true);
    expect(d.queued).toBe(1); // ben is gone — only ana remains
    expect(d.segment).toBe("meditation");
    expect(d.recipients).toEqual(["ana@example.com"]);

    const items = queueItems();
    expect(items).toHaveLength(1);
    expect(items[0].to).toBe("ana@example.com");
    expect(items[0].subject).toBe("Sunday Letter — this week's field notes");
    expect(items[0].html).toContain("/api/unsubscribe?e=ana%40example.com&t=");
    expect(items[0].guard).toEqual({ kind: "subscribed" });

    // a delivery line per member, in their mailbox
    const box = (lists.get("mailbox:ana@example.com") ?? []).map((r) => JSON.parse(r));
    expect(box[0]).toMatchObject({ key, subject: "Sunday Letter — this week's field notes" });
    expect(lists.get("mailbox:ben@example.com") ?? []).toHaveLength(0);
  });

  it("the typed count must match — a wrong number stops the send (409)", async () => {
    await seedList();
    const key = await composeAndWrite();
    const res = await (await sendPOST())(
      req("/api/admin/letters/send", {
        method: "POST",
        body: JSON.stringify({ key, source: "all", confirm: 999 }),
      }),
    );
    expect(res.status).toBe(409);
    const d = await res.json();
    expect(d).toMatchObject({ ok: false, expected: 4 });
    expect(queueItems()).toHaveLength(0); // nothing enqueued
  });

  it("N over the hourly cap comes back with an honest estimated finish", async () => {
    await seedList(); // 4 souls, cap 3/hour
    const key = await composeAndWrite();
    const d = await (await sendPOST())(
      req("/api/admin/letters/send", {
        method: "POST",
        body: JSON.stringify({ key, source: "all", confirm: 4 }),
      }),
    ).then((r) => r.json());
    expect(d.ok).toBe(true);
    expect(d.hourlyCap).toBe(3);
    expect(d.estimatedFinish).toBeTruthy();
    expect(Date.parse(d.estimatedFinish)).toBeGreaterThan(Date.now() + 3_600_000);
  });

  it("testTo sends exactly one test copy, list untouched", async () => {
    await seedList();
    const key = await composeAndWrite();
    const d = await (await sendPOST())(
      req("/api/admin/letters/send", {
        method: "POST",
        body: JSON.stringify({ key, testTo: "love@example.com" }),
      }),
    ).then((r) => r.json());
    expect(d).toEqual({ ok: true, queued: 1, test: true });
    const items = queueItems();
    expect(items).toHaveLength(1);
    expect(items[0].to).toBe("love@example.com");
    expect(items[0].subject).toBe("[test] Sunday Letter — this week's field notes");
    expect(items[0].html).toContain("/api/unsubscribe?e=love%40example.com&t=");
  });

  it("a composed letter's mail carries no site link yet (derive-or-dash until the /news seam)", async () => {
    await seedList();
    const key = await composeAndWrite();
    await (await sendPOST())(
      req("/api/admin/letters/send", {
        method: "POST",
        body: JSON.stringify({ key, source: "readwithlove", confirm: 1 }),
      }),
    );
    expect(queueItems()[0].html).not.toContain("View on the site");
  });

  it("every list mail wears List-Unsubscribe headers at the sendMail seam", async () => {
    const { sendMail } = await import("@/lib/mail");
    await sendMail("news", {
      to: "ana@example.com",
      subject: "s",
      html: "<p>x</p>",
      unsubscribeUrl: "https://test-site.example/api/unsubscribe?e=ana%40example.com&t=abc",
    });
    expect(sentMail).toHaveLength(1);
    expect(sentMail[0].headers?.["List-Unsubscribe"]).toBe(
      "<https://test-site.example/api/unsubscribe?e=ana%40example.com&t=abc>",
    );
    expect(sentMail[0].headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("an unsubscribe that lands while the letter waits kills that copy at send time", async () => {
    await seedList();
    const key = await composeAndWrite();
    await (await sendPOST())(
      req("/api/admin/letters/send", {
        method: "POST",
        body: JSON.stringify({ key, source: "meditation", confirm: 2 }),
      }),
    );
    const { removeSubscriber } = await import("@/lib/subscribers");
    await removeSubscriber("ana@example.com"); // left AFTER the send was queued
    const { tick } = await import("@/lib/mail-queue");
    const out = await tick();
    expect(out.sent).toBe(1);
    expect(sentMail.map((m) => m.to)).toEqual(["ben@example.com"]);
  });
});

describe("public audience", () => {
  it("a composed public letter shows on the shelf listing /news reads from", async () => {
    const { createLetter, saveLetterOverride, listPublicLetters } = await import("@/lib/letters");
    const { key } = await createLetter({ title: "Open Field Notes", audience: "public" });
    await saveLetterOverride(key, {
      subject: "Open Field Notes",
      body: "for everyone.",
      audience: "public",
    });
    const shelf = await listPublicLetters();
    // news-sample is seeded public; the composed letter joins it
    expect(shelf).toEqual(
      expect.arrayContaining([
        { key: "news-sample", subject: expect.any(String) },
        { key: "open-field-notes", subject: "Open Field Notes" },
      ]),
    );
    // a list-only composed letter stays OFF the shelf
    const { key: listOnly } = await createLetter({ title: "Members Only Note", audience: "list" });
    expect(shelf.map((s) => s.key)).not.toContain(listOnly);
  });
});
