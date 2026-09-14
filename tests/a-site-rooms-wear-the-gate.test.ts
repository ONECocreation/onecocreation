import { describe, it, expect, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-241 (0018.09.14 a₿) — the Admiral opened /a/site/about-videos signed
 * out and saw "a frame without the login items": the desk card drew with no
 * sign-in door, and Save answered 401. Every other /a room is a SERVER page
 * that reads the cookie and renders `<OperatorGate />` when there is no
 * operator; the four Site rooms were `"use client"` pages and skipped the
 * door. This pins the fix: each of the four page.tsx files is now a server
 * gate wrapper (same shape as /a/live's page.tsx), and the moved room body
 * (SiteRoom.tsx / SiteAboutVideosRoom.tsx / SiteCommunityDoorRoom.tsx /
 * SiteMenuRoom.tsx) is untouched.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");

const PAGES = [
  "src/app/a/site/page.tsx",
  "src/app/a/site/about-videos/page.tsx",
  "src/app/a/site/community-door/page.tsx",
  "src/app/a/site/menu/page.tsx",
];

describe("the four Site rooms wear the operator gate (source pins)", () => {
  it.each(PAGES)("%s is a server gate: OperatorGate + operatorFromCookieHeader + operatorsConfigured, no \"use client\"", async (rel) => {
    const src = await read(rel);
    expect(src).not.toContain('"use client"');
    expect(src).toContain('import OperatorGate from "@/components/OperatorGate"');
    expect(src).toContain("operatorFromCookieHeader");
    expect(src).toContain("operatorsConfigured");
    expect(src).toContain("<OperatorGate configured={operatorsConfigured()} />");
    expect(src).toContain('export const dynamic = "force-dynamic"');
    // headers() read, same idiom as /a/live
    expect(src).toContain('from "next/headers"');
    expect(src).toContain("await headers()");
  });

  it("/a/site's own denied line stays as belt-and-braces (source pin)", async () => {
    const room = await read("src/app/a/site/SiteRoom.tsx");
    expect(room).toContain("operator session required");
    expect(room).toContain("sign in at the door");
  });
});

describe("the studio words (naming law: StudioPac = \"the studio\")", () => {
  it("the meeting-rail chip reads The studio; the vdo key value never changes", async () => {
    const room = await read("src/app/a/site/SiteRoom.tsx");
    expect(room).toContain('{ key: "vdo", label: "The studio", about: "sessions meet in your studio — guest and director links on this site" }');
  });

  it("no VDO.Ninja text is left anywhere under src/app/a/site", async () => {
    async function collect(dir: string): Promise<string[]> {
      const entries = await fs.readdir(path.join(ROOT, dir), { withFileTypes: true });
      const files: string[] = [];
      for (const e of entries) {
        const rel = path.join(dir, e.name);
        if (e.isDirectory()) files.push(...(await collect(rel)));
        else files.push(rel);
      }
      return files;
    }
    const files = await collect("src/app/a/site");
    for (const rel of files) {
      const content = await read(rel);
      expect(content, `${rel} should carry no "VDO.Ninja" text`).not.toContain("VDO.Ninja");
    }
  });
});

describe("the gated branch — no operator cookie, the door renders, not the desk", () => {
  it("renders OperatorGate's own markup for /a/site/about-videos, not the Videos-on-About room", async () => {
    vi.resetModules();
    vi.doMock("next/headers", () => ({
      headers: async () => ({ get: () => null }),
    }));
    try {
      const mod = await import("@/app/a/site/about-videos/page");
      const element = await mod.default();
      const html = renderToStaticMarkup(element);
      // OperatorGate's own copy
      expect(html).toContain("Operator sign-in");
      expect(html).toContain("This area is for site operators");
      // never the room behind the gate
      expect(html).not.toContain("Videos on About");
      expect(html).not.toContain("AboutVideosCard");
    } finally {
      vi.doUnmock("next/headers");
      vi.resetModules();
    }
  });
});
