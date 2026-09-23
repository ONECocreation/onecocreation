import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Stage1CardBody, type Stage1CardBodyProps } from "@/app/a/site/reading/Stage1Card";

/**
 * TASK-438 (block 968,222; HOLD LIFTED block 968,269) — `Stage1Card.tsx`,
 * the /a/site/reading operator card for Stage 1, beside Stage2Card.
 *
 * THE /a LAW (the brief's Build 3), pinned per phase: ONE state per row,
 * said once, under the row's words; ONE control per row, on the same right
 * edge in every state (`.kit-rows`' own grid — the /a uniformity law);
 * pending and error text REPLACES that row's state, never adds to it; no
 * second chip, no duplicate state, no legacy `.btn` — kit classes only.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const CARD = "src/app/a/site/reading/Stage1Card.tsx";

const DOMAIN = "meet.stage1-fixture.invalid";
const ROOM = "oc-0123456789abcdef";

function bodyProps(overrides: Partial<Stage1CardBodyProps>): Stage1CardBodyProps {
  return {
    state: { phase: "closed", room: null, jitsiDomain: DOMAIN },
    busy: null,
    error: null,
    onAct: () => {},
    ...overrides,
  };
}

function render(p: Stage1CardBodyProps): string {
  return renderToStaticMarkup(createElement(Stage1CardBody, p));
}

function row(html: string, name: string): string {
  const m = html.match(new RegExp(`<li data-row="${name}"[\\s\\S]*?</li>`));
  expect(m, `the ${name} row is missing`).not.toBeNull();
  return m![0];
}

const controlsIn = (rowHtml: string) => (rowHtml.match(/<button|<a /g) ?? []).length;

describe("the /a law — every phase: two rows, one state said once under the words, one control on the same right edge", () => {
  const phases: Array<[Stage1CardBodyProps["state"]["phase"], string | null]> = [
    ["closed", null],
    ["prepared", ROOM],
    ["published", ROOM],
  ];

  for (const [phase, room] of phases) {
    it(`${phase}: each row carries exactly ONE control, and the state rides the kit-rows grid's right-edge cell`, () => {
      const html = render(bodyProps({ state: { phase, room, jitsiDomain: DOMAIN } }));
      expect(controlsIn(row(html, "lifecycle"))).toBe(1);
      expect(controlsIn(row(html, "host"))).toBe(1);
      expect(count(html, "kit-rows-end")).toBe(2); // the same right edge in every row
    });
  }
});

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("closed", () => {
  const html = render(bodyProps({}));

  it("the lifecycle row's one control is Prepare (kit-btn-main kit-btn-sm), the state said once", () => {
    const lifecycle = row(html, "lifecycle");
    expect(lifecycle).toContain('data-state="closed"');
    expect(count(lifecycle, "data-state=")).toBe(1);
    expect(lifecycle).toContain("Prepare");
    expect(lifecycle).toContain("kit-btn kit-btn-main kit-btn-sm");
  });

  it("the host row's control is DISABLED until a room exists — no href, aria-disabled, honest words instead", () => {
    const host = row(html, "host");
    expect(host).toContain("aria-disabled=\"true\"");
    expect(host).not.toContain("href=");
    expect(host).not.toContain(ROOM);
  });
});

describe("prepared", () => {
  const html = render(bodyProps({ state: { phase: "prepared", room: ROOM, jitsiDomain: DOMAIN } }));

  it("the lifecycle row's one control is Publish, the state said once", () => {
    const lifecycle = row(html, "lifecycle");
    expect(lifecycle).toContain('data-state="prepared"');
    expect(count(lifecycle, "data-state=")).toBe(1);
    expect(lifecycle).toContain("Publish");
  });

  it("the host row opens a NEW TAB on the configured house domain, with p2p off and the chat-moderation setting exposed (the whitelisted overrides)", () => {
    const host = row(html, "host");
    expect(host).toContain(
      `href="https://${DOMAIN}/${ROOM}#config.p2p.enabled=false&amp;config.showChatPermissionsModeratorSetting=true"`,
    );
    expect(host).toContain('target="_blank"');
    expect(host).toContain('rel="noreferrer"');
    expect(host).toContain("kit-btn kit-btn-second kit-btn-sm");
  });

  it("the host row carries its own state line, said ONCE under its words, verbatim (K122 item 2): 'Room ready: open it, log in as love, lock mic, video, screen share and chat, then Publish'", () => {
    const host = row(html, "host");
    expect(host).toContain(
      "Room ready: open it, log in as love, lock mic, video, screen share and chat, then Publish",
    );
    expect(count(host, "<em")).toBe(1);
  });
});

describe("the host row's state line in the other phases (K122 item 2 — said once under its words, in EVERY phase)", () => {
  it("closed: 'Appears once you Prepare'", () => {
    const host = row(render(bodyProps({})), "host");
    expect(host).toContain("Appears once you Prepare");
    expect(count(host, "<em")).toBe(1);
  });

  it("published: 'Live: this is your room' — it has STOPPED saying 'then Publish'", () => {
    const host = row(render(bodyProps({ state: { phase: "published", room: ROOM, jitsiDomain: DOMAIN } })), "host");
    expect(host).toContain("Live: this is your room");
    expect(host).not.toContain("then Publish");
    expect(count(host, "<em")).toBe(1);
  });
});

describe("published", () => {
  const html = render(bodyProps({ state: { phase: "published", room: ROOM, jitsiDomain: DOMAIN } }));

  it("the lifecycle row's one control is Close, and the closing words are verbatim", () => {
    const lifecycle = row(html, "lifecycle");
    expect(lifecycle).toContain('data-state="published"');
    expect(lifecycle).toContain("Close");
    expect(html).toContain(
      "New joins stop at midnight Mountain. Close removes our viewers on their next poll. End meeting for all ends the call.",
    );
  });
});

describe("pending and error REPLACE the row's state — never a second state, never a stuck control", () => {
  it("busy replaces the state line: 'Publishing…' instead of the prepared state, said once", () => {
    const html = render(bodyProps({ state: { phase: "prepared", room: ROOM, jitsiDomain: DOMAIN }, busy: "publish" }));
    const lifecycle = row(html, "lifecycle");
    expect(lifecycle).toContain("Publishing…");
    expect(lifecycle).not.toContain("data-state=");
    expect(controlsIn(lifecycle)).toBe(1);
  });

  it("an error replaces the state line with honest, announced words (role=alert) — and the row still has its one control", () => {
    const html = render(bodyProps({ state: { phase: "closed", room: null, jitsiDomain: DOMAIN }, error: "Publish refused — Prepare first." }));
    const lifecycle = row(html, "lifecycle");
    expect(lifecycle).toContain('role="alert"');
    expect(lifecycle).toContain("Publish refused — Prepare first.");
    expect(lifecycle).not.toContain("data-state=");
    expect(controlsIn(lifecycle)).toBe(1);
  });
});

describe("kit classes only — no legacy .btn, no Chip, no duplicate state chips", () => {
  it("the render carries kit-btn classes and never a legacy btn class", () => {
    for (const phase of ["closed", "prepared", "published"] as const) {
      const html = render(bodyProps({ state: { phase, room: phase === "closed" ? null : ROOM, jitsiDomain: DOMAIN } }));
      expect(html).toContain("kit-btn");
      expect(html).not.toMatch(/class="btn/);
      expect(html).not.toMatch(/Chip/);
    }
  });

  it("the source imports no console Chip and writes no legacy .btn class", async () => {
    const src = await read(CARD);
    expect(src).not.toMatch(/from "@\/components\/console\/glass"/);
    expect(src).not.toMatch(/className="btn/);
    expect(src).not.toMatch(/ btn btn-/);
  });
});

describe("the default export's own wiring — source pins (self-contained fetch/save, Stage2Card's shape)", () => {
  it("GETs /api/admin/stage1 on mount and PUTs { action } on each control, always no-store", async () => {
    const src = await read(CARD);
    expect(src).toContain('fetch("/api/admin/stage1", { cache: "no-store" })');
    expect(src).toContain('method: "PUT"');
    expect(src).toContain("JSON.stringify({ action })");
  });

  it("a refused Publish (409) becomes the row's error words, never a silent no-op", async () => {
    const src = await read(CARD);
    expect(src).toContain("409");
  });

  it("after a refused or failed PUT the card re-reads GET /api/admin/stage1 (K122 item 4) — the error words stay in the state line while the rows catch up to the real phase", async () => {
    const src = await read(CARD);
    /* the mount read, the refusal path, and the catch path each re-read */
    expect(src.match(/void refresh\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("the Card carries kit-stage1-card — the narrow-width row stacking is scoped to the card's own class (K122 item 1), the shared .kit-rows grid untouched for Stage2Details", async () => {
    const src = await read(CARD);
    expect(src).toContain('className="kit-stage1-card"');
  });
});
