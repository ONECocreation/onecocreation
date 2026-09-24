import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-438 (block 968,222; HOLD LIFTED block 968,269) — `JitsiViewer.tsx`,
 * the WATCH-ONLY Stage 1 embed. Source pins for the one-way configuration
 * (the brief's Build 4, checked against FACTS-jitsi-one-way.md's viewer
 * table): a viewer never offers a camera, a microphone, chat, screen share
 * or a roster; P2P is off so every viewer rides the bridge; the toolbar is
 * exactly fullscreen + hangup. `startSilent` is BANNED (it kills remote
 * audio — config.js:218-220) and `startAudioOnly` never existed.
 *
 * The iframe's `allow` attribute is deliberately NOT overridden: upstream's
 * external_api.js always sets it (fullscreen included — FACTS §b, the
 * external_api.js:372-395 row) and always includes camera/microphone, so a
 * local override could only fight upstream, never harden it. The media
 * safety is the config below plus the SERVER-side moderator locks (these
 * are viewer controls, not the server boundary — the brief's Build 4).
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const VIEWER = "src/components/reading/JitsiViewer.tsx";
const JITSIROOM = "src/components/booking/JitsiRoom.tsx";

describe("JitsiViewer — it never asks for the viewer's own media", () => {
  it("no initial getUserMedia, both tracks born muted, no prejoin step", async () => {
    const src = await read(VIEWER);
    expect(src).toContain("disableInitialGUM: true");
    expect(src).toContain("startWithAudioMuted: true");
    expect(src).toContain("startWithVideoMuted: true");
    expect(src).toContain("prejoinConfig: { enabled: false }");
  });

  it("NEVER startSilent (it disables REMOTE audio — the whole point of watching), never the nonexistent startAudioOnly", async () => {
    const src = await read(VIEWER);
    expect(src).not.toContain("startSilent");
    expect(src).not.toContain("startAudioOnly");
  });
});

describe("JitsiViewer — every surface a viewer doesn't own is off", () => {
  it("chat, self-view, shortcuts, reactions, polls, the conference subject and deep-linking", async () => {
    const src = await read(VIEWER);
    for (const pin of [
      "disableChat: true",
      "disableSelfView: true",
      "disableShortcuts: true",
      "disableReactions: true",
      "disablePolls: true",
      "hideConferenceSubject: true",
      "disableDeepLinking: true",
    ]) {
      expect(src).toContain(pin);
    }
  });

  it("the filmstrip, the participants pane and the remote-video menu", async () => {
    const src = await read(VIEWER);
    expect(src).toContain("filmstrip: { disabled: true }");
    expect(src).toContain("participantsPane: { enabled: false }");
    expect(src).toContain("remoteVideoMenu: { disabled: true }");
  });

  it("one remote tile, P2P off (every viewer rides the bridge), viewers named Guest, no display-name prompt", async () => {
    const src = await read(VIEWER);
    expect(src).toContain("channelLastN: 1");
    expect(src).toContain("p2p: { enabled: false }");
    expect(src).toContain('"Guest"');
    expect(src).toContain("requireDisplayName: false");
  });
});

describe("JitsiViewer — the toolbar is exactly fullscreen and hangup", () => {
  it("the exact pair, and no mic, camera, chat, screen-share or roster control anywhere", async () => {
    const src = await read(VIEWER);
    expect(src).toContain('toolbarButtons: ["fullscreen", "hangup"]');
    for (const banned of ['"microphone"', '"camera"', '"chat"', '"desktop"', '"raisehand"', '"participants-pane"', '"tileview"']) {
      expect(src).not.toContain(banned);
    }
  });
});

describe("JitsiViewer — lifecycle honesty (the JitsiRoom.tsx:93-102 pattern, reused)", () => {
  it("both farewell events land on onEnded, and the API is disposed on unmount", async () => {
    const src = await read(VIEWER);
    expect(src).toContain("videoConferenceLeft");
    expect(src).toContain("readyToClose");
    expect(src).toContain("onEnded");
    expect(src).toContain("dispose()");
  });

  it("a failed script load reports onFailed — and there is NEVER a raw-room link to fall back to (JitsiRoom.tsx:121-127 is NOT copied)", async () => {
    const src = await read(VIEWER);
    expect(src).toContain("onFailed");
    expect(src).not.toMatch(/<a[\s>]/);
    expect(src).not.toMatch(/href=/);
    expect(src).not.toContain("open it directly");
  });

  it("reuses the script guard: window.JitsiMeetExternalAPI checked first, external_api.js injected otherwise", async () => {
    const src = await read(VIEWER);
    expect(src).toContain("window.JitsiMeetExternalAPI");
    expect(src).toContain("external_api.js");
    expect(src).toContain('document.createElement("script")');
  });

  it("does NOT redeclare the Window API — JitsiRoom.tsx owns the one declaration (the brief's Build 4)", async () => {
    const src = await read(VIEWER);
    expect(src).not.toContain("declare global");
  });

  it("never imports JitsiRoom itself (the unchanged Stage 2 embed belongs to ReadingStage's Stage-2 branch)", async () => {
    const src = await read(VIEWER);
    expect(src).not.toMatch(/import[^;]*JitsiRoom/);
  });
});

describe("T-439 pin #7 stays green — JitsiRoom.tsx's configOverwrite never touches audio/video defaults or the toolbar (re-pinned so this lane's guard is self-contained)", () => {
  it("the read-only pin, verbatim", async () => {
    const src = await read(JITSIROOM);
    const block = src.match(/configOverwrite: \{[\s\S]*?\n\s*\},/);
    expect(block, "configOverwrite block not found").not.toBeNull();
    for (const banned of ["startWithAudioMuted", "startWithVideoMuted", "startAudioOnly", "startSilent", "toolbarButtons"]) {
      expect(block![0]).not.toContain(banned);
    }
  });
});
