import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

/**
 * TASK-120 step 4 (0018.06.16 a₿): the subscriber record carries its
 * `source` verbatim, so "readwithlove" and "waitlist-*" rows can be told
 * apart in the vault (flow 4's doctrine: know who is on what list). The KV
 * rail is stubbed — the test pins the RECORD addSubscriber writes, not the
 * network.
 *
 * Truth pinned, both halves: a NEW join records the door it came through;
 * a RE-join keeps the first door's source (re-joining only clears a prior
 * opt-out — the record of where they first arrived is not rewritten).
 */

const vault = new Map<string, string>();
let index: string[] = [];

beforeAll(() => {
  process.env.KV_REST_API_URL = "https://kv.example";
  process.env.KV_REST_API_TOKEN = "test-token";
  vi.stubGlobal("fetch", async (_url: unknown, init?: { body?: string }) => {
    const cmd = JSON.parse(init?.body ?? "[]") as [string, ...string[]];
    switch (cmd[0]) {
      case "GET":
        return Response.json({ result: vault.get(cmd[1]) ?? null });
      case "SET":
        vault.set(cmd[1], cmd[2]);
        return Response.json({ result: "OK" });
      case "SADD":
        if (!index.includes(cmd[2])) index.push(cmd[2]);
        return Response.json({ result: 1 });
      default:
        return Response.json({ result: null });
    }
  });
});

beforeEach(() => {
  vault.clear();
  index = [];
});

const subscribers = () => import("@/lib/subscribers");

describe("addSubscriber records the source (TASK-120)", () => {
  it("a readwithlove join is stored with source verbatim", async () => {
    const { addSubscriber } = await subscribers();
    const out = await addSubscriber("Reader@Example.com", "readwithlove");
    expect(out).toEqual({ added: true, already: false });
    const rec = JSON.parse(vault.get("mail:sub:reader@example.com")!);
    expect(rec.source).toBe("readwithlove");
    expect(rec.email).toBe("reader@example.com");
    expect(index).toContain("reader@example.com");
  });

  it("a waitlist-* join is told apart from readwithlove", async () => {
    const { addSubscriber } = await subscribers();
    await addSubscriber("a@example.com", "waitlist-leap-of-faith");
    await addSubscriber("b@example.com", "readwithlove");
    expect(JSON.parse(vault.get("mail:sub:a@example.com")!).source).toBe("waitlist-leap-of-faith");
    expect(JSON.parse(vault.get("mail:sub:b@example.com")!).source).toBe("readwithlove");
  });

  it("a re-join keeps the first door's source and only clears an opt-out", async () => {
    const { addSubscriber, removeSubscriber } = await subscribers();
    await addSubscriber("c@example.com", "footer");
    await removeSubscriber("c@example.com");
    const out = await addSubscriber("c@example.com", "readwithlove");
    expect(out).toEqual({ added: true, already: false });
    const rec = JSON.parse(vault.get("mail:sub:c@example.com")!);
    expect(rec.source).toBe("footer"); // the first arrival stays the record
    expect(rec.optedOut).toBe(false);
  });
});
