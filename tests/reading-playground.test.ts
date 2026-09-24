import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PlaygroundIslandBody, type PlaygroundIslandBodyProps } from "@/components/reading/playground/PlaygroundIsland";
import Stage2Details from "@/components/reading/Stage2Details";
import { readingViewerName } from "@/lib/session-read";
import { TIERS, type Tier } from "@/lib/entitlement";
import { TIER_PAGES } from "@/lib/tiers-content";

/**
 * TASK-449 (block 968,364; AMENDMENT 1 block 968,366 — every visible
 * "encore" became "the Playground"; only the banner's "Want an encore?"
 * stays) — the PLAYGROUND lane: `/reading/playground` (server shell +
 * client island), the banner that replaces /reading's in-place Stage 2
 * card, the member-menu line, and the ported `readingViewerName`.
 *
 * The island RENDERS the wire's decision and never decides (Stage2Door's
 * pattern is the law): a 20 s no-store poll for display, a FRESH no-store
 * fetch inside the join handler, and a join that rides only
 * `fresh.decision === "open" && fresh.reachable && fresh.room`. The pure
 * `PlaygroundIslandBody` renders through renderToStaticMarkup (the repo
 * runs no jsdom — Stage2DoorBody's own precedent); the wiring is pinned
 * at the source.
 *
 * Ruling words pinned here: banner `Stage 2 · the Playground` /
 * `Want an encore?` / `Go to the Playground` (no arrow); free member's
 * MAIN is the derived tier-B package, "Try one week" is quiet
 * nevermind-weight; the paid button reads `Join Love`; in-call there is
 * NO page button under the call (ruling 4). No literal tier slug or price
 * ever appears in the lane's source.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const PAGE = "src/app/reading/playground/page.tsx";
const ISLAND = "src/components/reading/playground/PlaygroundIsland.tsx";
const STAGE = "src/components/reading/ReadingStage.tsx";
const READING_PAGE = "src/app/reading/page.tsx";
const DOOR = "src/components/door/DoorButton.tsx";
const WEEK_PASS = "src/lib/week-pass.ts";
const KIT_CSS = "src/app/kit.css";

const ROOM = "oc-fedcba9876543210";
const DOMAIN = "meet.reading-playground-fixture.invalid";

const ROWS = createElement("ul", { className: "kit-rows" }, createElement("li", null, "ROWS-MARKER"));

function bodyProps(overrides: Partial<PlaygroundIslandBodyProps>): PlaygroundIslandBodyProps {
  return {
    wire: { decision: null, reachable: null, pkg: null },
    joinedRoom: null,
    left: false,
    nameSnapshot: "Guest",
    joining: false,
    weekBusy: false,
    note: null,
    jitsiDomain: DOMAIN,
    observerHref: "/packages/fixture-tier-b",
    observerName: "Fixture Observer",
    stage2Rows: ROWS,
    onJoinClick: () => {},
    onTryWeek: () => {},
    onCallEnded: () => {},
    ...overrides,
  };
}

function render(p: PlaygroundIslandBodyProps): string {
  return renderToStaticMarkup(createElement(PlaygroundIslandBody, p));
}

const count = (html: string, needle: string) => html.split(needle).length - 1;

const PKG = { name: "Fixture Weekly", href: "/packages/fixture-tier-a", week: { itemId: "fixture-one-week", price: "$0" } };

describe("the route and its derivations (the page source)", () => {
  it("the shell rides the live sources: jitsiDomain from getSiteConfig, the shared week-pass helper, the tier-B package derived from TIER_PAGES", async () => {
    const src = await read(PAGE);
    expect(src).toContain("getSiteConfig()");
    expect(src).toContain("jitsiDomain");
    expect(src).toContain('from "@/lib/week-pass"');
    expect(src).toContain('TIER_PAGES.find((p) => p.tier === "B")');
  });

  it("NEVER a literal tier slug or price anywhere in the lane's source (TIER_PAGES/TIERS/the store item derive them)", async () => {
    for (const rel of [PAGE, ISLAND]) {
      const src = await read(rel);
      expect(src).not.toContain('"observer"');
      expect(src).not.toContain("/packages/observer");
      expect(src).not.toContain("$55");
      expect(src).not.toContain("$11");
    }
  });

  it("AMENDMENT 1: the route is /reading/playground — no /reading/encore anywhere in the lane (it never shipped, no redirect)", async () => {
    for (const rel of [PAGE, ISLAND, STAGE, DOOR, WEEK_PASS]) {
      const src = await read(rel);
      expect(src).not.toContain("/reading/encore");
    }
    const page = await read(PAGE);
    expect(page).toContain("The Playground");
  });

  it("deriveWeekPass lives in src/lib/week-pass.ts (decision D — one home, never two copies) and /reading imports it", async () => {
    const lib = await read(WEEK_PASS);
    expect(lib).toContain("export async function deriveWeekPass");
    const reading = await read(READING_PAGE);
    expect(reading).toContain('from "@/lib/week-pass"');
    expect(reading).not.toContain("function deriveWeekPass");
  });
});

describe("the island renders the wire, never decides (source pins)", () => {
  it("polls /api/stage2 no-store every 20 s, and the join handler does its OWN fresh fetch with the open/reachable/room triple", async () => {
    const src = await read(ISLAND);
    expect(src).toContain("20_000");
    const polls = src.match(/fetch\("\/api\/stage2", \{ cache: "no-store" \}\)/g) ?? [];
    expect(polls.length).toBeGreaterThanOrEqual(2); // the poll AND the click-time re-check
    expect(src).toContain('fresh.decision === "open" && fresh.reachable && fresh.room');
  });

  it("the fetch surface is exactly /api/stage2 and /api/cart (both same-origin — never the Jitsi host)", async () => {
    const src = await read(ISLAND);
    const targets = [...src.matchAll(/fetch\("([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(targets)).toEqual(new Set(["/api/stage2", "/api/cart"]));
  });

  it("a room string is rendered ONLY by the in-call branch — the join rides the fresh answer into joinedRoom, and JitsiRoom mounts that", async () => {
    const src = await read(ISLAND);
    expect(src).toContain("room={joinedRoom}");
    expect(src).not.toContain("room={wire.room");
    expect(src).not.toContain("room={fresh.room");
    expect(count(src, "room={")).toBe(1);
  });
});

describe("the known-by name (readingViewerName, ported verbatim from 179fce8 — decision C)", () => {
  it("email fallback names and raw mailboxes never become viewer names", () => {
    expect(readingViewerName({ space: "email", handle: "private@example.invalid", name: "private" })).toBe("Guest");
    expect(readingViewerName({ space: "email", handle: "private@example.invalid", name: "private@example.invalid" })).toBe("Guest");
  });

  it("known-by names survive; signed-out and empty names fall back to Guest", () => {
    expect(readingViewerName({ space: "email", handle: "private@example.invalid", name: "Firefly" })).toBe("Firefly");
    expect(readingViewerName({ space: "frens", handle: "Firefly", name: "Firefly" })).toBe("Firefly");
    expect(readingViewerName(null)).toBe("Guest");
    expect(readingViewerName({ space: "email", handle: "private@example.invalid", name: "" })).toBe("Guest");
  });

  it("the island snapshots the name at the accepted click (one readSession read, never a live-call restart) and hands it to JitsiRoom as displayName", async () => {
    const src = await read(ISLAND);
    expect(src).toContain("readSession()");
    expect(src).toContain("readingViewerName(session)");
    expect(src).toContain("displayName={nameSnapshot}");
    expect(src.match(/readSession\(\)/g)).toHaveLength(1);
  });
});

describe("the banner replaced the /reading Stage 2 card (the seam)", () => {
  it("ReadingStage carries the banner — ruling-1 words, no arrow — and its own /api/stage2 poll", async () => {
    const src = await read(STAGE);
    expect(src).toContain("Stage 2 · the Playground");
    expect(src).toContain("Want an encore?");
    expect(src).toContain("Go to the Playground");
    expect(src).toContain('href="/reading/playground"');
    expect(src).not.toContain("Go to the Playground →");
    expect(src).toContain('fetch("/api/stage2", { cache: "no-store" })');
  });

  it("…and NONE of the replaced shape survives: no card, no single-embed branch, no Stage2Door/JitsiRoom import, no stage2Details prop", async () => {
    const src = await read(STAGE);
    for (const gone of [
      "showStage2Card",
      "stage2Room",
      "stage2Details",
      "Leave Stage 2",
      "Stage2Door",
      "onJoinStage2",
      "onLeaveStage2",
      'from "@/components/rooms/Stage2Door"',
      'from "@/components/booking/JitsiRoom"',
    ]) {
      expect(src).not.toContain(gone);
    }
  });

  it("the /reading page retired the stage2Details prop (Stage2Details' only consumer is the Playground now)", async () => {
    const src = await read(READING_PAGE);
    expect(src).not.toContain("stage2Details");
    expect(src).not.toContain('from "@/components/reading/Stage2Details"');
  });
});

describe("the member-menu line (ruling 5)", () => {
  it("DoorButton carries the /reading/playground row gated on the open truth, inside the menu-open branch only, after the MEMBER_MENU map", async () => {
    const src = await read(DOOR);
    expect(src).toContain('fetch("/api/stage2", { cache: "no-store" })');
    expect(src).toContain('href="/reading/playground"');
    expect(src).toContain("The Playground · open now");
    expect(src).toContain("playgroundOpen &&");
    const menuAt = src.indexOf('open === "menu" && name');
    const mapAt = src.indexOf("MEMBER_MENU.map");
    const rowAt = src.indexOf('href="/reading/playground"');
    const signOutAt = src.indexOf("Sign out");
    expect(menuAt).toBeGreaterThanOrEqual(0);
    expect(menuAt).toBeLessThan(mapAt);
    expect(mapAt).toBeLessThan(rowAt);
    expect(rowAt).toBeLessThan(signOutAt);
  });

  it("the style hoist: one module-level menuRowStyle shared by the map rows and the Playground row (design-drift numbers never rise)", async () => {
    const src = await read(DOOR);
    expect(src).toContain("const menuRowStyle");
    expect(count(src, "style={menuRowStyle}")).toBeGreaterThanOrEqual(2);
  });
});

describe("the price rows link their names (the derive-every-word law, rendered)", () => {
  const html = renderToStaticMarkup(
    createElement(Stage2Details, { weekPass: { name: "Fixture Week Pass", price: "$0" } }),
  );

  it("every tier name is an <a> to its TIER_PAGES slug, the prices still ride TIERS", () => {
    for (const t of ["A", "B", "C"] as Tier[]) {
      const slug = TIER_PAGES.find((p) => p.tier === t)!.slug;
      expect(html).toContain(`<a href="/packages/${slug}">${TIERS[t].name}</a>`);
      expect(html).toContain(`$${TIERS[t].priceUsd} / month`);
    }
  });

  it("the week row links to the tier-A page when the pass is on the shelf, and is absent when it is not", () => {
    const slugA = TIER_PAGES.find((p) => p.tier === "A")!.slug;
    expect(html).toContain(`<a href="/packages/${slugA}">Fixture Week Pass</a>`);
    expect(html).toContain("$0 once");
    const without = renderToStaticMarkup(createElement(Stage2Details, { weekPass: null }));
    expect(without).not.toContain("once");
  });

  it("the ONE new kit rule inks the links (compose()'s rule) and decision B's ONE phone modifier stands 3:4", async () => {
    const css = await read(KIT_CSS);
    expect(css).toContain(".kit-rows b a{color:inherit;text-decoration:underline;text-underline-offset:3px}");
    expect(css).toContain(".kit-stage-media--playground{aspect-ratio:3/4}");
  });
});

describe("the five states render the wire (ruling words, rendered)", () => {
  it("closed (M19e) — hidden AND pre-poll both read closed, with the rows and the way back to the reading", () => {
    for (const wire of [
      { decision: null, reachable: null, pkg: null },
      { decision: "hidden" as const, reachable: null, pkg: null },
    ]) {
      const html = render(bodyProps({ wire }));
      expect(html).toContain("The Playground is closed right now");
      expect(html).toContain("Go to the reading");
      expect(html).toContain('href="/reading"');
      expect(html).toContain("ROWS-MARKER");
      expect(html).not.toContain(ROOM);
    }
  });

  it("signed out (M19a) — Sign in returns to /reading/playground; the memberships second; the rows up", () => {
    const html = render(bodyProps({ wire: { decision: "signin", reachable: null, pkg: null } }));
    expect(html).toContain("Come up and talk with Love");
    expect(html).toContain('href="/login?next=%2Freading%2Fplayground"');
    expect(html).toContain("Sign in");
    expect(html).toContain('href="/memberships"');
    expect(html).toContain("See the memberships");
    expect(html).toContain("ROWS-MARKER");
    expect(html).not.toContain(ROOM);
  });

  it("free member (M19b, ruling 3) — the derived tier-B package is the ONE main, the memberships second, Try one week quiet nevermind-weight", () => {
    const html = render(bodyProps({ wire: { decision: "package", reachable: null, pkg: PKG } }));
    expect(html).toContain("Heart Field · your free membership");
    expect(html).toContain("The Playground comes with a paid membership");
    expect(count(html, "kit-btn-main")).toBe(1);
    expect(html).toContain('href="/packages/fixture-tier-b"');
    expect(html).toContain("Fixture Observer");
    expect(html).toContain("See the memberships");
    /* Try one week: quiet, riding the wire's own itemId and price, NEVER a main */
    expect(html).toMatch(/kit-btn-quiet[^>]*>\s*Try one week/);
    expect(html).not.toMatch(/kit-btn-main[^>]*>\s*Try one week/);
    expect(html).toContain("ROWS-MARKER");
    expect(html).not.toContain(ROOM);
  });

  it("free member WITHOUT the week offer (pkg.week null — the offer is optional): the quiet option simply doesn't render", () => {
    const html = render(
      bodyProps({ wire: { decision: "package", reachable: null, pkg: { ...PKG, week: null } } }),
    );
    expect(html).not.toContain("Try one week");
    expect(count(html, "kit-btn-main")).toBe(1);
  });

  it("entitled and reachable (M19c, ruling 4) — the stage frame, the Live chip, ONE kit-btn-main reading Join Love, and NO room string before the click", () => {
    const html = render(bodyProps({ wire: { decision: "open", reachable: true, pkg: null } }));
    expect(html).toContain("kit-stage-media");
    expect(html).toContain("kit-stage-chip");
    expect(count(html, "kit-btn-main")).toBe(1);
    expect(html).toContain("Join Love");
    expect(html).not.toContain("Come up");
    expect(html).toContain("Your browser asks for your camera and mic next.");
    expect(html).not.toContain(ROOM); // the room mounts only on the click's fresh answer
  });

  it("open but UNREACHABLE — the honest words, never a room", () => {
    const html = render(bodyProps({ wire: { decision: "open", reachable: false, pkg: null } }));
    expect(html).toContain("isn&#x27;t answering right now");
    expect(html).not.toContain("Join Love");
    expect(html).not.toContain(ROOM);
  });

  it("in the call (M19d, ruling 4) — JitsiRoom under the known-by name in the 3:4-capable frame, and NO page button anywhere under it", () => {
    const html = render(
      bodyProps({ wire: { decision: "open", reachable: true, pkg: null }, joinedRoom: ROOM, nameSnapshot: "Firefly" }),
    );
    expect(html).toContain("kit-stage-media--playground");
    expect(html).toContain("opening the room"); // JitsiRoom's own loading line
    expect(html).not.toContain("kit-btn");
    expect(html).not.toContain("Join Love");
  });

  it("left while still open (decision G — K124's words riding M19c's frame): You left the Playground + the way back in", () => {
    const html = render(
      bodyProps({ wire: { decision: "open", reachable: true, pkg: null }, left: true }),
    );
    expect(html).toContain("You left the Playground");
    expect(html).toContain("Join Love");
    expect(count(html, "kit-btn-main")).toBe(1);
    expect(html).not.toContain(ROOM);
  });

  it("…but left + a poll that says closed reads CLOSED honestly (the left words never outlive the open truth)", () => {
    const html = render(
      bodyProps({ wire: { decision: "hidden", reachable: null, pkg: null }, left: true }),
    );
    expect(html).toContain("The Playground is closed right now");
    expect(html).not.toContain("You left the Playground");
  });

  it("a failed fresh answer's note shows in words (Stage2Door's own shape)", () => {
    const html = render(bodyProps({ wire: { decision: "signin", reachable: null, pkg: null }, note: "could not add — try again" }));
    expect(html).toContain("could not add — try again");
  });
});

describe("JitsiRoom's end signal (the left state's trigger)", () => {
  it("the island wires onEnded into the in-call embed", async () => {
    const src = await read(ISLAND);
    expect(src).toContain("onEnded={onCallEnded}");
    const jitsi = await read("src/components/booking/JitsiRoom.tsx");
    expect(jitsi).toContain("onEnded");
  });
});
