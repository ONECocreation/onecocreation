"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * THE CLASS DOOR CARD (TASK-37/S40 lane 1) — the button's first home, on
 * the /a console front page. A room picker (CLASS rooms only — community
 * live is a later ruling), an optional opening message (blank = the house
 * words), Open / Close, and the class-starting letter as an explicit
 * option, DEFAULT OFF (the mail rail is reputation armor). Talks only to
 * /api/admin/live, which is operator-gated server-side like every /a
 * surface — this card never holds a credential.
 */
interface DoorFeed {
  ok: boolean;
  state: { live: boolean; kind?: string; room?: string; startedAt?: number };
  rooms: { slug: string; title: string; kind: string }[];
  matrixConfigured: boolean;
  vaultConfigured: boolean;
}

export default function LiveDoorCard() {
  const [feed, setFeed] = useState<DoorFeed | null>(null);
  const [denied, setDenied] = useState(false);
  const [room, setRoom] = useState("");
  const [message, setMessage] = useState("");
  const [letter, setLetter] = useState(false); // DEFAULT OFF — reputation armor
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/live", { cache: "no-store" })
      .then((r) => {
        if (r.status === 401) { setDenied(true); return null; }
        return r.ok ? r.json() : null;
      })
      .then((d) => {
        if (!d?.ok) return;
        setFeed(d);
        setRoom((cur) => cur || d.rooms.find((r: { kind: string }) => r.kind === "class")?.slug || "");
      })
      .catch(() => {});
  }, []);
  useEffect(load, [load]);

  async function act(action: "open" | "close") {
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch("/api/admin/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "open" ? { action, room, message: message.trim() || undefined, letter } : { action },
        ),
      });
      const d = await r.json().catch(() => null);
      if (d?.ok) {
        setNote(
          action === "open"
            ? `● open — the word landed in the room${d.letters ? ` · letter queued to ${d.letters.queued ?? 0} of ${d.letters.audience ?? 0}` : ""}`
            : d.closed
              ? `the room rests${d.goodbye?.ok ? " — the goodbye landed" : " — the goodbye did not land; the flag is down"}`
              : "the room was already dark",
        );
        if (action === "open") setMessage("");
      } else {
        setNote(d?.reason ?? `the door said no (${r.status})`);
      }
    } catch {
      setNote("the door could not be reached");
    }
    setBusy(false);
    load();
  }

  if (denied || !feed) return null;

  const classRooms = feed.rooms.filter((r) => r.kind === "class");
  const liveTitle = feed.state.live ? feed.rooms.find((r) => r.slug === feed.state.room)?.title : null;
  const railsDark = !feed.matrixConfigured || !feed.vaultConfigured;

  return (
    <div className="mt-6 border border-neutral-800 p-4 text-sm">
      <h2 className="text-sm text-neutral-100">● The class door — open the room</h2>

      {feed.state.live ? (
        <div className="mt-2">
          <p className="text-xs text-neutral-300">
            <b className="text-rose-300">● LIVE</b> — {liveTitle ?? feed.state.room}
            {feed.state.startedAt
              ? ` · since ${new Date(feed.state.startedAt * 1000).toUTCString().slice(17, 22)} UTC`
              : ""}
            . The banner is up and <a className="underline" href="/live">/live</a> carries the door.
          </p>
          <button className="btn btn-sm mt-2" onClick={() => act("close")} disabled={busy}>
            {busy ? "Closing…" : "Close the room 🕊️"}
          </button>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-300">
            <label htmlFor="live-door-room">Room</label>
            <select
              id="live-door-room"
              className="border border-neutral-700 bg-transparent px-2 py-1 text-xs text-neutral-200"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            >
              {classRooms.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.title}
                </option>
              ))}
            </select>
            <button className="btn btn-sm" onClick={() => act("open")} disabled={busy || !room || railsDark}>
              {busy ? "Opening…" : "Open the room ●"}
            </button>
          </div>
          <input
            type="text"
            className="w-full border border-neutral-700 bg-transparent px-2 py-1 text-xs text-neutral-200"
            placeholder="Opening word (optional — blank carries the house words)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={300}
          />
          <label className="flex items-center gap-2 text-xs text-neutral-400">
            <input type="checkbox" checked={letter} onChange={(e) => setLetter(e.target.checked)} />
            also queue the class-starting letter to the members this room opens for (off by default —
            the mail rail is reputation armor)
          </label>
          {railsDark && (
            <p className="text-xs text-neutral-500">
              the rails are dark (matrix bot token / live vault not configured here) — the door opens on the live site
            </p>
          )}
        </div>
      )}

      {note && <p className="mt-2 text-xs text-neutral-300">{note}</p>}
    </div>
  );
}
