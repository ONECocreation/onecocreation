"use client";

import { useCallback, useEffect, useState } from "react";
import type { CalendarDayCell } from "@/lib/calendar-view";
import { field, Chip } from "@/components/console/glass";
import MaterialsShelf from "./MaterialsShelf";
import RosterPanel from "./RosterPanel";
import { civilKeyOf, timeLabel } from "./marks";
import type { DeskFeed, DeskRoom } from "./types";

/**
 * Love's Desk — Day ("the class"): the pinned welcome, this session's
 * shelf, roster tonight, and "around this day" — the ruled spec's fourth
 * pane. The pin editor lives here (Day-only, so it stays local rather than
 * its own file).
 */

function PinEditor({ roomSlug, roomTitle }: { roomSlug: string | null; roomTitle: string | null }) {
  const [pin, setPin] = useState<{ text: string; updatedAtMs: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // no guard-branch setState (react-hooks/set-state-in-effect) — the
  // component already returns its own "no room" render early, below,
  // before `pin` is ever read, so a stale `pin` here is harmless.
  const load = useCallback(() => {
    if (!roomSlug) return;
    fetch(`/api/admin/classroom/pins?room=${encodeURIComponent(roomSlug)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.ok) setPin(d.pin); })
      .catch(() => {});
  }, [roomSlug]);
  useEffect(load, [load]);

  async function save() {
    if (!roomSlug) return;
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/admin/classroom/pins", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: roomSlug, text: draft }),
    }).then((r) => r.json()).catch(() => null);
    setBusy(false);
    if (!res?.ok) { setNote(res?.reason ?? "save failed"); return; }
    setNote(
      res.matrixPinned
        ? "pinned ✓ — also live-pinned in the room"
        : `saved ✓ — the room mirror didn't land (${res.matrixReason ?? "unknown reason"})`,
    );
    setEditing(false);
    load();
  }

  if (!roomSlug) {
    return (
      <div className="desk-panel">
        <div className="desk-panel__head"><h3>Pinned welcome</h3></div>
        <p className="desk-panel__muted">pick a room to set its welcome</p>
      </div>
    );
  }

  return (
    <div className="desk-panel">
      <div className="desk-panel__head">
        <h3>Pinned welcome — {roomTitle}</h3>
        {!editing && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setDraft(pin?.text ?? ""); setEditing(true); }}>
            edit
          </button>
        )}
      </div>
      {!editing && (pin
        ? <p className="desk-pin__text">📌 {pin.text}</p>
        : <p className="desk-panel__muted">no welcome pinned yet</p>)}
      {editing && (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Come as you are, beautiful soul…"
            style={{ ...field, width: "100%", minHeight: 72, resize: "vertical" }}
            maxLength={600}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-sm" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save & pin"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)} disabled={busy}>
              cancel
            </button>
          </div>
        </div>
      )}
      {note && <p className="desk-panel__note">{note}</p>}
    </div>
  );
}

export default function DayAltitude({
  cell,
  feed,
  rooms,
  liveNowRoomSlug,
  selectedRoomSlug,
  onSelectRoom,
}: {
  cell: CalendarDayCell;
  feed: DeskFeed | null;
  rooms: DeskRoom[];
  liveNowRoomSlug: string | null;
  selectedRoomSlug: string | null;
  onSelectRoom: (slug: string) => void;
}) {
  const dayBookings = (feed?.bookings ?? [])
    .filter((b) => civilKeyOf(b.startUtc) === cell.civilKey)
    .sort((a, b) => (a.startUtc < b.startUtc ? -1 : 1));
  const featured = dayBookings[0] ?? null;
  const sessionKey = featured?.bookingId ?? cell.civilKey;

  const override = feed?.overrides.find((o) => o.date === cell.civilKey);
  const isRetreat = !!override?.note?.toLowerCase().startsWith("retreat");
  const isBlackout = !!override && override.kind === "blocked" && !override.start && !isRetreat;

  const nowIso = new Date().toISOString();
  const next = (feed?.bookings ?? [])
    .filter((b) => b.startUtc >= nowIso)
    .sort((a, b) => (a.startUtc < b.startUtc ? -1 : 1))[0] ?? null;

  const room = rooms.find((r) => r.slug === selectedRoomSlug) ?? null;
  const liveHere = !!liveNowRoomSlug && liveNowRoomSlug === selectedRoomSlug;

  return (
    <div>
      <div className="desk-room-picker">
        <label htmlFor="desk-day-room">room</label>
        <select id="desk-day-room" value={selectedRoomSlug ?? ""} onChange={(e) => onSelectRoom(e.target.value)}>
          {rooms.map((r) => <option key={r.slug} value={r.slug}>{r.title}</option>)}
        </select>
        {liveHere && <Chip tone="gold">● LIVE now</Chip>}
      </div>

      <div className="desk-day-grid">
      <div>
      <PinEditor roomSlug={selectedRoomSlug} roomTitle={room?.title ?? null} />

      <MaterialsShelf
        roomSlug={selectedRoomSlug}
        sessionKey={sessionKey}
        sessionLabel={featured ? featured.title : "this session"}
      />
      </div>

      <div>
      <RosterPanel roomSlug={selectedRoomSlug} roomTitle={room?.title ?? null} />

      <div className="desk-panel">
        <div className="desk-panel__head"><h3>Around this day</h3></div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          {isBlackout && <Chip tone="rose">day off</Chip>}
          {isRetreat && <Chip tone="teal">retreat</Chip>}
          {!isBlackout && !isRetreat && dayBookings.length === 0 && <Chip tone="grey">open</Chip>}
        </div>
        {next
          ? (
            <p className="desk-panel__muted">
              next up: <b>{next.title}</b> — {timeLabel(next.startUtc)}
            </p>
          )
          : <p className="desk-panel__muted">nothing else on the books</p>}
      </div>
      </div>
      </div>
    </div>
  );
}
