import { describe, it, expect, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * T-555: /a/money/test-join, the operator test door page. Source pins, the
 * same ones tests/a-site-rooms-wear-the-gate.test.ts uses for its rooms,
 * kept here because that suite's list and title are about the six Site
 * rooms and this page lives under Money.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");
const PAGE = "src/app/a/money/test-join/page.tsx";
const ROOM = "src/app/a/money/test-join/TestJoinRoom.tsx";

describe("/a/money/test-join page", () => {
  it("is a server gate wrapper: OperatorGate + operatorFromCookieHeader, no \"use client\", noindex, force-dynamic", async () => {
    const src = await read(PAGE);
    expect(src).not.toContain('"use client"');
    expect(src).toContain('import OperatorGate from "@/components/OperatorGate"');
    expect(src).toContain("operatorFromCookieHeader");
    expect(src).toContain("operatorsConfigured");
    expect(src).toContain("<OperatorGate configured={operatorsConfigured()} />");
    expect(src).toContain('export const dynamic = "force-dynamic"');
    expect(src).toContain("await headers()");
    expect(src).toContain('title: "Test join · admin"');
    expect(src).toContain("robots: { index: false, follow: false }");
  });

  it("with no operator cookie it renders the door, not the room", async () => {
    vi.resetModules();
    vi.doMock("next/headers", () => ({ headers: async () => ({ get: () => null }) }));
    try {
      const mod = await import("@/app/a/money/test-join/page");
      const html = renderToStaticMarkup(await mod.default());
      expect(html).toContain("Operator sign-in");
      expect(html).not.toContain("Test a monthly membership");
    } finally {
      vi.doUnmock("next/headers");
      vi.resetModules();
    }
  });

  it("the body mounts the real JoinWithCard for tier A, only with a slot and a member", async () => {
    const src = await read(ROOM);
    expect(src).toContain('<JoinWithCard tier="A" tierName="Weekly Intuitive"');
    expect(src).toContain('slug="weekly-intuitive"');
    expect(src).toContain("plan && plan.cents != null && member");
    expect(src).toContain("/login?next=/a/money/test-join");
  });

  it("the copy carries no em dash, long dash, arrow or inline style", async () => {
    for (const rel of [PAGE, ROOM]) {
      const src = await read(rel);
      expect(src, rel).not.toMatch(/[—–→←]/);
      expect(src, rel).not.toContain("style={");
    }
  });

  it("the Money desk carries the link", async () => {
    const src = await read("src/components/console/SubscriptionsDesk.tsx");
    expect(src).toContain('href="/a/money/test-join"');
    expect(src).toContain("Test a join before switching on");
  });
});
