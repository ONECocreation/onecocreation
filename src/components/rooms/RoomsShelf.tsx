"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * THE ROOMS PAGE (C4, mockup 1 blessed 0018.05.14): your rooms say enter;
 * the ones above your tier stay visible but softly locked — the lock is an
 * invitation, not a wall. Signed out, every door points at the welcome path.
 */
interface RoomCard {
  slug: string;
  alias: string;
  title: string;
  kind: "class" | "community";
  minTier: string;
  neededName: string | null;
  open: boolean;
}
interface Feed {
  signedIn: boolean;
  handle: string | null;
  tier: string | null;
  tierName: string | null;
  rooms: RoomCard[];
}

const TIER_SLUG: Record<string, string> = {
  A: "weekly-intuitive",
  B: "observer",
  C: "evening-star",
};

export default function RoomsShelf() {
  const [feed, setFeed] = useState<Feed | null>(null);

  useEffect(() => {
    fetch("/api/matrix/rooms")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.ok && setFeed(d))
      .catch(() => {});
  }, []);

  if (!feed) return <p style={{ color: "var(--muted)" }}>opening the rooms…</p>;

  /* THE SHELF ORDER (Admiral, 0018.05.18): the Community Circle leads, then
     each package holds its own labeled row — a divider keeps the rows
     honest on mobile too. */
  const groups: { label: string; accent: string; rooms: RoomCard[] }[] = [
    { label: "Heart Field Commons · Community Circle", accent: "#a34e6c", rooms: feed.rooms.filter((r) => r.minTier === "all") },
    { label: "Weekly Intuitive", accent: "#5f4b96", rooms: feed.rooms.filter((r) => r.minTier === "A") },
    { label: "Observer", accent: "#a34e6c", rooms: feed.rooms.filter((r) => r.minTier === "B") },
    { label: "Evening Star", accent: "#b4862b", rooms: feed.rooms.filter((r) => r.minTier === "C") },
  ];

  const roomCard = (r: RoomCard) => (
          <div
            key={r.slug}
            className="card"
            style={{ padding: "14px 18px", opacity: r.open ? 1 : 0.82 }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <span
                style={{
                  borderRadius: 999,
                  padding: "3px 12px",
                  fontSize: ".64rem",
                  fontWeight: 700,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  ...(r.kind === "class"
                    ? { background: "rgba(139,118,196,.16)", color: "var(--info)", border: "1px solid rgba(139,118,196,.45)" }
                    : { background: "rgba(197,110,139,.13)", color: "var(--err)", border: "1px solid rgba(197,110,139,.4)" }),
                }}
              >
                {r.kind === "class" ? "Class" : "Commons"}
              </span>
              <span
                style={{
                  borderRadius: 999,
                  padding: "3px 12px",
                  fontSize: ".64rem",
                  fontWeight: 700,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  ...(r.open
                    ? { background: "rgba(78,138,95,.14)", color: "var(--ok)", border: "1px solid rgba(78,138,95,.4)" }
                    : { background: "rgba(137,127,151,.12)", color: "var(--muted)", border: "1px dashed rgba(137,127,151,.5)" }),
                }}
              >
                {r.open
                  ? r.minTier === "all" ? "open to all members" : "yours"
                  : `🔒 ${r.neededName ?? "members"}`}
              </span>
            </div>
            <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.08rem", margin: "0 0 4px" }}>
              {r.title}
            </h3>
            <p style={{ color: "var(--muted)", fontSize: ".82rem", margin: "0 0 14px" }}>
              {r.open
                ? r.kind === "class" ? "your classroom — Love holds the field" : "your commons — say hello"
                : r.neededName
                  ? `opens with the ${r.neededName} package`
                  : "opens with any membership"}
            </p>
            {r.open ? (
              <Link className="btn btn-gold btn-sm" href={`/rooms/${r.slug}`}>
                Enter the room
              </Link>
            ) : !feed.signedIn ? (
              r.minTier === "all" ? (
                <Link className="btn btn-gold btn-sm" href="/login">
                  Sign in · join free
                </Link>
              ) : (
                /* paid rooms are not free — say so honestly (Admiral) */
                <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link className="btn btn-ghost btn-sm" href="/login">Sign in</Link>
                  <Link className="btn btn-gold btn-sm" href={`/packages/${TIER_SLUG[r.minTier]}`}>
                    Get {r.neededName} →
                  </Link>
                </span>
              )
            ) : (
              <Link
                className="btn btn-ghost btn-sm"
                href={r.neededName ? `/packages/${TIER_SLUG[r.minTier]}` : "/memberships"}
              >
                See {r.neededName ?? "memberships"} →
              </Link>
            )}
          </div>
  );

  return (
    <div>
      {groups.map((g) =>
        g.rooms.length === 0 ? null : (
          <section key={g.label} style={{ marginBottom: 16 }}>
            {/* the divider — a labeled rule that survives every width */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <span
                style={{
                  borderRadius: 999,
                  padding: "4px 16px",
                  fontSize: ".72rem",
                  fontWeight: 700,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: g.accent,
                  border: `1.5px solid ${g.accent}55`,
                  background: `${g.accent}12`,
                  whiteSpace: "nowrap",
                }}
              >
                {g.label}
              </span>
              <span style={{ flex: 1, height: 1, background: `${g.accent}33` }} />
            </div>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(min(290px,100%), 1fr))",
              }}
            >
              {g.rooms.map(roomCard)}
            </div>
          </section>
        ),
      )}
      <p className="note" style={{ marginTop: 26 }}>
        {feed.signedIn ? (
          <>
            Your rooms open with your package and close kindly if it lapses. Your account —{" "}
            <b>@{feed.handle}:onecocreation.com</b> — lives on Love&apos;s own server, and works in{" "}
            <a href="https://app.element.io" target="_blank" rel="noreferrer" style={{ color: "var(--gold-deep)" }}>
              Element
            </a>{" "}
            on your phone too.
          </>
        ) : (
          <>
            The rooms live on One Cocreation&apos;s own server — nobody in between.{" "}
            <Link href="/login" style={{ color: "var(--gold-deep)" }}>Sign in or claim your free name</Link>{" "}
            and the Commons opens for you.
          </>
        )}
      </p>
    </div>
  );
}
