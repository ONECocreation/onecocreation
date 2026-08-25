"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * THE LIVE BANNER (TASK-37/S40 lane 2, H13 ruled) — a site-wide strip when
 * Love is live: "● Love is live now — join", linking to /live. When the
 * flag is dark this renders NOTHING (initial state is null, so the served
 * HTML carries no trace of it — zero layout shift when absent).
 *
 * Styling: house tokens, the rooms shelf's own proven class-chip recipe
 * (lavender wash + --info ink); the live dot wears --err. Visible, not
 * shouting; never gold — gold means money only.
 */
interface LiveFeed {
  live: boolean;
  roomTitle: string | null;
}

export default function LiveBanner() {
  const [feed, setFeed] = useState<LiveFeed | null>(null);

  useEffect(() => {
    let stop = false;
    const check = () =>
      fetch("/api/live")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!stop && d?.ok) setFeed(d.live ? { live: true, roomTitle: d.roomTitle ?? null } : null);
        })
        .catch(() => {});
    check();
    const t = setInterval(check, 30_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  if (!feed) return null;

  return (
    <Link
      href="/live"
      style={{
        display: "block",
        textAlign: "center",
        padding: "8px 16px",
        fontSize: ".82rem",
        fontWeight: 700,
        letterSpacing: ".04em",
        textDecoration: "none",
        background: "rgba(139,118,196,.16)",
        borderBottom: "1px solid rgba(139,118,196,.45)",
        color: "var(--info)",
      }}
    >
      <span style={{ color: "var(--err)" }}>●</span> Love is live now
      {feed.roomTitle ? ` — ${feed.roomTitle}` : ""} · join
    </Link>
  );
}
