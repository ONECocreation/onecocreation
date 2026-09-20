import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * TASK-351 (OC UI kit, lane 3 — REVIEW-K83 folded) — `/me` signed out is the
 * sign-in card alone; `MeSwitch` gets a real loading state and a real error
 * state, and stops conflating "signed out" (401, normal) with "the session
 * check failed" (network/5xx, abnormal). Pin the MODEL, not the render —
 * this repo's `vitest.config.ts` runs `environment: "node"`, no jsdom, no
 * `@testing-library/react` (Ground): `classifySessionResponse` and
 * `classifyMeState` (session-state.ts) are PURE, directly node-testable
 * functions, the same idiom `door-machine.ts`'s `reduce`/`proofFor` already
 * use in this repo. Source-string pins (the `door-first-screen.test.ts` /
 * `tests/welcome-page.test.ts` idiom) cover what a render check cannot.
 */

const readSrc = (...p: string[]) => readFileSync(path.join(process.cwd(), ...p), "utf8");

describe("classifySessionResponse — the raw fetch outcome, told apart honestly", () => {
  it("401 (a resolved {ok:false}) is signed-out, never an error", async () => {
    const { classifySessionResponse } = await import("@/components/me/session-state");
    expect(classifySessionResponse({ ok: false, status: 401 }, false)).toBe("signed-out");
  });

  it("a thrown fetch is error", async () => {
    const { classifySessionResponse } = await import("@/components/me/session-state");
    expect(classifySessionResponse(null, true)).toBe("error");
  });

  it("a 500 (any non-401, non-2xx) is error, not signed-out", async () => {
    const { classifySessionResponse } = await import("@/components/me/session-state");
    expect(classifySessionResponse({ ok: false, status: 500 }, false)).toBe("error");
  });

  it("{ok:true, space:'email'} is email", async () => {
    const { classifySessionResponse } = await import("@/components/me/session-state");
    expect(classifySessionResponse({ ok: true, status: 200, space: "email" }, false)).toBe("email");
  });

  it("{ok:true, space:'onecocreation'} (any non-email space) is key", async () => {
    const { classifySessionResponse } = await import("@/components/me/session-state");
    expect(classifySessionResponse({ ok: true, status: 200, space: "onecocreation" }, false)).toBe("key");
  });
});

describe("classifyMeState — what MeSwitch renders, from the shared hook's own snapshot", () => {
  it("unchecked → loading, regardless of status", async () => {
    const { classifyMeState } = await import("@/components/me/session-state");
    expect(classifyMeState({ checked: false, status: "unknown" })).toBe("loading");
    expect(classifyMeState({ checked: false, status: "error" })).toBe("loading");
  });

  it("checked but status still unknown → loading (defensive — should not happen in practice)", async () => {
    const { classifyMeState } = await import("@/components/me/session-state");
    expect(classifyMeState({ checked: true, status: "unknown" })).toBe("loading");
  });

  it("checked + signed-out → signed-out (the sign-in card alone)", async () => {
    const { classifyMeState } = await import("@/components/me/session-state");
    expect(classifyMeState({ checked: true, status: "signed-out" })).toBe("signed-out");
  });

  it("checked + error → error (plain words + Retry, never a guess)", async () => {
    const { classifyMeState } = await import("@/components/me/session-state");
    expect(classifyMeState({ checked: true, status: "error" })).toBe("error");
  });

  it("checked + email/key → the matching signed-in view", async () => {
    const { classifyMeState } = await import("@/components/me/session-state");
    expect(classifyMeState({ checked: true, status: "email" })).toBe("email");
    expect(classifyMeState({ checked: true, status: "key" })).toBe("key");
  });
});

describe("MeSwitch.tsx source — the loading beat is real, never a blank flash", () => {
  it("carries aria-busy on the loading markup", () => {
    const src = readSrc("src", "components", "me", "MeSwitch.tsx");
    expect(src).toMatch(/kind === "loading"[\s\S]*?aria-busy="true"/);
  });
});

describe('MeSwitch.tsx source — signed out renders the sign-in card ALONE', () => {
  it("the signed-out branch mounts SignInCard and nothing else (no purchases leak, no stray key prompt)", () => {
    const src = readSrc("src", "components", "me", "MeSwitch.tsx");
    const start = src.indexOf('kind === "signed-out"');
    const end = src.indexOf('kind === "email"');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const block = src.slice(start, end);
    expect(block).toContain("<SignInCard");
    expect(block).not.toContain("MemberQuickCards");
    expect(block).not.toContain("MePanel");
    expect(block).not.toContain("ConstellationCard");
  });

  it('SignInCard is mounted mount="page" (the /login fallback\'s own contract — no next plumbing invented)', () => {
    const src = readSrc("src", "components", "me", "MeSwitch.tsx");
    expect(src).toMatch(/<SignInCard mount="page"\s*\/>/);
  });
});

describe("MeSwitch.tsx source — the error state never traps the visitor", () => {
  it("the error branch renders a Retry button AND still mounts SignInCard beside it", () => {
    const src = readSrc("src", "components", "me", "MeSwitch.tsx");
    const start = src.indexOf('kind === "error"');
    const end = src.indexOf('kind === "signed-out"');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const block = src.slice(start, end);
    expect(block).toContain("Retry");
    expect(block).toContain("<SignInCard");
    expect(block).toContain("onClick={refresh}");
  });

  it("Retry calls the hook's exported refresh(), not a dead click", () => {
    const src = readSrc("src", "hooks", "useMemberSession.ts");
    expect(src).toContain("export function refresh()");
  });
});

describe("useMemberSession.ts — the additive seam, non-breaking by construction", () => {
  it("useMemberSession()'s own pinned return shape is untouched (tests/member-rename.test.ts, TASK-278)", () => {
    const src = readSrc("src", "hooks", "useMemberSession.ts");
    expect(src).toContain("return { member, accounts, checked, signOut, signOutOne, switchTo };");
  });

  it("the new status/refresh seam is additive, not folded into that return", () => {
    const src = readSrc("src", "hooks", "useMemberSession.ts");
    expect(src).toContain("export function useSessionStatus()");
    expect(src).toContain("export function refresh()");
  });
});
