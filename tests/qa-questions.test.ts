import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";

/**
 * TASK-603 phase 2 (K182) — the Q&A questions rail, pinned end to end:
 *
 *  · the public POST stores a question in the month-keyed doc and the
 *    honeypot eats a bot's fill without storing anything (the contact
 *    form's idiom);
 *  · the operator list carries an earlier month's still-OPEN rows (naming
 *    their month) and lets an answered row rest in its own month doc — the
 *    auto-archive is the month doc itself, nothing moves;
 *  · mark-answered ticks without mail; reply with no email left is refused
 *    in words (409); reply WITH an email against a dark mail rail fails
 *    honestly (500) and the row stays OPEN — nothing pretends to have gone;
 *  · the box's meter is the sign-in box's idiom: ten sends inside the
 *    ten-minute window, the eleventh holds with a 429;
 *  · the admin door is operator-gated (401 without the seat cookie).
 *
 * The store rides a fixture KV (the bare Upstash-REST twin, brand-faces'
 * own idiom), so the prod driver is the path under test.
 */

let cookie: string;
let server: http.Server;
let store: Map<string, string>;
let base: string;

beforeAll(async () => {
  const pk = getPublicKey(generateSecretKey());
  process.env.SEAT_SECRET = "t603-test-seat-secret";
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  delete process.env.SMTP_HOST; // the rail is dark: notice/reply sends fail honestly

  store = new Map();
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const [cmd, key, val] = JSON.parse(body) as [string, string, string?];
      if (cmd === "GET") res.end(JSON.stringify({ result: store.get(key) ?? null }));
      else if (cmd === "SET") {
        store.set(key, val ?? "");
        res.end(JSON.stringify({ result: "OK" }));
      } else if (cmd === "INCR") {
        const n = Number(store.get(key) ?? 0) + 1;
        store.set(key, String(n));
        res.end(JSON.stringify({ result: n }));
      } else if (cmd === "EXPIRE") res.end(JSON.stringify({ result: 1 }));
      else res.end(JSON.stringify({ result: null }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
  process.env.KV_REST_API_URL = base;
  process.env.KV_REST_API_TOKEN = "t603-fixture-token";

  const { makeOperatorToken } = await import("@/lib/operator-auth");
  cookie = `fe-operator=${makeOperatorToken(pk)}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
});

const post = (body: unknown) =>
  import("@/app/api/qa/questions/route").then(({ POST }) =>
    POST(new Request("http://test/api/qa/questions", { method: "POST", body: JSON.stringify(body) })),
  );

describe("the public box", () => {
  it("stores a question and answers ok (the notice send fails dark, the question survives)", async () => {
    const res = await post({ name: "Mary", email: "mary@example.com", question: "How do we stay in the heart?" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const { qaMonthKey } = await import("@/lib/qa-questions");
    const doc = JSON.parse(store.get(`qa:questions:${qaMonthKey()}`) ?? "{}") as { rows: { who: string }[] };
    expect(doc.rows).toHaveLength(1);
    expect(doc.rows[0].who).toBe("Mary");
    expect(store.get("qa:questions:index")).toContain(qaMonthKey());
  });

  it("the honeypot eats a bot's fill and nothing is stored", async () => {
    const res = await post({ company: "spammy", question: "buy my followers" });
    expect(res.status).toBe(200);
    const { qaMonthKey } = await import("@/lib/qa-questions");
    const doc = JSON.parse(store.get(`qa:questions:${qaMonthKey()}`) ?? "{}") as { rows: unknown[] };
    expect(doc.rows).toHaveLength(1); // only Mary's from the test above
  });

  it("the question is the one thing needed; a bad email is refused in words", async () => {
    expect((await post({ name: "x" })).status).toBe(400);
    const bad = await post({ email: "not-an-email", question: "a real question" });
    expect(bad.status).toBe(400);
    expect(((await bad.json()) as { reason: string }).reason).toContain("email");
  });

  it("the meter holds the eleventh send inside the window (the sign-in box's idiom)", async () => {
    let last = 0;
    for (let i = 0; i < 10; i++) last = (await post({ email: "flood@example.com", question: `q${i}` })).status;
    expect(last).toBe(200);
    const held = await post({ email: "flood@example.com", question: "one too many" });
    expect(held.status).toBe(429);
    expect(((await held.json()) as { reason: string }).reason).toContain("too many");
  });
});

describe("the operator list and the archive", () => {
  it("carries an earlier month's open rows, lets answered rows rest in their month", async () => {
    const { qaMonthKey } = await import("@/lib/qa-questions");
    const thisMonth = qaMonthKey();
    const [y, m] = thisMonth.split("-").map(Number);
    const lastMonth = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
    store.set(
      `qa:questions:${lastMonth}`,
      JSON.stringify({
        rows: [
          { id: `${lastMonth.replace("-", "")}-oldopen`, words: "carried?", who: "Ruth", email: null,
            atMs: Date.now() - 40 * 86_400_000, answeredAtMs: null, answer: null },
          { id: `${lastMonth.replace("-", "")}-olddone`, words: "resting?", who: "Alana", email: null,
            atMs: Date.now() - 39 * 86_400_000, answeredAtMs: Date.now() - 38 * 86_400_000, answer: null },
        ],
      }),
    );
    store.set("qa:questions:index", JSON.stringify({ months: [lastMonth, thisMonth] }));

    const { listQuestions } = await import("@/lib/qa-questions");
    const { thisMonthKey, rows } = await listQuestions();
    expect(thisMonthKey).toBe(thisMonth);
    const carried = rows.filter((r) => r.carried);
    expect(carried.map((r) => r.id)).toEqual([`${lastMonth.replace("-", "")}-oldopen`]);
    expect(carried[0].monthKey).toBe(lastMonth);
    expect(rows.find((r) => r.id.endsWith("olddone"))).toBeUndefined();
    // the carried row leads, this month's rows follow in arrival order
    expect(rows[0].carried).toBe(true);
  });

  it("mark-answered ticks the row out of the open list", async () => {
    const { addQuestion, markAnswered, listQuestions } = await import("@/lib/qa-questions");
    const row = await addQuestion({ words: "tick me", who: "no name given", email: null });
    const done = await markAnswered(row.id);
    expect(done?.answeredAtMs).not.toBeNull();
    const { rows } = await listQuestions();
    const listed = rows.find((r) => r.id === row.id);
    expect(listed?.answeredAtMs).not.toBeNull();
  });
});

describe("the admin door", () => {
  const put = (body: unknown, withCookie = true) =>
    import("@/app/api/admin/qa-questions/route").then(({ PUT }) =>
      PUT(
        new Request("http://test/api/admin/qa-questions", {
          method: "PUT",
          headers: withCookie ? { cookie, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      ),
    );

  it("gates on the operator seat", async () => {
    const { GET } = await import("@/app/api/admin/qa-questions/route");
    const denied = await GET(new Request("http://test/api/admin/qa-questions"));
    expect(denied.status).toBe(401);
    expect(denied.headers.get("Cache-Control")).toBe("no-store");
    const ok = await GET(new Request("http://test/api/admin/qa-questions", { headers: { cookie } }));
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as { ok: boolean; rows: unknown[] };
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.rows)).toBe(true);
  });

  it("reply with no email left is refused in words; the row stays open", async () => {
    const { addQuestion, listQuestions } = await import("@/lib/qa-questions");
    const row = await addQuestion({ words: "no email here", who: "no name given", email: null });
    const res = await put({ action: "reply", id: row.id, reply: "hello" });
    expect(res.status).toBe(409);
    const { rows } = await listQuestions();
    expect(rows.find((r) => r.id === row.id)?.answeredAtMs).toBeNull();
  });

  it("reply against a dark rail fails honestly (500) and the row stays open", async () => {
    const { addQuestion, listQuestions } = await import("@/lib/qa-questions");
    const row = await addQuestion({ words: "mail me", who: "James", email: "james@example.com" });
    const res = await put({ action: "reply", id: row.id, reply: "a warm answer" });
    expect(res.status).toBe(500);
    const { rows } = await listQuestions();
    expect(rows.find((r) => r.id === row.id)?.answeredAtMs).toBeNull();
  });

  it("mark-answered through the door answers no-store ok", async () => {
    const { addQuestion } = await import("@/lib/qa-questions");
    const row = await addQuestion({ words: "door tick", who: "Ruth", email: null });
    const res = await put({ action: "mark-answered", id: row.id });
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
