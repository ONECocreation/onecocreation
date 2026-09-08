import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-149 (0018.06.17 a₿, from Love's meeting) — THE CLASSROOM OPENS ON
 * THE STAGE. Pins:
 *  · the vantage tabs lead with Stage (Stage · Sanctuary · Lesson Path ·
 *    The Circle · Video · Materials · People) and the site default IS
 *    Stage — a first-time visitor (no stored pick) lands on the stage;
 *    a member's stored vantage still wins (localStorage is read first, so
 *    every saved vantage keeps working).
 *  · the Stage layout: the video region on top, the room's chat DIRECTLY
 *    under it (StageChat renders the same RoomView SanctuaryView renders —
 *    never a second chat), who's-here present as the rail.
 *  · who's-here = ONLINE only: soulsOnline() keeps a chip only when the
 *    homeserver's presence says online or last-seen ≤ 5 min; chips wear
 *    display names, a keyed member with no display name wears the handle
 *    (never the raw @key-…:server mxid), and chips key on the mxid (the
 *    T-133 duplicate-key fix).
 */

describe("vantage — Stage first and default", () => {
  it("the site-wide default vantage is the Stage", async () => {
    const { ROOM_VANTAGE_SITE_DEFAULT } = await import("@/components/rooms/vantage");
    expect(ROOM_VANTAGE_SITE_DEFAULT).toBe("stage");
  });

  it("the switcher's tabs lead with Stage, and Stage wears the default's pressed state", async () => {
    const VantageSwitcher = (await import("@/components/rooms/VantageSwitcher")).default;
    const html = renderToStaticMarkup(createElement(VantageSwitcher));
    const order = ["Stage", "Sanctuary", "Lesson Path", "The Circle", "Video", "Materials", "People"];
    const at = order.map((label) => html.indexOf(`>${label}<`));
    for (const [i, label] of order.entries()) {
      expect(at[i], `${label} tab is missing`).toBeGreaterThan(-1);
      if (i > 0) expect(at[i], `${label} is out of order`).toBeGreaterThan(at[i - 1]);
    }
    /* the server snapshot is the site default — Stage arrives pressed */
    expect(html).toMatch(/aria-pressed="true"[^>]*>Stage</);
  });
});

describe("the Stage layout — embed on top, chat directly under, who's-here the rail", () => {
  const PROPS = {
    slug: "heart-field",
    alias: "#heart-field:onecocreation.com",
    title: "Heart Field",
    kind: "community" as const,
    live: false,
  };

  it("renders video, chat, and people regions — chat directly after the video", async () => {
    const StageView = (await import("@/components/rooms/StageView")).default;
    const html = renderToStaticMarkup(createElement(StageView, PROPS));
    for (const region of ["video", "chat", "people", "materials"]) {
      expect(html, `Stage is missing the ${region} region`).toContain(`data-region="${region}"`);
    }
    const video = html.indexOf('data-region="video"');
    const chat = html.indexOf('data-region="chat"');
    const people = html.indexOf('data-region="people"');
    expect(chat, "the chat does not follow the video").toBeGreaterThan(video);
    expect(people, "who's-here does not follow the chat").toBeGreaterThan(chat);
  });

  it("the dark stage keeps the honest dark-stage voice above the chat", async () => {
    const StageView = (await import("@/components/rooms/StageView")).default;
    const html = renderToStaticMarkup(createElement(StageView, PROPS));
    expect(html).toContain("The stage is dark");
  });

  it("the lit stage mounts the T-146 embed (jitsiDomain/liveRoom threaded)", async () => {
    const StageView = (await import("@/components/rooms/StageView")).default;
    const html = renderToStaticMarkup(
      createElement(StageView, {
        ...PROPS,
        live: true,
        jitsiDomain: "meet.onecocreation.com",
        liveRoom: "onecocreation-heart-field",
      }),
    );
    expect(html).toContain("opening the room"); // JitsiRoom's first-paint state
  });
});

