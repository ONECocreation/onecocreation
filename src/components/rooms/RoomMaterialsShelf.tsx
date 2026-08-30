"use client";

import { useEffect, useState } from "react";
import type { MaterialItem, MaterialKind } from "@/lib/class-materials";

/**
 * The Sanctuary's right-rail Materials Shelf (loves-desk-and-classroom-
 * plan.md, Lane ROOM) — a member-facing, read-only wrap of the tier-gated
 * `GET /api/rooms/[slug]/materials` (Lane DESK). No upload here — that
 * door is the operator's (`/a`'s MaterialsShelf); members only ever read.
 */

const KIND_LABEL: Record<MaterialKind, string> = { recording: "recording", pdf: "pdf", file: "file" };

interface Feed {
  ok: boolean;
  open?: boolean;
  items?: MaterialItem[];
  reason?: string;
}

export default function RoomMaterialsShelf({ roomSlug }: { roomSlug: string }) {
  const [feed, setFeed] = useState<Feed | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/rooms/${encodeURIComponent(roomSlug)}/materials`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { ok: false }))
      .then((d) => { if (alive) setFeed(d); })
      .catch(() => { if (alive) setFeed({ ok: false }); });
    return () => { alive = false; };
  }, [roomSlug]);

  const items = feed?.items ?? [];

  return (
    <div className="card" style={{ padding: "14px 18px" }}>
      <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: ".98rem", margin: "0 0 10px", color: "var(--ink-strong)" }}>
        Materials
      </h3>
      {!feed && <p style={{ color: "var(--muted)", fontSize: ".82rem", margin: 0 }}>opening the shelf…</p>}
      {feed && !feed.ok && (
        <p style={{ color: "var(--muted)", fontSize: ".82rem", margin: 0 }}>
          {feed.reason === "materials vault not configured" ? "the shelf isn't configured here yet" : "the shelf didn't answer — try again in a moment"}
        </p>
      )}
      {feed?.ok && !feed.open && (
        <p style={{ color: "var(--muted)", fontSize: ".82rem", margin: 0 }}>this shelf opens with your room</p>
      )}
      {feed?.ok && feed.open && items.length === 0 && (
        <p style={{ color: "var(--muted)", fontSize: ".82rem", margin: 0 }}>nothing on the shelf yet</p>
      )}
      {feed?.ok && feed.open && items.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((m) => (
            <li key={m.id} style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <a href={m.url} target="_blank" rel="noreferrer" style={{ color: "var(--gold-deep)", fontSize: ".86rem", textDecoration: "none" }}>
                {m.name}
              </a>
              <span style={{ fontSize: ".62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                {KIND_LABEL[m.kind]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
