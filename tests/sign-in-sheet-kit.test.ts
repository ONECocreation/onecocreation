import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Match door-key-handoff's router mock: render the real door without an app router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

const sheetSrc = readFileSync(resolve(__dirname, "../src/components/door/DoorSheet.tsx"), "utf8");
const classes = [...sheetSrc.matchAll(/className="([^"]*)"/g)].map((match) => match[1]);

describe("TASK-443 — the calm sign-in sheet", () => {
  it("removes legacy button tokens without mistaking kit tokens for legacy ones", () => {
    const tokens = classes.flatMap((value) => value.split(/\s+/));
    expect(tokens.filter((token) => token === "btn" || token.startsWith("btn-"))).toEqual([]);
  });

  it.each([
    ["kit-btn kit-btn-main kit-btn-sm", 4],
    ["kit-btn kit-btn-second kit-btn-sm", 1],
    ["kit-btn kit-btn-quiet", 3],
  ] as const)("uses the exact %s composition on %i buttons", (className, count) => {
    expect(classes.filter((value) => value === className)).toHaveLength(count);
  });

  it("uses field ink on the name suffix itself", () => {
    const suffix = sheetSrc.match(/<span\b([^>]*)>\s*\{DOOR_NAME_SUFFIX\}\s*<\/span>/)?.[1];
    expect(suffix).toBeDefined();
    expect(suffix).toMatch(/style=\{\{[^}]*color:\s*"var\(--field-ink\)"[^}]*\}\}/);
  });

  it("does not use info ink anywhere in the door", () => {
    expect(sheetSrc).not.toContain("var(--info");
  });

  it.each(["sheet", "page"] as const)("scopes night tokens only to the sheet: %s mount", async (mount) => {
    const DoorSheet = (await import("@/components/door/DoorSheet")).default;
    const html = renderToStaticMarkup(createElement(DoorSheet, { mount }));
    const root = html.match(/^<div\b[^>]*>/)?.[0];
    expect(root).toBeDefined();
    expect(root).toContain('role="dialog"');
    expect(root).toContain('aria-label="Sign in"');
    const rootClasses = (root?.match(/\bclass="([^"]*)"/)?.[1] ?? "").split(/\s+/);
    expect(rootClasses.includes("oc-pv-dark")).toBe(mount === "sheet");
  });

  it("keeps the email, verify, and claim buttons as native submits", () => {
    const buttons = sheetSrc.match(/<button\b[^>]*>/g) ?? [];
    const submits = buttons.filter((button) => {
      const tokens = (button.match(/className="([^"]*)"/)?.[1] ?? "").split(/\s+/);
      return tokens.includes("kit-btn-main") && /\btype="submit"/.test(button);
    });
    expect(submits).toHaveLength(3);
  });

  it("does not import the kit component that defaults to a non-submit button", () => {
    expect(sheetSrc).not.toMatch(/["']@\/components\/kit(?:\/|["'])/);
  });
});
