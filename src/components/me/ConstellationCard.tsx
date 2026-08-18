"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * YOUR CONSTELLATION (the Admiral's welcome answers, 0018.05.15): what
 * the old five-step wizard demanded up front, offered here as gentle
 * stars to light whenever. Derived from the session + profile — never
 * a wall, never required.
 */
interface Star { done: boolean; icon: string; t: string; w: string; href: string }

export default function ConstellationCard() {
  const [stars, setStars] = useState<Star[] | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/me/letters", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/member/profile").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/frens/session").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([who, prof, ses]) => {
      if (!who?.signedIn) { setStars([]); return; }
      const emailMember = !!who.email;
      /* key members claimed their @tag at the door — that star is already lit;
         their "hello" face is the kind-0 profile card, not a call-me field */
      const named = emailMember
        ? { done: !!prof?.accountName, t: prof?.accountName ? `named ${prof.accountName}@onecocreation` : "claim your community name", href: "/welcome" }
        : { done: !!ses?.handle, t: ses?.handle ? `named ${ses.handle}@${ses.space}` : "claim your community name", href: "/welcome" };
      setStars([
        { done: true, icon: "✦", t: "joined the field", w: "", href: "" },
        { done: named.done, icon: "💫", t: named.t, w: "how the circle knows you", href: named.href },
        emailMember
          ? { done: !!prof?.displayName, icon: "🌸", t: "a call-me name", w: "what Love says hello with", href: "/me" }
          : { done: false, icon: "🌸", t: "dress your profile card", w: "the face every nostr app shows for you", href: "/me" },
        { done: false, icon: "📚", t: "open the school portal", w: "your classrooms, one door", href: "/classes" },
        { done: false, icon: "⚡", t: "connect a zap wallet", w: "send & receive sats — optional", href: "/me" },
        { done: !emailMember, icon: "🔑", t: "hold your own key", w: "when you're ready — your name becomes truly yours", href: "/login" },
      ]);
    });
  }, []);

  if (!stars || stars.length === 0) return null;
  const lit = stars.filter((s) => s.done).length;
  const whole = lit === stars.length;

  /* the sky map (Love's ask, 0018.05.15): six stars in a real figure — a
     little swan rising. Each lit star appears; lit NEIGHBORS get their line,
     so the constellation genuinely draws itself as the walk completes. */
  const SKY: [number, number][] = [[10, 46], [30, 22], [50, 34], [70, 14], [88, 30], [62, 54]];
  const EDGES: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [4, 5]];
  const gold = "var(--gold-2, #EBCB77)";

  return (
    <div style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)", borderRadius: 18,
      padding: "18px 20px", margin: "18px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div>
          <b style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.1rem", color: "var(--ink-strong)" }}>
            Your constellation
          </b>
          <span style={{ display: "block", fontSize: ".72rem", color: whole ? "var(--gold-2, #EBCB77)" : "var(--muted)" }}>
            {whole ? "whole — the figure shines ✨" : `${lit} of ${stars.length} stars lit`}
          </span>
        </div>
        <svg viewBox="0 0 98 64" width="118" height="77" aria-hidden
          style={{ marginLeft: "auto", flexShrink: 0, overflow: "visible",
            filter: whole ? "drop-shadow(0 0 6px rgba(235,203,119,.55))" : "none" }}>
          {EDGES.map(([a, b]) => (
            <line key={`${a}-${b}`} x1={SKY[a][0]} y1={SKY[a][1]} x2={SKY[b][0]} y2={SKY[b][1]}
              stroke={gold} strokeWidth="1"
              opacity={stars[a].done && stars[b].done ? 0.8 : 0.12} />
          ))}
          {SKY.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={stars[i].done ? 3 : 1.8}
              fill={stars[i].done ? gold : "var(--muted, #9a8fae)"}
              opacity={stars[i].done ? 1 : 0.45} />
          ))}
        </svg>
      </div>
      <div style={{ marginTop: 8 }}>
        {stars.map((s) => (
          <div key={s.t} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
            borderBottom: "1px solid rgba(139,118,196,.2)", fontSize: ".85rem",
            color: s.done ? "#7fb98f" : "var(--ink-body)" }}>
            <span aria-hidden>{s.done ? "✦" : "○"}</span>
            <span style={{ flex: 1 }}>
              {s.t}
              {s.w && !s.done && <span style={{ display: "block", fontSize: ".7rem", color: "var(--muted)" }}>{s.w}</span>}
            </span>
            {!s.done && s.href && (
              <Link href={s.href} style={{ fontSize: ".66rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: ".06em", color: "var(--gold-deep)", textDecoration: "none" }}>
                light it
              </Link>
            )}
          </div>
        ))}
      </div>
      <p style={{ margin: "10px 0 0", fontSize: ".7rem", color: "var(--muted)" }}>
        no star is required — the field is yours either way 💛
      </p>
    </div>
  );
}
