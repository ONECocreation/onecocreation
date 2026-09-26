import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RoomsCardBody, type RoomsCardBodyProps } from "@/app/a/site/reading/RoomsCard";
import type { DoorConfig, DoorRowState } from "@/app/a/site/reading/rooms-config";

/**
 * TASK-475 (block 968,624) — `RoomsCard.tsx`, the ONE host area on
 * `/a/site/reading` (the Admiral's ruling: "one area for love to open
 * each room as needed"). Identical rows built from ONE component over a
 * config array — never one copy per row.
 *
 * RE-TRUED (TASK-481, block 968,624+, the Admiral's ruling: "was there
 * going to be 4 rooms in the /a/site/reading room. i'm seeing 3. we spoke
 * about one line per meeting time"): T-475 shipped THREE rows because
 * Parts 1 and 2 shared Stage 1's one door ("Free room · 12:12
 * Housewarming and 1:11 Reading"). The Housewarming now has its own door
 * (`housewarming-door.ts`) and its own row; the fixture below mirrors
 * `SiteReadingRoom.tsx`'s own real, current `DOORS` config — FOUR rows,
 * one per meeting time. `RoomsCard.tsx` itself needed no change (it was
 * already door-agnostic, config-driven) — only this test file's fixture
 * was re-trued.
 *
 * RE-TRUED AGAIN (TASK-487, block 968,624+, the Admiral's ruling, option
 * C): each row now carries THREE controls — Open/Close, "Join as host"
 * (renamed from "Join on camera"), and the camera toggle ("Show my
 * camera" while hidden, "Pause my camera" while shown — the Admiral's own
 * label, not "Show my picture"). The state line is one of exactly three
 * (closed / open+hidden / open+shown), shorter than the old two-sentence
 * "press Close, then End meeting" words.
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
  { id: "housewarming", label: "Housewarming · 12:12", adminPath: "/api/admin/housewarming-door" },
  { id: "stage1", label: "Reading · 1:11", adminPath: "/api/admin/stage1" },
  { id: "stage2", label: "Book Talk · 2:22", adminPath: "/api/admin/stage2" },
  { id: "qa", label: "Q&A · 3:33", adminPath: "/api/admin/qa-door" },
];

function state(phase: DoorRowState["phase"], room: string | null, camera: DoorRowState["camera"] = "hidden"): DoorRowState {
  return { phase, room, jitsiDomain: DOMAIN, camera };
}

function bodyProps(overrides: Partial<RoomsCardBodyProps> = {}): RoomsCardBodyProps {
  return {
    doors: DOORS,
    states: {},
    busy: {},
    errors: {},
    onOpen: () => {},
    onClose: () => {},
    onShowCamera: () => {},
    onHideCamera: () => {},
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

/* TASK-486 (block 968,624+): a quiet "Room link" rides as the row's own
   THIRD `<li>` child now (RoomsCard.tsx's own docblock) — outside this
   span entirely, so "the same controls" below is scoped to the
   right-edge cluster it always meant, not the whole row. */
function rowsEndOf(rowHtml: string): string {
  const m = rowHtml.match(/<span class="kit-rows-end">[\s\S]*?<\/span>/);
  expect(m, "kit-rows-end is missing").not.toBeNull();
  return m![0];
}

const controlsIn = (rowHtml: string) => (rowsEndOf(rowHtml).match(/<button|<a /g) ?? []).length;

