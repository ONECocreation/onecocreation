"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * The meeting, held ON the site (Admiral, 0018.05.17): the jitsi room rides
 * an embed, and when the call ends the member is still home with us — no
 * third-party farewell page, no advertisement.
 */
declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, opts: Record<string, unknown>) => {
      addListener: (ev: string, cb: () => void) => void;
      dispose: () => void;
    };
  }
}

export default function JitsiRoom({
  domain,
  room,
  displayName,
}: {
  domain: string;
  room: string;
  displayName?: string;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "live" | "ended" | "failed">("loading");

  useEffect(() => {
    let api: { dispose: () => void } | null = null;
    let live = true;

    const boot = () => {
      if (!live || !holder.current || !window.JitsiMeetExternalAPI) return;
      const a = new window.JitsiMeetExternalAPI(domain, {
        roomName: room,
        parentNode: holder.current,
        width: "100%",
        height: "100%",
        userInfo: displayName ? { displayName } : undefined,
        configOverwrite: { prejoinConfig: { enabled: true }, disableDeepLinking: true },
      });
      api = a;
      setState("live");
      // both farewell paths land HERE, not on jit.si
      a.addListener("readyToClose", () => { if (live) setState("ended"); });
      a.addListener("videoConferenceLeft", () => { if (live) setState("ended"); });
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
  }, [domain, room, displayName]);

  if (state === "ended") {
    return (
      <div className="card" style={{ padding: 32, textAlign: "center" }}>
        <p style={{ fontFamily: "var(--serif)", fontSize: "1.4rem", margin: "0 0 8px" }}>
          The field holds what you brought 🕊️
        </p>
        <p style={{ color: "var(--muted)", margin: "0 0 20px" }}>
          Thank you for meeting — you&apos;re home, right where you left off.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="btn btn-gold" href="/me">My calendar</Link>
          <Link className="btn btn-ghost" href="/classes">The community</Link>
        </div>
      </div>
    );
  }
  if (state === "failed") {
    return (
      <p style={{ color: "var(--muted)" }}>
        The meeting room couldn&apos;t load here —{" "}
        <a href={`https://${domain}/${room}`} style={{ color: "var(--gold-deep)" }}>open it directly</a> instead.
      </p>
    );
  }
  return (
    <div>
      {state === "loading" && <p style={{ color: "var(--muted)" }}>opening the room…</p>}
      <div ref={holder} style={{ height: "72vh", borderRadius: 18, overflow: "hidden", border: "1.5px solid rgba(139,118,196,.35)" }} />
    </div>
  );
}
