import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RoomsCardBody, type RoomsCardBodyProps, type DoorConfig, type DoorRowState } from "@/app/a/site/reading/RoomsCard";

/**
 * TASK-475 (block 968,624) — `RoomsCard.tsx`, the ONE host area on
 * `/a/site/reading` (the Admiral's ruling: "one area for love to open
 * each room as needed"). Three identical rows built from ONE component
 * over a config array — never three copies.
 *
 * Same split as `Stage1Card.tsx`'s own tests: `RoomsCardBody` (pure
 * presentation) is rendered through `renderToStaticMarkup` (this repo
 * runs no jsdom) for every honest state; the default export's own wiring
 * — the one-click Open handler's publish-then-fallback-to-prepare chain,
 * the fetch targets, the poll-on-mount — is proven with source pins, the
 * same idiom `Stage1Card.tsx`'s test file already uses for its
 * unrenderable behavior.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");
const CARD = "src/app/a/site/reading/RoomsCard.tsx";

const DOMAIN = "meet.rooms-card-fixture.invalid";
const ROOM = "oc-0123456789abcdef";

const DOORS: DoorConfig[] = [
  { id: "stage1", label: "Free room · 12:12 Housewarming and 1:11 Reading", adminPath: "/api/admin/stage1" },
  { id: "stage2", label: "Book talk · 2:22", adminPath: "/api/admin/stage2" },
  { id: "qa", label: "Q&A · 3:33", adminPath: "/api/admin/qa-door" },
];

function bodyProps(overrides: Partial<RoomsCardBodyProps> = {}): RoomsCardBodyProps {
  return {
    doors: DOORS,
    states: {},
    busy: {},
    errors: {},
    onOpen: () => {},
    onClose: () => {},
    ...overrides,
  };
}

function render(p: RoomsCardBodyProps): string {
  return renderToStaticMarkup(createElement(RoomsCardBody, p));
}

function row(html: string, id: string): string {
  const m = html.match(new RegExp(`<li data-row="${id}"[\\s\\S]*?</li>`));
  expect(m, `the ${id} row is missing`).not.toBeNull();
  return m![0];
}

const controlsIn = (rowHtml: string) => (rowHtml.match(/<button|<a /g) ?? []).length;

describe("three rows, one component, one config array", () => {
  it("renders exactly three rows, one per door id, in order", () => {
    const html = render(bodyProps());
    expect((html.match(/<li data-row=/g) ?? []).length).toBe(3);
    for (const d of DOORS) row(html, d.id);
  });

  it("every row carries the SAME TWO controls, on the same right edge, every state", () => {
    const states: Record<string, DoorRowState | null> = {
      stage1: { phase: "closed", room: null, jitsiDomain: DOMAIN },
      stage2: { phase: "prepared", room: ROOM, jitsiDomain: DOMAIN },
      qa: { phase: "published", room: ROOM, jitsiDomain: DOMAIN },
    };
    const html = render(bodyProps({ states }));
    for (const d of DOORS) {
      expect(controlsIn(row(html, d.id))).toBe(2);
    }
    expect((html.match(/kit-rows-end/g) ?? []).length).toBe(3);
  });

  it("the source builds the rows from a doors.map — never three copies of DoorRow", async () => {
    const src = await read(CARD);
    expect(src).toMatch(/doors\.map\(/);
    expect(src.match(/<DoorRow\s/g)?.length).toBe(1);
  });
});

describe("ONE state line per row, every phase (the /a uniformity law — Number One's Chrome walk, block 968,624)", () => {
  const CASES: Array<[DoorRowState["phase"], string | null]> = [
    ["closed", null],
    ["prepared", ROOM],
    ["published", ROOM],
  ];

  for (const [phase, room] of CASES) {
    it(`${phase}: exactly one <em>, and the row's own <span> holds nothing but the title and that one <em>`, () => {
      const html = render(bodyProps({ states: { stage1: { phase, room, jitsiDomain: DOMAIN } } }));
      const r = row(html, "stage1");
      expect(r.match(/<em/g)?.length).toBe(1);
      /* the row's first <span> (the words column) — <b>title</b> then
         exactly one <em>...</em>, nothing else in between or after */
      const words = r.match(/<span>([\s\S]*?)<\/span>/)![1];
      expect(words).toMatch(/^<b>[\s\S]*<\/b><em[\s\S]*<\/em>$/);
    });
  }
});

