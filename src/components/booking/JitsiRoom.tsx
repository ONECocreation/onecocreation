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
declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, opts: Record<string, unknown>) => {
      addListener: (ev: string, cb: () => void) => void;
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

export default function JitsiRoom({
  domain,
  room,
  displayName,
  onEnded,
  height = "72vh",
  guestView,
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
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "live" | "ended" | "failed">("loading");

  useEffect(() => {
    let api: { dispose: () => void } | null = null;
    let live = true;

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
    return () => { live = false; api?.dispose(); };
  }, [domain, room, displayName, onEnded, guestView]);

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
