import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-346 LANE A (0018.07.02 a₿ — the SUPERSEDING CUT NOTE, top of the
 * brief) — the /style home canvas preview hero, mount mechanism only: the
 * `overrides.iframe` wiring, a BARE `Hero` (session resolved per option
 * 1), the `<main>` wrap, and the "preview only" affordance. No
 * `BuilderMarker` wrap in this lane (Lane B's job, once T-342's
 * `BuilderMarker` lands — it already has, but wrapping the reading door is
 * a separate, later cut).
 *
 * `PuckEditor.tsx`/`StyleEditor.tsx` are client components riding Puck's
 * own store/portal machinery (never rendered in the node test env) — the
 * house's read-the-source pattern (`tests/style-preview-overlay.test.ts`,
 * `tests/style-builder-marker.test.ts`, `tests/style-route.test.ts`) pins
 * the contracts off the SOURCE.
 *
 * GROUND GAP FOUND WHILE BUILDING (see the route file and PreviewHero.tsx
 * for the full account): `Hero` cannot be imported by ANY client file —
 * `sections.tsx` has no `"use client"` directive and its siblings
 * (booking/store/site-config) pull Node/redis-only code transitively,
 * which breaks `next build` once a client file (PuckEditor.tsx is
 * `"use client"`) reaches it. The fix threaded through this lane: the
 * SERVER route renders `<Hero session={session}/>` itself and passes the
 * finished element down as an opaque `previewHero: ReactNode` prop — the
 * standard Next.js "Server Component passed as a Client Component's prop"
 * pattern. These pins reflect that shape.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");

const PUCK_EDITOR = "src/components/PuckEditor.tsx";
const STYLE_EDITOR = "src/components/style/StyleEditor.tsx";
const ROUTE = "src/app/style/[[...slug]]/page.tsx";
const PREVIEW_HERO = "src/components/style/PreviewHero.tsx";

describe("the mount mechanism — overrides.iframe, not overrides.preview, not config.root.render", () => {
  it("<Puck> is passed overrides={{ iframe: PreviewCanvasFrame }}", async () => {
    const src = await read(PUCK_EDITOR);
    const open = src.match(/<Puck\s[\s\S]*?>/);
    expect(open, "couldn't find the <Puck> opening tag").not.toBeNull();
    expect(open![0]).toContain("overrides={{ iframe: PreviewCanvasFrame }}");
  });

  it("PreviewCanvasFrame renders {children} — Puck's own rendered content — untouched, never intercepted", async () => {
    const src = await read(PUCK_EDITOR);
    expect(src).toMatch(/function PreviewCanvasFrame\(\{\s*children\s*\}/);
    // children rides through as the LAST thing rendered, after the gated hero
    const fn = src.match(/function PreviewCanvasFrame[\s\S]*?\n\}/)?.[0] ?? "";
    expect(fn).toContain("{children}");
  });

  it("config.root carries no render override anywhere in the puck-config module (the live / route reads the SAME config object)", async () => {
    const src = await read("src/lib/puck-config.tsx");
    expect(src).not.toMatch(/root:\s*\{[^}]*render/);
  });
});

describe("gated to the home slug only (Ground #12 — /style and /style/home both resolve to 'home')", () => {
  it("PreviewCanvasFrame only mounts the hero when slug === \"home\"", async () => {
    const src = await read(PUCK_EDITOR);
    const fn = src.match(/function PreviewCanvasFrame[\s\S]*?\n\}/)?.[0] ?? "";
    expect(fn).toMatch(/ctx\?\.slug === "home"/);
  });
});

describe("the <main> wrap — load-bearing for Ground #9's keep-dark token pin", () => {
  it("the hero is wrapped in a bare <main>, matching src/app/page.tsx's own <main><Hero/><Render/></main> shape", async () => {
    const src = await read(PUCK_EDITOR);
    const fn = src.match(/function PreviewCanvasFrame[\s\S]*?\n\}/)?.[0] ?? "";
    expect(fn).toMatch(/<main>\s*<PreviewHero hero=\{ctx\.previewHero\} \/>\s*<\/main>/);
  });
});

