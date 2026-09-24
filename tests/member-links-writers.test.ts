import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * T-452 (block 968,393): the link WRITERS read strictly. Before, a failed
 * read of `member:links` became an empty list that the next link or merge
 * saved over EVERY stored link (every linked paid member then read as
 * unpaid — the "refused at the door" symptom). The reader stays lenient: a
 * blip narrows one group to the door itself, it never erases anything.
 */

const KV_URL = "http://kv.links-fixture";
let stored: string | null = null;
let failGet = false;
const writes: string[] = [];

beforeEach(() => {
  process.env.KV_REST_API_URL = KV_URL;
  process.env.KV_REST_API_TOKEN = "fixture-token";
  stored = JSON.stringify([["a@onecocreation", "a@example.com@email"]]);
  failGet = false;
  writes.length = 0;
  vi.stubGlobal("fetch", async (_url: unknown, init?: RequestInit) => {
    const cmd = JSON.parse(String(init?.body)) as string[];
    if (cmd[0] === "GET") {
      if (failGet) return new Response("boom", { status: 500 });
      return new Response(JSON.stringify({ result: stored }), { status: 200 });
    }
    if (cmd[0] === "SET") {
      writes.push(cmd[2]);
      stored = cmd[2];
      return new Response(JSON.stringify({ result: "OK" }), { status: 200 });
    }
    return new Response(JSON.stringify({ result: null }), { status: 200 });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("member links — a failed read never erases the links", () => {
  it("linkMembers on a failed read throws and writes NOTHING", async () => {
    const { linkMembers } = await import("@/lib/member-links");
    failGet = true;
    await expect(linkMembers("b@onecocreation", "b@example.com@email")).rejects.toThrow();
    expect(writes).toEqual([]);
    expect(JSON.parse(stored!)).toEqual([["a@onecocreation", "a@example.com@email"]]);
  });

  it("unlinkMember on a failed read throws and writes NOTHING", async () => {
    const { unlinkMember } = await import("@/lib/member-links");
    failGet = true;
    await expect(unlinkMember("a@onecocreation")).rejects.toThrow();
    expect(writes).toEqual([]);
  });

  it("a healthy read still links, keeping every existing pair", async () => {
    const { linkMembers } = await import("@/lib/member-links");
    await linkMembers("b@onecocreation", "b@example.com@email");
    expect(JSON.parse(stored!)).toEqual([
      ["a@onecocreation", "a@example.com@email"],
      ["b@onecocreation", "b@example.com@email"],
    ]);
  });

  it("the reader stays lenient: a failed read narrows the group to the door itself (never a throw)", async () => {
    const { memberGroup } = await import("@/lib/member-links");
    failGet = true;
    expect(await memberGroup("a@onecocreation")).toEqual(["a@onecocreation"]);
  });
});
