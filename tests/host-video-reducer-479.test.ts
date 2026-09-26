import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import {
  hostVideoReducer,
  hostEventParticipantId,
  initialHostVideoState,
  HOST_VIDEO_SAFETY_TIMEOUT_MS,
  type HostVideoState,
} from "@/components/booking/JitsiRoom";

/**
 * TASK-479 (block 968,624+, the Admiral's approved mockup, `t479/mockup.html`,
 * "good on the calls, let's build it"). `hostVideoReducer` is the pure state
 * machine behind the /reading top screen's book cover: it decides whether
 * the mounted, still-listening JitsiRoom shows the real video or the cover,
 * from nothing but the External API's own wire events (FEASIBILITY.md §1-3).
 *
 * FAIL OPEN throughout (FEASIBILITY.md §6): unknown/ambiguous/gone always
 * means SHOW THE VIDEO. `videoOn` only ever turns false on an EXPLICIT
 * muted-video signal from the participant already identified as the host
 * (moderator, not the local viewer) — never from mere presence.
 */

const LOVE = "love-participant-id";
const GUEST = "guest-participant-id";
const ME = "my-own-participant-id";

function joined(id = ME): HostVideoState {
  return hostVideoReducer(initialHostVideoState, { type: "videoConferenceJoined", id });
}

function withHost(id = LOVE): HostVideoState {
  return hostVideoReducer(joined(), { type: "participantRoleChanged", id, role: "moderator" });
}

describe("hostVideoReducer — unknown state shows video (fail open)", () => {
  it("the initial state, before any event, is video (never a cover with nothing known)", () => {
    expect(initialHostVideoState.videoOn).toBe(true);
  });

  it("just joining the call, with nobody identified yet, is still video", () => {
    expect(joined().videoOn).toBe(true);
  });

  it("a participant joining, with no role/mute info yet, stays video — presence alone proves nothing", () => {
    const state = hostVideoReducer(joined(), { type: "participantJoined", id: LOVE });
    expect(state.videoOn).toBe(true);
    expect(state.hostId).toBeNull();
  });

  it("becoming the identified moderator, before any mute signal, is STILL video (§6: default to video if unsure)", () => {
    const state = withHost();
    expect(state.hostId).toBe(LOVE);
    expect(state.videoOn).toBe(true);
  });
});

describe("hostVideoReducer — the identified moderator mutes/unmutes video", () => {
  it("moderator mutes video -> the cover (videoOn false)", () => {
    const state = hostVideoReducer(withHost(), {
      type: "participantMuted",
      id: LOVE,
      mediaType: "video",
      isMuted: true,
    });
    expect(state.videoOn).toBe(false);
    expect(state.sawMuteSignal).toBe(true);
  });

  it("...then unmutes -> the video again", () => {
    let state = hostVideoReducer(withHost(), { type: "participantMuted", id: LOVE, mediaType: "video", isMuted: true });
    expect(state.videoOn).toBe(false);
    state = hostVideoReducer(state, { type: "participantMuted", id: LOVE, mediaType: "video", isMuted: false });
    expect(state.videoOn).toBe(true);
  });

  it("an AUDIO mute from the host never touches videoOn (mediaType must be 'video')", () => {
    const state = hostVideoReducer(withHost(), { type: "participantMuted", id: LOVE, mediaType: "audio", isMuted: true });
    expect(state.videoOn).toBe(true);
    expect(state.sawMuteSignal).toBe(false);
  });
});

describe("hostVideoReducer — a non-moderator's events are ignored", () => {
  it("a guest's video-mute event, with a moderator already identified, changes nothing", () => {
    const state = hostVideoReducer(withHost(), { type: "participantMuted", id: GUEST, mediaType: "video", isMuted: true });
    expect(state.videoOn).toBe(true);
    expect(state.sawMuteSignal).toBe(false);
  });

  it("a video-mute event before ANY moderator is identified is ignored too (no hostId to match)", () => {
    const state = hostVideoReducer(joined(), { type: "participantMuted", id: GUEST, mediaType: "video", isMuted: true });
    expect(state.videoOn).toBe(true);
    expect(state.hostId).toBeNull();
  });

  it("our own role change is never trusted as a host identity (id === localId is ignored)", () => {
    const state = hostVideoReducer(joined(), { type: "participantRoleChanged", id: ME, role: "moderator" });
    expect(state.hostId).toBeNull();
  });
});

