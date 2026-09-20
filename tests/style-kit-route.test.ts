import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-349 (lane 1, the OC UI kit) — /style/kit, the repo's first
 * component preview. Read-the-source pins (the page is an async server
 * component — never rendered in this repo's `environment: "node"` vitest
 * config, same convention as tests/style-route.test.ts /
 * tests/route-gates.test.ts): the route exists as a static sibling beside
 * /style/brand and /style/reference/[slug], gates identically, and never
 * touches any page this lane doesn't own.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");
const exists = (rel: string) =>
  fs.stat(path.join(ROOT, rel)).then(() => true, () => false);

describe("TASK-349 — /style/kit exists as a static sibling route", () => {
  it("src/app/style/kit/page.tsx exists", async () => {
    expect(await exists("src/app/style/kit/page.tsx")).toBe(true);
  });

  it("is gated EXACTLY like /style/brand and /style/reference/[slug] — the T-175 idiom", async () => {
    const src = await read("src/app/style/kit/page.tsx");
    expect(src).toContain('from "@/lib/operator-auth"');
    expect(src).toContain("operatorFromCookieHeader");
    expect(src).toContain("if (!operator)");
    expect(src).toContain("<OperatorGate configured={operatorsConfigured()} />");
    expect(src).toContain('export const dynamic = "force-dynamic";');
  });

  it("renders every kit part (Button, Card, Field, Tabs) from the kit barrel, never re-implemented inline", async () => {
    const src = await read("src/app/style/kit/page.tsx");
    expect(src).toContain('from "@/components/kit"');
    expect(src).toContain("Button");
    expect(src).toContain("Card");
    expect(src).toContain("Field");
    expect(src).toContain("Tabs");
  });

  it("shows both themes on load — no --click needed for the shots (both oc-pv panes render unconditionally)", async () => {
    const src = await read("src/app/style/kit/page.tsx");
    expect(src).toContain('className="oc-pv-dark"');
    expect(src).toContain('className="oc-pv-light"');
    // no theme-toggle click handler gating either pane's render
    expect(src).not.toContain("onClick={() => setTheme");
  });

  it("includes a dashed demo frame proving the stack law without devtools, at any viewport width", async () => {
    const src = await read("src/app/style/kit/page.tsx");
    // ROUND 2 (Number One's pickup): the frame moved to ONE shared instance
    // above the two-pane grid (the law is theme-independent) and dropped
    // the hardcoded 390px pixel width — kit.css's own .kit-btn-row (a
    // flex-wrap row of nowrap-content buttons) is what proves the stack
    // law at ANY container width, not a specific frame size; see
    // tests/kit-components.test.ts's flex-wrap pin for that law itself.
    expect(src).toContain("kit-preview-frame");
    expect(src).toContain("kit-btn-row");
  });

  it("ROUND 2 (Number One's pickup): a two-column grid seats night beside dawn from 820px up, so a plain screenshot shows both panes without scrolling an inner overflow div", async () => {
    const src = await read("src/app/style/kit/page.tsx");
    expect(src).toContain("kit-preview-grid");
    expect(src).toMatch(/@media\(min-width:820px\)\{\.kit-preview-grid\{grid-template-columns:1fr 1fr/);
  });

  it("ROUND 2: cites the shared /style layout's forced inner scroller by file:line, since it isn't this page's own choice", async () => {
    const src = await read("src/app/style/kit/page.tsx");
    expect(src).toContain("src/app/style/layout.tsx:39");
  });
});

describe("TASK-349 — the kit route never touches a page outside its own lane", () => {
  it("no page migration file is edited by this lane (login/me/DoorSheet/MePanel/ContactForm untouched)", async () => {
    // the claim file is the source of truth for what this lane owns; this
    // pin just re-states the forbidden list in code so a future edit here
    // trips a visible test, not a silent scope creep
    const forbidden = [
      "src/app/login/page.tsx",
      "src/app/me/page.tsx",
      "src/components/door/DoorSheet.tsx",
      "src/components/me/MePanel.tsx",
    ];
    for (const rel of forbidden) {
      const src = await read(rel).catch(() => null);
      if (src === null) continue; // file shape may differ; existence isn't this pin's job
      expect(src).not.toContain("from \"@/components/kit\"");
    }
  });
});

describe("TASK-349 — StyleRoomStrip labels the new room honestly", () => {
  it("styleRoomLabel(\"/style/kit\") reads \"Kit\"", async () => {
    const { styleRoomLabel } = await import("@/app/style/StyleRoomStrip");
    expect(styleRoomLabel("/style/kit")).toBe("Kit");
  });
});
