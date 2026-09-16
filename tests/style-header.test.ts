import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { styleRoomLabel } from "@/app/style/StyleRoomStrip";

/**
 * TASK-327 (cut 0018.06.26 a₿ · block 967255) — /style wears the console's
 * own header, with a door back to /a. The Admiral: "make sure they have a
 * unified header so we can get back easily to the admin area." All three
 * /style routes (catch-all, brand board, reference viewer) sit under
 * src/app/style/layout.tsx, which now mounts SiteChromeHeader (the same
 * header every /a page renders, via the site-chrome swap point — zero edit
 * to SiteConsoleShell) plus the StyleRoomStrip: ← Back to admin · Style ·
 * the page being edited · View site.
 *
 * The word law rides the TASK-175 idiom (tests/style-route.test.ts): the
 * room word is "Style", never "studio"; StylePac is the house name and
 * never reaches Love's UI.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");

describe("TASK-327 — the shared header mounts on every /style route via the one layout", () => {
  it("style/layout.tsx imports SiteChromeHeader from the site-chrome swap point and renders it above the room strip", async () => {
    const layout = await read("src/app/style/layout.tsx");
    expect(layout).toContain('import { SiteChromeHeader } from "@/components/console/site-chrome"');
    expect(layout).toContain("<SiteChromeHeader />");
    expect(layout).toContain("<StyleRoomStrip />");
    /* header first, strip second, children below — one header block */
    expect(layout.indexOf("<SiteChromeHeader />")).toBeLessThan(layout.indexOf("<StyleRoomStrip />"));
    expect(layout.indexOf("<StyleRoomStrip />")).toBeLessThan(layout.indexOf("{children}"));
  });

  it("the layout stays a server component and adds chrome, never auth (the routes keep their own OperatorGate calls)", async () => {
    const layout = await read("src/app/style/layout.tsx");
    expect(layout).not.toMatch(/^["']use client["']/m);
    /* prose may retell the gate story — the pin targets code positions */
    expect(layout).not.toContain('from "@/lib/operator-auth"');
    expect(layout).not.toContain("<OperatorGate");
  });

  it("the layout records the PUCK P2 reversal honestly (no stale 'no SiteHeader' prose)", async () => {
    const layout = await read("src/app/style/layout.tsx");
    expect(layout).not.toContain("no SiteHeader, no console sidebar/header");
    expect(layout).toContain("TASK-327");
  });
});

describe("TASK-327 — the room strip: the door back, the room word, the page being edited", () => {
  it("the admin door points at /a and reads \"← Back to admin\" at a 44px target", async () => {
    const strip = await read("src/app/style/StyleRoomStrip.tsx");
    expect(strip).toContain('href="/a"');
    expect(strip).toContain("← Back to admin");
    expect(strip).toContain("minHeight: 44");
  });

  it("the View site door points at /", async () => {
    const strip = await read("src/app/style/StyleRoomStrip.tsx");
    expect(strip).toContain('href="/"');
    expect(strip).toContain("View site");
  });

  it("the room word is \"Style\" — never \"studio\", and StylePac never reaches Love's UI", async () => {
    const strip = await read("src/app/style/StyleRoomStrip.tsx");
    expect(strip).toContain(">Style<");
    expect(strip).not.toContain(">STUDIO<");
    expect(strip).not.toContain(">Studio<");
    /* StylePac may appear in comments — pin the JSX string positions only
       (the style-route.test.ts idiom) */
    const jsxText = strip.split("\n").filter((l) => /(>|title="|label=")[^*]*StylePac/.test(l));
    expect(jsxText, "StyleRoomStrip shows StylePac to Love").toEqual([]);
    /* no /studio path in code position (the TASK-175 STUDIO_PATH pin) */
    const studioPath = strip.split("\n").filter((l) => /["'`(]\/studio(\/|"|'|`|\?|$)/.test(l));
    expect(studioPath, `strip holds /studio path(s): ${studioPath.join(" | ")}`).toEqual([]);
  });

  it("styleRoomLabel names the three route shapes honestly", () => {
    expect(styleRoomLabel("/style")).toBe("home");
    expect(styleRoomLabel("/style/")).toBe("home");
    expect(styleRoomLabel("/style/pilot")).toBe("pilot");
    expect(styleRoomLabel("/style/about")).toBe("about");
    expect(styleRoomLabel("/style/brand")).toBe("Brand board");
    expect(styleRoomLabel("/style/reference/colors")).toBe("Reference · colors");
  });
});

describe("TASK-327 — the height/offset contract", () => {
  it("the PuckEditor root carries no 100vh literal — it fills the layout's body region (the one named seam)", async () => {
    const puck = await read("src/components/PuckEditor.tsx");
    const rootLines = puck.split("\n").filter((l) => l.includes('className="oc-studio"'));
    expect(rootLines.length, "PuckEditor's root line not found").toBe(1);
    expect(rootLines[0]).toContain('height: "100%"');
    expect(rootLines[0]).not.toContain("100vh");
  });

  it("the layout's wrapper is a full-viewport flex column with a flex:1 positioning-context body region", async () => {
    const layout = await read("src/app/style/layout.tsx");
    expect(layout).toContain('position: "fixed", inset: 0');
    expect(layout).toContain('flexDirection: "column"');
    expect(layout).toContain('flex: 1, minHeight: 0, position: "relative"');
  });

  it("the preview overlay is absolute against the body region, never fixed over the admin door", async () => {
    const css = await read("src/app/style/preview.css");
    const shell = css.match(/\.oc-preview-shell\s*\{[^}]*\}/s)?.[0] ?? "";
    expect(shell).toContain("position: absolute");
    expect(shell).not.toContain("position: fixed");
  });
});
