import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";

/**
 * Delete draft: Love removes a draft from the letters room. The words are
 * kept aside (letters:removed:<key>), published, seeded and self-sending
 * letters are refused, and the room asks for "yes delete" first.
 */
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
  vi.stubGlobal("fetch", async (_u: unknown, init?: { body?: string }) => {
    const cmd = JSON.parse(init?.body ?? "[]") as [string, ...string[]];
    if (cmd[0] === "GET") return Response.json({ result: vault.get(cmd[1]) ?? null });
    if (cmd[0] === "SET") { vault.set(cmd[1], cmd[2]); return Response.json({ result: "OK" }); }
    if (cmd[0] === "DEL") { vault.delete(cmd[1]); return Response.json({ result: 1 }); }
    return Response.json({ result: null });
  });
});
afterEach(() => vi.unstubAllGlobals());

const req = (method: string, body?: unknown) =>
  new Request("http://localhost/api/admin/letters", {
    method,
    headers: { cookie, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const keys = async () => {
  const { GET } = await import("@/app/api/admin/letters/route");
  const g = await (await GET(req("GET"))).json();
  return (g.letters as { key: string }[]).map((l) => l.key);
};

describe("DELETE /api/admin/letters", () => {
  it("deletes a draft from the room and keeps its words aside", async () => {
    const { POST, PUT, DELETE } = await import("@/app/api/admin/letters/route");
    const made = await (await POST(req("POST", { title: "A spare note", audience: "list" }))).json();
    await PUT(req("PUT", { key: made.key, subject: "Spare", body: "Kept words." }));
    const res = await DELETE(req("DELETE", { key: made.key }));
    expect(res.status).toBe(200);
    expect(await keys()).not.toContain(made.key);
    expect(vault.has(`letters:tpl:${made.key}`)).toBe(false);
    expect(vault.has(`letters:meta:${made.key}`)).toBe(false);
    const kept = JSON.parse(vault.get(`letters:removed:${made.key}`) ?? "[]");
    expect(kept).toHaveLength(1);
    expect(kept[0].override.body).toBe("Kept words.");
    expect(kept[0].meta.title).toBe("A spare note");
    // the key is free again, and a second delete keeps both copies
    const again = await (await POST(req("POST", { title: "A spare note", audience: "list" }))).json();
    expect(again.key).toBe(made.key);
    await DELETE(req("DELETE", { key: made.key }));
    expect(JSON.parse(vault.get(`letters:removed:${made.key}`) ?? "[]")).toHaveLength(2);
  });

  it("refuses a published letter, a seeded letter and an unknown key", async () => {
    const { POST, PUT, DELETE } = await import("@/app/api/admin/letters/route");
    const made = await (await POST(req("POST", { title: "Out already", audience: "list" }))).json();
    await PUT(req("PUT", { key: made.key, subject: "S", body: "W.", publish: true }));
    expect((await DELETE(req("DELETE", { key: made.key }))).status).toBe(400);
    expect(await keys()).toContain(made.key);
    expect((await DELETE(req("DELETE", { key: "welcome" }))).status).toBe(400);
    expect((await DELETE(req("DELETE", { key: "no-such-letter" }))).status).toBe(400);
  });

  it("refuses a draft riding an automatic send", async () => {
    const { POST, DELETE } = await import("@/app/api/admin/letters/route");
    const { READING_CONFIRMATION_LETTER_KEY } = await import("@/lib/reading-letters");
    await POST(req("POST", { key: READING_CONFIRMATION_LETTER_KEY, title: "Weekly reading", audience: "list" }));
    expect((await DELETE(req("DELETE", { key: READING_CONFIRMATION_LETTER_KEY }))).status).toBe(409);
    expect(await keys()).toContain(READING_CONFIRMATION_LETTER_KEY);
  });

  it("is closed without the operator cookie", async () => {
    const { DELETE } = await import("@/app/api/admin/letters/route");
    const r = new Request("http://localhost/api/admin/letters", { method: "DELETE", body: JSON.stringify({ key: "x" }) });
    expect((await DELETE(r)).status).toBe(401);
  });
});

describe("the room's delete step", () => {
  const room = readFileSync(resolve(__dirname, "../src/app/a/letters/page.tsx"), "utf8");
  it("only drafts carry the delete button, behind typed yes delete, Delete left of Keep it", () => {
    expect(room).toMatch(/main: words, remove: true/);
    expect(room.match(/remove: true/g)).toHaveLength(1);
    expect(room).toContain("there is no going back");
    expect(room).toContain('=== "yes delete"');
    expect(room.indexOf(">Delete draft</Button>")).toBeLessThan(room.indexOf(">Keep it</Button>"));
  });
});
