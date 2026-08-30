"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

/**
 * The roster rail (Love's Desk Week "who's here" / Day "roster tonight") —
 * honest joined-member count + names from the bot's own session
 * (/api/admin/classroom/roster → matrix.ts's roomRoster). There is no
 * presence API anywhere in this house, so this never invents an online
 * dot — only "who has joined", with a ghost door into the live room
 * itself for anything richer.
 */
export default function RosterPanel({ roomSlug, roomTitle }: { roomSlug: string | null; roomTitle: string | null }) {
  // no guard-branch setState here on purpose (react-hooks/set-state-in-
  // effect): the "no room picked" render branch below reads `roomSlug`
  // directly instead of a mirrored state flag, so the effect body only
  // ever calls setState from inside the fetch's own callbacks.
  const [state, setState] = useState<"loading" | "ok" | "dark">("loading");
  const [count, setCount] = useState(0);
  const [names, setNames] = useState<string[]>([]);

  const load = useCallback(() => {
    if (!roomSlug) return;
    fetch(`/api/admin/classroom/roster?room=${encodeURIComponent(roomSlug)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.ok) { setState("dark"); return; }
        setCount(d.count ?? 0);
        setNames(d.names ?? []);
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
          <p className="desk-panel__count">{count} joined</p>
          {names.length > 0 && (
            <ul className="desk-shelf__list">
              {names.slice(0, 12).map((n) => <li key={n} className="desk-roster__name">{n}</li>)}
              {names.length > 12 && <li className="desk-panel__muted">+{names.length - 12} more</li>}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
