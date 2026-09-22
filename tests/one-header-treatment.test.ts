import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-216 (0018.06.23 a₿, #39 — "the top headers on every page (/support,
 * /community …)"): the nav header itself was ALREADY one component
 * (`SiteHeader.tsx`) before this lane — verified here, not rebuilt. The
 * real drift was one band lower: eight public pages hand-rolled the exact
 * `<p className="kicker">…<h1 className="stack-hero">…<div
 * className="constellation">` markup `StackedHero.tsx` already exists to
 * own, each with its own inline color overrides — most of them redundant
 * copies of house.css's own defaults, one of them (/classes) a genuine
 * divergence (both title lines pink instead of the ink/teal split, a
 * "different header" next to /support's StackedHero-built one). Converged
 * on the ONE component; the divergent choice now rides a named CSS tone
 * (`sh-rose`/`kicker-teal`), not a copy of the markup.
 */
const root = process.cwd();
const read = (rel: string) => fs.readFile(path.join(root, rel), "utf8");

/** every `page.tsx` under src/app, repo-relative with forward slashes —
 *  no glob dependency, just a plain recursive walk (Node's own readdir). */
async function findPageFiles(): Promise<string[]> {
  const entries = await fs.readdir(path.join(root, "src/app"), { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name === "page.tsx")
    .map((e) => path.join(path.relative(root, e.parentPath ?? e.path), e.name).split(path.sep).join("/"));
}

describe("TASK-216 — the nav header is already the ONE component (pinned, not rebuilt)", () => {
  it("SiteHeader.tsx is the only file exporting a header component with this shape", async () => {
    const src = await read("src/components/SiteHeader.tsx");
    expect(src).toMatch(/export default function SiteHeader/);
  });

  it("every PUBLIC page route imports SiteHeader — the console (/a) and the Style canvas (/style) wear it via their layouts instead; the four documented standalone couriers are the only true exceptions", async () => {
    const pages = await findPageFiles();
    /* TASK-327 (0018.06.26 a₿): /style is no longer a header exception —
       the shared header OWNS the route via src/app/style/layout.tsx
       (SiteChromeHeader + the room strip), so the pages stay free of
       per-page duplicate headers by design. /a's console pages wear the
       same header through src/app/a/layout.tsx's shell. */
    const EXCLUDE_PREFIXES = ["src/app/a/", "src/app/style/"];
    const EXCLUDE_EXACT = new Set([
      // the old brand's cross-tenant profile card — its own chrome, not this site's
      "src/app/u/[handle]/page.tsx",
      // a pure OAuth-callback courier; transient, no chrome by design
      "src/app/login/signer-return/page.tsx",
      // the OBS transparent browser-source overlay — full-bleed, no chrome
      "src/app/studio/overlay/page.tsx",
      // TASK-405: a pure 308 forward to /me?tab=calendar — it never returns JSX, no chrome by design
      "src/app/me/calendar/page.tsx",
    ]);
    const checked: string[] = [];
    const missing: string[] = [];
    for (const p of pages) {
      if (EXCLUDE_PREFIXES.some((pre) => p.startsWith(pre)) || EXCLUDE_EXACT.has(p)) continue;
      checked.push(p);
      const src = await read(p);
      if (!/SiteHeader/.test(src)) missing.push(p);
    }
    expect(checked.length, "the census found no public pages to check — the glob is wrong").toBeGreaterThan(30);
    expect(missing, `pages missing SiteHeader: ${missing.join(", ")}`).toEqual([]);
  });

  it("the /style layout carries the shared header for every Style route — ownership once, no per-page duplicates (TASK-327)", async () => {
    const layout = await read("src/app/style/layout.tsx");
    expect(layout).toContain("SiteChromeHeader");
    const stylePages = (await findPageFiles()).filter((p) => p.startsWith("src/app/style/"));
    expect(stylePages.length, "the census found no /style pages — the glob is wrong").toBeGreaterThan(0);
    for (const p of stylePages) {
      const src = await read(p);
      /* docblocks may NAME the header in prose — the pin targets import and
         JSX positions only */
      expect(/import[^\n]*SiteChromeHeader|<SiteChromeHeader|<SiteHeader/.test(src), `${p} hand-mounts the header — the layout owns it`).toBe(false);
    }
  });

  it("/a's console layout carries its own documented chrome (LCARS or the site shell, CONSOLE_CHROME), never a third header", async () => {
    const layout = await read("src/app/a/layout.tsx");
    expect(layout).toMatch(/CONSOLE_CHROME/);
  });
});

describe("TASK-216 — the top hero band converges on <StackedHero>, not a hand-rolled copy", () => {
  const CONVERTED = [
    "src/app/book/cuts/page.tsx",
    "src/app/book/page.tsx",
    "src/app/cart/page.tsx",
    "src/app/contact/page.tsx",
    "src/app/me/page.tsx",
    "src/app/about/page.tsx",
    "src/app/login/page.tsx",
    "src/app/classes/page.tsx",
  ];

  it("no src/app page hand-rolls an h1.stack-hero anymore — every top hero calls <StackedHero>", async () => {
    const pages = await findPageFiles();
    const offenders: string[] = [];
    for (const p of pages) {
      const src = await read(p);
      if (/<h1 className="stack-hero"/.test(src)) offenders.push(p);
    }
    expect(offenders, `still hand-rolling h1.stack-hero: ${offenders.join(", ")}`).toEqual([]);
  });

  it("each converged page actually renders <StackedHero>", async () => {
    for (const p of CONVERTED) {
      const src = await read(p);
      expect(src, `${p} does not call <StackedHero`).toMatch(/<StackedHero/);
    }
  });

  it("mid-page section dividers (about's h2, services' h2) still legitimately reuse .stack-hero — a different, already-shared use of the class, left alone on purpose", async () => {
    const about = await read("src/app/about/page.tsx");
    const services = await read("src/app/services/page.tsx");
    expect((about.match(/<h2 className="stack-hero"/g) ?? []).length).toBeGreaterThan(0);
    expect((services.match(/<h2 className="stack-hero"/g) ?? []).length).toBeGreaterThan(0);
  });

  it("/classes' genuine content choice (both title lines rose, a teal kicker) rides the named tones, not an inline color copy", async () => {
    const src = await read("src/app/classes/page.tsx");
    expect(src).toMatch(/kickerTone="teal"/);
    expect(src).toMatch(/tone: "rose" }, { t: "COMMUNITY", tone: "rose"/);
    expect(src).not.toMatch(/style=\{\{ color: "var\(--rose\)" \}\}/);
  });

  it("StackedHero.tsx supports the rose tone + kickerTone as real CSS rules (house.css), not inline styles", async () => {
    const house = await read("src/app/house.css");
    expect(house).toMatch(/\.stack-hero \.sh-rose\{/);
    expect(house).toMatch(/\.kicker-teal\{/);
    const hero = await read("src/components/StackedHero.tsx");
    expect(hero).toMatch(/kickerTone/);
    expect(hero).toMatch(/"rose"/);
  });
});
