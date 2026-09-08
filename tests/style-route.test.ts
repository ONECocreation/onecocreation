import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import nextConfig from "../next.config";

/**
 * TASK-175 (0018.06.17 a₿ · block 966094) — THE PAGE DESIGNER IS STYLE.
 * Cut from the Admiral's naming ruling: StudioPac = the studio = the
 * VDO.Ninja fork (go-live); StylePac = the sovereign page designer. The
 * Puck editor route /studio collided with "the studio" and moved to
 * /style. Pins:
 *
 *  · (the Admiral, 0018.06.17: NO /studio redirect — there were no bookmarks; the old path simply 404s)
 *    /style/:path* — bookmarks and old letters keep working (behavioral:
 *    the config module is imported and its redirects() awaited);
 *  · the route folders really moved: src/app/style/** stands (catch-all,
 *    brand board, reference viewer), src/app/studio is gone, and the
 *    component folder is src/components/style with StyleEditor (the
 *    StudioEditor identifier is retired);
 *  · THE GATE FOLLOWS THE ROUTE: /style, /style/brand and
 *    /style/reference/[slug] each check operatorFromCookieHeader and
 *    render OperatorGate when no operator cookie — exactly the old
 *    /studio gate; the /a/studio console stub still gates, then hands
 *    off to /style;
 *  · THE WORD LAW: no Love-facing "Studio" word remains where it means
 *    the page designer — the editor badge reads STYLE, the Brand desk
 *    door reads "Edit the page · Style" and links /style, and no code
 *    path string ("/studio…" in a href/assign/redirect) survives in the
 *    designer's own files. Comments retelling the rename and the code
 *    identifiers (oc-studio-*, .oc-studio, --studio-*) stay on purpose —
 *    the pin targets the quoted/path form, not prose.
 *
 * The pages are async server components — never rendered in the node test
 * env — so the gate and word contracts are pinned off the SOURCE (the
 * house's read-the-source pattern, route-gates.test.ts /
 * sessions-style.test.ts). The redirect is pinned BEHAVIORALLY off the
 * real config module.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");
const exists = (rel: string) =>
  fs.stat(path.join(ROOT, rel)).then(() => true, () => false);

/* every file that must carry no quoted /studio path any more (OWNS list:
   the route folders, the designer components, the Brand desk, the /a
   stub) */
const DESIGNER_FILES = [
  "src/app/style/[[...slug]]/page.tsx",
  "src/app/style/brand/page.tsx",
  "src/app/style/reference/[slug]/page.tsx",
  "src/app/style/layout.tsx",
  "src/app/a/studio/[[...slug]]/page.tsx",
  "src/components/PuckEditor.tsx",
  "src/components/style/StyleEditor.tsx",
  "src/components/style/PagesPanel.tsx",
  "src/components/style/PopupsPanel.tsx",
  "src/components/style/BrandBoard.tsx",
  "src/components/style/MediaField.tsx",
  "src/components/console/BrandDesk.tsx",
];

/* a /studio path in CODE position: quoted, backticked, or opening an
   href/assign/redirect call — prose mentions in rename comments don't
   match this */
