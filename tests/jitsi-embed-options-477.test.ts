import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { jitsiEmbedOptions, GUEST_TOOLBAR_BUTTONS } from "@/components/booking/JitsiRoom";
import ReadingStage from "@/components/reading/ReadingStage";
import ReadingStageDoor from "@/components/reading/ReadingStageDoor";

/**
 * TASK-477 (block 968,624+, the Admiral's ruling): the /reading embed is
 * always the GUEST view (Love hosts every room from the direct
 * meet.onecocreation.com link, never from this embed). Four rulings, all
 * from `JitsiRoom.tsx`'s own `configOverwrite`:
 *
 *   1. Stage view (dominant speaker large) by default, tileview offered,
 *      never forced.
 *   2. Screen share ('desktop') is host-only — dropped from the guest
 *      toolbar.
 *   3. The moderator menu (remoteVideoMenu) and participants-pane stay
 *      reachable, so a hand-granted moderator can mute people / watch chat.
 *   4. No startVideoMuted / channelLastN: 1 / filmstrip: false — that was
 *      the retired one-way JitsiViewer's shape, never this embed's.
 *
 * `jitsiEmbedOptions()` is the pure options builder pulled out of the
 * component's boot() effect specifically so this suite can pin the
 * returned object directly, no script tag, no DOM.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const ROOM = "oc-0123456789abcdef";
const MARK_URL = "https://onecocreation.invalid/mark.svg";
const ORIGIN = "https://onecocreation.invalid";

function options(guestView?: boolean) {
  return jitsiEmbedOptions({
    room: ROOM,
    parentNode: null,
    displayName: "A Guest",
    markUrl: MARK_URL,
    origin: ORIGIN,
    guestView,
  });
}

describe("jitsiEmbedOptions — guest view (ruling 2: screen share is host-only)", () => {
  it("drops 'desktop' from the toolbar", () => {
    const opts = options(true) as { configOverwrite: { toolbarButtons?: readonly string[] } };
    expect(opts.configOverwrite.toolbarButtons).toBeDefined();
    expect(opts.configOverwrite.toolbarButtons).not.toContain("desktop");
  });

  it("keeps 'tileview' available (ruling 1: never force tile view, just offer it)", () => {
    const opts = options(true) as { configOverwrite: { toolbarButtons?: readonly string[] } };
    expect(opts.configOverwrite.toolbarButtons).toContain("tileview");
  });

  it("keeps 'participants-pane' (ruling 3: a hand-granted moderator still needs it)", () => {
    const opts = options(true) as { configOverwrite: { toolbarButtons?: readonly string[] } };
    expect(opts.configOverwrite.toolbarButtons).toContain("participants-pane");
  });

  it("the exported guest list is the house list (server live-config.js) minus exactly 'desktop'", () => {
    const HOUSE_LIST = [
      "camera", "chat", "desktop", "fullscreen", "hangup", "microphone",
      "participants-pane", "raisehand", "settings", "tileview",
      "toggle-camera", "videoquality", "select-background",
    ];
    expect([...GUEST_TOOLBAR_BUTTONS].sort()).toEqual(
      HOUSE_LIST.filter((b) => b !== "desktop").sort(),
    );
  });

  it("never sets startVideoMuted, channelLastN, or filmstrip (ruling 4 — the retired JitsiViewer's shape)", () => {
    const opts = options(true) as { configOverwrite: Record<string, unknown> };
    expect(opts.configOverwrite.startVideoMuted).toBeUndefined();
    expect(opts.configOverwrite.channelLastN).toBeUndefined();
    expect(opts.configOverwrite.filmstrip).toBeUndefined();
    expect(opts.configOverwrite).not.toHaveProperty("remoteVideoMenu");
  });

  it("keeps prejoin on and the branding keys", () => {
    const opts = options(true) as {
      configOverwrite: { prejoinConfig?: { enabled: boolean }; disableDeepLinking?: boolean; defaultLogoUrl?: string };
      interfaceConfigOverwrite: Record<string, unknown>;
    };
    expect(opts.configOverwrite.prejoinConfig).toEqual({ enabled: true });
    expect(opts.configOverwrite.disableDeepLinking).toBe(true);
    expect(opts.configOverwrite.defaultLogoUrl).toBe(MARK_URL);
    expect(opts.interfaceConfigOverwrite.DEFAULT_LOGO_URL).toBe(MARK_URL);
    expect(opts.interfaceConfigOverwrite.APP_NAME).toBe("One Cocreation");
    expect(opts.interfaceConfigOverwrite.SHOW_JITSI_WATERMARK).toBe(false);
  });
});

describe("jitsiEmbedOptions — every other caller (guestView unset) is byte-identical to before this lane", () => {
  it("configOverwrite carries no toolbarButtons key at all", () => {
    const opts = options(undefined) as { configOverwrite: Record<string, unknown> };
    expect(opts.configOverwrite).not.toHaveProperty("toolbarButtons");
  });

  it("the rest of the shape (roomName, width/height, prejoin, branding) is unchanged", () => {
    const opts = options(undefined) as Record<string, unknown> & {
      configOverwrite: Record<string, unknown>;
      interfaceConfigOverwrite: Record<string, unknown>;
    };
    expect(opts.roomName).toBe(ROOM);
    expect(opts.width).toBe("100%");
    expect(opts.height).toBe("100%");
    expect(opts.configOverwrite.prejoinConfig).toEqual({ enabled: true });
    expect(opts.configOverwrite.defaultLogoUrl).toBe(MARK_URL);
    expect(opts.interfaceConfigOverwrite.DEFAULT_LOGO_URL).toBe(MARK_URL);
  });
});

describe("TASK-477 — the /reading guest mounts actually pass guestView", () => {
  const STAGE = "src/components/reading/ReadingStage.tsx";
  const DOOR = "src/components/reading/ReadingStageDoor.tsx";

  it("ReadingStage.tsx's JitsiRoom mount carries guestView", async () => {
    const src = await read(STAGE);
    const line = src.split("\n").find((l) => l.includes("<JitsiRoom"));
    expect(line).toBeDefined();
    expect(line).toMatch(/guestView/);
  });

  it("ReadingStageDoor.tsx's JitsiRoom mount carries guestView", async () => {
    const src = await read(DOOR);
    const line = src.split("\n").find((l) => l.includes("<JitsiRoom"));
    expect(line).toBeDefined();
    expect(line).toMatch(/guestView/);
  });

  it("both components still exist and export their default (import doesn't throw)", () => {
    expect(typeof ReadingStage).toBe("function");
    expect(typeof ReadingStageDoor).toBe("function");
  });
});

describe("TASK-477 — JitsiViewer stays retired from /reading (never re-mounted, never deleted)", () => {
  it("JitsiViewer.tsx still exists on disk (house law: never delete)", async () => {
    await expect(read("src/components/reading/JitsiViewer.tsx")).resolves.toContain("JITSI VIEWER");
  });

  it("neither ReadingStage.tsx nor ReadingStageDoor.tsx imports it", async () => {
    const stage = await read("src/components/reading/ReadingStage.tsx");
    const door = await read("src/components/reading/ReadingStageDoor.tsx");
    expect(stage).not.toMatch(/import JitsiViewer/);
    expect(door).not.toMatch(/import JitsiViewer/);
  });
});
