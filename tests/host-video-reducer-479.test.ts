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
 * "good on the calls, let's build it"). TASK-485 (same day): the Admiral now
 * ALSO joins these rooms as a second moderator (adminpacman, alongside
 * Love) — `hostVideoReducer` no longer tracks a single "host" id. It tracks
 * a MAP of every remote moderator's own video-on state and shows the real
 * video whenever ANY of them is on; the cover shows only when the map is
 * non-empty AND every tracked moderator reads muted.
 *
 * FAIL OPEN throughout (FEASIBILITY.md §6): unknown/ambiguous/gone always
 * means SHOW THE VIDEO. A newly identified moderator enters the map as
 * `true` (unknown = on) and only flips to `false` on an EXPLICIT
 * muted-video signal for that same id — never from mere presence.
 */

const LOVE = "love-participant-id";
const ADMIRAL = "admiral-participant-id";
const GUEST = "guest-participant-id";
const ME = "my-own-participant-id";

function joined(id = ME): HostVideoState {
  return hostVideoReducer(initialHostVideoState, { type: "videoConferenceJoined", id });
}

/** dispatches a moderator role-change for `id` onto `state` (default: a
 *  freshly joined call with nobody else known yet). */
function withModerator(id = LOVE, state: HostVideoState = joined()): HostVideoState {
  return hostVideoReducer(state, { type: "participantRoleChanged", id, role: "moderator" });
}

function muted(state: HostVideoState, id: string, isMuted: boolean): HostVideoState {
  return hostVideoReducer(state, { type: "participantMuted", id, mediaType: "video", isMuted });
}

describe("hostVideoReducer — unknown state shows video (fail open)", () => {
  it("the initial state, before any event, is video (never a cover with nothing known)", () => {
    expect(initialHostVideoState.videoOn).toBe(true);
    expect(initialHostVideoState.moderators).toEqual({});
  });

  it("just joining the call, with nobody identified yet, is still video", () => {
    expect(joined().videoOn).toBe(true);
  });

  it("a participant joining, with no role/mute info yet, stays video — presence alone proves nothing", () => {
    const state = hostVideoReducer(joined(), { type: "participantJoined", id: LOVE });
    expect(state.videoOn).toBe(true);
    expect(state.moderators).toEqual({});
  });

  it("becoming an identified moderator, before any mute signal, is STILL video (§6: default to video if unsure)", () => {
    const state = withModerator(LOVE);
    expect(state.moderators).toEqual({ [LOVE]: true });
    expect(state.videoOn).toBe(true);
  });
});

describe("hostVideoReducer — a tracked moderator mutes/unmutes video", () => {
  it("a moderator mutes video -> the cover (videoOn false), since they're the only one tracked", () => {
    const state = muted(withModerator(LOVE), LOVE, true);
    expect(state.videoOn).toBe(false);
    expect(state.sawMuteSignal).toBe(true);
  });

  it("...then unmutes -> the video again", () => {
    let state = muted(withModerator(LOVE), LOVE, true);
    expect(state.videoOn).toBe(false);
    state = muted(state, LOVE, false);
    expect(state.videoOn).toBe(true);
  });

  it("an AUDIO mute from a moderator never touches videoOn (mediaType must be 'video')", () => {
    const state = hostVideoReducer(withModerator(LOVE), { type: "participantMuted", id: LOVE, mediaType: "audio", isMuted: true });
    expect(state.videoOn).toBe(true);
    expect(state.sawMuteSignal).toBe(false);
  });
});

describe("hostVideoReducer — a non-moderator's events are ignored", () => {
  it("a guest's video-mute event, with a moderator already identified, changes nothing", () => {
    const state = muted(withModerator(LOVE), GUEST, true);
    expect(state.videoOn).toBe(true);
    expect(state.sawMuteSignal).toBe(false);
  });

  it("a video-mute event before ANY moderator is identified is ignored too (nothing tracked to match)", () => {
    const state = muted(joined(), GUEST, true);
    expect(state.videoOn).toBe(true);
    expect(state.moderators).toEqual({});
  });

  it("our own role change is never trusted / never tracked (id === localId is ignored)", () => {
    const state = hostVideoReducer(joined(), { type: "participantRoleChanged", id: ME, role: "moderator" });
    expect(state.moderators).toEqual({});
  });
});

