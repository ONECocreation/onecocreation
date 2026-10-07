import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";

/**
 * T-591: "Send me a copy" on every letter row (one address, "[test]", blanks
 * filled with sample words) and "Save draft" beside Publish.
 */
const sent: { to: string; subject: string; html: string }[] = [];
vi.mock("@/lib/mail-queue", () => ({
  enqueue: async (items: { to: string; subject: string; html: string }[]) => { sent.push(...items); return items.length; },
}));
vi.mock("@/lib/mail", async (orig) => ({ ...(await orig<typeof import("@/lib/mail")>()), onceWithin: async () => true }));

const vault = new Map<string, string>();
let cookie: string;
beforeAll(async () => {
  process.env.KV_REST_API_URL = "https://kv.example";
  process.env.KV_REST_API_TOKEN = "test-token";
  process.env.SEAT_SECRET = "test-seat-secret";
  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  cookie = `fe-operator=${makeOperatorToken(pk)}`;
});
beforeEach(() => {
  vault.clear();
  sent.length = 0;
  vi.stubGlobal("fetch", async (_u: unknown, init?: { body?: string }) => {
    const cmd = JSON.parse(init?.body ?? "[]") as [string, ...string[]];
    if (cmd[0] === "GET") return Response.json({ result: vault.get(cmd[1]) ?? null });
    if (cmd[0] === "SET") { vault.set(cmd[1], cmd[2]); return Response.json({ result: "OK" }); }
    return Response.json({ result: null });
  });
});
afterEach(() => vi.unstubAllGlobals());

const post = (body: unknown, withCookie = true) =>
  new Request("http://localhost/api/admin/letters/copy", {
    method: "POST",
    headers: { ...(withCookie ? { cookie } : {}), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("fillSamples", () => {
  it("fills every blank with sample words, unknown blanks too", async () => {
    const { fillSamples } = await import("@/lib/letter-samples");
    const out = fillSamples("{{lines}}\n{{link}}\n{{ nothing }}");
    expect(out).not.toContain("{{");
    expect(out).toContain("(sample)");
    expect(out).not.toMatch(/—/); // no long dash in the sample words
  });
});

describe("POST /api/admin/letters/copy", () => {
  it("sends one copy of a one-soul letter with [test] and the blanks filled", async () => {
    const { POST } = await import("@/app/api/admin/letters/copy/route");
    const r = await (await POST(post({ key: "order-receipt", to: "me@example.com" }))).json();
    expect(r).toEqual({ ok: true, queued: 1 });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("me@example.com");
    expect(sent[0].subject.startsWith("[test] ")).toBe(true);
    expect(sent[0].html).not.toContain("{{");
  });
  it("refuses without the operator cookie, a bad address, or an unknown letter", async () => {
    const { POST } = await import("@/app/api/admin/letters/copy/route");
    expect((await POST(post({ key: "order-receipt", to: "me@example.com" }, false))).status).toBe(401);
    expect((await POST(post({ key: "order-receipt", to: "not-an-address" }))).status).toBe(400);
    expect((await POST(post({ key: "no-such-letter", to: "me@example.com" }))).status).toBe(400);
    expect(sent).toHaveLength(0);
  });
});

describe("the room", () => {
  const src = readFileSync(resolve(__dirname, "../src/app/a/letters/page.tsx"), "utf8");
  it("every keyed row carries Send me a copy, and its strip opens under the row", () => {
    expect(src).toContain('aria-label="Send me a copy"');
    expect(src.match(/copyFor === [a-zA-Z.]+ && copyStrip\(/g)?.length).toBe(3);
  });
  it("a draft's editor has Save draft beside Publish, and it saves without publish", () => {
    expect(src).toContain(">Save draft<");
    const fn = src.slice(src.indexOf("async function saveDraft"), src.indexOf("async function save(key"));
    expect(fn).not.toContain("publish");
  });
});
