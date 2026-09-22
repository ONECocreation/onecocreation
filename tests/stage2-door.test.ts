import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-392 Build 5 — Stage2Door.tsx pins. SOURCE-PIN style
 * (tests/studio-jitsi-door.test.ts:34-48's "read the source" idiom),
 * honestly labeled a SUPPLEMENT (Astra's review, finding 7): these prove
 * the SHAPE of the click-time-re-authorization fix, never a substitute
 * for the behavioral route tests (tests/stage2-route.test.ts), which are
 * what actually prove no stale room is ever joined. Plus a couple of
 * cheap render checks for the two "no DOM at all" states, which cost
 * nothing to add (renderToStaticMarkup never runs effects, so the
 * pre-poll and joined states are reachable without mocking fetch).
 */

const read = (rel: string) => readFileSync(rel, "utf8");
const DOOR = "src/components/rooms/Stage2Door.tsx";

describe("Stage2Door.tsx — source pins", () => {
  it("no btn-gold anywhere — ghost only, joining isn't a purchase", () => {
    expect(read(DOOR)).not.toContain("btn-gold");
  });

  it("the region carries role=\"region\", data-region=\"stage2\", and the stage2 grid-area class", () => {
    const src = read(DOOR);
    expect(src).toContain('role="region"');
    expect(src).toContain('data-region="stage2"');
    expect(src).toContain("cl-area-stage2");
  });

  it("never imports @/lib/site-config or @/lib/matrix-rooms (Decision 3's naming collision must never leak a tier check in here)", () => {
    const src = read(DOOR);
    expect(src).not.toMatch(/@\/lib\/site-config/);
    expect(src).not.toMatch(/@\/lib\/matrix-rooms/);
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
