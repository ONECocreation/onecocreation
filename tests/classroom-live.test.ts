import { describe, it, expect, beforeAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-146 (0018.06.17 a₿) — THE CLASSROOM VIDEO SLOT BECOMES THE LIVE
 * STAGE. Pins:
 *  · liveRoomName(slug) is pure: `${space}-${slug}`, namespaced by the
 *    site's own space so a shared Jitsi host never collides two artists'
 *    rooms of the same slug.
 *  · RoomVideoSlot mounts the embed ONLY when live AND both jitsiDomain
 *    and liveRoom are supplied — the three unowned layouts (Materials/
 *    People/Stage) that don't thread these through yet keep rendering the
 *    original text-only door (tests/classroom-layouts.test.ts's existing
 *    "Join Live Session" pin stays true), and the dark (not-live) branch
 *    is byte-identical to before this lane touched the file.
 *  · VideoView passes jitsiDomain/liveRoom straight through to the slot
 *    (pass-through only, per this lane's OWNS).
 *  · Source-level pins: /live/page.tsx and the room page both call the
 *    ONE liveRoomName() helper (never invent a second `${space}-${slug}`
 *    join); RoomVideoSlot.tsx never imports "@/lib/live" directly (that
 *    file is server-only — see its own docblock on the Turbopack lesson);
 *    /meet/[bookingId]/page.tsx's JitsiRoom call is untouched, so the
 *    optional `height` prop JitsiRoom grew for this lane defaults to
 *    /meet's original literal and /meet renders byte-identical.
 */

let liveRoomName: (typeof import("@/lib/live"))["liveRoomName"];

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
  ({ liveRoomName } = await import("@/lib/live"));
});

describe("liveRoomName — the ONE Jitsi room-name derivation", () => {
  it("namespaces the slug by the site's own space", () => {
    expect(liveRoomName("lesson-path")).toBe("onecocreation-lesson-path");
    expect(liveRoomName("heart-field")).toBe("onecocreation-heart-field");
  });
});

describe("RoomVideoSlot — the embed mounts only when fully addressable", () => {
  it("dark (not live): unchanged — no embed, no join link", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const html = renderToStaticMarkup(
      createElement(RoomVideoSlot, { live: false, roomTitle: "Heart Field" }),
    );
    expect(html).not.toContain("Join Live Session");
    expect(html).not.toContain("opening the room");
    expect(html).toContain("The stage is dark");
  });

  it("live but no domain/room (today's other three layouts) — falls back to the text-only door", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const html = renderToStaticMarkup(
      createElement(RoomVideoSlot, { live: true, roomTitle: "Heart Field" }),
    );
    expect(html).toContain("Join Live Session");
    expect(html).not.toContain("opening the room");
  });

  it("live with jitsiDomain + liveRoom — mounts the embed AND keeps the fallback link", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const html = renderToStaticMarkup(
      createElement(RoomVideoSlot, {
        live: true,
        roomTitle: "Heart Field",
        jitsiDomain: "meet.onecocreation.com",
        liveRoom: "onecocreation-heart-field",
      }),
    );
    expect(html).toContain("opening the room"); // JitsiRoom's first-paint state
    expect(html).toContain("Join Live Session"); // fallback link stays, per the brief
  });
});

describe("VideoView — pass-through only", () => {
  it("forwards jitsiDomain/liveRoom down to the slot", async () => {
    const VideoView = (await import("@/components/rooms/VideoView")).default;
    const dark = renderToStaticMarkup(
      createElement(VideoView, { slug: "heart-field", alias: "#heart-field:onecocreation.com", title: "Heart Field", live: false }),
    );
    expect(dark).not.toContain("opening the room");

    const lit = renderToStaticMarkup(
      createElement(VideoView, {
        slug: "heart-field",
        alias: "#heart-field:onecocreation.com",
        title: "Heart Field",
        live: true,
        jitsiDomain: "meet.onecocreation.com",
        liveRoom: "onecocreation-heart-field",
      }),
    );
    expect(lit).toContain("opening the room");
  });
});

describe("source-level pins", () => {
  it("/live/page.tsx calls the ONE liveRoomName() helper — never a second derivation", async () => {
    const src = await fs.readFile(path.join(process.cwd(), "src/app/live/page.tsx"), "utf8");
    expect(src).toContain('liveRoomName } from "@/lib/live"');
    expect(src).toMatch(/liveRoomName\(state\.room!\)/);
  });

  it("the room page calls the ONE liveRoomName() helper too", async () => {
    const src = await fs.readFile(path.join(process.cwd(), "src/app/rooms/[slug]/page.tsx"), "utf8");
    expect(src).toContain('import { liveRoomName } from "@/lib/live"');
    expect(src).toMatch(/liveRoomName\(slug\)/);
  });

  it("RoomVideoSlot.tsx never imports live.ts directly (server-only chain)", async () => {
    const src = await fs.readFile(path.join(process.cwd(), "src/components/rooms/RoomVideoSlot.tsx"), "utf8");
    expect(src).not.toMatch(/from ["']@\/lib\/live["']/);
  });

  it("/meet/[bookingId]/page.tsx's JitsiRoom call is untouched — byte pin", async () => {
    const src = await fs.readFile(path.join(process.cwd(), "src/app/meet/[bookingId]/page.tsx"), "utf8");
    expect(src).toContain(
      "<JitsiRoom\n          domain={rail.domain}\n          room={bookingId}\n          displayName={booking.customer.name || undefined}\n        />",
    );
  });
});