const STUDIO_PATH = /["'`(]\/studio(\/|"|'|`|\?|$)/;

describe("TASK-175 — the route folders moved", () => {
  it("src/app/style stands with catch-all, brand board and reference viewer; src/app/studio is gone", async () => {
    expect(await exists("src/app/style/[[...slug]]/page.tsx")).toBe(true);
    expect(await exists("src/app/style/brand/page.tsx")).toBe(true);
    expect(await exists("src/app/style/reference/[slug]/page.tsx")).toBe(true);
    expect(await exists("src/app/style/layout.tsx")).toBe(true);
    expect(await exists("src/app/studio")).toBe(false);
  });

  it("src/components/style stands with StyleEditor; the studio folder and StudioEditor identifier are gone", async () => {
    expect(await exists("src/components/style/StyleEditor.tsx")).toBe(true);
    expect(await exists("src/components/studio")).toBe(false);
    const editor = await read("src/components/style/StyleEditor.tsx");
    expect(editor).toContain("export default function StyleEditor(");
    /* the identifier is retired — the rename-retelling comment may name it */
    expect(editor).not.toContain("function StudioEditor");
    expect(editor).not.toMatch(/<StudioEditor/);
    const page = await read("src/app/style/[[...slug]]/page.tsx");
    expect(page).toContain('import StyleEditor from "@/components/style/StyleEditor"');
    expect(page).toContain("<StyleEditor slug={slug} data={data} />");
  });

  it("the former import sites all read @/components/style/* (puck-config, PuckEditor, brand board)", async () => {
    expect(await read("src/lib/puck-config.tsx")).toContain('from "@/components/style/MediaField"');
    const puck = await read("src/components/PuckEditor.tsx");
    expect(puck).toContain('from "@/components/style/PagesPanel"');
    expect(puck).toContain('from "@/components/style/PopupsPanel"');
    expect(await read("src/app/style/brand/page.tsx")).toContain('from "@/components/style/BrandBoard"');
  });
});

describe("TASK-175 — the operator gate protects /style identically", () => {
  it.each([
    "src/app/style/[[...slug]]/page.tsx",
    "src/app/style/brand/page.tsx",
    "src/app/style/reference/[slug]/page.tsx",
    "src/app/a/studio/[[...slug]]/page.tsx",
  ])("%s: no operator cookie → OperatorGate, same as every /a room", async (rel) => {
    const src = await read(rel);
    expect(src).toContain("operatorFromCookieHeader");
    expect(src).toContain('from "@/lib/operator-auth"');
    expect(src).toContain("if (!operator)");
    expect(src).toContain("<OperatorGate configured={operatorsConfigured()} />");
  });

  it("the /a/studio console stub hands off to /style, preserving the slug", async () => {
    const src = await read("src/app/a/studio/[[...slug]]/page.tsx");
    expect(src).toContain("redirect(`/style${suffix}`)");
    expect(src).not.toContain("redirect(`/studio");
  });
});

describe("TASK-175 — the word law: no Love-facing \"Studio\" meaning the page designer", () => {
  it("the editor's top-bar badge reads STYLE, never STUDIO", async () => {
    const puck = await read("src/components/PuckEditor.tsx");
    expect(puck).not.toContain(">STUDIO<");
    expect(puck).toContain(">STYLE</i>");
  });

  it("the Brand desk door reads \"Edit the page · Style\" and links /style", async () => {
    const desk = await read("src/components/console/BrandDesk.tsx");
    expect(desk).toContain('href="/style"');
    expect(desk).toContain("Edit the page · Style");
    expect(desk).not.toMatch(/open the [Ss]tudio/);
    expect(desk).not.toContain("the Studio");
    expect(desk).not.toContain("Studio-built");
  });

  it("the brand board's way back reads \"← back to Style\"", async () => {
    const board = await read("src/components/style/BrandBoard.tsx");
    expect(board).toContain("← back to Style");
    expect(board).not.toContain("back to studio");
  });

  it("the reference viewer's way back reads \"← back to Style\" and links /style", async () => {
    const ref = await read("src/app/style/reference/[slug]/page.tsx");
    expect(ref).toContain('href="/style"');
    expect(ref).toContain("← back to Style");
  });

  it("no designer file carries a /studio path in code position (href/assign/redirect/literal)", async () => {
    for (const rel of DESIGNER_FILES) {
      const src = await read(rel);
      const lines = src.split("\n").filter((l) => STUDIO_PATH.test(l));
      expect(lines, `${rel} still holds /studio path(s): ${lines.join(" | ")}`).toEqual([]);
    }
  });

  it("the StylePac name never reaches Love's UI (the badge, the doors, the desks)", async () => {
    for (const rel of ["src/components/PuckEditor.tsx", "src/components/console/BrandDesk.tsx", "src/components/style/BrandBoard.tsx"]) {
      const src = await read(rel);
      /* StylePac may appear in comments — pin the JSX string positions only */
      const jsxText = src.split("\n").filter((l) => /(>|title="|label=")[^*]*StylePac/.test(l));
      expect(jsxText, `${rel} shows StylePac to Love`).toEqual([]);
    }
  });
});