describe("four rows, one component, one config array", () => {
  it("renders exactly four rows, one per door id, in order (TASK-481: the Housewarming's own row, first)", () => {
    const html = render(bodyProps());
    expect((html.match(/<li data-row=/g) ?? []).length).toBe(4);
    for (const d of DOORS) row(html, d.id);
  });

  it("every row carries the SAME THREE controls, on the same right edge, every state (TASK-487)", () => {
    const states: Record<string, DoorRowState | null> = {
      housewarming: state("published", ROOM, "shown"),
      stage1: state("closed", null),
      stage2: state("prepared", ROOM),
      qa: state("published", ROOM, "shown"),
    };
    const html = render(bodyProps({ states }));
    for (const d of DOORS) {
      expect(controlsIn(row(html, d.id))).toBe(3);
    }
    expect((html.match(/kit-rows-end/g) ?? []).length).toBe(4);
  });

  it("the source builds the rows from a doors.map — never three copies of DoorRow", async () => {
    const src = await read(CARD);
    expect(src).toMatch(/doors\.map\(/);
    expect(src.match(/<DoorRow\s/g)?.length).toBe(1);
  });
});

describe("TASK-486 — each row also carries a quiet Room link to its go/[door] page", () => {
  it("every row's Room link points at /a/site/reading/go/<door id>, outside the control cluster", () => {
    const html = render(bodyProps());
    for (const d of DOORS) {
      const r = row(html, d.id);
      expect(r).toContain(`href="/a/site/reading/go/${d.id}"`);
      expect(r).toContain(">Room link<");
      // exactly one anchor/button beyond the three the right-edge cluster owns
      expect((r.match(/<button|<a /g) ?? []).length).toBe(controlsIn(r) + 1);
    }
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
      const html = render(bodyProps({ states: { stage1: state(phase, room) } }));
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
  const html = render(bodyProps({ states: { stage1: state("closed", null) } }));
  const r = row(html, "stage1");

  it("the one lifecycle control is Open (kit-btn-main), the state said once, in ONE <em>: 'Closed.'", () => {
    expect(r).toContain('data-state="closed"');
    expect(r.match(/data-state=/g)?.length).toBe(1);
    expect(r.match(/<em/g)?.length).toBe(1);
    expect(r).toContain(">Open<");
    expect(r).toContain("kit-btn kit-btn-main kit-btn-sm");
    expect(r).toContain("Closed.");
  });

  it("Join as host is DISABLED until a room exists — no href, aria-disabled, honest words", () => {
    expect(r).toContain('aria-disabled="true"');
    expect(r).not.toContain(ROOM);
    expect(r).toContain("Join as host");
    expect(r).not.toContain("Join on camera");
  });

  it("Show my camera is DISABLED while closed too", () => {
    expect(r).toContain(">Show my camera<");
    // the disabled camera button, and the disabled join anchor, both carry
    // an honest disabled marker (a <button disabled> or aria-disabled="true")
    expect(r.match(/disabled(=""|>)| aria-disabled="true"/g)!.length).toBeGreaterThanOrEqual(2);
  });

  it("never a legacy arrow on the button label (the no-arrow-buttons law)", () => {
    expect(r).not.toContain("→");
  });
});

describe("prepared — collapses into the OPEN, HIDDEN bucket (rooms-config.ts's own doorStateWords)", () => {
  const html = render(bodyProps({ states: { stage2: state("prepared", ROOM) } }));
  const r = row(html, "stage2");

  it("the lifecycle control is now Close, the state line is the short 'open, hidden' words", () => {
    expect(r).toContain('data-state="prepared"');
    expect(r).toContain(">Close<");
    expect(r).toContain("Open. Guests see your picture and hear your mic.");
    expect(r).not.toContain("press Close, then End meeting");
  });

  it("Join as host is enabled, the whitelisted Jitsi hash, a new tab", () => {
    expect(r).toContain(`href="https://${DOMAIN}/${ROOM}#config.p2p.enabled=false&amp;config.showChatPermissionsModeratorSetting=true"`);
    expect(r).toContain('target="_blank"');
    expect(r).toContain('rel="noreferrer"');
  });

  it("the camera control is 'Show my camera' (kit-btn-main), enabled", () => {
    expect(r).toContain(">Show my camera<");
    expect(r).toContain("kit-btn kit-btn-main kit-btn-sm");
  });

  it("said in exactly ONE state line, never a second one", () => {
    expect(r.match(/<em/g)?.length).toBe(1);
  });
});

describe("published, camera hidden", () => {
  const html = render(bodyProps({ states: { qa: state("published", ROOM, "hidden") } }));
  const r = row(html, "qa");

  it("the same 'open, hidden' words as prepared, Close, Show my camera", () => {
    expect(r).toContain('data-state="published"');
    expect(r).toContain(">Close<");
    expect(r).toContain(">Show my camera<");
    expect(r).toContain("Open. Guests see your picture and hear your mic.");
    expect(r.match(/<em/g)?.length).toBe(1);
  });
});

describe("published, camera shown (live) — TASK-487", () => {
  const html = render(bodyProps({ states: { qa: state("published", ROOM, "shown") } }));
  const r = row(html, "qa");

  it("ONE quiet state line: 'Live. Guests see your camera.' — the control is Close", () => {
    expect(r).toContain('data-state="published"');
    expect(r).toContain(">Close<");
    expect(r).toContain("Live. Guests see your camera.");
    expect(r.match(/<em/g)?.length).toBe(1);
  });

  it("the camera control reads 'Pause my camera' (kit-btn-second), never 'Show my picture'", () => {
    expect(r).toContain(">Pause my camera<");
    expect(r).not.toContain("Show my picture");
    const clusterAfterPause = rowsEndOf(r).split(">Pause my camera<")[1];
    expect(clusterAfterPause).toBeDefined();
  });
});

describe("pending and error REPLACE the row's state — never a second state, never a stuck control", () => {
  it("busy 'open' replaces the state line: 'Opening…'", () => {
    const html = render(bodyProps({ states: { stage1: state("closed", null) }, busy: { stage1: "open" } }));
    const r = row(html, "stage1");
    expect(r).toContain("Opening…");
    expect(r).not.toContain("data-state=");
  });

  it("busy 'close' replaces the state line: 'Closing…'", () => {
    const html = render(bodyProps({ states: { qa: state("published", ROOM, "shown") }, busy: { qa: "close" } }));
    const r = row(html, "qa");
    expect(r).toContain("Closing…");
  });

  it("busy 'show-camera' replaces the state line: 'Showing your camera…'", () => {
    const html = render(bodyProps({ states: { qa: state("published", ROOM, "hidden") }, busy: { qa: "show-camera" } }));
    const r = row(html, "qa");
    expect(r).toContain("Showing your camera…");
  });

  it("busy 'hide-camera' replaces the state line: 'Pausing your camera…'", () => {
    const html = render(bodyProps({ states: { qa: state("published", ROOM, "shown") }, busy: { qa: "hide-camera" } }));
    const r = row(html, "qa");
    expect(r).toContain("Pausing your camera…");
  });

  it("an error replaces the state line with honest, announced words (role=alert)", () => {
    const html = render(
      bodyProps({ states: { stage1: state("closed", null) }, errors: { stage1: "prepare first — the room refused" } }),
    );
    const r = row(html, "stage1");
    expect(r).toContain('role="alert"');
    expect(r).toContain("prepare first — the room refused");
    expect(r).not.toContain("data-state=");
  });
});

describe("kit classes only — no legacy .btn, no em dash, no arrow in any label", () => {
  it("every state renders kit-btn, never legacy .btn", () => {
    for (const phase of ["closed", "prepared", "published"] as const) {
      const html = render(bodyProps({ states: { stage1: state(phase, phase === "closed" ? null : ROOM) } }));
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

  it("TASK-487: showCameraDoor/hideCameraDoor PUT show-camera/hide-camera, the same putAction chain", async () => {
    const src = await read(CARD);
    expect(src).toContain('putAction(door.adminPath, "show-camera")');
    expect(src).toContain('putAction(door.adminPath, "hide-camera")');
  });

  it("no door id is ever special-cased in the open/close/camera handlers — door-agnostic, config-driven", async () => {
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

  it("TASK-487: all FOUR actions (open/close/show-camera/hide-camera) share ONE runExclusive lock per door", async () => {
    const src = await read(CARD);
    expect(src).toContain("useRef<Record<string, boolean>>({})");
    /* the shared runDoorAction helper wraps runExclusive exactly ONCE now
       — open/close/showCamera/hideCamera all call THROUGH it, never a
       second inline runExclusive call per action (that was the T-486
       shape; T-487 pulled the four actions' identical run-and-report
       shape into one helper). */
    expect(src.match(/runExclusive\(recordLock\(locksRef, door\.id\),/g)?.length).toBe(1);
    expect(src).toMatch(/runDoorAction\(\s*"open",\s*openDoor\s*\)/);
    expect(src).toMatch(/runDoorAction\(\s*"close",\s*closeDoor\s*\)/);
    expect(src).toMatch(/runDoorAction\(\s*"show-camera",\s*showCameraDoor\s*\)/);
    expect(src).toMatch(/runDoorAction\(\s*"hide-camera",\s*hideCameraDoor\s*\)/);
  });
});

describe("kit.css — the layout fix so three controls never squeeze the room title (TASK-487, block 968,624+)", () => {
  const KIT_CSS = "src/app/kit.css";

  it("the Open/Close button (never Join as host) gets a shared min-width, scoped to .kit-rooms-card", async () => {
    const css = await read(KIT_CSS);
    expect(css).toContain(".kit-rooms-card .kit-rows-end>button.kit-btn{min-width:100px");
  });

  it(".kit-rooms-card's own .kit-rows loses the shared top border — every other .kit-rows keeps it", async () => {
    const css = await read(KIT_CSS);
    expect(css).toContain(".kit-rooms-card .kit-rows{border-top:none}");
    /* the base rule (shared by Stage1Card, Stage2Details) is untouched */
    expect(css).toContain(".kit-rows{list-style:none;margin:0;padding:0;text-align:left;border-top:1px solid var(--glass-edge)}");
  });

  it("the controls-on-their-own-line rule is UNCONDITIONAL now (not scoped to a narrow @media any more)", async () => {
    const css = await read(KIT_CSS);
    const start = css.indexOf(".kit-rooms-card .kit-rows-end{display:flex");
    const end = css.indexOf(".kit-rooms-card .kit-row-link{");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    // the whole span between the flex rule and the Room-link rule (which
    // covers the min-width rule AND the new unconditional stacking rules)
    // never opens an @media block — the old `@media (max-width:768px){...}`
    // wrapper this lane retired is gone from here entirely.
    const between = css.slice(start, end);
    expect(between).not.toContain("@media");
    expect(between).toContain(".kit-rooms-card .kit-rows>li{grid-template-columns:1fr;gap:8px}");
    expect(between).toContain(".kit-rooms-card .kit-rows-end{justify-self:end}");
  });
});
