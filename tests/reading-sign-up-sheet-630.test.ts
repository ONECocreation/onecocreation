import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  ReadingSignInCard,
  SIGN_IN_HEADING,
} from "@/components/rooms/ReadingSignInBox";
import { SHEET_HAVE_ACCOUNT, SHEET_SWITCH_TO_SIGN_IN } from "@/components/reading/SignMeUpSheet";

const read = (p: string) => readFileSync(p, "utf8");
const SIGNED_OUT_FILES = [
  "src/components/reading/ReadingDayBody.tsx",
  "src/components/reading/ReadingStage.tsx",
  "src/components/reading/ReadingStageDoor.tsx",
];

describe("T-630 Sign me up sheet", () => {
  it("no signed-out Sign me up on /reading links to #sign-up any more", () => {
    for (const f of SIGNED_OUT_FILES) {
      const src = read(f);
      expect(src, f).not.toMatch(/href="#sign-up"/);
      expect(src, f).toContain("SignUpSheetTrigger");
    }
  });

  it("the sheet is a modal dialog with Esc, backdrop close, and the sign-in switch", () => {
    const src = read("src/components/reading/SignMeUpSheet.tsx");
    expect(src).toContain('aria-modal="true"');
    expect(src).toContain('role="dialog"');
    expect(src).toContain('"Escape"');
    expect(src).toContain("onClick={closeSignUpSheet}");
    expect(SHEET_HAVE_ACCOUNT).toBe("Already have an account? ");
    expect(SHEET_SWITCH_TO_SIGN_IN).toBe("Sign in");
    expect(src).not.toMatch(/style=\{/);
  });

  it("the bottom keep-posted section stays", () => {
    expect(read("src/app/reading/page.tsx")).toContain('id="keep-posted"');
  });

  it("sign-in view uses the same email box, without the list promise", () => {
    const html = renderToStaticMarkup(
      createElement(ReadingSignInCard, { member: null, embedded: true, mode: "sign-in" }),
    );
    expect(html).toContain(SIGN_IN_HEADING);
    expect(html).toContain('type="email"');
    expect(html).not.toContain("Keep me posted");
    expect(html).not.toContain('id="sign-up"');
  });

  it("open and close flip the shared store; Esc, trap and focus return are wired", () => {
    const src = read("src/components/reading/SignMeUpSheet.tsx");
    expect(src).toContain("export const openSignUpSheet = () => setOpen(true)");
    expect(src).toContain("export const closeSignUpSheet = () => setOpen(false)");
    expect(src).toContain('e.key === "Escape"');
    expect(src).toContain('e.key !== "Tab"');
    expect(src).toContain("returnRef.current?.focus");
    expect(src).toContain("preventScroll: true");
    expect(src).toContain('document.body.style.overflow = "hidden"');
  });

  it("the switch flips sign-up and sign-in inside the same sheet, no navigation", () => {
    const src = read("src/components/reading/SignMeUpSheet.tsx");
    expect(src).toContain('setMode(signIn ? "sign-up" : "sign-in")');
    expect(src).toContain("e.preventDefault()");
    expect(src).toContain("applyMemberSession");
    expect(src).not.toMatch(/router\.(push|replace)/);
  });

  it("the sign-up view keeps the list promise and the code step names where it went", () => {
    const html = renderToStaticMarkup(
      createElement(ReadingSignInCard, { member: null, embedded: true, mode: "sign-up" }),
    );
    expect(html).toContain("Sign me up. Keep me posted.");
    const code = renderToStaticMarkup(
      createElement(ReadingSignInCard, { member: null, embedded: true, mode: "sign-in", initialStep: "code" }),
    );
    expect(code).toContain("reading-sheet-code");
  });
});
