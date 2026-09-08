"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import useFrenSession from "@/hooks/useFrenSession";
import { cartridge } from "@/brand/cartridge";

/**
 * /welcome — WHAT'S YOURS NOW (TASK-185 Phase B, the Admiral's ruling 1,
 * 0018.06.18 a₿): the URL keeps its place as the post-sign-in page, linked
 * from the member menu. The join / code / names steps are RETIRED — the
 * door sheet owns sign-up now. Today's `in` step IS this page: the
 * greeting and the three doors. A signed-out visitor meets one door to
 * /login — never a second sign-up walk, never the same email asked twice.
 */

const shell: React.CSSProperties = {
  maxWidth: 420, margin: "0 auto", textAlign: "center",
  background: "var(--glass)", backdropFilter: "blur(9px)", borderRadius: 30,
  border: "1px solid var(--glass-edge)", padding: "34px 28px 30px",
  boxShadow: "0 30px 70px -28px rgba(5,3,16,.8)",
};

export default function WelcomeFlow() {
  const { fren: session, checked } = useFrenSession();
  /* the known-by name (the door's own rule): an email member is greeted by
     who they ARE once the name is claimed, never by the mailbox */
  const [knownBy, setKnownBy] = useState<string | null>(null);

  useEffect(() => {
    if (!session || session.space !== "email") return;
    fetch("/api/member/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((p: { ok?: boolean; displayName?: string; accountName?: string } | null) => {
        const known = p?.displayName || p?.accountName;
        if (p?.ok && known) setKnownBy(known);
      })
      .catch(() => {});
  }, [session]);

  const name = session ? (session.space === "email" ? knownBy : session.handle) : null;

  return (
    <div style={shell}>
      <div className="constellation" aria-hidden style={{ margin: "0 0 6px" }}>{cartridge.constellation}</div>
      <h1 className="stack-hero" style={{ fontSize: "1.6rem" }}>
        <span className="sh-ink">WELCOME</span>
        <span className="sh-teal">HOME</span>
      </h1>

      {/* the first session answer hasn't landed — say nothing yet
          (derive-or-dash, never an invented state) */}
      {!checked && (
        <p style={{ fontSize: ".85rem", color: "var(--muted)", margin: "14px 0 4px" }}>—</p>
      )}

      {/* signed out — the sheet owns the walk; this page is not a door,
          it only POINTS at the one door */}
      {checked && !session && (
        <>
          <p style={{ fontSize: ".9rem", margin: "10px 0 4px", color: "var(--ink-body)" }}>
            This is what&apos;s yours once you&apos;re in — the door is one short walk:
            an email code or your key, no passwords.
          </p>
          <div style={{ display: "grid", gap: 10, margin: "18px 0 0" }}>
            <Link href="/login" className="btn" style={{ display: "block", width: "100%", boxSizing: "border-box", textDecoration: "none" }}>
              Log in · join
            </Link>
          </div>
        </>
      )}

      {/* signed in — what's yours now (today's `in` step, the whole page) */}
      {checked && session && (
        <>
          <p style={{ fontSize: ".9rem", margin: "10px 0 4px" }}>
            welcome home{name ? <>, <b style={{ color: "#EBCB77" }}>{name}</b></> : ""} — your doors are open.
          </p>
          <div style={{ display: "grid", gap: 10, margin: "18px 0 0", textAlign: "left" }}>
            {[
              { icon: "🕊️", t: "Book your discovery call", w: "credited toward your first session", href: "/book/discovery-call" },
              { icon: "💗", t: "Step into Heartfield Commons", w: "the free circle, open to every member", href: "/classes" },
              { icon: "🌙", t: "Wander the store", w: "meditations, sessions, wares", href: "/store" },
            ].map((d) => (
              <Link key={d.t} href={d.href} style={{ display: "flex", alignItems: "center", gap: 12,
                textDecoration: "none", color: "var(--ink-body)", borderRadius: 16, padding: "13px 16px",
                background: "rgba(255,255,255,.05)", border: "1px solid var(--glass-edge)", fontSize: ".85rem" }}>
                <span style={{ fontSize: "1.2rem" }}>{d.icon}</span>
                <span style={{ flex: 1 }}>
                  <b style={{ display: "block", fontFamily: "var(--font-h3)", fontWeight: 400, color: "var(--ink-strong)" }}>{d.t}</b>
                  <span style={{ fontSize: ".72rem", color: "var(--muted)" }}>{d.w}</span>
                </span>
                <span style={{ fontSize: ".66rem", fontWeight: 700, textTransform: "uppercase", color: "#EBCB77" }}>go</span>
              </Link>
            ))}
          </div>
          <p style={{ margin: "18px 0 0", fontSize: ".68rem", color: "var(--muted)" }}>
            after your call, Love may open a month of the Weekly Intuitive for you 💛 · finish your
            constellation anytime on <Link href="/me" style={{ color: "#EBCB77" }}>your page</Link>
          </p>
        </>
      )}
    </div>
  );
}
