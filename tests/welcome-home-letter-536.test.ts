import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";

/** TASK-536: the existing `welcome` letter is the permanent first row of
 *  every signed-in member's reading room. The route prepends it; the room
 *  prints the word "Welcome" where a date would print. */

const state = {
  fren: null as { handle: string; space: string } | null,
  mailbox: [] as { key: string; subject: string; atMs: number }[],
  override: null as { subject: string; body: string } | null,
};

vi.mock("@/lib/member-auth", () => ({ memberFromRequest: () => state.fren }));
vi.mock("@/lib/operator-auth", () => ({ operatorFromCookieHeader: () => null }));
vi.mock("@/lib/mailbox", () => ({ listMailbox: async () => state.mailbox }));
vi.mock("@/lib/letters", async (orig) => {
  const real = await orig<typeof import("@/lib/letters")>();
  return {
    ...real,
    isLetterKey: async () => true,
    getLetterOverride: async (k: string) => (k === "welcome" ? state.override : null),
  };
});

import { GET } from "@/app/api/me/letters/route";

async function call() {
  const res = await GET(new Request("http://x/api/me/letters"));
  return (await res.json()) as { signedIn: boolean; letters: { key: string; subject: string; pinned?: boolean; readable?: boolean }[] };
}

beforeEach(() => {
  state.fren = { handle: "free@example.com", space: "email" };
  state.mailbox = [];
  state.override = null;
});

describe("welcome home letter pinned in the reading room (T-536)", () => {
  it("(a) an email member with an empty mailbox gets exactly the pinned welcome entry", async () => {
    const d = await call();
    expect(d.letters).toHaveLength(1);
    expect(d.letters[0]).toMatchObject({ key: "welcome", pinned: true, readable: true, subject: "Welcome home" });
  });
  it("(b) Love's saved override subject wins", async () => {
    state.override = { subject: "Welcome, dear one", body: "x" };
    expect((await call()).letters[0].subject).toBe("Welcome, dear one");
  });
  it("(c) the welcome entry is first, ahead of real mailbox entries", async () => {
    state.mailbox = [{ key: "news-sample", subject: "A note", atMs: 1700000000000 }];
    const d = await call();
    expect(d.letters.map((l) => l.key)).toEqual(["welcome", "news-sample"]);
  });
  it("(d) a mailbox that already holds welcome yields one welcome row", async () => {
    state.mailbox = [{ key: "welcome", subject: "Welcome home", atMs: 1700000000000 }];
    const d = await call();
    expect(d.letters.filter((l) => l.key === "welcome")).toHaveLength(1);
    expect(d.letters[0].pinned).toBe(true);
  });
  it("(e) a signed-out request gets no letters and never the subject", async () => {
    state.fren = null;
    state.override = { subject: "SECRET SUBJECT", body: "x" };
    const d = await call();
    expect(d.signedIn).toBe(false);
    expect(d.letters).toEqual([]);
    expect(JSON.stringify(d)).not.toContain("SECRET SUBJECT");
  });
  it("(f) a key member with no email still gets the entry; the room links /letters/welcome there", async () => {
    state.fren = { handle: "npub1abc", space: "nostr" };
    const d = await call();
    expect(d.letters.map((l) => l.key)).toEqual(["welcome"]);
    const src = readFileSync("src/components/LettersRoom.tsx", "utf8");
    const noEmail = src.slice(src.indexOf("if (!who.email)"), src.indexOf("operatorNote}", src.indexOf("if (!who.email)")));
    expect(noEmail).toContain('href="/letters/welcome"');
    expect(src.match(/href="\/letters\/welcome"/g)).toHaveLength(1);
  });
  it("(g) the dead empty-room branch is gone and the pinned label prints where a date would", () => {
    const src = readFileSync("src/components/LettersRoom.tsx", "utf8");
    expect(src).not.toContain("Welcome to the community");
    expect(src).not.toContain("Nothing has landed");
    expect(src).not.toContain("letters.length === 0");
    expect(src).toMatch(/pinned\?: boolean/);
    expect(src).toMatch(/l\.pinned\s*\?\s*"Welcome"/);
    expect(src).toContain("Browse the public news");
  });
  it("(h) no em dash, arrow, or emoji in what the lane adds", () => {
    const route = readFileSync("src/app/api/me/letters/route.ts", "utf8");
    const added = route.slice(route.indexOf("pinned"));
    expect(added).not.toMatch(/[—→←\u{1F300}-\u{1FAFF}]/u);
    const page = readFileSync("src/app/a/letters/page.tsx", "utf8");
    const row = page.slice(page.indexOf('key: "welcome",'), page.indexOf('key: "welcome-day-two"'));
    expect(row).toContain("reading room");
    expect(row).not.toMatch(/[—→]/);
  });
});
