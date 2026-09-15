import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-287 (0018.06.25 a₿ · block 967,130) — the console rooms' description
 * line is unreadable at dawn. The room ledes rode night-only Tailwind inks
 * (text-white/55, /50): grey on the night console ground, invisible when
 * cartridge.css's dawn blanket repaint turns the room <main> cream. The
 * fix is ONE shared rule — .mgmt-lede{color:var(--muted)} in house.css
 * (--muted is the site's own muted ink, the S21 D6 pair: #9a8fae night /
 * #6F6885 dawn) — worn by every lede line. Read-the-source pins (the
 * house pattern):
 *
 *  · THE GO PIN: no text-white/[0-9]+ className remains on a <p> under a
 *    .mgmt-title h1 in src/app/a/**\/page.tsx — and positively, every
 *    room-title's lede carries mgmt-lede;
 *  · the ONE rule exists in house.css, token-derived (no invented hex);
 *  · the in-lede <b> spans carry no night-only ink either (they sit inside
 *    the lede lines — a /75 bold phrase would vanish at dawn inside a
 *    fixed lede).
 */

const ROOT = process.cwd();

async function pageFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await pageFiles(p)));
    else if (e.name === "page.tsx") out.push(p);
  }
  return out.sort();
}

const A_DIR = path.join(ROOT, "src", "app", "a");

describe("the console ledes derive their ink per theme", () => {
  it("no text-white/[0-9]+ className remains on a <p> under .mgmt-title — every room lede wears mgmt-lede", async () => {
    const files = await pageFiles(A_DIR);
    expect(files.length).toBeGreaterThanOrEqual(7); // overview, action, bots, connections, sim, status, testing
    let titles = 0;
    for (const file of files) {
      const rel = path.relative(ROOT, file);
      const lines = (await fs.readFile(file, "utf8")).split("\n");
      lines.forEach((line, i) => {
        if (!line.includes("mgmt-title")) return;
        titles += 1;
        /* the lede is the first <p> after the room title — find it before
           the next heading or section */
        const ledeIdx = lines.findIndex(
          (l, j) => j > i && (l.includes("<p") || l.includes("<h") || l.includes("</div>") || l.includes("<section")),
        );
        expect(ledeIdx, `${rel}: no element follows the mgmt-title h1`).toBeGreaterThan(i);
        const lede = lines[ledeIdx];
        expect(lede.includes("<p"), `${rel}: the element under .mgmt-title is not a <p> (${lede.trim()})`).toBe(true);
        expect(lede, `${rel}:${ledeIdx + 1} night-only ink under .mgmt-title`).not.toMatch(/text-white\/\d+/);
        expect(lede, `${rel}:${ledeIdx + 1} the lede does not wear mgmt-lede`).toContain("mgmt-lede");
      });
    }
    expect(titles).toBeGreaterThanOrEqual(7);
  });

  it("the ONE shared rule lives in house.css and derives from the site token (no invented hex)", async () => {
    const css = await fs.readFile(path.join(ROOT, "src", "app", "house.css"), "utf8");
    expect(css).toContain(".mgmt-lede{color:var(--muted)}");
  });

  it("no night-only <b> ink survives inside a lede line", async () => {
    const files = await pageFiles(A_DIR);
    for (const file of files) {
      const rel = path.relative(ROOT, file);
      const src = await fs.readFile(file, "utf8");
      /* a <b className="text-white/…"> is only lawful inside an always-night
         surface (console-card); the lede lines are not those surfaces */
      const ledeLines = src.split("\n").filter((l) => l.includes("mgmt-lede"));
      for (const l of ledeLines) expect(l, `${rel}: night-only bold inside a lede`).not.toMatch(/text-white\/\d+/);
      /* and the lines immediately continuing a lede (the <b> rides the next
         source line in these files) */
      const boldHits = src.match(/<b className="text-white\/\d+">/g) ?? [];
      for (const hit of boldHits) {
        const idx = src.indexOf(hit);
        const region = src.slice(Math.max(0, idx - 300), idx);
        expect(region.includes("console-card"), `${rel}: ${hit} outside an always-night card`).toBe(true);
      }
    }
  });
});
