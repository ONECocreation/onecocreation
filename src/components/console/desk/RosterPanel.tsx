"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { soulsOnline, type Soul } from "@/components/rooms/RoomPresence";

/**
 * The roster rail (Love's Desk Week "who's here" / Day "roster tonight") —
 * the joined-member count still rides the bot's own session
 * (/api/admin/classroom/roster → matrix.ts's roomRoster), and TASK-160
 * (0018.06.17 a₿ · block 966,055) adds the ONLINE truth on top: the route
 * now also hands back the joined map + the bot-token presence batch, and
 * this panel runs T-149's exported soulsOnline/isOnline/handleOf — the
 * SAME filter the room's own who's-here rail uses — so the desk sees who
 * is here NOW, display names first (a keyed member with no name wears the
 * handle, never the raw mxid). A soul the server won't speak for simply
 * isn't listed — never an invented dot. The empty truth reads "— nobody
 * here yet" (derive-or-dash). The ghost door into the live room itself
 * stays for anything richer.
 */
export default function RosterPanel({ roomSlug, roomTitle }: { roomSlug: string | null; roomTitle: string | null }) {
  // no guard-branch setState here on purpose (react-hooks/set-state-in-
  // effect): the "no room picked" render branch below reads `roomSlug`
  // directly instead of a mirrored state flag, so the effect body only
  // ever calls setState from inside the fetch's own callbacks.
  const [state, setState] = useState<"loading" | "ok" | "dark">("loading");
  const [count, setCount] = useState(0);
  const [souls, setSouls] = useState<Soul[]>([]);

  const load = useCallback(() => {
    if (!roomSlug) return;
    fetch(`/api/admin/classroom/roster?room=${encodeURIComponent(roomSlug)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.ok) { setState("dark"); return; }
        setCount(d.count ?? 0);
        setSouls(soulsOnline(d.joined ?? {}, d.presence ?? {}));
        setState("ok");
      })
      .catch(() => setState("dark"));
  }, [roomSlug]);
  useEffect(load, [load]);

  return (
    <div className="desk-panel">
      <div className="desk-panel__head">
        <h3>Roster</h3>
        {roomSlug && (
          <Link className="btn btn-ghost btn-sm" href={`/rooms/${roomSlug}`}>
            open {roomTitle ?? "room"} live room →
          </Link>
        )}
      </div>
      {!roomSlug && <p className="desk-panel__muted">pick a room to see who&apos;s joined</p>}
      {roomSlug && state === "loading" && <p className="desk-panel__muted">reading the room…</p>}
      {roomSlug && state === "dark" && (
        <p className="desk-panel__muted">
          the matrix bot isn&apos;t configured here — <Link href={`/rooms/${roomSlug}`}>open the live room</Link> instead
        </p>
      )}
      {roomSlug && state === "ok" && (
        <>
          <p className="desk-panel__count">
            {count} joined · {souls.length} here now
          </p>
          {souls.length === 0 ? (
            <p className="desk-panel__muted">— nobody here yet</p>
          ) : (
            <ul className="desk-shelf__list">
              {souls.slice(0, 12).map((s) => <li key={s.mxid} className="desk-roster__name">{s.name}</li>)}
              {souls.length > 12 && <li className="desk-panel__muted">+{souls.length - 12} more</li>}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
