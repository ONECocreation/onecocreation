import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-546 - /replays' "Want a reminder email?" opens the SAME reading
 * list box /reading uses, in place. Pins:
 *  - the page mounts the island and no longer links to /reading#keep-posted
 *  - the island reuses ReadingSignInBox, is a disclosure (aria-expanded,
 *    aria-controls, focus moves in), and adds no inline style
 *  - END TO END through the real client post path + the real route + the
 *    real addReadingTag over a stubbed KV: a signup made from this box
 *    lands a vault record with source "reading" AND tags ["reading"]
 */

const vault = new Map<string, string>();
const mailed: string[] = [];

vi.mock("@/lib/mail", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/mail")>();
  return { ...actual, mailConfigured: () => true };
});
vi.mock("@/lib/reading-letters", () => ({
  sendReadingConfirmation: async (e: string) => {
    mailed.push(e);
  },
  sendDayOfToOneIfDue: async () => {},
}));

const TESTS_DIR = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
const readSrc = (rel: string) => fs.readFile(path.join(TESTS_DIR, "..", rel), "utf8");

beforeAll(() => {
  process.env.KV_REST_API_URL = "https://kv.example";
  process.env.KV_REST_API_TOKEN = "test-token";
});
beforeEach(() => {
  vault.clear();
  mailed.length = 0;
});

describe("the page and the island", () => {
  it("the page mounts ReplaysReminder and no longer jumps to /reading#keep-posted", async () => {
    const page = await readSrc("src/app/replays/page.tsx");
    expect(page).toContain("<ReplaysReminder />");
    expect(page).not.toContain('href="/reading#keep-posted"');
  });

  it("the island reuses ReadingSignInBox as a labelled disclosure with focus moved in", async () => {
    const src = await readSrc("src/components/replays/ReplaysReminder.tsx");
    expect(src).toContain('import ReadingSignInBox from "@/components/rooms/ReadingSignInBox"');
    expect(src).toContain("Want a reminder email?");
    expect(src).toContain("aria-expanded={open}");
    expect(src).toContain('aria-controls="replays-reminder"');
    expect(src).toContain('id="replays-reminder"');
    expect(src).toContain(".focus({ preventScroll: true })");
    expect(src).not.toMatch(/style=\{/);
    expect(src).not.toMatch(/[→←]/);
    expect(src).not.toContain("—");
  });

  it("/reading keeps its #keep-posted anchor", async () => {
    expect(await readSrc("src/app/reading/page.tsx")).toContain('id="keep-posted"');
  });
});

describe("a signup from the /replays box carries the reading tag", () => {
  it("postReadingSignUp -> /api/subscribe -> addReadingTag: source reading + tags [reading]", async () => {
    let posted: { source?: string } = {};
    vi.stubGlobal("fetch", async (url: string, init?: { body?: string }) => {
      if (String(url).startsWith("https://kv.example")) {
        const cmd = JSON.parse(init?.body ?? "[]") as [string, ...string[]];
        if (cmd[0] === "GET") return Response.json({ result: vault.get(cmd[1]) ?? null });
        if (cmd[0] === "SET") {
          vault.set(cmd[1], cmd[2]);
          return Response.json({ result: "OK" });
        }
        return Response.json({ result: 1 });
      }
      // the browser's relative POST, handed to the real route
      posted = JSON.parse(init?.body ?? "{}");
      const { POST } = await import("@/app/api/subscribe/route");
      return POST(
        new Request("http://test/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: init?.body,
        }),
      );
    });
    const { postReadingSignUp } = await import("@/components/rooms/ReadingSignUp");
    const out = await postReadingSignUp("Replay.Fan@Example.com");
    expect(out).toEqual({ ok: true, outcome: "joined" });
    expect(posted.source).toBe("reading");
    const rec = JSON.parse(vault.get("mail:sub:replay.fan@example.com")!);
    expect(rec.source).toBe("reading");
    expect(rec.tags).toEqual(["reading"]);
    expect(mailed).toEqual(["Replay.Fan@Example.com"]);
    vi.unstubAllGlobals();
  });
});
