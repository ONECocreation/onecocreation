"use client";

import Link from "next/link";
import RoomView from "./RoomView";
import RoomMaterialsShelf from "./RoomMaterialsShelf";
import RoomPresence from "./RoomPresence";
import type { RoomPin } from "@/lib/room-pins";

/**
 * A — THE SANCTUARY (default vantage, loves-desk-and-classroom-plan.md):
 * the chat IS the room. A re-layout wrap around the EXISTING RoomView
 * timeline/composer (unmodified) — the pinned teacher welcome leads above
 * it, a gold "Join Live Session" door surfaces only when this room is
 * actually live, and the right rail carries the Materials Shelf +
 * Presence panel.
 */
export default function SanctuaryView({
  slug, alias, title, kind, pin, live,
}: {
  slug: string;
  alias: string;
  title: string;
  kind: "class" | "community";
  pin: RoomPin | null;
  live: boolean;
}) {
  return (
    <div className="cls-grid">
      <div style={{ minWidth: 0 }}>
        {live && (
          <Link
            href="/live"
            className="btn btn-gold"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 14 }}
          >
            ● Join Live Session
          </Link>
        )}
        {pin?.text && (
          <div className="card" style={{ padding: "14px 18px", marginBottom: 14, background: "rgba(217,178,78,.1)", border: "1px solid rgba(217,178,78,.45)" }}>
            <p style={{ margin: 0, fontSize: ".62rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--gold-deep)" }}>
              📌 from Love
            </p>
            <p style={{ margin: "6px 0 0", whiteSpace: "pre-line", color: "var(--ink-body)", fontSize: ".9rem" }}>{pin.text}</p>
          </div>
        )}
        <RoomView slug={slug} alias={alias} title={title} kind={kind} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <RoomMaterialsShelf roomSlug={slug} />
        <RoomPresence alias={alias} />
      </div>
    </div>
  );
}
