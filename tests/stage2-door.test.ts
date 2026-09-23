import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { signInDoorHref } from "@/lib/room-access";
import { READING_ROOM_SLUG } from "@/lib/reading-room";
import type { Stage2DoorBodyProps } from "@/components/rooms/Stage2Door";

/**
 * TASK-392 Build 5 / TASK-439 (block 968,218, Amendment 1 of 968,222) —
 * Stage2Door.tsx pins, re-trued for the paid door. SOURCE-PIN style
 * (tests/studio-jitsi-door.test.ts:34-48's "read the source" idiom),
 * honestly labeled a SUPPLEMENT (Astra's review, finding 7): the
 * behavioural proof that no room reaches a free member lives in
 * tests/stage2-route.test.ts and tests/stage2-paid-door.test.ts. What
 * lives here: the pure `Stage2DoorBody` rendered through
 * `renderToStaticMarkup` for every decision (the repo has no jsdom —
 * build critic §2), the kit-button law (no legacy `.btn`, no gold, no
 * `style={{`), and the import fence (the tier check lives in the ROUTE,
 * never in this file).
 */

const read = (rel: string) => readFileSync(rel, "utf8");
const DOOR = "src/components/rooms/Stage2Door.tsx";

async function renderBody(props: Partial<Stage2DoorBodyProps>) {
  const { Stage2DoorBody } = await import("@/components/rooms/Stage2Door");
  return renderToStaticMarkup(
    h(Stage2DoorBody, {
      decision: "hidden",
      reachable: null,
      pkg: null,
      joining: false,
      weekBusy: false,
      note: null,
      onJoinClick: () => {},
      onTryWeek: () => {},
      ...props,
    }),
  );
}

const PKG = { name: "Weekly Intuitive", href: "/packages/weekly-intuitive" };
const WEEK = { itemId: "weekly-one-week", price: "$11" };

