import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Block 976,021 — the links to /classes while the Classes switch is off.
 *
 * One helper, classesDoor(switches) in src/lib/classes.ts: Classes ON gives
 * "/classes", OFF gives null. Every one of the 14 links asks it: it hides on
 * null, or falls back to the free Heart Field (/rooms/heart-field). No words
 * change. With Classes ON every link is as it was.
 *
 * Pages are async server components and most of the links sit in client
 * components, so the house read-the-source pattern pins the wiring, and the
 * pure helpers (classesDoor, applyHomeSwitchesToPuck, applyLiveToPuck, the
 * LiveDoor block render) are pinned behaviourally in both states.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");
const ON = { features: { classes: true } };
const OFF = { features: { classes: false } };

/** Every file that held one of the 14 links. */
const LINK_FILES = [
  "src/components/sections.tsx", // 1
  "src/lib/puck-seeds.ts", // 2 (resolved at render in applyHomeSwitchesToPuck)
  "src/app/replays/page.tsx", // 3
  "src/app/live/page.tsx", // 4
  "src/lib/puck-blocks/live-door.tsx", // 5
  "src/app/rooms/[slug]/page.tsx", // 6
  "src/components/rooms/RoomView.tsx", // 7
  "src/components/booking/JitsiRoom.tsx", // 8
  "src/components/booking/VdoRoom.tsx", // 9
  "src/components/me/MemberQuickCards.tsx", // 10
  "src/components/MemberProfile.tsx", // 11, 12, 13
  "src/components/welcome/WelcomeFlow.tsx", // 14
];

describe("classesDoor — the one source", () => {
  it("ON gives /classes, OFF or unread gives null", async () => {
    const { classesDoor, CLASSES_URL, HEART_FIELD_URL } = await import("@/lib/classes");
    expect(CLASSES_URL).toBe("/classes");
    expect(HEART_FIELD_URL).toBe("/rooms/heart-field");
    expect(classesDoor(ON)).toBe("/classes");
    expect(classesDoor(OFF)).toBeNull();
    expect(classesDoor(null)).toBeNull();
    expect(classesDoor(undefined)).toBeNull();
  });

  it("the Heart Field room exists (the fallback is a real open room)", async () => {
    const { ROOMS } = await import("@/lib/matrix-rooms");
    expect(ROOMS.some((r) => r.id === "#heart-field:onecocreation.com")).toBe(true);
  });
});

