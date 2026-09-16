"use client";

import { useState } from "react";
import VdoRoom from "@/components/booking/VdoRoom";

/**
 * THE PRE-JOIN CARD (TASK-297, 0018.06.25 a₿ · block ~967,218) — the one
 * beat before the room opens: your name (prefilled from the member
 * session when the site knows you, a field otherwise), camera and mic
 * BOTH OFF by default with a toggle each (Love's call #4 item 6 ruling:
 * "video and mic off when people join… guests choose"), and the one
 * honest line from item 9: allow camera and microphone when your browser
 * asks. Joining mounts the room itself (VdoRoom) addressed by our OWN
 * same-origin frame route — the toggles ride its query, and the frame
 * route's server mint honours them (room-access.ts's
 * mintStudioFrameTarget). No key, no secret, no vdo host in any prop —
 * this island never touches one.
 */

const wrap: React.CSSProperties = {
  border: "1.5px solid rgba(139,118,196,.35)",
  borderRadius: 18,
  padding: "26px 22px",
  maxWidth: 520,
  margin: "0 auto",
  textAlign: "center",
};

const toggleRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  justifyContent: "center",
  flexWrap: "wrap",
  margin: "14px 0 4px",
};

export default function PreJoin({
  room,
  vdoHost,
  roomTitle,
  initialName,
}: {
  room: string;
  vdoHost: string;
  roomTitle: string;
  initialName: string;
}) {
  const [name, setName] = useState(initialName);
  const [camera, setCamera] = useState(false);
  const [mic, setMic] = useState(false);
  const [joined, setJoined] = useState(false);

  if (joined) {
    const q = `label=${encodeURIComponent(name.trim() || "Guest")}&camera=${camera ? 1 : 0}&mic=${mic ? 1 : 0}`;
    return (
      <VdoRoom
        src={`/meet/studio/frame/${encodeURIComponent(room)}?${q}`}
        vdoHost={vdoHost}
        title={roomTitle}
      />
    );
  }

  return (
    <div style={wrap}>
      <p style={{ margin: "0 0 14px", color: "var(--ink-body)", fontSize: ".92rem" }}>
        the room opens right here, inside the site — you never leave home for it.
      </p>
      <label style={{ display: "block", marginBottom: 12 }}>
        <span style={{ display: "block", fontSize: ".68rem", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>
          the name the room sees
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Guest"
          maxLength={48}
          style={{ width: "100%", textAlign: "center" }}
        />
      </label>
      <div style={toggleRow}>
        <button
          type="button"
          aria-pressed={camera}
          onClick={() => setCamera((v) => !v)}
          className={`btn btn-sm ${camera ? "btn-on" : "btn-ghost"}`}
        >
          camera {camera ? "on" : "off"}
        </button>
        <button
          type="button"
          aria-pressed={mic}
          onClick={() => setMic((v) => !v)}
          className={`btn btn-sm ${mic ? "btn-on" : "btn-ghost"}`}
        >
          mic {mic ? "on" : "off"}
        </button>
      </div>
      <p style={{ margin: "0 0 16px", fontSize: ".78rem", color: "var(--muted)" }}>
        you arrive with both off unless you flip them here — and you can change your mind inside the room, too.
      </p>
      <button type="button" className="btn" onClick={() => setJoined(true)}>
        Join the room
      </button>
      <p style={{ margin: "14px 0 0", fontSize: ".78rem", color: "var(--muted)" }}>
        allow camera and microphone when your browser asks.
      </p>
    </div>
  );
}