describe("Stage2Door.tsx — source pins", () => {
  it("no gold anywhere — the package page carries the money; joining isn't a purchase", () => {
    expect(read(DOOR)).not.toContain("btn-gold");
  });

  it("no legacy .btn class and no style={{ anywhere in the file — the kit only, as /reading does", () => {
    const src = read(DOOR);
    expect(src).not.toMatch(/className="btn/);
    expect(src).not.toContain("btn-ghost");
    expect(src).not.toContain("style={{");
  });

  it("the region carries role=\"region\", data-region=\"stage2\", and the stage2 grid-area class", () => {
    const src = read(DOOR);
    expect(src).toContain('role="region"');
    expect(src).toContain('data-region="stage2"');
    expect(src).toContain("cl-area-stage2");
  });

  it("never imports @/lib/site-config, @/lib/matrix-rooms, @/lib/entitlement or @/lib/member-tier — the tier check lives in the route", () => {
    const src = read(DOOR);
    expect(src).not.toMatch(/@\/lib\/site-config/);
    expect(src).not.toMatch(/@\/lib\/matrix-rooms/);
    expect(src).not.toMatch(/@\/lib\/entitlement/);
    expect(src).not.toMatch(/@\/lib\/member-tier/);
  });

  it("carries no onLeave prop — the component is null while joined, a prop it could never render", () => {
    expect(read(DOOR)).not.toMatch(/onLeave/);
  });

  it("the Join click handler's fetch is a call site SEPARATE from the mount-effect's poll (finding 3's shape)", () => {
    const src = read(DOOR);
    const fetchCalls = [...src.matchAll(/fetch\(\s*["']\/api\/stage2["']/g)];
    expect(fetchCalls.length).toBeGreaterThanOrEqual(2);
  });

  it("the join() function reads the FRESH response's own room, never a value captured from the poll", () => {
    const src = read(DOOR);
    const joinFn = src.match(/async function join\(\)[\s\S]*?\n {2}\}/);
    expect(joinFn, "join() not found").not.toBeNull();
    expect(joinFn![0]).toMatch(/fresh\.room/);
    expect(joinFn![0]).not.toMatch(/state\.room/);
  });

  it("the click applies the FRESH answer to the displayed state at once (a changed decision shows on the click, not 20 s later)", () => {
    const src = read(DOOR);
    const joinFn = src.match(/async function join\(\)[\s\S]*?\n {2}\}/);
    expect(joinFn, "join() not found").not.toBeNull();
    expect(joinFn![0]).toMatch(/setState\(toPolled\(fresh\)\)/);
  });

  it("the week offer repeats AddTierButton's fetch on a kit button — and never imports AddTierButton (it renders legacy gold)", () => {
    const src = read(DOOR);
    expect(src).not.toMatch(/AddTierButton/);
    expect(src).toContain('fetch("/api/cart"');
    expect(src).toContain("oc-cart-changed");
    expect(src).toContain('window.location.assign("/cart")');
  });
});

describe("JitsiRoom.tsx — read-only source pin (ruling 3): chat on, cameras and mics the member's own choice", () => {
  it("configOverwrite never touches audio/video defaults or the toolbar", () => {
    const src = read("src/components/booking/JitsiRoom.tsx");
    const block = src.match(/configOverwrite: \{[\s\S]*?\n\s*\},/);
    expect(block, "configOverwrite block not found").not.toBeNull();
    for (const banned of ["startWithAudioMuted", "startWithVideoMuted", "startAudioOnly", "startSilent", "toolbarButtons"]) {
      expect(block![0]).not.toContain(banned);
    }
  });
});

describe("Stage2DoorBody — every decision, rendered pure", () => {
  it("hidden renders nothing", async () => {
    expect(await renderBody({ decision: "hidden" })).toBe("");
  });

  it("signin renders the kit-body line and a 'Sign in' link on the DEFAULT href (today's signInDoorHref for the reading room)", async () => {
    const html = await renderBody({ decision: "signin" });
    expect(html).toContain("kit-body");
    expect(html).toContain("Sign in");
    expect(html).toContain(`href="${signInDoorHref(READING_ROOM_SLUG)}"`);
    expect(html).not.toContain("join free");
  });

  it("signin with a passed signInHref uses IT (T-438 will pass /login?next=%2Freading from /reading)", async () => {
    const html = await renderBody({ decision: "signin", signInHref: "/login?next=%2Freading" });
    expect(html).toContain('href="/login?next=%2Freading"');
    expect(html).not.toContain(encodeURIComponent("/rooms/"));
  });

  it("package renders the packageDoorLine words and the 'See the Weekly Intuitive package' link to its own page", async () => {
    const html = await renderBody({ decision: "package", pkg: { ...PKG, week: null } });
    expect(html).toContain("This stage opens with the Weekly Intuitive package — and everything above it.");
    expect(html).toContain("See the Weekly Intuitive package");
    expect(html).toContain('href="/packages/weekly-intuitive"');
  });

  it("package with the week offer renders a kit button reading 'Try one week — $11' (Amendment A3)", async () => {
    const html = await renderBody({ decision: "package", pkg: { ...PKG, week: WEEK } });
    expect(html).toContain("Try one week — $11");
    const btn = html.match(/<button[^>]*>[^<]*Try one week[^<]*<\/button>/);
    expect(btn, "the Try-one-week button not found").not.toBeNull();
    expect(btn![0]).toContain("kit-btn");
  });

  it("package with week: null has no second button and no mention of a week", async () => {
    const html = await renderBody({ decision: "package", pkg: { ...PKG, week: null } });
    expect(html).not.toContain("one week");
    expect(html).not.toContain("Try one");
  });

  it("open + reachable renders the Join button with its words, on the kit's main button", async () => {
    const html = await renderBody({ decision: "open", reachable: true });
    expect(html).toContain("Join Stage 2 — come up");
    expect(html).toContain("kit-btn kit-btn-main kit-btn-sm");
  });

  it("open + joining disables the button and says so", async () => {
    const html = await renderBody({ decision: "open", reachable: true, joining: true });
    expect(html).toContain("Joining…");
    expect(html).toContain("disabled");
  });

  it("open + unreachable renders today's line, unchanged, and no Join button", async () => {
    const html = await renderBody({ decision: "open", reachable: false });
    expect(html).toContain("Stage 2 isn&#x27;t answering right now.");
    expect(html).not.toContain("Join Stage 2");
  });

  it("a click failure note renders as one kit-text-quiet line", async () => {
    const html = await renderBody({ decision: "open", reachable: true, note: "Stage 2 couldn't be reached just now — try again." });
    expect(html).toContain("kit-text-quiet");
    expect(html).toContain("couldn&#x27;t be reached");
  });

  it("no rendered state contains class=\"btn or btn-ghost, and every action carries kit-btn", async () => {
    const states = await Promise.all([
      renderBody({ decision: "signin" }),
      renderBody({ decision: "package", pkg: { ...PKG, week: null } }),
      renderBody({ decision: "package", pkg: { ...PKG, week: WEEK } }),
      renderBody({ decision: "open", reachable: true }),
      renderBody({ decision: "open", reachable: false }),
    ]);
    for (const html of states) {
      expect(html).not.toContain('class="btn');
      expect(html).not.toContain("btn-ghost");
      const actions = html.match(/<(a|button) [^>]*>/g) ?? [];
      for (const a of actions) expect(a).toContain("kit-btn");
    }
  });
});

describe("Stage2Door — render: the two no-DOM states", () => {
  it("renders nothing while joined, regardless of signedIn", async () => {
    const Stage2Door = (await import("@/components/rooms/Stage2Door")).default;
    const html = renderToStaticMarkup(
      h(Stage2Door, { jitsiDomain: "meet.test.invalid", joined: true, onJoin: () => {}, signedIn: true }),
    );
    expect(html).toBe("");
  });

  it("renders nothing on first paint, before any poll has resolved (renderToStaticMarkup never runs effects)", async () => {
    const Stage2Door = (await import("@/components/rooms/Stage2Door")).default;
    const html = renderToStaticMarkup(
      h(Stage2Door, { jitsiDomain: "meet.test.invalid", joined: false, onJoin: () => {}, signedIn: true }),
    );
    expect(html).toBe("");
  });
});
