import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadingStageBody, type ReadingStageBodyProps } from "@/components/reading/ReadingStage";
import { TIERS } from "@/lib/entitlement";
import { STAGE2_MIN_TIER } from "@/lib/stage2-access";

/**
 * TASK-466 (block 968,561) — the Admiral's three notes on the /reading
 * block picture: centered buttons, no dash, one button size everywhere.
 *
 * TASK-471 (block 968,624) reshapes the stage's own states (no more
 * `watching`/`failed` booleans — the two-way room mounts straight off
 * `phase`+`signedIn`+`room`, and JitsiRoom owns its own script-load
 * failure). This file's pins are re-trued against the CURRENT phases;
 * every rule TASK-466 established (one size, no dash, one Playground
 * door, the lock icon, no arrow/emoji) still holds and is re-proven here.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const STAGE = "src/components/reading/ReadingStage.tsx";
const PAGE = "src/app/reading/page.tsx";
const ROOM = "oc-0123456789abcdef";
const DOMAIN = "meet.reading-polish-fixture.invalid";
const FLOOR_NAME = TIERS[STAGE2_MIN_TIER].name;
const PLAYGROUND_HREF = "/reading/playground";
const PLAYGROUND_LABEL = "Watch part two";
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

function bodyProps(overrides: Partial<ReadingStageBodyProps>): ReadingStageBodyProps {
  return {
    phase: "closed",
    signedIn: true,
    room: null,
    playgroundOpen: false,
    playgroundLock: { locked: false, floorName: FLOOR_NAME },
    jitsiDomain: DOMAIN,
    nextWords: null,
    countdown: null,
    countdownWhen: null,
    left: false,
    ended: false,
    onRoomEnded: () => {},
    onRejoin: () => {},
    ...overrides,
  };
}

function render(p: ReadingStageBodyProps): string {
  return renderToStaticMarkup(createElement(ReadingStageBody, p));
}

/** every class attribute that carries the exact "kit-btn" token — real
 *  button/link tags only, never the `.kit-btn-row` wrapper (a single,
 *  different token that merely starts with the same letters). */
function kitBtnClassAttrs(html: string): string[] {
  return [...html.matchAll(/class="([^"]*)"/g)].map((m) => m[1]).filter((cls) => cls.split(" ").includes("kit-btn"));
}

const ALL_PHASES: Array<[string, Partial<ReadingStageBodyProps>]> = [
  ["closed", {}],
  ["published, signed in, room arrived", { phase: "published", signedIn: true, room: ROOM }],
  ["published, signed in, room not yet arrived", { phase: "published", signedIn: true, room: null }],
  ["published, signed out", { phase: "published", signedIn: false, room: ROOM }],
  ["ended, published underneath", { phase: "published", ended: true, nextWords: "Wednesday, September 30" }],
  ["ended, closed underneath", { phase: "closed", ended: true, nextWords: "Wednesday, September 30" }],
  ["left", { phase: "published", left: true }],
];

/* TASK-471 (block 968,624): the two phases with no button at all — closed
   carries only the waiting words (nothing to click before Love is live),
   and the room-showing phase where Jitsi's own toolbar is the control. */
const NO_BUTTON_PHASES = ["closed", "published, signed in, room arrived", "published, signed in, room not yet arrived"];

describe("TASK-466 ruling 3 — one button size everywhere on the card", () => {
  it("every kit-btn* tag across every phase carries kit-btn-sm (closed and the room-showing phase alone have none)", () => {
    for (const [name, overrides] of ALL_PHASES) {
      const html = render(bodyProps(overrides));
      const classes = kitBtnClassAttrs(html);
      if (!NO_BUTTON_PHASES.includes(name)) {
        expect(classes.length, `${name}: expected at least one kit-btn`).toBeGreaterThan(0);
      }
      for (const cls of classes) {
        expect(cls.split(" "), `${name}: "${cls}" is missing kit-btn-sm`).toContain("kit-btn-sm");
      }
    }
  });

  it("the Playground banner's own button stays kit-btn-sm too (unchanged, but re-proven under this ruling)", () => {
    const html = render(bodyProps({ playgroundOpen: true }));
    expect(html).toMatch(/<a class="kit-btn kit-btn-main kit-btn-sm" href="\/reading\/playground">\s*Go to the Playground\s*<\/a>/);
  });
});

describe("TASK-466 ruling 2 — no em dash in any rendered phase's text", () => {
  it('no phase renders "—" anywhere', () => {
    for (const [name, overrides] of ALL_PHASES) {
      const html = render(bodyProps(overrides));
      expect(html, `${name} still carries an em dash`).not.toContain("—");
    }
  });

  it('the ended words split: "The reading has ended." then "Thank you for being here." on its own line — never joined by an em dash', () => {
    const html = render(bodyProps({ phase: "published", ended: true, nextWords: "Wednesday, September 30" }));
    expect(html).toContain("The reading has ended.");
    expect(html).toMatch(/The reading has ended\.<\/p><p[^>]*>Thank you for being here\./);
  });
});

