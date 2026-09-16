"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * THE STUDIO ROOM, HELD ON THE SITE (TASK-297, 0018.06.25 a₿ · block
 * ~967,218) — the VDO.Ninja sibling of JitsiRoom.tsx (READ-ONLY
 * precedent, same shape on purpose): the meeting rides an iframe, and
 * when the call ends the member is still home with us — no third-party
 * farewell page, no advertisement ("I like the view we had for
 * meet.onecocreation.com — it was in the site and we never left", the
 * Admiral, T-292's brief).
 *
 * `src` is the SERVER-MINTED keyed studio URL (the page's
 * mintStudioFrameTarget — room key, both-off arrival unless the
 * pre-join card's toggles flipped a half on, `&hangupbutton`,
 * `&iframetarget=<the visitor's origin>`). The key appears in the page's
 * HTML ONLY inside this iframe src — never as bare text, never in a copy
 * field (T-292 §4's posture, pinned in tests/meet-studio.test.ts); the
 * page is force-dynamic, so the minted HTML is `no-store`. The Stage
 * already iframes the studio cross-origin (RoomVideoSlot.tsx, T-245) —
 * this is the same embed, wrapped in the meeting's chrome. The src
 * must be DIRECT, never a same-origin route that 302s to the studio:
 * Chromium does not delegate camera/mic permissions through a redirect
 * inside an iframe (A/B proven this lane, 0018.06.25).
 *
 * The end card fires on the fork's own iframe-API event: hangupComplete()
 * emits `{action:"hungup", value:true}` (fork `lib.js:20545`, delivered
 * to the parent by `pokeIframeAPI`, `lib.js:10929` → postMessage at
 * `lib.js:10968`). It reaches us because the minted frame URL carries
 * `&iframetarget=<our origin>` (fork `main.js:6728-6734`) — so the
 * listener pins BOTH the source window and the studio origin, the doc's
 * own pattern (docs.vdo.ninja/guides/iframe-api-documentation).
 *
 * T-292 §4.6's hygiene holds here: no API token rides the frame URL, no
 * code is ever evaluated from a message, no chat POST-back — this leaf
 * only ever LISTENS.
 */

/** The farewell, Love's line verbatim (JitsiRoom.tsx's end card — reuse,
 *  never rewrite). Exported so the suite can pin the words directly. */
export function VdoRoomEndCard() {
  return (
    <div className="card" style={{ padding: 32, textAlign: "center" }}>
      <p style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: "1.4rem", margin: "0 0 8px" }}>
        The field holds what you brought 🕊️
      </p>
      <p style={{ color: "var(--muted)", margin: "0 0 20px" }}>
        Thank you for meeting — you&apos;re home, right where you left off.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link className="btn" href="/me">My calendar</Link>
        <Link className="btn btn-ghost" href="/classes">The community</Link>
      </div>
    </div>
  );
}

export default function VdoRoom({
  src,
  vdoHost,
  title = "the meeting room",
  height = "72vh",
  endCard,
}: {
  /** the SERVER-MINTED keyed studio URL (mintStudioFrameTarget for the
   *  guest seat, mintStudioDirectorTarget for the director's) — appears
   *  in the page's HTML only inside this iframe's src */
  src: string;
  /** the studio's own host (config.meeting.vdoHost) — the expected
   *  postMessage origin of the frame's events; public knowledge,
   *  carried in every pre-T-297 link */
  vdoHost: string;
  title?: string;
  /** JitsiRoom's own prop shape — the parent sizes the frame */
  height?: string;
  /** TASK-306: the farewell when the frame hangs up — defaults to
   *  VdoRoomEndCard (the guest's member-facing doors). The director's
   *  desk passes its own console-flavoured card instead (the operator
   *  is not a guest; /me and /classes are not her rooms). */
  endCard?: React.ReactNode;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [state, setState] = useState<"loading" | "live" | "ended">("loading");

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      if (vdoHost && e.origin !== `https://${vdoHost}`) return;
      if (e.data && typeof e.data === "object" && e.data.action === "hungup") {
        setState("ended");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [vdoHost]);

  if (state === "ended") {
    return <>{endCard ?? <VdoRoomEndCard />}</>;
  }

  return (
    <div style={{ height, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {state === "loading" && <p style={{ color: "var(--muted)" }}>opening the room…</p>}
      <iframe
        ref={frame}
        src={src}
        onLoad={() => setState("live")}
        /* T-292 §2 Page B: a guest WITH camera — the fork's own IFRAME.md
           documents allow="autoplay;camera;microphone"; fullscreen rides
           for the in-frame expand. No sandbox attribute: the studio needs
           its localStorage and service worker, and the Stage's frames
           ship none either (RoomVideoSlot.tsx). */
        allow="camera; microphone; autoplay; fullscreen"
        title={title}
        style={{ flex: 1, minHeight: 0, width: "100%", border: "1.5px solid rgba(139,118,196,.35)", borderRadius: 18, overflow: "hidden" }}
      />
    </div>
  );
}
