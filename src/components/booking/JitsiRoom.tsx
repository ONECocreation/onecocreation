"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cartridge } from "@/brand/cartridge";

/**
 * The meeting, held ON the site (Admiral, 0018.05.17): the jitsi room rides
 * an embed, and when the call ends the member is still home with us — no
 * third-party farewell page, no advertisement.
 */

/**
 * TASK-246: the mark's absolute URL, for the branding override below.
 * lib/subscribers.ts's siteBase() does the same job server-side but pulls
 * in node:crypto (unsafe in this client bundle) — lifted and adapted for
 * the browser: NEXT_PUBLIC_SITE_URL first (inlined at build time), else
 * the page's own origin (always right, this only ever runs client-side).
 */
function siteOrigin(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}
/**
 * TASK-479: the External API's own event payloads — a loose, optional-field
 * shape (different events carry different keys) rather than a per-event
 * type, since one `addListener` signature has to cover all of them. See
 * FEASIBILITY.md §1: the wire's real key is `id` (source-verified); the
 * handbook's prose calls it `participantId` — both are read, never just one.
 */
interface JitsiWireEventData {
  id?: string;
  participantId?: string;
  role?: string;
  mediaType?: string;
  isMuted?: boolean;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, opts: Record<string, unknown>) => {
      addListener: (ev: string, cb: (data: JitsiWireEventData) => void) => void;
      dispose: () => void;
    };
  }
}

/**
 * TASK-477 (block 968,624+, the Admiral's ruling): screen share is for the
 * HOST only. Love hosts every /reading room from the direct
 * meet.onecocreation.com link, never from this embed, so this embed is
 * always the GUEST view there. The server's own house toolbar (the tail
 * of live-config.js, ~line 250) is this list WITH 'desktop' — this is
 * that same list minus 'desktop', nothing else changed: 'tileview' stays
 * (ruling 1 — stage view by default, the tile-view button still offered,
 * never forced), 'participants-pane' stays (ruling 3 — a hand-granted
 * moderator still needs it to mute people and watch the roster).
 */
export const GUEST_TOOLBAR_BUTTONS = [
  "camera",
  "chat",
  "fullscreen",
  "hangup",
  "microphone",
  "participants-pane",
  "raisehand",
  "settings",
  "tileview",
  "toggle-camera",
  "videoquality",
  "select-background",
] as const;

/**
 * TASK-477: the External API options object, pulled out pure so a test can
 * pin its shape without booting a script tag or a DOM. `guestView` is the
 * ONLY thing that changes the returned object; everything else is exactly
 * what the component already built before this lane, so every caller that
 * never passes it (every mount except /reading's) gets a byte-identical
 * `configOverwrite` — no `toolbarButtons` key at all, same as today.
 */
export function jitsiEmbedOptions({
  room,
  parentNode,
  displayName,
  markUrl,
  origin,
  guestView,
}: {
  room: string;
  parentNode: HTMLElement | null;
  displayName?: string;
  markUrl: string;
  origin: string;
  /** TASK-477: true only for the /reading guest mounts. */
  guestView?: boolean;
}): Record<string, unknown> {
  return {
    roomName: room,
    parentNode,
    width: "100%",
    height: "100%",
    userInfo: displayName ? { displayName } : undefined,
    configOverwrite: {
      prejoinConfig: { enabled: true },
      disableDeepLinking: true,
      defaultLogoUrl: markUrl,
      ...(guestView ? { toolbarButtons: GUEST_TOOLBAR_BUTTONS } : {}),
    },
    interfaceConfigOverwrite: {
      SHOW_JITSI_WATERMARK: false,
      SHOW_WATERMARK_FOR_GUESTS: false,
      SHOW_BRAND_WATERMARK: true,
      BRAND_WATERMARK_LINK: origin,
      DEFAULT_LOGO_URL: markUrl,
      DEFAULT_WELCOME_PAGE_LOGO_URL: markUrl,
      APP_NAME: "One Cocreation",
      JITSI_WATERMARK_LINK: "",
    },
  };
}

