import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-586 - the console room menu is a side menu on phones (the Admiral's
 * mark on the phone shot of /a/letters). Source pins: the vitest runner is a
 * node environment with no DOM, so the behaviour is pinned in the source and
 * the rail CSS.
 */
const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

describe("Rooms side menu (phone)", () => {
  it("one Rooms button carries aria-expanded and aria-controls to the nav", async () => {
    const src = await read("src/components/console/SiteConsoleShell.tsx");
    expect(src).toMatch(/aria-expanded=\{open\}\s+aria-controls="mgmt-rooms-nav"/);
    expect(src).toContain('id="mgmt-rooms-nav"');
    expect(src).toContain("mgmt-rooms-btn");
  });

  it("closes on scrim tap, Escape, the Close button and after choosing a room", async () => {
    const src = await read("src/components/console/SiteConsoleShell.tsx");
    expect(src).toMatch(/mgmt-rooms-scrim" onClick=\{close\}/);
    expect(src).toContain('e.key === "Escape"');
    expect(src).toMatch(/ref=\{closeRef\} onClick=\{close\}/);
    expect(src).toContain('closest("a[href]")');
  });

  it("traps Tab inside the open menu and returns focus to the button", async () => {
    const src = await read("src/components/console/SiteConsoleShell.tsx");
    expect(src).toContain('e.key !== "Tab"');
    expect(src).toContain("triggerRef.current?.focus()");
    expect(src).toContain("closeRef.current?.focus()");
    expect(src).toContain('role: "dialog", "aria-modal": true');
  });

  it("keeps the current-room mark on every rail link", async () => {
    const src = await read("src/components/console/SiteConsoleShell.tsx");
    expect(src).toContain('aria-current={active ? "page" : undefined}');
  });

  it("desktop is untouched: the button is hidden by default and the drawer rules live inside the 760px query only", async () => {
    const css = await read("src/app/house.css");
    expect(css).toContain("button.mgmt-rooms-btn{display:none}");
    const at = css.indexOf("@media(max-width:760px){\n  button.mgmt-rooms-btn");
    expect(at).toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf("\n}\n", at));
    expect(block).toContain("position:fixed");
    expect(block).toContain("translateX(-102%)");
    expect(block).toContain("visibility:hidden");
    // the base desktop rule is still the sticky column
    expect(css).toMatch(/\.mgmt-rail\{display:flex;flex-direction:column;gap:6px;position:sticky;top:92px/);
  });

  it("the drawer and the shell stack on the same width", async () => {
    const src = await read("src/components/console/SiteConsoleShell.tsx");
    expect(src).toContain('ROOMS_PHONE_QUERY = "(max-width: 760px)"');
  });

  it("shows no head or scrim until opened (desktop markup stays as it was)", async () => {
    const src = await read("src/components/console/SiteConsoleShell.tsx");
    expect(src).toContain("{open && <div className=\"mgmt-rooms-scrim\"");
    expect(src).toMatch(/\{open && \(\s+<div className="mgmt-rail-head">/);
  });
});
