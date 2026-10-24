"use client";

import { useEffect, useRef } from "react";
import { useLiveRooms, type LiveRoomFields, type LiveRoomHandlers, type LiveRoomIdentity } from "./LiveRoomContext";

/**
 * THE LIVE-ROOM BRIDGE (T-639 BUILD, K184 block 972,965) — what a room-owning
 * page renders in the exact seat the embed used to occupy. It does two
 * things and nothing else:
 *
 *   1. join()s the layout-owned live-room store with its identity (kind +
 *      domain + room), the display fields (title, chip, the camera cover),
 *      and the owner's own handlers — then keeps them current on every
 *      render. join() is idempotent by identity: a fields-only change never
 *      remounts the embed playing in the dock.
 *   2. reports its own rect on scroll/resize, so the dock's stage mode can
 *      sit EXACTLY where the room used to mount while the owner is on
 *      screen.
 *
 * The unmount cleanup DETACHES ONLY — never leaves. An unmount is client
 * navigation (or the owner's own left/ended swap), and the room survives
 * navigation; the owners' end paths (the poll finding the door closed, the
 * story retired) call the context's dismissIf themselves. Without a
 * provider (the repo's renderToStaticMarkup test idiom) the bridge is just
 * the placeholder — every existing owner-side pin keeps working.
 *
 * The placeholder itself is invisible (aria-hidden): the dock's stage-mode
 * window sits exactly over it. Its quiet "Opening the room…" line is the
 * pre-hydration first paint the embed's own SSR holder used to give.
 */
export default function LiveRoomBridge({
  kind,
  domain,
  room,
  title,
  homePath,
  homeLabel,
  chip,
  coverUp,
  onEnded,
  onFailed,
  onJoined,
  onRejoin,
}: LiveRoomIdentity & LiveRoomFields & LiveRoomHandlers) {
  const live = useLiveRooms();
  const ref = useRef<HTMLDivElement>(null);

  /* no deps array on purpose: join() is the idempotent update path — the
     chip text and the camera cover flip WITHOUT a remount (the camera
     site-switch is the live case), and the handlers stay fresh. */
  useEffect(() => {
    live?.join({ kind, domain, room }, { title, homePath, homeLabel, chip, coverUp }, { onEnded, onFailed, onJoined, onRejoin });
  });

  useEffect(() => {
    if (!live) return;
    const el = ref.current;
    if (!el) return;
    const identity: LiveRoomIdentity = { kind, domain, room };
    const report = () => {
      const r = el.getBoundingClientRect();
      live.reportRect(identity, { top: r.top, left: r.left, width: r.width, height: r.height });
    };
    report();
    window.addEventListener("scroll", report, { passive: true, capture: true });
    window.addEventListener("resize", report);
    return () => {
      window.removeEventListener("scroll", report, { capture: true });
      window.removeEventListener("resize", report);
      live.detach(identity);
    };
  }, [live, kind, domain, room]);

  return (
    <div ref={ref} className="lrd-bridge" aria-hidden="true">
      <p className="lrd-bridge-note">Opening the room…</p>
    </div>
  );
}