describe("closed", () => {
  const html = render(bodyProps({ states: { stage1: { phase: "closed", room: null, jitsiDomain: DOMAIN } } }));
  const r = row(html, "stage1");

  it("the one lifecycle control is Open (kit-btn-main), the state said once, in ONE <em>", () => {
    expect(r).toContain('data-state="closed"');
    expect(r.match(/data-state=/g)?.length).toBe(1);
    expect(r.match(/<em/g)?.length).toBe(1);
    expect(r).toContain(">Open<");
    expect(r).toContain("kit-btn kit-btn-main kit-btn-sm");
  });

  it("Join on camera is DISABLED until a room exists — no href, aria-disabled, honest words", () => {
    expect(r).toContain('aria-disabled="true"');
    expect(r).not.toContain(ROOM);
    expect(r).toContain("Join on camera");
  });

  it("never a legacy arrow on the button label (the no-arrow-buttons law)", () => {
    expect(r).not.toContain("→");
  });
});

describe("prepared", () => {
  const html = render(bodyProps({ states: { stage2: { phase: "prepared", room: ROOM, jitsiDomain: DOMAIN } } }));
  const r = row(html, "stage2");

  it("the lifecycle control is now Close, the state line says the room is open and waiting on the host", () => {
    expect(r).toContain('data-state="prepared"');
    expect(r).toContain(">Close<");
    expect(r).toContain("Open. Press Join on camera to start.");
  });

  it("Join on camera is enabled, the whitelisted Jitsi hash, a new tab", () => {
    expect(r).toContain(`href="https://${DOMAIN}/${ROOM}#config.p2p.enabled=false&amp;config.showChatPermissionsModeratorSetting=true"`);
    expect(r).toContain('target="_blank"');
    expect(r).toContain('rel="noreferrer"');
  });

  it("the close instructions ride INSIDE the one state line, not a second one (the /a uniformity law, Number One's Chrome walk)", () => {
    expect(r).toContain("Open. Press Join on camera to start. When you finish, press Close, then End meeting for all in the call.");
    expect(r.match(/<em/g)?.length).toBe(1);
  });
});

describe("published", () => {
  const html = render(bodyProps({ states: { qa: { phase: "published", room: ROOM, jitsiDomain: DOMAIN } } }));
  const r = row(html, "qa");

  it("ONE quiet state line names being open, what a visitor sees, and how to end it — the control is Close", () => {
    expect(r).toContain('data-state="published"');
    expect(r).toContain(">Close<");
    expect(r).toContain("Open. Viewers can come in. When you finish, press Close, then End meeting for all in the call.");
    expect(r.match(/<em/g)?.length).toBe(1);
  });
});

describe("pending and error REPLACE the row's state — never a second state, never a stuck control", () => {
  it("busy 'open' replaces the state line: 'Opening…'", () => {
    const html = render(bodyProps({ states: { stage1: { phase: "closed", room: null, jitsiDomain: DOMAIN } }, busy: { stage1: "open" } }));
    const r = row(html, "stage1");
    expect(r).toContain("Opening…");
    expect(r).not.toContain("data-state=");
  });

  it("busy 'close' replaces the state line: 'Closing…'", () => {
    const html = render(bodyProps({ states: { qa: { phase: "published", room: ROOM, jitsiDomain: DOMAIN } }, busy: { qa: "close" } }));
    const r = row(html, "qa");
    expect(r).toContain("Closing…");
  });

  it("an error replaces the state line with honest, announced words (role=alert)", () => {
    const html = render(bodyProps({ states: { stage1: { phase: "closed", room: null, jitsiDomain: DOMAIN } }, errors: { stage1: "prepare first — the room refused" } }));
    const r = row(html, "stage1");
    expect(r).toContain('role="alert"');
    expect(r).toContain("prepare first — the room refused");
    expect(r).not.toContain("data-state=");
  });
});