describe("StageChat — the room's OWN chat, never a second one", () => {
  it("renders the same RoomView SanctuaryView renders (its first paint is RoomView's own)", async () => {
    const StageChat = (await import("@/components/rooms/StageChat")).default;
    const html = renderToStaticMarkup(
      createElement(StageChat, {
        slug: "heart-field",
        alias: "#heart-field:onecocreation.com",
        title: "Heart Field",
        kind: "community",
      }),
    );
    expect(html).toContain("opening the room…"); // RoomView's loading voice
  });

  it("source pin: StageChat imports RoomView and holds no Matrix fetch of its own", async () => {
    const src = await fs.readFile(path.join(process.cwd(), "src/components/rooms/StageChat.tsx"), "utf8");
    expect(src).toContain('from "./RoomView"');
    expect(src).not.toContain("/_matrix/");
    expect(src).not.toContain("fetch(");
  });

  it("source pin: SanctuaryView still renders the same RoomView", async () => {
    const src = await fs.readFile(path.join(process.cwd(), "src/components/rooms/SanctuaryView.tsx"), "utf8");
    expect(src).toContain('from "./RoomView"');
  });
});

describe("who's here — online only, display names, mxid keys", () => {
  const JOINED = {
    "@ada:onecocreation.com": { display_name: "Ada Lovelace" },
    "@key-e2048abc:onecocreation.com": {}, // keyed member, no display name
    "@gone:onecocreation.com": { display_name: "Long Gone" },
    "@idle:onecocreation.com": { display_name: "Idle Ira" },
    "@ada2:onecocreation.com": { display_name: "Ada Lovelace" }, // same name, another soul
  };

  it("keeps only souls the server reports online or last-seen ≤ 5 minutes", async () => {
    const { soulsOnline } = await import("@/components/rooms/RoomPresence");
    const souls = soulsOnline(JOINED, {
      "@ada:onecocreation.com": { presence: "online" },
      "@key-e2048abc:onecocreation.com": { presence: "offline", last_active_ago: 2 * 60 * 1000 },
      "@gone:onecocreation.com": { presence: "offline", last_active_ago: 40 * 60 * 1000 },
      "@idle:onecocreation.com": { presence: "unavailable", last_active_ago: 5 * 60 * 1000 },
      "@ada2:onecocreation.com": { presence: "online" },
    });
    const names = souls.map((s) => s.name);
    expect(names).not.toContain("Long Gone");
    expect(names.filter((n) => n === "Ada Lovelace")).toHaveLength(2); // both souls, no dedupe by name
    expect(names).toContain("Idle Ira"); // inside the window, idle counts
    expect(souls.map((s) => s.name)).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("a keyed member with no display name wears the handle — never the raw mxid", async () => {
    const { soulsOnline, handleOf } = await import("@/components/rooms/RoomPresence");
    expect(handleOf("@key-e2048abc:onecocreation.com")).toBe("key-e2048abc");
    const souls = soulsOnline(JOINED, {
      "@key-e2048abc:onecocreation.com": { presence: "online" },
    });
    expect(souls).toHaveLength(1);
    expect(souls[0].name).toBe("key-e2048abc");
    expect(souls[0].name).not.toContain("@");
    expect(souls[0].name).not.toContain(":");
  });

  it("chips key on the mxid, not the display name (the T-133 duplicate-key fix)", async () => {
    const { soulsOnline } = await import("@/components/rooms/RoomPresence");
    const souls = soulsOnline(JOINED, {
      "@ada:onecocreation.com": { presence: "online" },
      "@ada2:onecocreation.com": { presence: "online" },
    });
    expect(new Set(souls.map((s) => s.mxid)).size).toBe(2); // distinct keys for same-named souls
  });

  it("the 5-minute window's edge: exactly 5 min is here, one beat past is not", async () => {
    const { isOnline } = await import("@/components/rooms/RoomPresence");
    expect(isOnline({ presence: "offline", last_active_ago: 5 * 60 * 1000 })).toBe(true);
    expect(isOnline({ presence: "offline", last_active_ago: 5 * 60 * 1000 + 1 })).toBe(false);
    expect(isOnline(null)).toBe(false); // the server won't say → no chip, never an invented dot
    expect(isOnline({ presence: "online" })).toBe(true);
  });

  it("an empty truth reads as the dash state, never a zero-count brag", async () => {
    const src = await fs.readFile(path.join(process.cwd(), "src/components/rooms/RoomPresence.tsx"), "utf8");
    expect(src).toContain("— nobody here yet");
  });
});