describe("TASK-466 ruling 1 — the ended card drops Watch again for one Playground door", () => {
  it("published-underneath ended: no Watch again, exactly one /reading/playground link labelled \"Watch part two\"", () => {
    const html = render(bodyProps({ phase: "published", ended: true, nextWords: "Wednesday, September 30" }));
    expect(html).not.toContain("Watch again");
    expect([...html.matchAll(new RegExp(PLAYGROUND_HREF.replace("/", "\\/"), "g"))]).toHaveLength(1);
    expect(html).toContain(PLAYGROUND_LABEL);
  });

  it("closed-underneath ended: the SAME door", () => {
    const html = render(bodyProps({ phase: "closed", ended: true, nextWords: "Wednesday, September 30" }));
    expect(html).not.toContain("Watch again");
    expect([...html.matchAll(new RegExp(PLAYGROUND_HREF.replace("/", "\\/"), "g"))]).toHaveLength(1);
    expect(html).toContain(PLAYGROUND_LABEL);
  });

  it("never links to /rooms/heart-field from the ended card any more", () => {
    for (const phase of ["published", "closed"] as const) {
      const html = render(bodyProps({ phase, ended: true, nextWords: "Wednesday, September 30" }));
      expect(html).not.toContain("/rooms/heart-field");
    }
  });

  it("locked: the link carries the lock svg (aria-hidden) AND the quiet floor words, in words, never the icon alone", () => {
    const html = render(
      bodyProps({ phase: "published", ended: true, nextWords: "Wednesday, September 30", playgroundLock: { locked: true, floorName: FLOOR_NAME } }),
    );
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*>/);
    expect(html).toContain(`Part two is for ${FLOOR_NAME} members and up.`);
  });

  it("unlocked: neither the lock svg nor the floor words render", () => {
    const html = render(
      bodyProps({ phase: "published", ended: true, nextWords: "Wednesday, September 30", playgroundLock: { locked: false, floorName: FLOOR_NAME } }),
    );
    expect(html).not.toContain("<svg");
    expect(html).not.toContain("members and up.");
  });

  it("no duplicate Playground button: when the banner is ALSO showing (playgroundOpen), the ended card yields to it — exactly one /reading/playground link on the page", () => {
    for (const phase of ["published", "closed"] as const) {
      const html = render(
        bodyProps({ phase, ended: true, nextWords: "Wednesday, September 30", playgroundOpen: true, playgroundLock: { locked: true, floorName: FLOOR_NAME } }),
      );
      expect([...html.matchAll(new RegExp(PLAYGROUND_HREF.replace("/", "\\/"), "g"))]).toHaveLength(1);
      expect(html).not.toContain(PLAYGROUND_LABEL); // the banner's own "Go to the Playground" is the one door
      expect(html).toContain("Go to the Playground");
    }
  });
});

describe("TASK-466/471 — the 'left' state offers an in-page way back, resized only", () => {
  it('left-while-published: "Back to the reading" survives, kit-btn-sm, an in-page button (never a Heart Field link)', () => {
    const html = render(bodyProps({ phase: "published", left: true }));
    expect(html).toMatch(/<button[^>]*class="kit-btn kit-btn-main kit-btn-sm"[^>]*>\s*Back to the reading\s*<\/button>/);
  });
});

describe("TASK-466 — no arrow or emoji on any /reading button label, across every phase and lock state", () => {
  it('no "→" and no emoji renders anywhere', () => {
    for (const [name, overrides] of ALL_PHASES) {
      for (const locked of [true, false]) {
        const html = render(bodyProps({ ...overrides, playgroundLock: { locked, floorName: FLOOR_NAME } }));
        expect(html, `${name} locked=${locked} carries an arrow`).not.toContain("→");
        expect(html, `${name} locked=${locked} carries an emoji`).not.toMatch(EMOJI);
      }
    }
  });
});

describe("TASK-466 — source pins: the page computes the lock the sanctioned way, never a literal tier", () => {
  it("reading/page.tsx derives playgroundLock via tierForSubject + tierSatisfies against STAGE2_MIN_TIER, and hands it to ReadingStage", async () => {
    const src = await read(PAGE);
    expect(src).toContain("tierForSubject(");
    expect(src).toContain("tierSatisfies(");
    expect(src).toContain("STAGE2_MIN_TIER");
    expect(src).toContain("playgroundLock");
    expect(src).toContain('from "@/lib/stage2-access"');
    // never a literal tier letter as the comparison target
    expect(src).not.toMatch(/tierSatisfies\([^)]*["'][ABC]["']/);
  });

  it("ReadingStage.tsx reads the floor name from TIERS[STAGE2_MIN_TIER].name-shaped data only — never a literal package name in the component itself", async () => {
    const src = await read(STAGE);
    expect(src).not.toMatch(/["'](Weekly Intuitive|Observer|Evening Star)["']/);
  });
});

describe("the lock sits inline in the button (review fix, block 968,561)", () => {
  it("kit.css makes .kit-lock-icon inline-block — Tailwind preflight's svg{display:block} otherwise drops it onto its own line", async () => {
    const css = await (await import("fs")).promises.readFile((await import("path")).join(process.cwd(), "src/app/kit.css"), "utf8");
    expect(css).toContain(".kit-lock-icon{display:inline-block;margin-right:6px;vertical-align:-2px}");
  });
});
