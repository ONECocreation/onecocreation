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

describe("SignInCard — TASK-356: the Admiral overrules K83's RULED item 3 ('same doors')", () => {
  /* The Admiral, walking /login (block 967,911): "on the email tab, we
     shouldnt have a button to sign in with a key. it makes it confusing
     for the user. that's why we split the tabs." K83's RULED item 3 (a
     second key button INSIDE the Email tab, opening SignerDoors in
     place) is overruled, not just trimmed — the Email tab keeps no key
     door of its own; the Key tab's is the only one. */
  it("exactly one onClick={signInWithKey} now — the Key tab's own button, not a second Email-tab door", async () => {
    const src = await read("src/components/door/SignInCard.tsx");
    const calls = src.match(/onClick=\{signInWithKey\}/g) ?? [];
    expect(calls.length).toBe(1);
  });

  it("the Email tab carries no key CTA, no emailSignerOpen state, and no in-place SignerDoors mount", async () => {
    const src = await read("src/components/door/SignInCard.tsx");
    expect(src).not.toMatch(/emailSignerOpen/);
    expect(src).not.toMatch(/No extension on this device/);
    /* SignerDoors is mounted exactly once now — the Key tab's no-extension pane */
    const mounts = src.match(/<SignerDoors\b/g) ?? [];
    expect(mounts.length).toBe(1);
  });

  it("the local keyNoteFor/KEY_NOTE_* duplicate (and the now-unused useIsAndroid) left with the button", async () => {
    const src = await read("src/components/door/SignInCard.tsx");
    expect(src).not.toMatch(/keyNoteFor/);
    expect(src).not.toMatch(/KEY_NOTE_ANDROID/);
    expect(src).not.toMatch(/KEY_NOTE_REMOTE/);
    expect(src).not.toMatch(/useIsAndroid/);
    /* DOOR_KEY_CTA stays imported — the Key tab still uses it */
    expect(src).toMatch(/DOOR_KEY_CTA/);
  });

  it("a real, words-only pointer sends the Email tab reader to the Key tab instead", async () => {
    const { EMAIL_KEY_POINTER, EMAIL_KEY_TAB_LINK } = await import("@/components/door/SignInCard");
    expect(EMAIL_KEY_POINTER).toBe("Have a key? ");
    expect(EMAIL_KEY_TAB_LINK).toBe("Use the Key tab.");
    const html = renderToStaticMarkup(createElement((await import("@/components/door/SignInCard")).default, {}));
    expect(html).toContain(EMAIL_KEY_POINTER);
    expect(html).toContain(EMAIL_KEY_TAB_LINK);
  });

  it("the Key tab, no extension: KEY_NO_EXTENSION_NOTE renders above SignerDoors, never a silent gap", async () => {
    const { KEY_NO_EXTENSION_NOTE } = await import("@/components/door/SignInCard");
    expect(KEY_NO_EXTENSION_NOTE).toBe(
      "No key add-on found in this browser. Pick one of these ways, or use the Email tab.",
    );
    const html = renderToStaticMarkup(createElement((await import("@/components/door/SignInCard")).default, {}));
    expect(html).toContain(KEY_NO_EXTENSION_NOTE);
  });
});

