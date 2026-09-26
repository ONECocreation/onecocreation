import { describe, it, expect, afterEach, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DOOR_SEND_CONFIRMATION,
  DOOR_SEND_TIMEOUT_MS,
  DOOR_SEND_TIMEOUT_NOTE,
} from "@/components/door/door-machine";

/* DoorSheet/SignInCard call useRouter (next/navigation throws "expected app
   router to be mounted" outside it) — the house's mock idiom, the same one
   tests/door-key-handoff.test.ts and tests/signin-card.test.ts run. */
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

/**
 * TASK-470 (block 968,624) — L4-TRACE.md §2 Candidate A (no SMTP timeout, so
 * a slow relay reads as "stuck") + Candidate B (no client timeout, so the
 * UI can't tell "slow" from "dead") + ASTRA-REVIEW.md's L4 "No false
 * success" ("Sending your code…" immediately, "Code sent. Check your
 * inbox." only after acceptance) + VERDICT-968624.md's "client abort does
 * not cancel server-side SMTP" (never claim failure on timeout — an
 * honest, uncertain-outcome note instead).
 *
 * The house's own no-jsdom convention (signin-card.test.ts's docblock):
 * node env, no click simulation. DoorSheet.tsx/SignInCard.tsx duplicate
 * their own `sendCode` (the established pattern — door-key-handoff.test.ts
 * pins the same functions the same way), so their new send/timeout wiring
 * is proven by source pin here; `startEmailCode` (ReadingSignInBox.tsx) is
 * exported and pure w.r.t. fetch, so its timeout is proven by a REAL call
 * with a stubbed fetch + fake timers, the same idiom
 * tests/signin-card.test.ts uses for the 30-second signer timeout and
 * tests/stage2-route.test.ts uses for an aborted probe.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");

describe("door-machine.ts — the new send/sent/timeout words (pure, additive)", () => {
  it("DOOR_SEND_CONFIRMATION is exactly 'Code sent. Check your inbox.' — no em dash", () => {
    expect(DOOR_SEND_CONFIRMATION).toBe("Code sent. Check your inbox.");
    expect(DOOR_SEND_CONFIRMATION).not.toContain("—");
  });

  it("DOOR_SEND_TIMEOUT_NOTE is honest about an uncertain outcome — never claims failure", () => {
    expect(DOOR_SEND_TIMEOUT_NOTE).toBe(
      "This is taking longer than usual. Check your inbox before trying again.",
    );
    expect(DOOR_SEND_TIMEOUT_NOTE).not.toContain("—");
    expect(DOOR_SEND_TIMEOUT_NOTE).not.toMatch(/fail|error|stuck|dead/i);
  });

  it("DOOR_SEND_TIMEOUT_MS is ~25s, per the ruling (VERDICT-968624.md)", () => {
    expect(DOOR_SEND_TIMEOUT_MS).toBe(25_000);
  });

  it("door-machine.ts's existing model is untouched: reduce/DOOR_WALKS/DOOR_COPY keep their exact shape", async () => {
    const src = await read("src/components/door/door-machine.ts");
    /* additive only — the pure reducer itself carries none of this lane's
       new strings (the same "byte-identical law" door-key-handoff.test.ts
       already pins for the model) */
    const reduceBody = src.match(/export function reduce\([\s\S]*?\n\}/)?.[0] ?? "";
    expect(reduceBody).not.toContain("DOOR_SEND_CONFIRMATION");
    expect(reduceBody).not.toContain("DOOR_SEND_TIMEOUT");
  });
});

describe("mail.ts — the transport fails fast, never hangs past nodemailer's own defaults (L4-TRACE.md §2, Candidate A)", () => {
  it("connectionTimeout/greetingTimeout/socketTimeout are set on the one transport every sign-in surface shares (source pin — no real SMTP socket in this suite)", async () => {
    const src = await read("src/lib/mail.ts");
    const transportBody = src.match(/function transportFor[\s\S]*?\n\}/)?.[0] ?? "";
    expect(transportBody, "transportFor's body").toBeTruthy();
    expect(transportBody).toContain("connectionTimeout: 10_000");
    expect(transportBody).toContain("greetingTimeout: 10_000");
    expect(transportBody).toContain("socketTimeout: 20_000");
    /* honest bounds: fast enough that a visitor (or a serverless function's
       own execution ceiling) never waits nodemailer's ~2-minute default */
    expect(transportBody.indexOf("createTransport")).toBeLessThan(transportBody.indexOf("connectionTimeout"));
  });
});

describe("code-door-limit.ts — MAX_SENDS raised 3 -> 10, window unchanged (block 968,624, the Admiral's number)", () => {
  it("shipped ALONGSIDE the transport timeout, per the ruling's own safety note (§6)", async () => {
    const limitSrc = await read("src/app/api/auth/email/code-door-limit.ts");
    const mailSrc = await read("src/lib/mail.ts");
    expect(limitSrc).toContain("export const MAX_SENDS = 10;");
    expect(limitSrc).toContain("export const SEND_WINDOW_S = 600;");
    expect(mailSrc).toContain("connectionTimeout");
  });
});