describe("kit classes only — no legacy .btn, no em dash, no arrow in any label", () => {
  it("every state renders kit-btn, never legacy .btn", () => {
    for (const phase of ["closed", "prepared", "published"] as const) {
      const html = render(bodyProps({ states: { stage1: { phase, room: phase === "closed" ? null : ROOM, jitsiDomain: DOMAIN } } }));
      expect(html).toContain("kit-btn");
      expect(html).not.toMatch(/class="btn/);
    }
  });

  it("the source writes no legacy .btn class and imports the kit Card", async () => {
    const src = await read(CARD);
    expect(src).not.toMatch(/className="btn/);
    expect(src).toContain('from "@/components/kit/Card"');
  });

  it("no em dash anywhere in the row words this lane wrote", async () => {
    const src = await read(CARD);
    const wordsOnly = src.match(/"[^"]*"/g)?.join(" ") ?? "";
    expect(wordsOnly).not.toContain("—");
  });
});

describe("the default export's own wiring — source pins (no jsdom)", () => {
  it("one poll per door on mount, GET each door.adminPath, no-store", async () => {
    const src = await read(CARD);
    expect(src).toContain('fetch(door.adminPath, { cache: "no-store" })');
    expect(src).toMatch(/for \(const door of doors\)/);
  });

  it("open() tries publish FIRST — the closed->publish convenience path Stage 2/Q&A take, one PUT is enough for them", async () => {
    const src = await read(CARD);
    expect(src).toContain('putAction(door.adminPath, "publish")');
  });

  it("on a refused publish (Stage 1's 409, its own law), open() falls back to prepare THEN publish, in the same click", async () => {
    const src = await read(CARD);
    expect(src).toMatch(/putAction\(door\.adminPath, "prepare"\)/);
    /* both a first publish attempt AND a second (post-prepare) publish call */
    expect(src.match(/putAction\(door\.adminPath, "publish"\)/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("no door id is ever special-cased in the open/close handlers — door-agnostic, config-driven", async () => {
    const src = await read(CARD);
    expect(src).not.toMatch(/door\.id === "stage1"/);
    expect(src).not.toMatch(/door\.id === "stage2"/);
    expect(src).not.toMatch(/door\.id === "qa"/);
  });

  it("PUT bodies are always no-store, JSON action", async () => {
    const src = await read(CARD);
    expect(src).toContain('method: "PUT"');
    expect(src).toContain("JSON.stringify({ action })");
    expect(src).toContain('cache: "no-store"');
  });
});

describe("kit.css — the Open/Close width fix and the stray top divider fix (Number One's Chrome walk, block 968,624)", () => {
  const KIT_CSS = "src/app/kit.css";

  it("the Open/Close button (never Join on camera) gets a shared min-width, scoped to .kit-rooms-card", async () => {
    const css = await read(KIT_CSS);
    expect(css).toContain(".kit-rooms-card .kit-rows-end>button.kit-btn{min-width:100px");
  });

  it(".kit-rooms-card's own .kit-rows loses the shared top border — every other .kit-rows keeps it", async () => {
    const css = await read(KIT_CSS);
    expect(css).toContain(".kit-rooms-card .kit-rows{border-top:none}");
    /* the base rule (shared by Stage1Card, Stage2Details) is untouched */
    expect(css).toContain(".kit-rows{list-style:none;margin:0;padding:0;text-align:left;border-top:1px solid var(--glass-edge)}");
  });
});
