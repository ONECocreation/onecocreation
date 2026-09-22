import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReadingSignUp, { ReadingSignUpCard, OUTCOME_COPY, postReadingSignUp } from "@/components/rooms/ReadingSignUp";
import {
  classifySignUpKind,
  reduceSubmit,
  INITIAL_SUBMIT_STATE,
  type SubmitState,
} from "@/components/rooms/reading-sign-up-state";
import type { NoticeState } from "@/components/rooms/ReadingNotice";

/**
 * TASK-388 (block 968,088) — the reading sign-up block. Pin the MODEL, not
 * the render (`src/components/me/session-state.ts` + `tests/
 * me-signed-out.test.ts`'s own idiom, named in the brief's Ground for HOW
 * to test this): the two pure functions (`classifySignUpKind`,
 * `reduceSubmit`) get exact-boundary tests; the three real UI states
 * render via `renderToStaticMarkup` on the NAMED `ReadingSignUpCard`
 * export (pure presentation, no hook of its own) rather than the default
 * `ReadingSignUp` — this repo's `vitest.config.ts` runs no jsdom, and
 * `useMemberSession()`'s own `useSyncExternalStore` resolves to its
 * `getServerSnapshot` (`checked: false, member: null`) under a static
 * render, the same reason `tests/me-signed-out.test.ts` pins `MeSwitch`'s
 * signed-in branches by SOURCE STRING rather than rendering them.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

describe("classifySignUpKind — the exact boundary (mirrors classifyMeState's 'unchecked -> loading')", () => {
  it("unchecked -> loading, regardless of member — never the form flashed before the session resolves", () => {
    expect(classifySignUpKind({ checked: false, member: null })).toBe("loading");
    expect(classifySignUpKind({ checked: false, member: { space: "email" } })).toBe("loading");
  });

  it("checked, no member -> guest", () => {
    expect(classifySignUpKind({ checked: true, member: null })).toBe("guest");
  });

  it("checked, space 'email' -> member", () => {
    expect(classifySignUpKind({ checked: true, member: { space: "email" } })).toBe("member");
  });

  it("checked, any non-email space -> member-key (decision B: the field, never a silent skip)", () => {
    expect(classifySignUpKind({ checked: true, member: { space: "onecocreation" } })).toBe("member-key");
  });
});

describe("reduceSubmit — the submit machine (duplicate-click suppression, honest retryable errors)", () => {
  it("starts idle", () => {
    expect(INITIAL_SUBMIT_STATE).toEqual({ kind: "idle" });
  });

  it("idle + submit -> pending", () => {
    expect(reduceSubmit({ kind: "idle" }, { type: "submit" })).toEqual({ kind: "pending" });
  });

  it("a second submit while pending is a no-op — the SAME state, never a second in-flight request", () => {
    const pending: SubmitState = { kind: "pending" };
    expect(reduceSubmit(pending, { type: "submit" })).toBe(pending);
  });

  it("pending + success -> done, carrying the outcome", () => {
    expect(reduceSubmit({ kind: "pending" }, { type: "success", outcome: "joined" })).toEqual({
      kind: "done",
      outcome: "joined",
    });
    expect(reduceSubmit({ kind: "pending" }, { type: "success", outcome: "already" })).toEqual({
      kind: "done",
      outcome: "already",
    });
    expect(reduceSubmit({ kind: "pending" }, { type: "success", outcome: "unsubscribed" })).toEqual({
      kind: "done",
      outcome: "unsubscribed",
    });
  });

  it("a non-2xx (failure) lands in an honest error state — never a throw, never a stuck spinner", () => {
    expect(reduceSubmit({ kind: "pending" }, { type: "failure", message: "bad email" })).toEqual({
      kind: "error",
      message: "bad email",
    });
  });

  it("error + submit -> pending again — a further submit is always allowed", () => {
    expect(reduceSubmit({ kind: "error", message: "bad email" }, { type: "submit" })).toEqual({ kind: "pending" });
  });
});

describe("the success copy — decision C, verbatim, no letter promised", () => {
  it("OUTCOME_COPY.joined is exactly \"You're on the list for the reading.\"", () => {
    expect(OUTCOME_COPY.joined).toBe("You're on the list for the reading.");
  });
});

describe("postReadingSignUp — the fetch wrapper's own honest outcomes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("a 200 with an outcome round-trips", async () => {
    vi.stubGlobal(
      "fetch",
      async () => Response.json({ ok: true, outcome: "already" }, { status: 200 }),
    );
    expect(await postReadingSignUp("x@example.com")).toEqual({ ok: true, outcome: "already" });
  });

  it("a non-2xx with a reason surfaces that reason", async () => {
    vi.stubGlobal(
      "fetch",
      async () => Response.json({ ok: false, reason: "that email doesn't look right" }, { status: 400 }),
    );
    expect(await postReadingSignUp("bad")).toEqual({ ok: false, message: "that email doesn't look right" });
  });

  it("a thrown fetch (network failure) falls back to the generic error, never a throw", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("network down");
    });
    expect(await postReadingSignUp("x@example.com")).toEqual({
      ok: false,
      message: "Something went sideways — please try again.",
    });
  });
});

describe("ReadingSignUpCard — the three real render states (renderToStaticMarkup, no hook)", () => {
  it("member: one button, no field, no /news door", () => {
    const html = renderToStaticMarkup(
      createElement(ReadingSignUpCard, { kind: "member", memberEmail: "reader@example.com" }),
    );
    expect(html).toContain("Count me in for the reading");
    expect(html).not.toContain("<input");
    expect(html).not.toContain("/news");
    expect(html).not.toContain("Join the reading");
  });

  it("key-signed member: the email field (decision B), same button words, still no /news door", () => {
    const html = renderToStaticMarkup(createElement(ReadingSignUpCard, { kind: "member-key", memberEmail: null }));
    expect(html).toContain("<input");
    expect(html).toContain("Count me in for the reading");
    expect(html).not.toContain("/news");
    expect(html).toContain("carry an email on file");
  });

  it("signed-out: the email field AND the /news letters door", () => {
    const html = renderToStaticMarkup(createElement(ReadingSignUpCard, { kind: "guest", memberEmail: null }));
    expect(html).toContain("<input");
    expect(html).toContain("Join the reading");
    expect(html).toContain('href="/news"');
  });
});

describe("ReadingSignUp — the default, hook-wired export", () => {
  it("state:'off' renders nothing, whatever the session (Ground)", () => {
    const props: { state: NoticeState } = { state: { kind: "off" } };
    expect(renderToStaticMarkup(createElement(ReadingSignUp, props))).toBe("");
  });

  it("a non-off state still renders nothing while the session is unchecked — never the form flashed before it resolves (useMemberSession's own unchecked start)", () => {
    const props: { state: NoticeState } = {
      state: { kind: "upcoming", startsAtMs: Date.now() + 86_400_000, endsAtMs: Date.now() + 90_000_000 },
    };
    expect(renderToStaticMarkup(createElement(ReadingSignUp, props))).toBe("");
  });
});

describe("addReadingTag — the four cases (Ground, subscribers.ts's narrow seam)", () => {
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

  it("case 1 — a brand-new address joins fresh, source AND tags both carry 'reading'", async () => {
    const { addReadingTag } = await subscribers();
    const out = await addReadingTag("New@Example.com");
    expect(out).toEqual({ outcome: "joined" });
    const rec = JSON.parse(vault.get("mail:sub:new@example.com")!);
    expect(rec.source).toBe("reading");
    expect(rec.tags).toEqual(["reading"]);
    expect(index).toContain("new@example.com");
  });

  it("case 2 — existing, not opted out, no 'reading' tag yet: merges the tag, source/optedOut/npub/joinedAtMs byte-identical", async () => {
    const { addSubscriber, addReadingTag } = await subscribers();
    await addSubscriber("footer@example.com", "footer");
    const before = JSON.parse(vault.get("mail:sub:footer@example.com")!);
    const out = await addReadingTag("footer@example.com");
    expect(out).toEqual({ outcome: "joined" });
    const after = JSON.parse(vault.get("mail:sub:footer@example.com")!);
    expect(after.tags).toEqual(["reading"]);
    expect(after.source).toBe(before.source);
    expect(after.joinedAtMs).toBe(before.joinedAtMs);
    expect(after.optedOut).toBe(before.optedOut);
  });

  it("case 3 — existing, already tagged 'reading': no write at all, reports already", async () => {
    const { addReadingTag } = await subscribers();
    await addReadingTag("twice@example.com");
    const before = vault.get("mail:sub:twice@example.com");
    const out = await addReadingTag("twice@example.com");
    expect(out).toEqual({ outcome: "already" });
    expect(vault.get("mail:sub:twice@example.com")).toBe(before); // byte-identical — no write
  });

  it("case 4 — an unsubscribed address: NO write, NO silent resubscribe — optedOut stays preserved", async () => {
    const { addSubscriber, removeSubscriber, addReadingTag } = await subscribers();
    await addSubscriber("left@example.com", "footer");
    await removeSubscriber("left@example.com");
    const before = vault.get("mail:sub:left@example.com");
    const out = await addReadingTag("left@example.com");
    expect(out).toEqual({ outcome: "unsubscribed" });
    expect(vault.get("mail:sub:left@example.com")).toBe(before); // byte-identical — no write at all
    expect(JSON.parse(vault.get("mail:sub:left@example.com")!).optedOut).toBe(true);
  });
});

describe("this lane's own lintable checks (What is lintable?)", () => {
  it("the new files never reference ClassroomView.tsx or rooms/[slug]/page.tsx (the T-387 non-collision)", async () => {
    const signUp = await read("src/components/rooms/ReadingSignUp.tsx");
    const state = await read("src/components/rooms/reading-sign-up-state.ts");
    for (const src of [signUp, state]) {
      expect(src).not.toMatch(/ClassroomView/);
      expect(src).not.toMatch(/rooms\/\[slug\]/);
    }
  });

  it("ReadingNotice.tsx still contains no setInterval, and exactly its one pre-existing setTimeout call (the one-clock law — this lane adds no new timer)", async () => {
    const src = await read("src/components/rooms/ReadingNotice.tsx");
    expect(src).not.toMatch(/setInterval\(/);
    expect((src.match(/setTimeout\(/g) ?? []).length).toBe(1);
  });
});