describe("hostVideoReducer — the host leaves: cover off / safe, never stuck", () => {
  it("the host leaving clears identity and forces video back on, even mid-cover", () => {
    let state = hostVideoReducer(withHost(), { type: "participantMuted", id: LOVE, mediaType: "video", isMuted: true });
    expect(state.videoOn).toBe(false);
    state = hostVideoReducer(state, { type: "participantLeft", id: LOVE });
    expect(state.videoOn).toBe(true);
    expect(state.hostId).toBeNull();
    expect(state.sawMuteSignal).toBe(false);
  });

  it("a GUEST leaving (not the identified host) changes nothing", () => {
    let state = hostVideoReducer(withHost(), { type: "participantMuted", id: LOVE, mediaType: "video", isMuted: true });
    state = hostVideoReducer(state, { type: "participantLeft", id: GUEST });
    expect(state.videoOn).toBe(false);
    expect(state.hostId).toBe(LOVE);
  });

  it("the moderator role being handed to someone else (host demoted) also fails open to video", () => {
    let state = hostVideoReducer(withHost(), { type: "participantMuted", id: LOVE, mediaType: "video", isMuted: true });
    expect(state.videoOn).toBe(false);
    state = hostVideoReducer(state, { type: "participantRoleChanged", id: LOVE, role: "participant" });
    expect(state.videoOn).toBe(true);
    expect(state.hostId).toBeNull();
  });
});

describe("hostVideoReducer — the safety timeout", () => {
  it("with no host ever identified and no mute signal, a timeout is a no-op (already video)", () => {
    const state = hostVideoReducer(joined(), { type: "timeout" });
    expect(state.videoOn).toBe(true);
  });

  it("a moderator identified but no mute signal received yet: the timeout keeps it video, never invents a cover", () => {
    const state = hostVideoReducer(withHost(), { type: "timeout" });
    expect(state.videoOn).toBe(true);
  });

  it("drops the cover: a state with videoOn false but NO confirmed signal (the defensive branch itself) is forced back to video on timeout", () => {
    // constructed directly rather than reached through a normal event
    // sequence (the reducer never produces this combination on its own —
    // videoOn only ever turns false alongside sawMuteSignal: true) to pin
    // the escape hatch's own contract: an unconfirmed cover NEVER survives
    // the safety timeout, no matter how it got there.
    const suspect: HostVideoState = { localId: ME, hostId: LOVE, videoOn: false, sawMuteSignal: false };
    const state = hostVideoReducer(suspect, { type: "timeout" });
    expect(state.videoOn).toBe(true);
  });

  it("a REAL, confirmed mute signal survives the timeout — Love's camera can stay off longer than 20s", () => {
    let state = hostVideoReducer(withHost(), { type: "participantMuted", id: LOVE, mediaType: "video", isMuted: true });
    expect(state.videoOn).toBe(false);
    state = hostVideoReducer(state, { type: "timeout" });
    expect(state.videoOn).toBe(false);
    expect(state.sawMuteSignal).toBe(true);
  });

  it("the safety window is 20 seconds", () => {
    expect(HOST_VIDEO_SAFETY_TIMEOUT_MS).toBe(20_000);
  });
});

describe("hostEventParticipantId — the payload key: source-verified `id`, handbook-prose `participantId`", () => {
  it("reads `id` when present (the real wire key, FEASIBILITY.md §1)", () => {
    expect(hostEventParticipantId({ id: "abc", participantId: "other" })).toBe("abc");
  });

  it("falls back to `participantId` when `id` is absent (a docs/source drift never silently drops the event)", () => {
    expect(hostEventParticipantId({ participantId: "abc" })).toBe("abc");
  });

  it("neither key present -> empty string, never undefined/throws", () => {
    expect(hostEventParticipantId({})).toBe("");
  });

  it("the reducer works identically whichever key JitsiRoom.tsx's listener normalized from", () => {
    const viaId = hostVideoReducer(joined(), {
      type: "participantRoleChanged",
      id: hostEventParticipantId({ id: LOVE }),
      role: "moderator",
    });
    const viaParticipantId = hostVideoReducer(joined(), {
      type: "participantRoleChanged",
      id: hostEventParticipantId({ participantId: LOVE }),
      role: "moderator",
    });
    expect(viaId.hostId).toBe(LOVE);
    expect(viaParticipantId.hostId).toBe(LOVE);
  });
});

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");
const JITSIROOM = "src/components/booking/JitsiRoom.tsx";

describe("JitsiRoom.tsx — the wiring around the reducer (source pins, no jsdom)", () => {
  it("onHostVideo is optional and unused by every caller except the /reading mounts", async () => {
    const src = await read(JITSIROOM);
    expect(src).toContain("onHostVideo?: (on: boolean) => void;");
  });

  it("the listeners this lane needs are all wired: participantMuted, participantRoleChanged, participantJoined, participantLeft, videoConferenceJoined", async () => {
    const src = await read(JITSIROOM);
    for (const ev of [
      '"participantMuted"',
      '"participantRoleChanged"',
      '"participantJoined"',
      '"participantLeft"',
      '"videoConferenceJoined"',
    ]) {
      expect(src).toContain(ev);
    }
  });

  it("the listeners are gated behind `if (onHostVideo)` — every other caller pays nothing", async () => {
    const src = await read(JITSIROOM);
    expect(src).toMatch(/if \(onHostVideo\) \{/);
  });

  it("the safety timeout is cleared on unmount (no leaked timer across a re-mount)", async () => {
    const src = await read(JITSIROOM);
    expect(src).toContain("clearTimeout(hostVideoTimeout)");
  });
});
