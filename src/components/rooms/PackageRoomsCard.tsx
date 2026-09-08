"use client";

import Link from "next/link";
import type { RoomPackage } from "@/lib/matrix-rooms";

/**
 * TASK-150 (0018.06.17 a₿) — ONE CARD PER PACKAGE. Love: the rooms shelf
 * had "too many buttons on the bottom" (two cards per package). The card
 * names the package, lists its rooms as small lines (open rooms are their
 * own text doors), and carries ONE button: ENTER when the member holds the
 * tier, SEE <PACKAGE> when not. Signed out, the Commons' door is the
 * welcome path — sign in · join free. Shared by RoomsShelf (/classes) and
 * CircleView's grid under the class calendar, so the door-shape never
 * drifts between the two shelves. `compact` matches The Circle's denser
 * cards.
 */
export interface PackageRoomLine {
  slug: string;
  title: string;
  open: boolean;
}

export default function PackageRoomsCard({
  pkg,
  signedIn,
  compact = false,
}: {
  pkg: RoomPackage<PackageRoomLine>;
  signedIn: boolean;
  compact?: boolean;
}) {
  const pill = pkg.open
    ? pkg.tier === "all"
      ? "open to all members"
      : "yours"
    : `🔒 ${pkg.name}`;
  const blurb = pkg.open
    ? pkg.tier === "all"
      ? "your commons — say hello"
      : "your rooms — Love holds the field"
    : `opens with the ${pkg.name} package`;

  return (
    <div
      className="card"
      style={{ padding: compact ? "12px 16px" : "14px 18px", opacity: pkg.open ? 1 : 0.82 }}
    >
      {compact ? (
        <p
          style={{
            margin: "0 0 6px",
            fontSize: ".6rem",
            fontWeight: 700,
            letterSpacing: ".07em",
            textTransform: "uppercase",
            color: pkg.open ? "var(--ok)" : "var(--muted)",
          }}
        >
          {pill}
        </p>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <span
            style={{
              borderRadius: 999,
              padding: "3px 12px",
              fontSize: ".64rem",
              fontWeight: 700,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              ...(pkg.open
                ? { background: "rgba(78,138,95,.14)", color: "var(--ok)", border: "1px solid rgba(78,138,95,.4)" }
                : { background: "rgba(137,127,151,.12)", color: "var(--muted)", border: "1px dashed rgba(137,127,151,.5)" }),
            }}
          >
            {pill}
          </span>
        </div>
      )}
      {compact ? (
        <h4 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: ".96rem", margin: "0 0 8px", color: "var(--ink-strong)" }}>
          {pkg.name}
        </h4>
      ) : (
        <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.08rem", margin: "0 0 4px" }}>
          {pkg.name}
        </h3>
      )}
      {!compact && (
        <p style={{ color: "var(--muted)", fontSize: ".82rem", margin: "0 0 10px" }}>{blurb}</p>
      )}
      {/* the rooms as small lines — an open room's own title is its text
          door (the package keeps ONE button; the lines are links, not
          buttons); a locked room's line stays plain, the card's lock pill
          says why */}
      <ul style={{ listStyle: "none", margin: "0 0 14px", padding: 0, display: "grid", gap: 4 }}>
        {pkg.rooms.map((r) => (
          <li key={r.slug} style={{ fontSize: ".82rem", lineHeight: 1.35 }}>
            {r.open ? (
              <Link href={`/rooms/${r.slug}`} aria-label={`Enter ${r.title}`} style={{ color: "var(--gold-deep)" }}>
                {r.title}
              </Link>
            ) : (
              <span style={{ color: "var(--muted)" }}>{r.title}</span>
            )}
          </li>
        ))}
      </ul>
      {pkg.open ? (
        <Link className="btn btn-sm" href={`/rooms/${pkg.primary.slug}`}>
          Enter
        </Link>
      ) : !signedIn && pkg.tier === "all" ? (
        <Link className="btn btn-sm" href="/login">
          Sign in · join free
        </Link>
      ) : (
        /* paid rooms are not free — say so honestly (Admiral); the package
           page carries the sign-in and the door */
        <Link
          className="btn btn-ghost btn-sm"
          href={pkg.packageSlug ? `/packages/${pkg.packageSlug}` : "/memberships"}
        >
          See {pkg.name}
        </Link>
      )}
    </div>
  );
}