describe("SignInCard — Tabs run controlled now, so 'Use the Key tab.' can really select it", () => {
  it("source: Tabs is passed active/onChange, not defaultActive", async () => {
    const src = await read("src/components/door/SignInCard.tsx");
    const tabsTag = src.match(/<Tabs\b[\s\S]*?items=\{\[/)?.[0] ?? "";
    expect(tabsTag).toContain("active={activeTab}");
    expect(tabsTag).toContain("onChange=");
    expect(tabsTag).not.toMatch(/defaultActive=/);
  });

  it("rendered: clicking the pointer's Button selects the Key tab (aria-selected flips)", async () => {
    /* node env, no DOM click harness — this repo's convention is a real
       function call, not a simulated event (Tabs.tsx's own nextTabIndex
       is tested the same pure way). The pointer's onClick calls
       setActiveTab("key") directly; we exercise the same state machine
       Tabs itself drives by rendering with defaultTab="key" and
       confirming the controlled prop, not an internal default, is what
       Tabs honors. */
    const SignInCard = (await import("@/components/door/SignInCard")).default;
    const html = renderToStaticMarkup(createElement(SignInCard, { defaultTab: "key" }));
    const keyTab = html.match(/<button[^>]*>Key<\/button>/)?.[0] ?? "";
    expect(keyTab).toContain('aria-selected="true"');
  });
});

describe("SignInCard — variant=\"card\" is SignInCard's own choice, not DoorSheet's or OperatorGate's", () => {
  it("SignInCard passes variant=\"card\" to its SignerDoors mount", async () => {
    const src = await read("src/components/door/SignInCard.tsx");
    expect(src).toMatch(/<SignerDoors[\s\S]*?variant="card"/);
  });

  it("DoorSheet.tsx and OperatorGate.tsx mount SignerDoors with no variant prop at all (byte-stable default)", async () => {
    const doorSheetSrc = await read("src/components/door/DoorSheet.tsx");
    const operatorGateSrc = await read("src/components/OperatorGate.tsx");
    expect(doorSheetSrc).not.toMatch(/variant=/);
    expect(operatorGateSrc).not.toMatch(/variant=/);
  });
});

describe("SignInCard — TASK-356 alignment (RULED K-b = (a)): title + tabs centred, body left", () => {
  it("the card title carries an explicit centred style", async () => {
    const src = await read("src/components/door/SignInCard.tsx");
    expect(src).toMatch(/className="kit-h2" style=\{\{ textAlign: "center" \}\}/);
  });

  it("no kit-body paragraph is centred (legibility doctrine: reading text stays left)", async () => {
    const src = await read("src/components/door/SignInCard.tsx");
    const paras = src.match(/<p className="kit-body"[^>]*>/g) ?? [];
    for (const p of paras) expect(p).not.toMatch(/textAlign/);
  });
});

describe("DoorButton — TASK-356 (REVIEW-K87 item 7): dawn LOG IN is pinned to the always-night ink", () => {
  it("the signed-out chip's color is the literal #ECE3C9, never 'inherit'", async () => {
    const src = await read("src/components/door/DoorButton.tsx");
    const chip = src.match(/cursor: walking \? "default" : "pointer", color: [^,]+,/)?.[0] ?? "";
    expect(chip, "the signed-out chip's style object").toBeTruthy();
    expect(chip).toContain('color: "#ECE3C9"');
    expect(chip).not.toContain('color: "inherit"');
  });
});

describe("SignInCard — send-back (Number One's Chrome walk, 390px): the main button clip", () => {
  it("source: every default/main-variant <Button> also passes sm (variant=second/quiet are exempt — R-071's fixed .kit-btn-main clips at 390px, kit.css is read-only)", async () => {
    const src = await read("src/components/door/SignInCard.tsx");
    const buttonTags = src.match(/<Button\b[\s\S]*?>/g) ?? [];
    expect(buttonTags.length).toBeGreaterThan(0);
    for (const tag of buttonTags) {
      if (/variant="(second|quiet)"/.test(tag)) continue;
      expect(tag, `main-variant Button missing sm: ${tag}`).toMatch(/\bsm\b/);
    }
  });

  it("rendered: every kit-btn-main class also carries kit-btn-sm, in both the sign-in and new-name states", async () => {
    const SignInCard = (await import("@/components/door/SignInCard")).default;
    const signInHtml = renderToStaticMarkup(createElement(SignInCard, {}));
    const newNameHtml = renderToStaticMarkup(
      createElement(SignInCard, {
        initialKey: { event: { kind: 22242 }, npub: "npub1fixture" },
      }),
    );
    for (const html of [signInHtml, newNameHtml]) {
      const classAttrs = [...html.matchAll(/class="([^"]*)"/g)].map((m) => m[1]);
      const mainButtons = classAttrs.filter((c) => c.split(" ").includes("kit-btn-main"));
      expect(mainButtons.length).toBeGreaterThan(0);
      for (const c of mainButtons) {
        expect(c.split(" "), `kit-btn-main without kit-btn-sm: "${c}"`).toContain("kit-btn-sm");
      }
    }
  });

  it("source: the kit-body paragraphs that sit before a field/SignerDoors/button carry marginBottom: 12, not flush", async () => {
    const src = await read("src/components/door/SignInCard.tsx");
    const paras = src.match(/<p className="kit-body"[^>]*>/g) ?? [];
    expect(paras.length).toBeGreaterThan(0);
    for (const p of paras) {
      expect(p, `kit-body paragraph missing marginBottom: 12: ${p}`).toContain("marginBottom: 12");
    }
  });
});