describe("Hero is rendered server-side and threaded down as an opaque ReactNode (the ground gap fix)", () => {
  it("the /style route resolves session via sessionsFromCookieHeader(cookie), the SAME cookie already read for operator, and renders <Hero> itself", async () => {
    const src = await read(ROUTE);
    expect(src).toContain('import { sessionsFromCookieHeader } from "@/lib/member-auth";');
    expect(src).toContain('import { tierForSubject } from "@/lib/member-tier";');
    expect(src).toContain('import { Hero } from "@/components/sections";');
    expect(src).toContain("sessionsFromCookieHeader(cookie)[0] ?? null");
    expect(src).toContain("const previewHero = <Hero session={session} />;");
    // no second cookie read — operator and session both read the ONE `cookie` const
    const cookieReads = src.match(/\(await headers\(\)\)\.get\("cookie"\)/g) ?? [];
    expect(cookieReads).toHaveLength(1);
  });

  it("the route forwards previewHero to StyleEditor alongside operator", async () => {
    const src = await read(ROUTE);
    expect(src).toContain("<StyleEditor slug={slug} data={data} operator={operator} previewHero={previewHero} />");
  });

  it("StyleEditor forwards previewHero to PuckEditor, typed ReactNode — never importing sections.tsx itself", async () => {
    const src = await read(STYLE_EDITOR);
    expect(src).not.toContain('from "@/components/sections"');
    expect(src).toMatch(/previewHero:\s*ReactNode/);
    expect(src).toMatch(/<PuckEditor[\s\S]*?previewHero=\{previewHero\}/);
  });

  it("PuckEditor takes previewHero and provides it (with slug) via PreviewCanvasContext, crossing the canvas iframe the same way BuilderMarkerContext already does — and never imports sections.tsx either", async () => {
    const src = await read(PUCK_EDITOR);
    expect(src).not.toContain('from "@/components/sections"');
    expect(src).toMatch(/previewHero:\s*ReactNode;/);
    expect(src).toContain("<PreviewCanvasContext.Provider value={{ slug, previewHero }}>");
    expect(src).toContain("</PreviewCanvasContext.Provider>");
  });
});

describe("the hero never enters the saved Puck document (the ground mismatch, re-asserted from this lane's own side)", () => {
  it("SEEDS.home still carries no Hero-typed block — this lane adds nothing to homeContent", async () => {
    const { SEEDS } = await import("@/lib/puck-seeds");
    const content = SEEDS.home.content as { type: string }[];
    expect(content.some((b) => b.type === "Hero")).toBe(false);
  });

  it("PreviewHero is referenced only inside PreviewCanvasFrame — never touching data/liveData/onChange (the saved-document path)", async () => {
    const src = await read(PUCK_EDITOR);
    const hits = src.match(/PreviewHero/g) ?? [];
    // the import statement contributes TWO hits (the identifier + the
    // "@/components/style/PreviewHero" module specifier string), plus the
    // one JSX use inside PreviewCanvasFrame
    expect(hits.length).toBe(3);
    const jsxUse = src.match(/<PreviewHero hero=\{ctx\.previewHero\} \/>/g) ?? [];
    expect(jsxUse).toHaveLength(1);
  });
});

describe("PreviewHero.tsx — wraps a BARE, unmodified Hero element (Lane A's own design decision)", () => {
  it("takes an opaque ReactNode `hero` prop and renders it unmodified — never imports sections.tsx (the ground-gap fix)", async () => {
    const src = await read(PREVIEW_HERO);
    expect(src).not.toContain('from "@/components/sections"');
    expect(src).toMatch(/hero:\s*ReactNode/);
    expect(src).toContain("{hero}");
  });

  it("never wraps anything in BuilderMarker — that is Lane B's cut, not this one (prose mentions in the seam note are fine; code usage is not)", async () => {
    const src = await read(PREVIEW_HERO);
    expect(src).not.toContain('from "@/components/style/BuilderMarker"');
    expect(src).not.toMatch(/<BuilderMarker/);
  });

  it("carries the 'preview only' affordance as legible TEXT, not a color-only cue", async () => {
    const src = await read(PREVIEW_HERO);
    expect(src).toContain("Preview only — not saved to the page");
    // theme-invariant tokens (T-342's own verified-contrast pairing), not --muted
    // (which is NOT theme-invariant outside a .keep-dark DOM scope)
    expect(src).toContain("var(--pop-bg)");
    expect(src).toContain("var(--nav-gold, #FAC51C)");
  });
});
