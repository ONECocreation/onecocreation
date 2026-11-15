import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

/**
 * Block 975,990 (Lumen's operator-rooms brief, pin 1): the /a phone walk
 * (scripts/admin-walk.cjs) needs a browser and a production build, so it
 * runs on Number One's word, like console-matrix.sh. This file keeps its
 * JUDGE honest inside the normal gate: each of the five failures the walk
 * exists for is fired once, and a clean room passes.
 */
const require = createRequire(import.meta.url);
const { judge, parsePorts } = require("../scripts/admin-walk.cjs") as {
  judge: (room: { name?: string }, phone: Probe, desk?: Probe | null) => string[];
  parsePorts: (s: string) => { app: number; kv: number; all: number[] } | null;
};

interface Probe {
  url: string;
  vw: number;
  docW: number;
  h1: string;
  gate: boolean;
  fields: { bright: number };
  controls: { under44: number };
  text: { under12: number; smallest: number | null };
  sideways: { docOver: boolean; scrollers: number; offEdge: number };
}

const clean = (over: Partial<Probe> = {}): Probe => ({
  url: "/a/site/menu",
  vw: 390,
  docW: 390,
  h1: "Menu",
  gate: false,
  fields: { bright: 0 },
  controls: { under44: 0 },
  text: { under12: 0, smallest: null },
  sideways: { docOver: false, scrollers: 0, offEdge: 0 },
  ...over,
});

describe("the /a phone walk's judge (block 975,990)", () => {
  const room = { name: "Menu" };

  it("a clean room passes", () => {
    expect(judge(room, clean(), clean({ vw: 1440, docW: 1440 }))).toEqual([]);
  });

  it("fails a light-ground field in the night theme", () => {
    expect(judge(room, clean({ fields: { bright: 1 } })).join()).toMatch(/fields: 1 light-ground/);
  });

  it("fails a control under 44 px at 390", () => {
    expect(judge(room, clean({ controls: { under44: 3 } })).join()).toMatch(/controls: 3 under 44px/);
  });

  it("fails text under 12 px, at 390 and at 1440", () => {
    expect(judge(room, clean({ text: { under12: 2, smallest: 10.24 } })).join()).toMatch(/under 12px at 390/);
    expect(judge(room, clean(), clean({ text: { under12: 1, smallest: 11 } })).join()).toMatch(/under 12px at 1440/);
  });

  it("fails sideways scroll: the page, a part that scrolls, a part off the edge", () => {
    expect(judge(room, clean({ docW: 600, sideways: { docOver: true, scrollers: 0, offEdge: 0 } })).join()).toMatch(/600px on a 390px phone/);
    expect(judge(room, clean({ sideways: { docOver: false, scrollers: 1, offEdge: 0 } })).join()).toMatch(/scroll sideways/);
    expect(judge(room, clean({ sideways: { docOver: false, scrollers: 0, offEdge: 2 } })).join()).toMatch(/run off the right edge/);
  });

  it("fails a room that does not say its own name, and a gate in place of the room", () => {
    expect(judge(room, clean({ h1: "Site" })).join()).toMatch(/says "Site", not "Menu"/);
    expect(judge(room, clean({ gate: true })).join()).toMatch(/operator gate/);
  });

  it("takes ports only as four in a row", () => {
    expect(parsePorts("4391-4394")).toEqual({ app: 4391, kv: 4392, all: [4391, 4392, 4393, 4394] });
    expect(parsePorts("4391-4395")).toBeNull();
    expect(parsePorts("")).toBeNull();
  });

  it("walks every room in the operator's own menu", () => {
    const rooms = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scripts/admin-walk.rooms.json"), "utf8")).rooms as { route: string }[];
    const routes = rooms.map((r) => r.route);
    for (const r of [
      "/a", "/a/booking", "/a/studio", "/a/site/reading", "/a/site/replays", "/a/letters/questions", "/a/letters",
      "/a/people", "/a/money", "/a/store", "/a/site", "/a/site/menu", "/a/site/about-videos", "/a/site/chat",
      "/a/site/community-door",
    ]) {
      expect(routes, `${r} is not walked`).toContain(r);
    }
  });
});
