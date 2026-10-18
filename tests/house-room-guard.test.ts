import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CONSOLE_ROOMS, CONSOLE_OVERVIEW } from "@/lib/console";

/**
 * T-623 (lane E): Love's menu carries no dead or house-only row, and every
 * house-only room carries the T-135 idiom verbatim (the chrome-matrix oracle
 * matches the full line, so the idiom is copied, not wrapped in a helper).
 */
const page = (d: string) => readFileSync(join(process.cwd(), "src/app/a", d, "page.tsx"), "utf8");
const IDIOM = 'if (CONSOLE_CHROME === "site") redirect("/a");';

describe("T-623 console housekeeping", () => {
  it("the Live row is house-only and has no site label or rail slot", async () => {
    const { SITE_LABELS, SITE_NAV_ORDER } = await import("@/components/console/SiteConsoleShell");
    expect(CONSOLE_ROOMS.find((r) => r.key === "live")?.houseOnly).toBe(true);
    expect(SITE_LABELS.live).toBeUndefined();
    expect(SITE_NAV_ORDER).not.toContain("live");
    const rail = [CONSOLE_OVERVIEW, ...CONSOLE_ROOMS].filter((r) => !r.houseOnly).map((r) => r.key);
    expect(rail).not.toContain("live");
  });

  it("/a/live still redirects to /a/studio, query kept", async () => {
    const { studioRedirectPath } = await import("@/app/a/live/page");
    expect(studioRedirectPath({})).toBe("/a/studio");
    expect(studioRedirectPath({ a: "1" })).toBe("/a/studio?a=1");
  });

  it.each(["status", "sim", "bots", "connections", "briefs"])("/a/%s carries the house-room idiom", (d) => {
    expect(page(d)).toContain(IDIOM);
  });

  it("/a/briefs redirects before it reads the cookie", () => {
    const src = page("briefs");
    expect(src.indexOf(IDIOM)).toBeLessThan(src.indexOf("operatorFromCookieHeader(cookie)"));
  });

  it.each([
    ["chat", "/a/connections"], ["decisions", "/a"], ["mempool", "/a/connections"],
    ["mud", "/a/connections"], ["scar", "/a"], ["spaces", "/a/connections"],
  ])("/a/%s is a retired stub redirecting to %s", (d, to) => {
    expect(page(d)).toContain(`redirect("${to}");`);
  });

  it("none of the house or retired rooms is in Love's rail", () => {
    const hrefs = [CONSOLE_OVERVIEW, ...CONSOLE_ROOMS].filter((r) => !r.houseOnly).map((r) => r.href);
    for (const d of ["status", "sim", "bots", "connections", "briefs", "chat", "decisions", "mempool", "mud", "scar", "spaces", "live"]) {
      expect(hrefs).not.toContain(`/a/${d}`);
    }
  });
});