/**
 * TASK-479 (block 968,624+, the Admiral's approved mockup, `t479/mockup.html`):
 * the /reading top screen keeps the book cover over the mounted, still-
 * listening room until Love's camera comes on. Her identity: the
 * participant holding the External API's 'moderator' role who is NOT the
 * local viewer themselves (this embed's own join, reported by
 * `videoConferenceJoined`'s own `id` — FEASIBILITY.md §3 "moderator role").
 * Deliberately NOT the "moderator AND displayName" combination FEASIBILITY.md
 * §3 floats as the sturdier interim signal: `displayName` is free text any
 * guest's own prejoin screen lets them type (FEASIBILITY.md §3's own
 * "a guest COULD type 'Love'" risk) — adding it back in here would only
 * narrow WHICH moderator we trust, never harden the check, since the
 * moderator flag is still the thing actually granting the identity. The
 * durable fix is the JWT plan's own moderator claim (briefings/jitsi-jwt-968269/);
 * until then, moderator-only plus "never adopt a second moderator while the
 * first is still tracked" (see `participantRoleChanged` below) is the
 * chosen interim shape.
 *
 * FAIL OPEN throughout (FEASIBILITY.md §6): unknown, ambiguous, or gone
 * always means SHOW THE VIDEO, never trap a viewer behind a still picture.
 * `videoOn` starts `true` and only ever turns `false` on an EXPLICIT
 * muted-video signal from the participant already identified as the host —
 * merely joining, or merely becoming the moderator, says nothing about the
 * camera by itself (§6: "the host's camera starting unmuted is not
 * guaranteed to fire an event... default to video if unsure").
 *
 * A pure reducer so the state machine can be pinned hard without a script
 * tag, a DOM, or a live Jitsi server (none exist in this environment —
 * FEASIBILITY.md's own "Obstacles").
 */
export interface HostVideoState {
  /** this embed's own participant id (from `videoConferenceJoined`) —
   *  never treated as a possible host, however its role reads. */
  localId: string | null;
  /** the one participant currently trusted as the host (moderator, not
   *  local) — null when nobody's been identified yet, or the identified
   *  host left / lost the role. */
  hostId: string | null;
  /** what the /reading screen shows: true -> the real video, false -> the
   *  cover stays over the mounted (still audible) room. */
  videoOn: boolean;
  /** true once an explicit participantMuted(video) signal has arrived for
   *  the identified host — guards the safety timeout from undoing a real,
   *  still-current signal (see `hostVideoReducer`'s "timeout" case). */
  sawMuteSignal: boolean;
}

export const initialHostVideoState: HostVideoState = {
  localId: null,
  hostId: null,
  videoOn: true,
  sawMuteSignal: false,
};

export type HostVideoEvent =
  | { type: "videoConferenceJoined"; id: string }
  | { type: "participantJoined"; id: string }
  | { type: "participantLeft"; id: string }
  | { type: "participantRoleChanged"; id: string; role: string }
  | { type: "participantMuted"; id: string; mediaType: string; isMuted: boolean }
  | { type: "timeout" };

/** FEASIBILITY.md §1: the wire's real payload key is `id` (source-verified
 *  against `external_api.js`); the public handbook's prose calls the same
 *  field `participantId`. Both are read here so a docs/source drift never
 *  silently drops an event. */
export function hostEventParticipantId(data: { id?: string; participantId?: string }): string {
  return data.id ?? data.participantId ?? "";
}

/** 20 seconds from OUR OWN join (`videoConferenceJoined`) — if by then no
 *  host has ever been identified at all, the safety net below drops any
 *  assumption of a cover rather than risk trapping a viewer on a broken or
 *  older build that never fires the events this lane relies on. It never
 *  overrides a REAL, still-current mute signal (`sawMuteSignal`) — Love's
 *  camera can legitimately stay off far longer than 20 seconds; only the
 *  UNCERTAIN case times out. */
export const HOST_VIDEO_SAFETY_TIMEOUT_MS = 20_000;

