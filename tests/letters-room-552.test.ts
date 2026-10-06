import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";

/**
 * T-552: the letters room rebuild, lane 1. Drafted rules, the meta round
 * trip through the real GET/PUT/POST route, and source pins on the room.
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

describe("isDrafted", () => {
  it("covers the helper draft, Love's own draft, a legacy composed letter and a reviewed reading draft", async () => {
    const { isDrafted } = await import("@/lib/letters-drafts");
    expect(isDrafted("next-reading-2026-10-11", {})).toBe(true); // helper draft, no flag needed
    expect(isDrafted("after-reading-2026-10-11-1", { draft: false })).toBe(true);
    expect(isDrafted("a-note", { draft: true })).toBe(true); // Love's own
    expect(isDrafted("old-letter", {})).toBe(false); // legacy: never a draft
    expect(isDrafted("old-letter", null)).toBe(false);
    expect(isDrafted("next-reading-2026-10-11", { reviewedAtMs: 5, draft: false })).toBe(false);
  });
  it("says who started it in plain words", async () => {
    const { draftWhoWords } = await import("@/lib/letters-drafts");
    const wd = () => "Monday";
    expect(draftWhoWords("next-reading-x", 1, wd)).toBe("Drafted by the helper on Monday, waiting for you.");
    expect(draftWhoWords("mine", 1, wd, false)).toBe("Started by you on Monday, not finished yet.");
    expect(draftWhoWords("mine", 1, wd, true)).toBe("Started by you on Monday, waiting for your review.");
  });
});

describe("meta round trip through the admin route", () => {
  it("a new letter is born a draft; Publish clears it; a plain legacy meta stays not-a-draft", async () => {
    const { GET, POST, PUT } = await import("@/app/api/admin/letters/route");
    const made = await (await POST(req("POST", { title: "A note to the circle", audience: "list" }))).json();
    expect(made.key).toBe("a-note-to-the-circle");
    let g = await (await GET(req("GET"))).json();
    let l = g.letters.find((x: { key: string }) => x.key === made.key);
    expect(l.draft).toBe(true);
    expect(l.createdAtMs).toBeGreaterThan(0);
    expect(l.reviewedAtMs).toBeNull();

    await PUT(req("PUT", { key: made.key, subject: "S", body: "Words." }));
    g = await (await GET(req("GET"))).json();
    l = g.letters.find((x: { key: string }) => x.key === made.key);
    expect(l.draft).toBe(true); // a plain save keeps it Drafted
    expect(l.updatedAtMs).toBeGreaterThan(0);

    await PUT(req("PUT", { key: made.key, subject: "S", body: "Words.", publish: true }));
    g = await (await GET(req("GET"))).json();
    l = g.letters.find((x: { key: string }) => x.key === made.key);
    expect(l.draft).toBe(false);
    expect(l.reviewedAtMs).toBeGreaterThan(0);

    // a legacy meta (no new fields) reads as not a draft
    vault.set("letters:meta:old", JSON.stringify({ key: "old", title: "Old", createdAtMs: 1 }));
    vault.set("letters:composed", JSON.stringify([made.key, "old"]));
    vault.set("letters:tpl:old", JSON.stringify({ subject: "o", body: "b" }));
    g = await (await GET(req("GET"))).json();
    l = g.letters.find((x: { key: string }) => x.key === "old");
    expect(l.draft).toBe(false);
  });

  it("a derived key that is taken gets a numeric suffix; a typed key that is taken still refuses", async () => {
    const { createLetter } = await import("@/lib/letters");
    expect((await createLetter({ title: "Same", audience: "list" })).key).toBe("same");
    expect((await createLetter({ title: "Same", audience: "list" })).key).toBe("same-2");
    expect((await createLetter({ title: "Same", audience: "list" })).key).toBe("same-3");
    await expect(createLetter({ key: "same", title: "Same", audience: "list" })).rejects.toThrow(/already exists/);
  });
});

describe("the room source", () => {
  const src = readFileSync(resolve(__dirname, "../src/app/a/letters/page.tsx"), "utf8");
  it("is built on the kit and the Drafted helper", () => {
    expect(src).toContain('from "@/components/kit"');
    expect(src).toContain("isDrafted(");
    expect(src).toContain("Your letters");
    expect(src).toContain("Drafted");
  });
  it("every sendable row has Edit, Preview and Send that reach the existing editor, preview and send panel", () => {
    expect(src).toContain("openPreview(key, fallbackSubject)");
    expect(src).toContain("href={`/a/letters/${key}`}");
    expect(src).toContain("send: !l.noPublish");
  });
  it("every row control is a small icon button with an accessible name, Send first, no visible words", () => {
    const end = src.slice(src.indexOf("function rowEnd("), src.indexOf("function openedRow("));
    for (const name of ["Send this letter", "Edit this letter", "Preview this letter", "Review this draft"]) expect(end).toContain(name);
    expect(end.match(/<RowIcon>/g)?.length).toBe(3); // airplane, pencil, eye
    expect(end).not.toMatch(/>\s*(Send|Edit|Preview|Review|Close)\s*</);
    expect(end.indexOf('aria-label="Send this letter"')).toBeLessThan(end.indexOf("openEditor("));
    expect(end.indexOf("openEditor(")).toBeLessThan(end.indexOf("openPreview("));
    expect(src).toContain('aria-hidden="true"');
  });
  it("the one size rule: every control in the group is a 2.5rem square; phone keeps one left-aligned row", () => {
    const css = readFileSync(resolve(__dirname, "../src/app/kit.css"), "utf8");
    expect(css).toMatch(/\.kitx-even>\.kit-btn\{[^}]*width:2\.5rem;height:2\.5rem/);
    expect(css).toMatch(/max-width:640px\)\{\s*\.kit-rows-stackable>li>\.kitx-even\{display:flex;justify-content:flex-start/);
  });
  it("names the fixed parts on every row", () => {
    expect(src).toContain("Fixed: the logo header and the footer.");
    expect(src).toContain("every part is fixed");
  });
  it("the room's new copy has no long dash, arrow or emoji (the editor's old labels are lane 553a)", () => {
    const head = src.slice(src.indexOf("function rowEnd("), src.indexOf("function yoursRow("));
    const tail = src.slice(src.indexOf("  return (\n    <div className=\"p-6 text-sm\""));
    for (const part of [head, tail]) expect(part).not.toMatch(/[—→←\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}]/u);
  });
  it("an empty subject says No subject yet, never empty quotes; the control group is the even phone row", () => {
    expect(src).toContain("No subject yet");
    expect(src).not.toContain("&ldquo;{c.override?.subject");
    expect(src).toContain("kit-rows-end kit-rows-pair kitx-even");
  });
  it("under the site chrome the room prints no head of its own; the frame subtitle has no long dash", () => {
    expect(src).toContain('CONSOLE_CHROME !== "site"');
    const con = readFileSync(resolve(__dirname, "../src/lib/console.ts"), "utf8");
    expect(con).toContain("Every letter the house sends, and the ones Love will bring.");
  });
  it("the key field is gone from New letter", () => {
    expect(src).not.toContain("setNewKey");
  });
});

describe("T-552 r6: test letters sit at the bottom of Your letters", () => {
  it("moves letters titled or subjected 'test' last, keeps the rest in order", async () => {
    const { testsLast, isTestLetter } = await import("@/lib/letters-drafts");
    const live = [
      { key: "new-public-test-public-letter", title: "New Public Test Public letter", override: { subject: "New Public Test Public letter" } },
      { key: "test-title", title: "Test title", override: { subject: "Test title" } },
      { key: "story-time-welcome", title: "Story Time Welcome", override: { subject: "Story Time Welcome" } },
      { key: "weekly-reading-with-love", title: "Weekly Reading with Love", override: { subject: "Weekly Reading with Love" } },
    ];
    expect(testsLast(live).map((l) => l.key)).toEqual([
      "story-time-welcome", "weekly-reading-with-love", "new-public-test-public-letter", "test-title",
    ]);
    expect(isTestLetter({ title: "Testimony night", override: null })).toBe(false);
  });
});
