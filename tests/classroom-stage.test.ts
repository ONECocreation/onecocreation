import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-149 (0018.06.17 a₿, from Love's meeting) — THE CLASSROOM OPENS ON
 * THE STAGE; TASK-184 (0018.06.18 a₿ · the Admiral's three-rooms ruling) —
 * A CLASSROOM IS THREE ROOMS. Pins:
 *  · the vantage tabs are exactly Stage · Lesson Path · The Circle, in the
 *    ruling's order — the retired four (Sanctuary / Video / Materials /
 *    People) no longer list, and the site default IS Stage.
 *  · the Stage layout — the VIDEO layout's shape won: the video region
 *    leads full-width, the room's chat sits beside who's-here beneath it
 *    (People folded in as the roster), and NO materials region rides the
 *    Stage any more (Materials merged into the Lesson Path).
 *  · who's-here = ONLINE only: soulsOnline() keeps a chip only when the
 *    homeserver's presence says online or last-seen ≤ 5 min; chips wear
 *    display names, a keyed member with no display name wears the handle
 *    (never the raw @key-…:server mxid), and chips key on the mxid (the
 *    T-133 duplicate-key fix).
 */

describe("vantage — three rooms, Stage first and default", () => {
  it("the site-wide default vantage is the Stage", async () => {
    const { ROOM_VANTAGE_SITE_DEFAULT } = await import("@/components/rooms/vantage");
    expect(ROOM_VANTAGE_SITE_DEFAULT).toBe("stage");
  });

  it("the switcher's tabs are exactly Stage · Lesson Path · The Circle, in the ruling's order", async () => {
    const VantageSwitcher = (await import("@/components/rooms/VantageSwitcher")).default;
    const html = renderToStaticMarkup(createElement(VantageSwitcher));
    const order = ["Stage", "Lesson Path", "The Circle"];
    const at = order.map((label) => html.indexOf(`>${label}<`));
    for (const [i, label] of order.entries()) {
      expect(at[i], `${label} tab is missing`).toBeGreaterThan(-1);
      if (i > 0) expect(at[i], `${label} is out of order`).toBeGreaterThan(at[i - 1]);
    }
    /* the retired four no longer list */
    for (const retired of ["Sanctuary", "Video", "Materials", "People"]) {
      expect(html, `${retired} should have retired`).not.toContain(`>${retired}<`);
    }
    /* the server snapshot is the site default — Stage arrives pressed */
    expect(html).toMatch(/aria-pressed="true"[^>]*>Stage</);
  });
});

describe("the Stage layout — the Video layout's shape won", () => {
  const PROPS = {
    slug: "heart-field",
    alias: "#heart-field:onecocreation.com",
    title: "Heart Field",
    kind: "community" as const,
    live: false,
    roster: null,
  };

  it("renders video, chat, and people regions — the embed full-width on top, chat and roster beneath", async () => {
    const StageView = (await import("@/components/rooms/StageView")).default;
    const html = renderToStaticMarkup(createElement(StageView, PROPS));
    for (const region of ["video", "chat", "people"]) {
      expect(html, `Stage is missing the ${region} region`).toContain(`data-region="${region}"`);
    }
    /* Materials merged into the Lesson Path — no materials region here */
    expect(html).not.toContain('data-region="materials"');
    const video = html.indexOf('data-region="video"');
    const chat = html.indexOf('data-region="chat"');
    const people = html.indexOf('data-region="people"');
    expect(chat, "the chat does not follow the video").toBeGreaterThan(video);
    expect(people, "who's-here does not follow the chat").toBeGreaterThan(chat);
  });

  it("the grid declares the Video layout's shape: video full-width, chat beside people beneath", async () => {
    const css = await fs.readFile(path.join(process.cwd(), "src/components/rooms/classroom.css"), "utf8");
    const stage = css.match(/\.cl-grid-stage\s*\{[\s\S]*?\}/);
    expect(stage, "the stage grid is missing").not.toBeNull();
    expect(stage![0]).toContain('"video video"');
    expect(stage![0]).toContain('"chat people"');
    /* the retired layouts' grids are gone with them */
    expect(css).not.toContain(".cl-grid-video");
    expect(css).not.toContain(".cl-grid-materials");
    expect(css).not.toContain(".cl-grid-people{");
  });

  it("the retired Sanctuary's pinned welcome folds in atop the stage", async () => {
    const StageView = (await import("@/components/rooms/StageView")).default;
    const html = renderToStaticMarkup(
      createElement(StageView, { ...PROPS, pin: { text: "Welcome, sweet souls", updatedAtMs: 1 } }),
    );
    expect(html).toContain("from Love");
    expect(html).toContain("Welcome, sweet souls");
    /* the pin rides ABOVE the video region */
    expect(html.indexOf("from Love")).toBeLessThan(html.indexOf('data-region="video"'));
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
    /* JitsiRoom's SSR holder (the chat ALSO says "opening the room…" — the
       18px holder is the embed's unambiguous marker) */
    expect(html).toContain("border-radius:18px");
  });
});

describe("StageChat — the room's OWN chat, never a second one", () => {
  it("renders RoomView (its first paint is RoomView's own)", async () => {
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

  it("the Sanctuary retired — its file is gone and nothing imports it", async () => {
    await expect(
      fs.access(path.join(process.cwd(), "src/components/rooms/SanctuaryView.tsx")),
    ).rejects.toThrow();
    const src = await fs.readFile(path.join(process.cwd(), "src/components/rooms/ClassroomView.tsx"), "utf8");
    for (const retired of ["SanctuaryView", "VideoView", "MaterialsView", "PeopleView"]) {
      expect(src, `ClassroomView still imports ${retired}`).not.toContain(retired);
    }
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