export function hostVideoReducer(state: HostVideoState, event: HostVideoEvent): HostVideoState {
  switch (event.type) {
    case "videoConferenceJoined":
      return { ...state, localId: event.id || state.localId };
    case "participantRoleChanged": {
      if (!event.id || event.id === state.localId) return state; // never trust our own role
      if (event.role === "moderator") {
        if (event.id === state.hostId) return state; // already tracking this one
        if (state.hostId) {
          /* a SECOND moderator arriving while we already track one — never
           * adopt them as a replacement host. This was the reported
           * blocker: Love (the real host) mutes video (cover up, a real
           * confirmed signal), a second participant is handed/reports
           * 'moderator' too, and the naive "last moderator wins" rule used
           * to overwrite hostId to the second id WITHOUT resetting
           * videoOn/sawMuteSignal — Love's later real unmute then failed
           * the `event.id !== state.hostId` guard in "participantMuted"
           * below and was silently dropped, leaving the cover stuck over
           * a live host for the rest of the call. The only paths that may
           * change who we track are the identified host's OWN lost-role
           * (below) or leaving (participantLeft) — never a second
           * participant's role report while the first is still present. */
          return state;
        }
        // no host tracked yet — fail open still holds (videoOn/sawMuteSignal
        // are already true/false); if this branch is ever reached with a
        // DIFFERENT id already tracked, reset explicitly too (belt and
        // braces — see the guard above that makes this the normal case).
        return { ...state, hostId: event.id, videoOn: true, sawMuteSignal: false };
      }
      if (event.id === state.hostId) {
        // the identified host lost the role (e.g. handed off) — fail open
        return { ...state, hostId: null, videoOn: true, sawMuteSignal: false };
      }
      return state;
    }
    case "participantMuted": {
      if (event.mediaType !== "video") return state;
      if (!state.hostId || event.id !== state.hostId) return state; // a non-host's events are ignored
      return { ...state, videoOn: !event.isMuted, sawMuteSignal: true };
    }
    case "participantJoined":
      // presence alone says nothing about the camera (FEASIBILITY.md §6)
      return state;
    case "participantLeft":
      if (event.id !== state.hostId) return state;
      return { ...state, hostId: null, videoOn: true, sawMuteSignal: false };
    case "timeout":
      return state.sawMuteSignal ? state : { ...state, videoOn: true };
    default:
      return state;
  }
}