for (const [name, relPath] of [
  ["DoorSheet", "src/components/door/DoorSheet.tsx"],
  ["SignInCard", "src/components/door/SignInCard.tsx"],
] as const) {
  describe(`${name} — sendCode: immediate busy, honest sent state, client timeout, no double send`, () => {
    it("imports the shared send/sent/timeout words from door-machine.ts", async () => {
      const src = await read(relPath);
      expect(src).toContain("DOOR_SEND_CONFIRMATION");
      expect(src).toContain("DOOR_SEND_TIMEOUT_MS");
      expect(src).toContain("DOOR_SEND_TIMEOUT_NOTE");
    });

    it("sendCode still guards against a double send: busy is checked and set BEFORE the fetch fires", async () => {
      const src = await read(relPath);
      const body = src.match(/async function sendCode\([\s\S]*?\n  \}/)?.[0] ?? "";
      expect(body, "sendCode's body").toBeTruthy();
      expect(body.indexOf("if (busy) return;")).toBeGreaterThanOrEqual(0);
      expect(body.indexOf("setBusy(true);")).toBeLessThan(body.indexOf('fetch("/api/auth/email/start"'));
    });

    it("the submit button disables while busy — belt and suspenders with the local guard", async () => {
      const src = await read(relPath);
      expect(src).toMatch(/disabled=\{busy\}/);
    });

    it("wraps the send in an AbortController on DOOR_SEND_TIMEOUT_MS, cleared in every branch", async () => {
      const src = await read(relPath);
      const body = src.match(/async function sendCode\([\s\S]*?\n  \}/)?.[0] ?? "";
      expect(body).toContain("const controller = new AbortController();");
      expect(body).toContain("setTimeout(() => controller.abort(), DOOR_SEND_TIMEOUT_MS);");
      expect(body).toContain("signal: controller.signal,");
      expect(body).toContain("clearTimeout(timer);");
    });

    it("an aborted send shows the honest timeout note, never the generic connection failure", async () => {
      const src = await read(relPath);
      const body = src.match(/async function sendCode\([\s\S]*?\n  \}/)?.[0] ?? "";
      expect(body).toContain('if (err instanceof DOMException && err.name === "AbortError") setNote(DOOR_SEND_TIMEOUT_NOTE);');
      /* the 429/other-failure branch (existing reason string) is untouched */
      expect(body).toContain('setNote(data?.reason ?? "The letter didn\'t send. Try again.");');
    });

    it("the code step's confirmation is honest: it lives ONLY in the state===\"code\" branch, unreachable before a real accept", async () => {
      const src = await read(relPath);
      /* the confirmation text sits after the state==="code" guard opens, not before it */
      const codeGuardIdx = src.indexOf('state === "code" &&');
      const confirmationIdx = src.indexOf("DOOR_SEND_CONFIRMATION", codeGuardIdx);
      expect(codeGuardIdx).toBeGreaterThan(-1);
      expect(confirmationIdx).toBeGreaterThan(codeGuardIdx);
    });

    it("rendered: the default sign-in screen never shows the sent confirmation (no false success)", async () => {
      const mod = await import(relPath.replace("src/", "@/").replace(".tsx", ""));
      const Component = mod.default;
      const html = renderToStaticMarkup(createElement(Component, { mount: "page" }));
      expect(html).not.toContain(DOOR_SEND_CONFIRMATION);
      expect(html).not.toContain(DOOR_SEND_TIMEOUT_NOTE);
    });
  });
}

describe("ReadingSignInBox — startEmailCode: honest timeout, no double send, sent confirmation only after accept", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("a fast accept still resolves { ok: true } — the timeout never fires on a healthy send", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ ok: true }));
    const { startEmailCode } = await import("@/components/rooms/ReadingSignInBox");
    await expect(startEmailCode("x@example.com")).resolves.toEqual({ ok: true });
  });

  it("aborts after ~25s and returns the honest, uncertain-outcome message — never the generic error", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", (_url: string, init?: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) return; // never settles — the real "stuck" shape
        if (signal.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    });
    const { startEmailCode, SEND_TIMEOUT_MESSAGE } = await import("@/components/rooms/ReadingSignInBox");
    const promise = startEmailCode("x@example.com");
    await vi.advanceTimersByTimeAsync(25_000);
    await expect(promise).resolves.toEqual({ ok: false, message: SEND_TIMEOUT_MESSAGE });
  });

  it("SEND_TIMEOUT_MESSAGE matches DOOR_SEND_TIMEOUT_NOTE's law: honest, no dash, never 'failed'", async () => {
    const { SEND_TIMEOUT_MESSAGE } = await import("@/components/rooms/ReadingSignInBox");
    expect(SEND_TIMEOUT_MESSAGE).toBe("This is taking longer than usual. Check your inbox before trying again.");
    expect(SEND_TIMEOUT_MESSAGE).not.toContain("—");
  });

  it("submitEmail (the box's own submit) still guards against a double send", async () => {
    const src = await read("src/components/rooms/ReadingSignInBox.tsx");
    const body = src.match(/async function submitEmail\([\s\S]*?\n  \}/)?.[0] ?? "";
    expect(body, "submitEmail's body").toBeTruthy();
    expect(body).toContain("if (busy) return;");
  });

  it("the code step renders CODE_SENT_CONFIRMATION; the email step never does (no false success)", async () => {
    const { ReadingSignInCard, CODE_SENT_CONFIRMATION } = await import("@/components/rooms/ReadingSignInBox");
    const emailHtml = renderToStaticMarkup(createElement(ReadingSignInCard, { member: null }));
    expect(emailHtml).not.toContain(CODE_SENT_CONFIRMATION);
    const codeHtml = renderToStaticMarkup(
      createElement(ReadingSignInCard, { member: null, initialStep: "code" }),
    );
    expect(codeHtml).toContain(CODE_SENT_CONFIRMATION);
  });
});
