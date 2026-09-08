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
 *
 * TASK-162 (0018.06.17 a₿ · block 966,080): a room line the homeserver
 * SAYS isn't there yet (live === false in the feed) wears "— opens soon"
 * in words. live === null (the server won't say) paints nothing —
 * derive-or-dash, never an invented marker.
 *
 * TASK-183 (0018.06.18 a₿ · block 966,098) — ADMIRAL'S LAW: the buttons
 * were "not even — this looks like slop". The doors now HUG THE BOTTOM:
 * the card fills its grid cell (`.room-card` in house.css), the body
 * flexes, and the doors ride one bottom column (`.room-card-doors`) —
 * stacked top-to-bottom (the who-you-are / sign-in door first, then the
 * enter/see door), the same width, the same order on every card. The
 * signed-in soul's name rides the top of the door column ("you're in as
 * <name>") so a visitor with a second name knows which one they wear;
 * signed out, the sign-in door stands in its place. The ENTER door names
 * the package ("Enter the Heart Field Commons") and lands on the room's
 * STAGE — the bare `/rooms/<slug>` IS the Stage's address: vantage.ts's
 * ROOM_VANTAGE_SITE_DEFAULT is "stage" (T-149/T-174 made the Stage the
 * gated door; no `?v=` param exists — a member's own saved vantage still
 * wins, by T-149's design).
 */
export interface PackageRoomLine {
  slug: string;
  title: string;
  open: boolean;
  /** from the feed's directory answers; absent/false-y unknown paints nothing */
  live?: boolean | null;
}

export default function PackageRoomsCard({
  pkg,
  signedIn,
  name = null,
  compact = false,
}: {
  pkg: RoomPackage<PackageRoomLine>;
  signedIn: boolean;
  /** the signed-in soul's handle — the "you're in as <name>" line atop the
      door column; absent (or a feed that won't say) paints nothing */
  name?: string | null;
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
      className="card room-card"
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
            {/* TASK-162: the homeserver SAYS this room isn't there yet —
                words, not a guess; a server that won't answer adds nothing */}
            {r.live === false && (
              <span style={{ color: "var(--muted)", fontSize: ".72rem" }}> — opens soon</span>
            )}
          </li>
        ))}
      </ul>
      {/* TASK-183: THE DOOR COLUMN — the doors HUG THE BOTTOM (margin-top:auto
          in house.css), stacked top-to-bottom, the same width, the same order
          on every card: FIRST who you are (signed in: your name; signed out:
          the sign-in door), THEN the card's door — ENTER when the member
          holds the tier, SEE <PACKAGE> (ghost) when not. The ENTER door lands
          on the room's STAGE: the bare /rooms/<slug> is the Stage's address
          (ROOM_VANTAGE_SITE_DEFAULT, T-149/T-174). Signed out, the Commons'
          single door is the welcome path — sign in · join free. */}
      <div className="room-card-doors">
        {signedIn && name && (
          <p className="room-card-name">
            you&apos;re in as <b>@{name}</b>
          </p>
        )}
        {!signedIn && (
          <Link className="btn btn-sm" href="/login">
            {pkg.tier === "all" ? "Sign in · join free" : "Sign in"}
          </Link>
        )}
        {pkg.open ? (
          <Link className="btn btn-sm" href={`/rooms/${pkg.primary.slug}`}>
            Enter the {pkg.name}
          </Link>
        ) : pkg.tier !== "all" ? (
          /* paid rooms are not free — say so honestly (Admiral); the package
             page carries the door */
          <Link
            className="btn btn-ghost btn-sm"
            href={pkg.packageSlug ? `/packages/${pkg.packageSlug}` : "/memberships"}
          >
            See {pkg.name}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
