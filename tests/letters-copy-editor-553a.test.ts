import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * T-604 (letters 553a): the edit page's test copy. The copy carries what is ON
 * THE SCREEN (the posted words, not the stored ones) and goes to the signed-in
 * address only. The old typed-address mode stays as T-591 left it (its own test).
 */
const sent: { to: string; subject: string; html: string }[] = [];
let guardOpen = true;
vi.mock("@/lib/mail-queue", () => ({
  enqueue: async (items: { to: string; subject: string; html: string }[]) => { sent.push(...items); return items.length; },
}));
vi.mock("@/lib/mail", async (orig) => ({ ...(await orig<typeof import("@/lib/mail")>()), onceWithin: async () => guardOpen }));
/* the session reader: a cookie "who=<identity>" stands for the operator identity the real reader returns
   (an email for an email seat, a public key for a keyed operator) */
vi.mock("@/lib/operator-auth", () => ({
  operatorFromCookieHeader: (c: string | null) => /who=([^;]+)/.exec(c ?? "")?.[1] ?? null,
}));

const vault = new Map<string, string>();
beforeEach(() => {
  process.env.KV_REST_API_URL = "https://kv.example";
  process.env.KV_REST_API_TOKEN = "test-token";
  vault.clear();
  sent.length = 0;
  guardOpen = true;
  vi.stubGlobal("fetch", async (_u: unknown, init?: { body?: string }) => {
    const cmd = JSON.parse(init?.body ?? "[]") as [string, ...string[]];
    if (cmd[0] === "GET") return Response.json({ result: vault.get(cmd[1]) ?? null });
    if (cmd[0] === "SET") { vault.set(cmd[1], cmd[2]); return Response.json({ result: "OK" }); }
    return Response.json({ result: null });
  });
});
afterEach(() => vi.unstubAllGlobals());

const EMAIL = "love@example.com";
const KEYED = "ab".repeat(32);
const post = (body: unknown, who: string | null = EMAIL) =>
  new Request("http://localhost/api/admin/letters/copy", {
    method: "POST",
    headers: { ...(who ? { cookie: `who=${who}` } : {}), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const get = (who: string | null = EMAIL) =>
  new Request("http://localhost/api/admin/letters/copy", { headers: who ? { cookie: `who=${who}` } : {} });

describe("POST /api/admin/letters/copy, the editor mode", () => {
  it("sends the POSTED words, not the stored ones, to the session email", async () => {
    const { POST } = await import("@/app/api/admin/letters/copy/route");
    const r = await (await POST(post({ fromEditor: true, key: "welcome", subject: "On screen subject", body: "Fresh **bold** words for {{who}}." }))).json();
    expect(r).toMatchObject({ ok: true, queued: 1, to: EMAIL });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(EMAIL);
    expect(sent[0].subject).toBe("[test] On screen subject");
    expect(sent[0].html).toContain("Fresh <b>bold</b> words");
    expect(sent[0].html).not.toContain("{{");
  });
  it("ignores an address the client sends", async () => {
    const { POST } = await import("@/app/api/admin/letters/copy/route");
    await POST(post({ fromEditor: true, key: "welcome", to: "someone-else@example.com", subject: "S", body: "Words." }));
    expect(sent.map((m) => m.to)).toEqual([EMAIL]);
  });
  it("refuses a keyed operator with the plain reason, and sends nothing", async () => {
    const { POST } = await import("@/app/api/admin/letters/copy/route");
    const res = await POST(post({ fromEditor: true, key: "welcome", to: "me@example.com", subject: "S", body: "Words." }, KEYED));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, reason: "Your sign-in has no email address, so there is nowhere to send a copy." });
    expect(sent).toHaveLength(0);
  });
  it("refuses a signed-out request with 401", async () => {
    const { POST } = await import("@/app/api/admin/letters/copy/route");
    expect((await POST(post({ fromEditor: true, key: "welcome", subject: "S", body: "Words." }, null))).status).toBe(401);
    expect(sent).toHaveLength(0);
  });
  it("refuses empty words, a body past the cap and an unknown letter", async () => {
    const { POST } = await import("@/app/api/admin/letters/copy/route");
    expect((await POST(post({ fromEditor: true, key: "welcome", subject: "S", body: "  " }))).status).toBe(400);
    expect((await POST(post({ fromEditor: true, key: "welcome", subject: "", body: "Words" }))).status).toBe(400);
    expect((await POST(post({ fromEditor: true, key: "welcome", subject: "S", body: "x".repeat(60001) }))).status).toBe(400);
    expect((await POST(post({ fromEditor: true, key: "no-such-letter", subject: "S", body: "Words" }))).status).toBe(400);
    expect(sent).toHaveLength(0);
  });
  it("the one-shot guard still holds", async () => {
    const { POST } = await import("@/app/api/admin/letters/copy/route");
    guardOpen = false;
    const res = await POST(post({ fromEditor: true, key: "welcome", subject: "S", body: "Words." }));
    expect(res.status).toBe(429);
    expect(sent).toHaveLength(0);
  });
});

describe("GET /api/admin/letters/copy", () => {
  it("names the session email so the button can say where the copy goes", async () => {
    const { GET } = await import("@/app/api/admin/letters/copy/route");
    expect(await (await GET(get())).json()).toEqual({ ok: true, canCopy: true, to: EMAIL });
  });
  it("says there is nowhere to send for a keyed operator, and 401 signed out", async () => {
    const { GET } = await import("@/app/api/admin/letters/copy/route");
    expect(await (await GET(get(KEYED))).json()).toEqual({ ok: true, canCopy: false, to: null });
    expect((await GET(get(null))).status).toBe(401);
  });
});