describe("hostVideoReducer — a moderator leaving: removed from the map, recomputed, never stuck", () => {
  it("the only tracked moderator leaving clears the map and forces video back on, even mid-cover", () => {
    let state = muted(withModerator(LOVE), LOVE, true);
    expect(state.videoOn).toBe(false);
    state = hostVideoReducer(state, { type: "participantLeft", id: LOVE });
    expect(state.videoOn).toBe(true);
    expect(state.moderators).toEqual({});
  });

  it("a GUEST leaving (never tracked) changes nothing", () => {
    let state = muted(withModerator(LOVE), LOVE, true);
    state = hostVideoReducer(state, { type: "participantLeft", id: GUEST });
    expect(state.videoOn).toBe(false);
    expect(state.moderators).toEqual({ [LOVE]: false });
  });

  it("a moderator losing the role (handed off) is also removed and fails open if they were the only one tracked", () => {
    let state = muted(withModerator(LOVE), LOVE, true);
    expect(state.videoOn).toBe(false);
    state = hostVideoReducer(state, { type: "participantRoleChanged", id: LOVE, role: "participant" });
    expect(state.videoOn).toBe(true);
    expect(state.moderators).toEqual({});
  });
});

describe("hostVideoReducer — TASK-485: a SECOND moderator (the Admiral, alongside Love) is now TRACKED, not ignored", () => {
  it("regression, re-trued: a second moderator arriving no longer hijacks the first — BOTH are tracked, and the cover reflects the two of them together", () => {
    // Love is identified and mutes her video: the cover goes up — she is
    // the only one tracked.
    let state = muted(withModerator(LOVE), LOVE, true);
    expect(state.videoOn).toBe(false);
    expect(state.moderators).toEqual({ [LOVE]: false });
    // the Admiral is also reported as 'moderator' — TASK-485's whole
    // point: he is now ADOPTED alongside Love, entering as `true`
    // (unknown = on), which immediately drops the cover (fail open —
    // we don't know his camera state yet, so we never assume it's off).
    state = hostVideoReducer(state, { type: "participantRoleChanged", id: ADMIRAL, role: "moderator" });
    expect(state.moderators).toEqual({ [LOVE]: false, [ADMIRAL]: true });
    expect(state.videoOn).toBe(true);
    // Love's own real unmute still reaches her own entry too, independent
    // of the Admiral's
    state = muted(state, LOVE, false);
    expect(state.moderators).toEqual({ [LOVE]: true, [ADMIRAL]: true });
    expect(state.videoOn).toBe(true);
  });

  it("the Admiral (muted) joins first, then Love joins and unmutes: the cover drops", () => {
    // the Admiral is identified first and reads muted immediately (e.g.
    // he joined with his camera already off) — with only him tracked and
    // muted, the cover is up. This is the exact TASK-485 scenario: under
    // the OLD single-host rule he'd be tracked as "the host" and Love's
    // later unmute would have nowhere to attach.
    let state = muted(withModerator(ADMIRAL), ADMIRAL, true);
    expect(state.moderators).toEqual({ [ADMIRAL]: false });
    expect(state.videoOn).toBe(false);
    // Love joins (tracked, defaults on) — already drops the cover
    // (unknown = on, fail open, before any explicit signal from her).
    state = withModerator(LOVE, state);
    expect(state.videoOn).toBe(true);
    // her own explicit unmute then makes it a real, confirmed signal too
    state = muted(state, LOVE, false);
    expect(state.moderators).toEqual({ [ADMIRAL]: false, [LOVE]: true });
    expect(state.videoOn).toBe(true);
  });

  it("both muted: the cover shows (every tracked moderator reads off)", () => {
    let state = withModerator(ADMIRAL);
    state = withModerator(LOVE, state);
    state = muted(state, ADMIRAL, true);
    state = muted(state, LOVE, true);
    expect(state.moderators).toEqual({ [ADMIRAL]: false, [LOVE]: false });
    expect(state.videoOn).toBe(false);
  });

  it("one leaves: recompute — the remaining moderator's OWN state now decides the cover", () => {
    // the Admiral muted, Love unmuted -> video shows (Love's `true` wins
    // the OR)
    let state = withModerator(ADMIRAL);
    state = withModerator(LOVE, state);
    state = muted(state, ADMIRAL, true);
    state = muted(state, LOVE, false);
    expect(state.videoOn).toBe(true);
    // Love leaves — the Admiral (still muted) is now the only one left,
    // so the cover comes back, purely from the map shrinking (a genuine
    // recompute-driven transition, not a fresh mute signal)
    state = hostVideoReducer(state, { type: "participantLeft", id: LOVE });
    expect(state.moderators).toEqual({ [ADMIRAL]: false });
    expect(state.videoOn).toBe(false);
  });

  it("the local participant is never counted, even if this embed's own id happens to also carry the moderator role", () => {
    const state = hostVideoReducer(joined(), { type: "participantRoleChanged", id: ME, role: "moderator" });
    expect(state.moderators).toEqual({});
    expect(state.videoOn).toBe(true);
  });
});

