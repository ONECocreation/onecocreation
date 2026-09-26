import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ReadingStageDoorBody,
  CLOSED,
  doorPath,
  type ReadingStageDoorBodyProps,
  type Wire,
} from "@/components/reading/ReadingStageDoor";

/**
 * TASK-473 (block 968,624; course change, same block) — the ONE generic
 * gated-door screen Parts 3 and 4 both mount (`ReadingStageDoor`). Every
 * wire state, both doors' own words, and the "exactly one conference"
 * shape (never both a waiting picture AND a mounted room at once).
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const ROOM = "oc-0123456789abcdef";
const DOMAIN = "meet.reading-stage-door-fixture.invalid";
const NOT_OWNED = createElement("p", { className: "kit-body" }, "NOT-OWNED-FIXTURE");

function bodyProps(overrides: Partial<ReadingStageDoorBodyProps>): ReadingStageDoorBodyProps {
  return {
    wire: CLOSED,
    jitsiDomain: DOMAIN,
    whenWords: null,
    label: "the Book Talk",
    partLabel: null,
    notOwned: NOT_OWNED,
    left: false,
    onEnded: () => {},
    onRejoin: () => {},
    ...overrides,
  };
}

function render(p: ReadingStageDoorBodyProps): string {
  return renderToStaticMarkup(createElement(ReadingStageDoorBody, p));
}

describe("doorPath — the ONE place the two routes are written", () => {
  it("stage2 -> /api/stage2, qa -> /api/qa-door (T-475's own mirror)", () => {
    expect(doorPath("stage2")).toBe("/api/stage2");
    expect(doorPath("qa")).toBe("/api/qa-door");
  });
});

describe("ReadingStageDoorBody — closed (the default, and a 404/failed T-475 read)", () => {
  it("the waiting picture, the part's time, no room, no controls beyond the words", () => {
    const html = render(bodyProps({ whenWords: "2:22 PM MDT" }));
    expect(html).toContain("/images/reading-love-cover.jpg");
    expect(html).toContain("The Book Talk is not live yet.");
    expect(html).toContain("Opens 2:22 PM MDT.");
    expect(html).not.toContain("kit-stage-viewer");
    expect(html).not.toContain(ROOM);
  });

  it("no date (schedule off): no 'Opens …' line at all", () => {
    const html = render(bodyProps({}));
    expect(html).toContain("The Book Talk is not live yet.");
    expect(html).not.toContain("Opens");
  });
});

describe("ReadingStageDoorBody — signed out (door open, no session)", () => {
  it("the page's own sign-in, never a bare join", () => {
    const wire: Wire = { decision: "signin", reachable: null, room: null };
    const html = render(bodyProps({ wire }));
    expect(html).toContain("The Book Talk is live now. Sign in with your email and come straight back here to join it.");
    expect(html).toMatch(/<a class="kit-btn kit-btn-main kit-btn-sm" href="#sign-up">\s*Sign me up\s*<\/a>/);
    expect(html).not.toContain("kit-stage-viewer");
  });
});

describe("ReadingStageDoorBody — not owned (signed in, no entitlement)", () => {
  it("renders the caller's own notOwned node verbatim — never re-derived here", () => {
    const wire: Wire = { decision: "package", reachable: null, room: null };
    const html = render(bodyProps({ wire }));
    expect(html).toContain("NOT-OWNED-FIXTURE");
    expect(html).not.toContain("kit-stage-viewer");
  });
});

describe("ReadingStageDoorBody — live (owned, published, reachable)", () => {
  it("mounts the room in place; the waiting picture is GONE, not just hidden", () => {
    const wire: Wire = { decision: "open", reachable: true, room: ROOM };
    const html = render(bodyProps({ wire }));
    expect(html).toContain("kit-stage-viewer");
    expect(html).not.toContain("/images/reading-love-cover.jpg");
    expect(html).toContain("kit-stage-chip");
  });

  it("exactly one conference surface: never both the waiting picture and the viewer in the same render", () => {
    const wire: Wire = { decision: "open", reachable: true, room: ROOM };
    const html = render(bodyProps({ wire }));
    const hasCover = html.includes("/images/reading-love-cover.jpg");
    const hasViewer = html.includes("kit-stage-viewer");
    expect(hasCover && hasViewer).toBe(false);
    expect(hasCover || hasViewer).toBe(true);
  });

  it("unreachable: honest words, never a guessed room", () => {
    const wire: Wire = { decision: "open", reachable: false, room: null };
    const html = render(bodyProps({ wire }));
    expect(html).toContain("The Book Talk can&#x27;t connect right now.");
    expect(html).not.toContain("kit-stage-viewer");
  });

  it("open but the room hasn't arrived yet (a brief first-paint gap): waits honestly, never guesses", () => {
    const wire: Wire = { decision: "open", reachable: true, room: null };
    const html = render(bodyProps({ wire }));
    expect(html).not.toContain("kit-stage-viewer");
  });
});

describe("ReadingStageDoorBody — fix round (block 968,624, the Admiral's Chrome walk): the chip always names the part", () => {
  it("closed: the chip shows the part label, no 'Live' prefix", () => {
    const html = render(bodyProps({ partLabel: "2:22 PM MDT · The Book Talk" }));
    expect(html).toContain('<span class="kit-stage-chip">2:22 PM MDT · The Book Talk</span>');
  });

  it("open but unreachable — the exact regression the Admiral hit: the chip STILL says which part, not just 'Live'", () => {
    const wire: Wire = { decision: "open", reachable: false, room: null };
    const html = render(bodyProps({ wire, partLabel: "2:22 PM MDT · The Book Talk" }));
    expect(html).toContain('<span class="kit-stage-chip">Live · 2:22 PM MDT · The Book Talk</span>');
    expect(html).toContain("The Book Talk can&#x27;t connect right now.");
  });

  it("live and mounted: the chip rides beside the real viewer, 'Live · ' plus the part label", () => {
    const wire: Wire = { decision: "open", reachable: true, room: ROOM };
    const html = render(bodyProps({ wire, partLabel: "3:33 PM MDT · The Q&A with Love" }));
    expect(html).toContain('<span class="kit-stage-chip">Live · 3:33 PM MDT · The Q&amp;A with Love</span>');
  });

  it("no schedule (partLabel null): 'Live' alone when live, no chip at all when not", () => {
    const wire: Wire = { decision: "open", reachable: true, room: ROOM };
    const live = render(bodyProps({ wire, partLabel: null }));
    expect(live).toContain('<span class="kit-stage-chip">Live</span>');
    const closed = render(bodyProps({ partLabel: null }));
    expect(closed).not.toContain("kit-stage-chip");
  });
});

describe("ReadingStageDoorBody — left, while still published (K122 item 8's own law, generalized)", () => {
  it("'You left {label}.' plus one in-page Back button — never a link, never the room", () => {
    const wire: Wire = { decision: "open", reachable: true, room: ROOM };
    const html = render(bodyProps({ wire, left: true }));
    expect(html).toContain("You left the Book Talk.");
    expect(html).toMatch(/<button[^>]*class="kit-btn kit-btn-main kit-btn-sm"[^>]*>\s*Back to the Book Talk\s*<\/button>/);
    expect(html).not.toContain("kit-stage-viewer");
    expect(html).not.toContain("<a ");
  });
});

describe("ReadingStageDoorBody — the label composes both doors' own words correctly", () => {
  it("the Q&A: sentence casing capitalizes only the first letter, never 'the' itself", () => {
    const wire: Wire = { decision: "hidden", reachable: null, room: null };
    const html = render(bodyProps({ wire, label: "the Q&A" }));
    expect(html).toContain("The Q&amp;A is not live yet.");
  });
});

describe("no em dash anywhere, in any wire state", () => {
  const WIRES: Wire[] = [
    CLOSED,
    { decision: "signin", reachable: null, room: null },
    { decision: "package", reachable: null, room: null },
    { decision: "open", reachable: true, room: ROOM },
    { decision: "open", reachable: false, room: null },
  ];
  for (const [i, wire] of WIRES.entries()) {
    it(`state ${i}`, () => {
      const html = render(bodyProps({ wire, whenWords: "2:22 PM MDT" }));
      expect(html).not.toContain("—");
    });
    it(`state ${i}, left`, () => {
      const html = render(bodyProps({ wire, left: true }));
      expect(html).not.toContain("—");
    });
  }
});

describe("ReadingStageDoor — the wrapper's own wiring (source pins, no jsdom)", () => {
  const FILE = "src/components/reading/ReadingStageDoor.tsx";

  it("polls its own door path every 20 seconds, no-store", async () => {
    const src = await read(FILE);
    expect(src).toContain("20_000");
    expect(src).toContain('fetch(path, { cache: "no-store" })');
  });

  it("a 404 or failed read never updates the wire off CLOSED — honestly closed, never guessed", async () => {
    const src = await read(FILE);
    expect(src).toContain("if (!alive || !d?.ok) return;");
  });

  it("the hangup unmounts the embed in THIS commit (no farewell-card flash) — the TASK-471 review law, generalized", async () => {
    const src = await read(FILE);
    const onEnded = src.slice(src.indexOf("const onEnded = useCallback("), src.indexOf("const onRejoin = useCallback("));
    expect(onEnded).toContain("setLeft(true)");
  });
});