describe("no link file draws a fixed /classes address any more", () => {
  for (const rel of LINK_FILES) {
    it(`${rel} asks the switch`, async () => {
      const src = await read(rel);
      expect(src).not.toMatch(/href="\/classes"/);
      expect(src).not.toMatch(/href:\s*"\/classes"/);
      expect(src).not.toMatch(/href=\{CLASSES_URL\}/);
      expect(src).toMatch(/classesDoor|useClassesDoor/);
    });
  }

  it("the client hook reads the switches and calls classesDoor", async () => {
    const src = await read("src/lib/use-classes-door.ts");
    expect(src).toMatch(/fetch\("\/api\/admin\/site"/);
    expect(src).toMatch(/classesDoor\(d\.config\)/);
  });

  it("no public src file outside the known lists links to /classes", async () => {
    const known = new Set([
      "src/components/NavMenu.tsx", // two doors: follows the switch
      "src/components/SiteFooter.tsx", // two doors: follows the switch
      "src/lib/site-config.ts", // a route list
      "src/lib/page-states.ts", // a route list
      "src/lib/puck-popups.ts", // a route list
      "src/lib/puck-config.tsx", // the designer's own picker (admin room)
      "src/components/style/BrandBoard.tsx", // the brand board (admin room)
      "src/lib/puck-seeds.ts", // the seed keeps "/classes"; render resolves it
    ]);
    const hits: string[] = [];
    const walk = async (dir: string) => {
      for (const e of await fs.readdir(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) { await walk(rel); continue; }
        if (!/\.tsx?$/.test(e.name) || known.has(rel)) continue;
        if (rel.startsWith("src/app/a/") || rel.startsWith("src/app/classes/") || rel.startsWith("src/app/api/")) continue;
        const src = await fs.readFile(path.join(ROOT, rel), "utf8");
        if (/href=["{]\s*["'`]?\/classes["'`]/.test(src) || /href:\s*["'`]\/classes["'`]/.test(src)) hits.push(rel);
      }
    };
    await walk("src");
    expect(hits).toEqual([]);
  });
});

describe("#2 — the home seed's Enter your rooms button", () => {
  type B = { type: string; props: Record<string, unknown> };
  const doorOf = (data: { content: B[] }) => {
    const band = data.content.find((b) => b.props.id === "home-classes-community");
    const inner = (band?.props.content ?? []) as B[];
    return inner.find((c) => c.type === "Button" && c.props.label === "Enter your rooms")?.props.href;
  };
  const sw = (classes: boolean) => ({ memberships: true, classes, community: true, store: true, sessions: true, cuts: false });

  it("ON: the same doc comes back, the button is /classes", async () => {
    const { SEEDS, applyHomeSwitchesToPuck } = await import("@/lib/puck-seeds");
    const seed = SEEDS.home as unknown as { content: B[] };
    expect(doorOf(seed)).toBe("/classes");
    const out = applyHomeSwitchesToPuck(seed, sw(true));
    expect(out).toBe(seed);
    expect(doorOf(out)).toBe("/classes");
  });

  it("OFF: the button points at the Heart Field; the stored seed is untouched; the words stay", async () => {
    const { SEEDS, applyHomeSwitchesToPuck } = await import("@/lib/puck-seeds");
    const seed = SEEDS.home as unknown as { content: B[] };
    const out = applyHomeSwitchesToPuck(seed, sw(false));
    expect(doorOf(out)).toBe("/rooms/heart-field");
    expect(doorOf(seed)).toBe("/classes");
    expect(JSON.stringify(out)).not.toMatch(/"href":"\/classes"/);
  });
});

describe("#5 — the LiveDoor block's idle sentence", () => {
  const SENTENCE = "Classes and community gather in the rooms";
  const render = async (injected?: { classesHref: string | null }) => {
    const { createLiveDoor, applyLiveToPuck } = await import("@/lib/puck-blocks/live-door");
    const block = createLiveDoor();
    const doc = { content: [{ type: "LiveDoor", props: { ...block.defaultProps } }] };
    const data = injected ? applyLiveToPuck(doc, { live: null, embed: null, ...injected }) : doc;
    const props = data.content[0].props as Parameters<typeof block.render>[0];
    return renderToStaticMarkup(block.render(props));
  };

  it("ON: the sentence and its /classes link stand", async () => {
    const html = await render({ classesHref: "/classes" });
    expect(html).toContain(SENTENCE);
    expect(html).toContain('href="/classes"');
  });

  it("OFF: the whole sentence hides; the YouTube line stays", async () => {
    const html = await render({ classesHref: null });
    expect(html).not.toContain(SENTENCE);
    expect(html).not.toContain("/classes");
    expect(html).toContain("YouTube");
  });

  it("the designer canvas (no injection) keeps it as today", async () => {
    const html = await render();
    expect(html).toContain(SENTENCE);
    expect(html).toContain('href="/classes"');
  });

  it("/live injects classesDoor on the designer branch", async () => {
    const src = await read("src/app/live/page.tsx");
    expect(src).toMatch(/const classesHref = classesDoor\(await getSiteConfig\(\)\)/);
    expect(src).toMatch(/applyLiveToPuck\(puck as Data, \{ live, embed, classesHref \}\)/);
  });
});

describe("the client links render with no /classes before the switches are read", () => {
  it("#9 the studio end card: The community hides until Classes is read ON", async () => {
    const { VdoRoomEndCard } = await import("@/components/booking/VdoRoom");
    const html = renderToStaticMarkup(createElement(VdoRoomEndCard));
    expect(html).toContain("My calendar");
    expect(html).not.toContain("/classes");
  });
});

describe("the words do not change", () => {
  const WORDS: [string, string][] = [
    ["src/components/sections.tsx", "Enter your rooms"],
    ["src/lib/puck-seeds.ts", 'hm.button("Enter your rooms", "/classes"'],
    ["src/app/replays/page.tsx", "Visit the Community page"],
    ["src/app/live/page.tsx", "shows every door and what opens it."],
    ["src/lib/puck-blocks/live-door.tsx", "shows every door and what opens it."],
    ["src/app/rooms/[slug]/page.tsx", "Classes &amp; Community"],
    ["src/components/rooms/RoomView.tsx", "Back to the rooms"],
    ["src/components/booking/JitsiRoom.tsx", "The community"],
    ["src/components/booking/VdoRoom.tsx", "The community"],
    ["src/components/me/MemberQuickCards.tsx", "Community & Classes"],
    ["src/components/MemberProfile.tsx", "JOIN THE COMMUNITY"],
    ["src/components/MemberProfile.tsx", "SEE THE CLASSES"],
    ["src/components/MemberProfile.tsx", "CERTS 0/${ARTIST_GATE_CERT_COUNT}"],
    ["src/components/welcome/WelcomeFlow.tsx", "Step into The Heart Field"],
  ];
  for (const [rel, w] of WORDS) {
    it(`${rel} still says "${w}"`, async () => {
      expect(await read(rel)).toContain(w);
    });
  }
});

describe("the per-link wiring", () => {
  it("#1 home shelf falls back to the Heart Field", async () => {
    expect(await read("src/components/sections.tsx")).toMatch(/href=\{classesDoor\(switches\) \?\? HEART_FIELD_URL\}>Enter your rooms/);
  });
  it("#3 replays and #6 room heading hide on null", async () => {
    expect(await read("src/app/replays/page.tsx")).toMatch(/\{classesHref && \(\s*<p className="kit-note">/);
    expect(await read("src/app/rooms/[slug]/page.tsx")).toMatch(/\{classesHref && \(\s*<p className="mgmt-eyebrow">/);
  });
  it("#4 /live fallback hides the whole sentence on null", async () => {
    expect(await read("src/app/live/page.tsx")).toMatch(/\{classesHref && \(\s*<p style=\{\{ margin: 0, color: "var\(--muted\)"/);
  });
  it("#7 room chat error: Heart Field fallback, hidden inside Heart Field", async () => {
    const src = await read("src/components/rooms/RoomView.tsx");
    expect(src).toMatch(/classesHref \?\? \(`\/rooms\/\$\{slug\}` === HEART_FIELD_URL \? null : HEART_FIELD_URL\)/);
    expect(src).toMatch(/\{backHref && <p><Link href=\{backHref\}/);
  });
  it("#8 and #9 the after-call buttons hide on null", async () => {
    for (const rel of ["src/components/booking/JitsiRoom.tsx", "src/components/booking/VdoRoom.tsx"]) {
      expect(await read(rel)).toMatch(/\{classesHref && <Link className="btn btn-ghost" href=\{classesHref\}>The community<\/Link>\}/);
    }
  });
  it("#10, #11 and #14 fall back to the Heart Field", async () => {
    expect(await read("src/components/me/MemberQuickCards.tsx")).toMatch(/href=\{classesHref \?\? HEART_FIELD_URL\}>Community & Classes/);
    expect(await read("src/components/MemberProfile.tsx")).toMatch(/href=\{classesHref \?\? HEART_FIELD_URL\}\s*className="self-start/);
    expect(await read("src/components/welcome/WelcomeFlow.tsx")).toMatch(/d\.href === CLASSES_URL \? \(classesHref \?\? HEART_FIELD_URL\) : d\.href/);
  });
  it("#12 the CERTS step has no link while off; #13 SEE THE CLASSES hides", async () => {
    const src = await read("src/components/MemberProfile.tsx");
    expect(src).toMatch(/label: `CERTS 0\/\$\{ARTIST_GATE_CERT_COUNT\}`, done: false, href: classesHref \}/);
    expect(src).toMatch(/\{classesHref && \(\s*<a href=\{classesHref\} className="button mt-4 inline-block text-center">\s*SEE THE CLASSES/);
  });
});
