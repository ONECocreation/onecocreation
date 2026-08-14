"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SubscribeForm from "@/components/SubscribeForm";

/**
 * THE READING ROOM (Admiral, 0018.05.15): who's asking is decided PER
 * REQUEST by /api/me/letters (no-store) — the router cache can never
 * again show a signed-out browser someone else's mailbox. Guests are
 * offered the free-meditation letter and the recent public notes.
 */

interface Entry { key: string; subject: string; atMs: number }
interface Who { ok: boolean; signedIn: boolean; operator: boolean; email: string | null; letters: Entry[] }

export default function LettersRoom({ recent }: { recent: { key: string; subject: string }[] }) {
  const [who, setWho] = useState<Who | null>(null);

  useEffect(() => {
    fetch("/api/me/letters", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.ok && setWho(d))
      .catch(() => setWho({ ok: true, signedIn: false, operator: false, email: null, letters: [] }));
  }, []);

  if (!who) return <p style={{ color: "var(--muted)", fontSize: ".9rem" }}>opening the reading room…</p>;

  const recentFeed = recent.length > 0 && (
    <div style={{ marginTop: 34 }}>
      <p className="kicker" style={{ marginBottom: 12 }}>Recent from the Field</p>
      <div style={{ display: "grid", gap: 10, textAlign: "left" }}>
        {recent.slice(0, 5).map((n) => (
          <Link key={n.key} href={`/letters/${n.key}`}
            style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none", color: "inherit",
              borderRadius: 16, padding: "12px 18px", background: "var(--glass)",
              border: "1px solid var(--glass-edge)", boxShadow: "0 18px 44px -28px rgba(120,100,160,.45)" }}>
            <span style={{ fontSize: "1.2rem" }}>🗞️</span>
            <b style={{ flex: 1, fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1rem", color: "var(--ink-strong)" }}>
              {n.subject}
            </b>
            <span style={{ fontSize: ".7rem", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: ".06em", color: "var(--gold-deep)" }}>read →</span>
          </Link>
        ))}
      </div>
    </div>
  );

  if (!who.signedIn) {
    return (
      <div>
        <p className="lead" style={{ margin: "0 auto 6px" }}>
          Letters from Love land here for members — and the first one is a gift:
        </p>
        <p style={{ color: "var(--ink-body)", fontFamily: "var(--serif)", fontSize: "1.05rem", margin: "0 0 4px" }}>
          <b style={{ color: "var(--rose)" }}>&ldquo;Unzip Into the New You&rdquo;</b> — a free guided meditation
        </p>
        <p style={{ color: "var(--muted)", fontSize: ".85rem", margin: "0 0 8px" }}>
          join the letters and it arrives with love, plus a weekly note of inspiration.
        </p>
        <div style={{ maxWidth: 420, margin: "0 auto" }}>
          <SubscribeForm source="letters" />
        </div>
        <p style={{ marginTop: 14, fontSize: ".8rem", color: "var(--muted)" }}>
          already one of us? <Link href="/login" style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>sign in</Link>{" "}
          and your reading room opens.
        </p>
        {recentFeed}
      </div>
    );
  }

  if (!who.email) {
    return (
      <div>
        <p className="lead" style={{ marginBottom: 24 }}>
          Letters travel by email — add yours to your profile and everything Love sends you gathers here.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btn-gold btn-sm" href="/me">Your profile →</Link>
          <Link className="btn btn-ghost btn-sm" href="/news">The public news</Link>
        </div>
        {who.operator && operatorNote}
        {recentFeed}
      </div>
    );
  }

  return (
    <div>
      <p className="lead" style={{ marginBottom: 24 }}>
        {who.letters.length > 0
          ? "Everything Love has sent you, newest first."
          : "Nothing here yet — when Love publishes her next letter, it lands here too."}
      </p>
      <div style={{ display: "grid", gap: 10, textAlign: "left" }}>
        {who.letters.map((l, i) => (
          <Link key={`${l.key}-${l.atMs}-${i}`} href={`/letters/${l.key}`}
            style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none", color: "inherit",
              borderRadius: 16, padding: "14px 18px", background: "var(--glass)",
              border: "1px solid var(--glass-edge)", boxShadow: "0 18px 44px -28px rgba(120,100,160,.45)" }}>
            <span style={{ fontSize: "1.4rem" }}>💌</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: "block", fontFamily: "var(--font-h3)", fontWeight: 400,
                fontSize: "1.05rem", color: "var(--ink-strong)" }}>{l.subject}</b>
              <span style={{ fontSize: ".76rem", color: "var(--muted)" }}>
                {new Date(l.atMs).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
              </span>
            </span>
            <span style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: ".06em", color: "var(--gold-deep)", whiteSpace: "nowrap" }}>read →</span>
          </Link>
        ))}
      </div>
      {who.letters.length === 0 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
          <Link className="btn btn-ghost btn-sm" href="/news">Browse the public news →</Link>
        </div>
      )}
      {who.operator && operatorNote}
    </div>
  );
}

const operatorNote = (
  <p style={{ marginTop: 28, fontSize: ".8rem", color: "var(--muted)" }}>
    ✎ you&apos;re the operator — previews, audiences, and publishing live in{" "}
    <Link href="/a/letters" style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>
      the Letters room
    </Link>.
  </p>
);