export default function JitsiRoom({
  domain,
  room,
  displayName,
  onEnded,
  height = "72vh",
  guestView,
  onHostVideo,
}: {
  domain: string;
  room: string;
  displayName?: string;
  /** TASK-449 (block 968,364): optional end signal — the Playground
   *  island's left-while-open state needs to know the call ended (the
   *  same two farewell events JitsiViewer reports). Existing consumers
   *  pass nothing and render byte-identical. */
  onEnded?: () => void;
  /** TASK-146: optional, defaults to /meet's original literal so /meet
   *  renders byte-identical without passing it — the classroom slot and
   *  /live pass their own to fit a smaller embed frame. */
  height?: string;
  /** TASK-477: true only for the /reading guest mounts (ReadingStage.tsx,
   *  ReadingStageDoor.tsx) — drops the screen-share button from the
   *  toolbar (Love hosts from the direct link, not this embed). Every
   *  other caller leaves this unset and is unaffected. */
  guestView?: boolean;
  /** TASK-479: opt-in ONLY for the /reading mounts — reports whether the
   *  identified host currently has video on, computed by the pure
   *  `hostVideoReducer` above from participantMuted/participantRoleChanged/
   *  participantJoined/participantLeft/videoConferenceJoined. Every other
   *  caller leaves this unset; the listeners below are only added when a
   *  callback is actually passed, so nothing else pays for this. */
  onHostVideo?: (on: boolean) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "live" | "ended" | "failed">("loading");

  useEffect(() => {
    let api: { dispose: () => void } | null = null;
    let live = true;
    let hostVideoTimeout: ReturnType<typeof setTimeout> | null = null;

    const boot = () => {
      if (!live || !holder.current || !window.JitsiMeetExternalAPI) return;
      /* TASK-246: belt-and-braces branding from OUR side — the server kit
       * (briefings/vps-scripts/jitsi/deploy/branding/custom-interface_config.js)
       * strips the Jitsi mark on the box itself; this override does the same
       * from the embed no matter whether that kit has been applied yet, and
       * puts ONE Cocreation's own mark up instead. Same keys as the kit so
       * client and server never disagree about what should show. */
      const markUrl = `${siteOrigin()}${cartridge.logo.mark}`;
      const a = new window.JitsiMeetExternalAPI(
        domain,
        jitsiEmbedOptions({
          room,
          parentNode: holder.current,
          displayName,
          markUrl,
          origin: siteOrigin(),
          guestView,
        }),
      );
      api = a;
      setState("live");
      // both farewell paths land HERE, not on jit.si
      a.addListener("readyToClose", () => { if (live) { setState("ended"); onEnded?.(); } });
      a.addListener("videoConferenceLeft", () => { if (live) { setState("ended"); onEnded?.(); } });

      /* TASK-479: the /reading guest mounts' own opt-in — see the block
       * comment above `hostVideoReducer`. `hv` is local, mutable state for
       * this one boot cycle only (a fresh conference gets a fresh reducer),
       * dispatched into on each wire event; `onHostVideo` fires only on an
       * actual change, never on every event. */
      if (onHostVideo) {
        let hv = initialHostVideoState;
        /* TASK-479 fix (stuck-cover-after-rejoin): a FRESH mount always
         * starts at the reducer's own fail-open `videoOn: true`, but the
         * parent's own state (ReadingStage.tsx/ReadingStageDoor.tsx) could
         * still be sitting on a stale `false` from a PRIOR mount of this
         * same room (host muted -> cover up -> viewer hangs up -> host
         * turns video on -> viewer rejoins: a new JitsiRoom boots in the
         * true state, but never told the parent, so the parent's cover
         * stayed up over a live host). Sync unconditionally, once, right
         * here — never wait for a CHANGE, since there may be none to wait
         * for if the room simply never sends another mute signal at all. */
        onHostVideo(hv.videoOn);
        const dispatch = (event: HostVideoEvent) => {
          const next = hostVideoReducer(hv, event);
          if (live && next.videoOn !== hv.videoOn) onHostVideo(next.videoOn);
          hv = next;
        };
        a.addListener("videoConferenceJoined", (data) => {
          dispatch({ type: "videoConferenceJoined", id: hostEventParticipantId(data) });
          // a re-join (e.g. a reconnect) fires this event again — clear any
          // still-pending timer first so two never race each other
          if (hostVideoTimeout) clearTimeout(hostVideoTimeout);
          hostVideoTimeout = setTimeout(() => dispatch({ type: "timeout" }), HOST_VIDEO_SAFETY_TIMEOUT_MS);
        });
        a.addListener("participantJoined", (data) => dispatch({ type: "participantJoined", id: hostEventParticipantId(data) }));
        a.addListener("participantLeft", (data) => dispatch({ type: "participantLeft", id: hostEventParticipantId(data) }));
        a.addListener("participantRoleChanged", (data) =>
          dispatch({ type: "participantRoleChanged", id: hostEventParticipantId(data), role: data.role ?? "" }),
        );
        a.addListener("participantMuted", (data) =>
          dispatch({
            type: "participantMuted",
            id: hostEventParticipantId(data),
            mediaType: data.mediaType ?? "",
            isMuted: Boolean(data.isMuted),
          }),
        );
      }
    };

    if (window.JitsiMeetExternalAPI) boot();
    else {
      const s = document.createElement("script");
      s.src = `https://${domain}/external_api.js`;
      s.async = true;
      s.onload = boot;
      s.onerror = () => { if (live) setState("failed"); };
      document.body.appendChild(s);
    }
    return () => {
      live = false;
      api?.dispose();
      if (hostVideoTimeout) clearTimeout(hostVideoTimeout);
    };
  }, [domain, room, displayName, onEnded, guestView, onHostVideo]);

  if (state === "ended") {
    return (
      <div className="card" style={{ padding: 32, textAlign: "center" }}>
        <p style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: "1.4rem", margin: "0 0 8px" }}>
          The field holds what you brought 🕊️
        </p>
        <p style={{ color: "var(--muted)", margin: "0 0 20px" }}>
          Thank you for meeting. You&apos;re home, right where you left off.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="btn" href="/me">My calendar</Link>
          <Link className="btn btn-ghost" href="/classes">The community</Link>
        </div>
      </div>
    );
  }
  if (state === "failed") {
    return (
      <p style={{ color: "var(--muted)" }}>
        The meeting room couldn&apos;t load here.{" "}
        <a href={`https://${domain}/${room}`} style={{ color: "var(--gold-deep)" }}>Open it directly</a> instead.
      </p>
    );
  }
  /* TASK-246: the wrapper takes the FULL height its parent hands it (the
   * literal passed in — "100%" for an aspect-ratio'd box, "72vh" for /meet's
   * unconstrained one) and lays it out as a column so the holder can claim
   * everything the loading line doesn't need, rather than resolving its own
   * "100%" against an auto-height parent and collapsing to Jitsi's own
   * ~240px minimum (the fault in the Admiral's picture). */
  return (
    <div style={{ height, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {state === "loading" && <p style={{ color: "var(--muted)" }}>opening the room…</p>}
      <div ref={holder} style={{ flex: 1, minHeight: 0, borderRadius: 18, overflow: "hidden", border: "1.5px solid rgba(139,118,196,.35)" }} />
    </div>
  );
}
