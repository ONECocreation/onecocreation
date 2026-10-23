import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * T-624 - one button set across the /a console. Source pins: the console's
 * main column wears .kit-bset, the set is label-sized pills (no fixed widths),
 * a group is centred and one width, and nothing in the set carries a mockup mark.
 */
const read = (f: string) => fs.readFile(path.join(process.cwd(), f), "utf8");

describe("one button set (T-624)", () => {
  it("the site console's main column wears the set", async () => {
    const shell = await read("src/components/console/SiteConsoleShell.tsx");
    expect(shell).toMatch(/<main className="mgmt-body kit-bset">/);
  });

  it("buttons are pills sized to the label: height and padding, no fixed width", async () => {
    const css = await read("src/app/kit.css");
    const at = css.indexOf("/* ── T-624: ONE button set");
    expect(at).toBeGreaterThan(-1);
    const set = css.slice(at);
    expect(set).toMatch(/\.kit-bset \.btn,\.kit-bset \.kit-btn:not\(\.kit-btn-quiet\)\{[^}]*height:38px[^}]*border-radius:999px/);
    expect(set).toMatch(/\.kit-btn-sm\)\{height:34px/);
    expect(set).not.toMatch(/\.kit-doors>[^{]*\{width:320px/);
    expect(set).not.toMatch(/\.kit-rail \.btn\{width:/);
  });

  it("a group is centred and one width (grid, equal columns), one column on a phone", async () => {
    const css = await read("src/app/kit.css");
    expect(css).toMatch(/\.kit-bset \.kit-doors,[^{]*\{\s*display:grid;grid-auto-flow:column;grid-auto-columns:1fr;/);
    expect(css).toMatch(/\.kit-bset \.kit-btn-row[^{]*\{\s*display:grid;grid-auto-flow:column;grid-auto-columns:1fr;[^}]*justify-content:center/);
    expect(css).toMatch(/@media\(max-width:640px\)\{\s*\.kit-bset \.kit-btn-row[^{]*\{grid-auto-flow:row/);
  });

  it("the letter canvas's fixed Open button is centred on a phone", async () => {
    const css = await read("src/app/kit.css");
    expect(css).toMatch(/@media\(max-width:640px\)\{\.kitx-letter-card \.kit-btn\{display:flex;width:fit-content;margin:10px auto 0\}\}/);
  });

  it("no mockup wording is left in the set", async () => {
    const css = await read("src/app/kit.css");
    expect(css.slice(css.indexOf("/* ── T-624"))).not.toMatch(/MOCKUP|not for push|not shipped/i);
    const rooms = [
      "src/app/a/site/SiteRoom.tsx",
      "src/app/a/site/replays/ReplaysCard.tsx",
      "src/components/console/StudioHub.tsx",
      "src/components/studio-overlay/StudioRoom.tsx",
    ];
    for (const f of rooms) expect(await read(f)).not.toMatch(/MOCKUP|not for push/i);
  });
});
