"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { readingPartHref, type ReadingPart } from "@/lib/reading-parts";

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
 * TASK-490 (block 969,088+ — the Admiral, RULED at block 968,624): the
 * strip follows Love's reading buttons too. A `kind: "reading"` feed
 * (any of the four reading doors `published`) links the part's deep
 * link instead of a room slug — "Love is live · <the part> · Join" for
 * EVERYONE, paid rooms included: the /reading page's own unlock offer
 * does the gating, the strip never reads entitlements.
 *
 * Styling: house tokens, slimmer than the old banner; the live dot wears
 * --err, the wash is lavender — never gold (gold means money only).
 */
export interface LiveStripFeed {
  live: boolean;
  room: string | null;
  roomTitle: string | null;
  /** TASK-490: the payload's live flavour — "reading" for a published
   *  reading door; absent on the old Go-live path. */
  kind?: string | null;
  /** TASK-490: the reading part (1-4) when `kind` is "reading". */
  part?: number | null;
}

/** The strip's model, pure: a live flag with a room gives the one line and
 *  its href (the room's Stage); anything else gives NOTHING — the strip's
 *  absence is as honest as its presence. Exported for the tests. */
export function stripModel(feed: LiveStripFeed | null): { href: string; label: string } | null {
  if (!feed?.live) return null;
  /* TASK-490 — the reading case: the href is DERIVED (`readingPartHref`,
     never a hand-written query string); a nonsense part falls through to
     NOTHING rather than a guessed link. */
  if (feed.kind === "reading") {
    const part =
      typeof feed.part === "number" && feed.part >= 1 && feed.part <= 4 ? (feed.part as ReadingPart) : null;
    if (part === null || !feed.roomTitle) return null;
    return { href: readingPartHref(part), label: `Love is live · ${feed.roomTitle} · Join` };
  }
  if (!feed.room) return null;
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
          setFeed(
            d.live
              ? { live: true, room: d.room ?? null, roomTitle: d.roomTitle ?? null, kind: d.kind ?? null, part: d.part ?? null }
              : null,
          );
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
        padding: "12px 20px",
        fontSize: "1rem",
        fontWeight: 700,
        letterSpacing: ".04em",
        textDecoration: "none",
        background: "rgba(139,118,196,.14)",
        borderBottom: "1px solid rgba(139,118,196,.4)",
        color: "var(--info)",
      }}
    >
      {/* border-only pill (no fill): a filled pill here would stack its own
          tint ON TOP of the strip's own wash and cut the label's measured
          contrast below 4.5:1 in both themes (measured while building this
          — see SUMMARY) — the border + radius + padding alone read as a
          real tap target without touching what's under the text. The dot
          lives INSIDE the pill (send-back, T-339) so dot + label wrap
          together as one piece at narrow widths instead of the dot
          orphaning onto its own line above the pill. */}
      <span
        style={{
          display: "inline-block",
          padding: "6px 18px",
          borderRadius: "999px",
          border: "1px solid rgba(139,118,196,.5)",
        }}
      >
        {/* TASK-490: the pulse rides the CLASS (kit.css, the named
            exception to the idle-motion law — the live dot ONLY, both
            flavours of live, stilled under prefers-reduced-motion); the
            inline style stays (T-339's own pins name it). */}
        <span
          className="live-strip-dot"
          style={{ color: "var(--err)", fontSize: "1.4em", verticalAlign: "-.05em", marginRight: ".35em" }}
        >
          ●
        </span>
        {model.label}
      </span>
    </Link>
  );
}
