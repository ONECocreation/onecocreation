"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { groupRoomsByPackage } from "@/lib/matrix-rooms";
import PackageRoomsCard from "./PackageRoomsCard";

/**
 * THE ROOMS PAGE (C4, mockup 1 blessed 0018.05.14): your packages say
 * enter; the ones above your tier stay visible but softly locked — the
 * lock is an invitation, not a wall. Signed out, every door points at the
 * welcome path. TASK-150 (0018.06.17 a₿): ONE CARD PER PACKAGE — Love:
 * "too many buttons on the bottom". The card names the package and lists
 * its rooms as small lines; one door, ENTER or SEE <PACKAGE>.
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

export default function RoomsShelf() {
  const [feed, setFeed] = useState<Feed | null>(null);

  useEffect(() => {
    fetch("/api/matrix/rooms")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.ok && setFeed(d))
      .catch(() => {});
  }, []);

  if (!feed) return <p style={{ color: "var(--muted)" }}>opening the rooms…</p>;

  /* one card per package — Commons first, then by tier rank (the grouping
     helper owns the order; the card names the package, so the old labeled
     divider rows retire with the duplicate doors) */
  const packages = groupRoomsByPackage(feed.rooms);

  return (
    <div>
      <h2 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.3rem", margin: "0 0 16px", color: "var(--ink-strong)" }}>
        The rooms
      </h2>
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(min(290px,100%), 1fr))",
        }}
      >
        {packages.map((p) => (
          /* TASK-183: the signed-in soul's name rides each card's door
             column — "you're in as <name>" (the feed's handle, derived
             server-side; a feed that won't say passes null and the line
             stays unpainted — derive-or-dash) */
          <PackageRoomsCard key={p.tier} pkg={p} signedIn={feed.signedIn} name={feed.handle} />
        ))}
      </div>
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
