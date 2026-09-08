"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * THE MEMBER-HEADER LIVE STRIP (TASK-192, 0018.06.18 a₿ · H69 ruled A) —
 * when a room is live, a slim line under the site header on every public
 * page: "Love is live · <room> · Join" → the room's Stage (gated by
 * T-174's door — the room's own gate decides who walks in). Derived from
 * the SAME live flag as everything else — the tiny public /api/live read,
 * never a second store. Hidden when nothing is live (initial state null,
 * so the served HTML carries no trace — zero layout shift), and hidden
 * under /a, where the operator's own desk already carries the truth.
 *
 * Styling: house tokens, slimmer than the old banner; the live dot wears
 * --err, the wash is lavender — never gold (gold means money only).
 */
export interface LiveStripFeed {
  live: boolean;
  room: string | null;
  roomTitle: string | null;
}

/** The strip's model, pure: a live flag with a room gives the one line and
 *  its href (the room's Stage); anything else gives NOTHING — the strip's
 *  absence is as honest as its presence. Exported for the tests. */
export function stripModel(feed: LiveStripFeed | null): { href: string; label: string } | null {
  if (!feed?.live || !feed.room) return null;
  return {
    href: `/rooms/${feed.room}`,
    label: `Love is live · ${feed.roomTitle ?? feed.room} · Join`,
  };
}

export default function LiveStrip() {
  const pathname = usePathname() ?? "";
  const [feed, setFeed] = useState<LiveStripFeed | null>(null);

  useEffect(() => {
    let stop = false;
    const check = () =>
      fetch("/api/live")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (stop || !d?.ok) return;
          setFeed(d.live ? { live: true, room: d.room ?? null, roomTitle: d.roomTitle ?? null } : null);
        })
        .catch(() => {});
    check();
    const t = setInterval(check, 30_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  /* the desk already carries the truth — never double-speak under /a */
  if (pathname === "/a" || pathname.startsWith("/a/")) return null;

  const model = stripModel(feed);
  if (!model) return null;

  return (
    <Link
      href={model.href}
      style={{
        display: "block",
        textAlign: "center",
        padding: "5px 16px",
        fontSize: ".78rem",
        fontWeight: 700,
        letterSpacing: ".04em",
        textDecoration: "none",
        background: "rgba(139,118,196,.14)",
        borderBottom: "1px solid rgba(139,118,196,.4)",
        color: "var(--info)",
      }}
    >
      <span style={{ color: "var(--err)" }}>●</span> {model.label}
    </Link>
  );
}
