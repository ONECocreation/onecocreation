import { describe, it, expect, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/* SignInCard calls useRouter (next/navigation throws outside an app router)
   — the house's mock idiom, the same one tests/door-key-handoff.test.ts
   runs for DoorSheet. */
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

/**
 * TASK-350 (lane 2 of the OC UI kit migration, REVIEW-K83) — SignInCard:
 * tabs, code step, key step, the 30-second signer timeout. Pins in the
 * house's node-env, no-jsdom convention (kit-components.test.ts's docblock):
 * static markup for shape/attributes/copy, source-grep for the kit-only /
 * no-wrap law, and the pure `withSignTimeout` race (signer-doors.ts) for
 * the 30-second law — this repo's shots-fixture has no window.nostr stub
 * and no fake-signer-hang mechanism (the brief's own ground note), so the
 * timing law is proven here instead of by a shot.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");

describe("SignInCard — the default tab is Email absent a Puck override (B1)", () => {
  it("defaultTab omitted → Email starts selected", async () => {
    const SignInCard = (await import("@/components/door/SignInCard")).default;
    const html = renderToStaticMarkup(createElement(SignInCard, {}));
    const emailTab = html.match(/<button[^>]*>Email<\/button>/)?.[0] ?? "";
    expect(emailTab).toContain('aria-selected="true"');
    const keyTab = html.match(/<button[^>]*>Key<\/button>/)?.[0] ?? "";
    expect(keyTab).toContain('aria-selected="false"');
  });

  it("a Puck defaultTab: 'key' prop opens on Key", async () => {
    const SignInCard = (await import("@/components/door/SignInCard")).default;
    const html = renderToStaticMarkup(createElement(SignInCard, { defaultTab: "key" }));
    const keyTab = html.match(/<button[^>]*>Key<\/button>/)?.[0] ?? "";
    expect(keyTab).toContain('aria-selected="true"');
  });

  it("Puck emailTabLabel/keyTabLabel overrides rename the tabs themselves", async () => {
    const SignInCard = (await import("@/components/door/SignInCard")).default;
    const html = renderToStaticMarkup(
      createElement(SignInCard, { emailTabLabel: "By letter", keyTabLabel: "By key" }),
    );
    expect(html).toContain(">By letter<");
    expect(html).toContain(">By key<");
  });
});

describe("SignInCard — the Key tab explainer matches M2 verbatim (B2)", () => {
  it("KEY_EXPLAINER is the architect pass's exact words", async () => {
    const { KEY_EXPLAINER } = await import("@/components/door/SignInCard");
    expect(KEY_EXPLAINER).toBe(
      "A key is a sign-in you own. No company holds your account. A small browser add-on keeps the key and asks you before it signs anything. New to it? Use the Email tab — you can add a key later.",
    );
  });

  it("renders the default explainer text (both tab panels stay mounted, so it's present regardless of the active tab)", async () => {
    const { default: SignInCard, KEY_EXPLAINER } = await import("@/components/door/SignInCard");
    const html = renderToStaticMarkup(createElement(SignInCard, {}));
    expect(html).toContain(KEY_EXPLAINER);
  });

  it("a Puck keyExplainer override replaces the default words", async () => {
    const SignInCard = (await import("@/components/door/SignInCard")).default;
    const html = renderToStaticMarkup(
      createElement(SignInCard, { keyExplainer: "custom words for a template site" }),
    );
    expect(html).toContain("custom words for a template site");
  });
});

describe("SignInCard — the 30-second timeout (M3, the R-069 lesson)", () => {
  it("SIGNER_TIMEOUT_MESSAGE is the Admiral's exact M3 words (MOCKUPS-1)", async () => {
    const { SIGNER_TIMEOUT_MESSAGE } = await import("@/components/door/SignInCard");
    expect(SIGNER_TIMEOUT_MESSAGE).toBe(
      "⚠ No answer after 30 seconds. Your signer opens its own small window — look behind this one. Still nothing? Close this window, open a new one, and try again.",
    );
  });

  it("withSignTimeout (signer-doors.ts) — the shared helper SignInCard's key step calls — never rejects before 30s and always does at/after it", async () => {
    vi.useFakeTimers();
    try {
      const { withSignTimeout, SignTimeoutError, SIGN_TIMEOUT_MS } = await import("@/lib/signer-doors");
      expect(SIGN_TIMEOUT_MS).toBe(30_000);
      const hang = new Promise(() => {}); /* the real R-069 shape: a signer that never answers */
      const race = withSignTimeout(hang, SIGN_TIMEOUT_MS);
      let rejected = false;
      race.catch(() => {
        rejected = true;
      });
      await vi.advanceTimersByTimeAsync(SIGN_TIMEOUT_MS - 1);
      expect(rejected).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await expect(race).rejects.toBeInstanceOf(SignTimeoutError);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a signer that answers before 30s resolves normally — no timeout fires", async () => {
    const { withSignTimeout } = await import("@/lib/signer-doors");
    await expect(withSignTimeout(Promise.resolve("signed-event"), 30_000)).resolves.toBe("signed-event");
  });
});

describe("SignInCard — button labels never wrap (R-071): kit Button only, no raw <button>", () => {
  it("SignInCard.tsx's own markup uses only the kit Button component, never a bare <button>", async () => {
    const src = await read("src/components/door/SignInCard.tsx");
    expect(src).not.toMatch(/<button\b/);
    expect(src).toContain('from "@/components/kit/Button"');
  });
});

describe("SignInCard — the email field keeps T-315's no-autofocus law on the first screen", () => {
  it("the email input does not autofocus; the code and name steps still do", async () => {
    const src = await read("src/components/door/SignInCard.tsx");
    const emailField = src.match(/id="signin-email"[\s\S]*?\/>/)?.[0] ?? "";
    expect(emailField, "the email Field still exists").toBeTruthy();
    expect(emailField).not.toMatch(/autoFocus/);
    expect(src).toMatch(/id="signin-code"[\s\S]*?autoFocus/);
    expect(src).toMatch(/id="signin-name"[\s\S]*?autoFocus/);
  });
});

describe("SignInCard — RULED item 3, named not fixed: one signInWithKey, two entry points", () => {
  it("the Email tab's ghost button and the Key tab's own button both call signInWithKey (the same doors)", async () => {
    const src = await read("src/components/door/SignInCard.tsx");
    const calls = src.match(/onClick=\{signInWithKey\}/g) ?? [];
    expect(calls.length).toBe(2);
  });
});