describe("hostVideoReducer — the safety timeout", () => {
  it("with no moderator ever identified and no mute signal, a timeout is a no-op (already video)", () => {
    const state = hostVideoReducer(joined(), { type: "timeout" });
    expect(state.videoOn).toBe(true);
  });

  it("a moderator identified but no mute signal received yet: the timeout keeps it video, never invents a cover", () => {
    const state = hostVideoReducer(withModerator(LOVE), { type: "timeout" });
    expect(state.videoOn).toBe(true);
  });

  it("drops the cover: a state with videoOn false but NO confirmed signal (the defensive branch itself) is forced back to video on timeout", () => {
    // constructed directly rather than reached through a normal event
    // sequence (the reducer's own normal paths never produce videoOn:false
    // without sawMuteSignal:true) to pin the escape hatch's own contract:
    // an unconfirmed cover NEVER survives the safety timeout, no matter
    // how it got there.
    const suspect: HostVideoState = { localId: ME, moderators: { [LOVE]: false }, videoOn: false, sawMuteSignal: false };
    const state = hostVideoReducer(suspect, { type: "timeout" });
    expect(state.videoOn).toBe(true);
    expect(state.moderators).toEqual({});
  });

  it("a REAL, confirmed mute signal survives the timeout — a moderator's camera can stay off longer than 20s", () => {
    let state = muted(withModerator(LOVE), LOVE, true);
    expect(state.videoOn).toBe(false);
    state = hostVideoReducer(state, { type: "timeout" });
    expect(state.videoOn).toBe(false);
    expect(state.moderators).toEqual({ [LOVE]: false });
    expect(state.sawMuteSignal).toBe(true);
  });

  it("the latch is global: once ANY moderator has ever sent a real signal, a LATER, still-unconfirmed second moderator's default-on entry is unaffected by the timeout too", () => {
    let state = muted(withModerator(LOVE), LOVE, true); // real signal seen
    state = withModerator(ADMIRAL, state); // unconfirmed, defaults true
    state = hostVideoReducer(state, { type: "timeout" });
    // sawMuteSignal is already true (Love's real signal) -> timeout is a
    // no-op; the Admiral's default-on entry rides through untouched
    expect(state.moderators).toEqual({ [LOVE]: false, [ADMIRAL]: true });
    expect(state.videoOn).toBe(true);
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
    expect(viaId.moderators).toEqual({ [LOVE]: true });
    expect(viaParticipantId.moderators).toEqual({ [LOVE]: true });
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

  it("TASK-479 fix (stuck-cover-after-rejoin, part a): boot() syncs onHostVideo to the fresh reducer state ONCE, unconditionally, before any wire event — a rejoin's new mount must never leave the parent on a stale value from the PRIOR mount", async () => {
    const src = await read(JITSIROOM);
    // the sync call itself, ahead of any listener registration
    const gated = src.slice(src.indexOf("if (onHostVideo) {"));
    const syncCall = gated.indexOf("onHostVideo(hv.videoOn);");
    const firstListener = gated.indexOf('a.addListener("videoConferenceJoined"');
    expect(syncCall, "onHostVideo(hv.videoOn) sync call not found").toBeGreaterThan(-1);
    expect(firstListener, "videoConferenceJoined listener not found").toBeGreaterThan(-1);
    expect(syncCall).toBeLessThan(firstListener);
  });

  it("TASK-485: HostVideoState tracks a moderators MAP, not a single hostId — the shape this whole file exercises", async () => {
    const src = await read(JITSIROOM);
    expect(src).toContain("moderators: Record<string, boolean>;");
    expect(src).not.toContain("hostId");
  });
});
