"use client";

/* eslint-disable @next/next/no-img-element -- WELCOME_PHOTO_URL is an
   arbitrary URL Love emails in, not a build-time asset next/image can
   optimize; the ServiceCard.tsx precedent disables the same rule for the
   same reason. */

import Link from "next/link";
import { useEffect, useState } from "react";
import useFrenSession from "@/hooks/useFrenSession";
import { cartridge } from "@/brand/cartridge";
import { continueLabel } from "@/components/door/door-machine";

/**
 * /welcome — WHAT'S YOURS NOW (TASK-185 Phase B, the Admiral's ruling 1,
 * 0018.06.18 a₿): the URL keeps its place as the post-sign-in page, linked
 * from the member menu. The join / code / names steps are RETIRED — the
 * door sheet owns sign-up now. Today's `in` step IS this page: the
 * greeting and the three doors. A signed-out visitor meets one door to
 * /login — never a second sign-up walk, never the same email asked twice.
 *
 * TASK-212 (0018.06.23 a₿, Love's call #25/#38): the three doors wear the
 * SAME border /book's session cards do (`.card`, house.css — imported, not
 * re-spelled) and a shine walks over them one after another (the fleet's
 * own `.shine-hover` recipe, house.css, unedited — the trigger class below
 * just fires it off a JS-cycled state instead of `:hover`). Love's picture
 * slot (her hands): an honest empty frame until her photo lands by email —
 * derive-or-dash, never a stock face.
 *
 * TASK-259 (0018.06.24 a₿): a brand-new soul now ALWAYS lands here first
 * (door-machine.ts's `landingFor`, isNew wins) — a same-origin `next` that
 * rode along (e.g. the reading room's own `?next=`) shows up as `?next=`
 * on THIS url, so nothing is lost, it's just one short stop. A ONE door at
 * the bottom of what's-yours-now carries it the rest of the way:
 * "Continue to <room title>" (door-machine.ts's `continueLabel`, derived
 * from the rooms config — never a guessed label). `next` is validated and
 * read server-side (page.tsx's own `safeNextPath` over `searchParams`) and
 * handed down as a plain prop — no client-only window read, no hydration
 * seam.
 */

/** Love's welcome photo — her hands, sent by email. `null` until it lands:
 *  the frame below stays an honest empty circle, never a stock face. */
const WELCOME_PHOTO_URL: string | null = null;

const shell: React.CSSProperties = {
  maxWidth: 420, margin: "0 auto", textAlign: "center",
  background: "var(--glass)", backdropFilter: "blur(9px)", borderRadius: 30,
  border: "1px solid var(--glass-edge)", padding: "34px 28px 30px",
  boxShadow: "0 30px 70px -28px rgba(5,3,16,.8)",
};

/** The three what's-yours doors — pulled out so the walking shine can index
 *  them by position (item 2, "one after another"). */
const DOORS = [
  { icon: "🕊️", t: "Book your discovery call", w: "credited toward your first session", href: "/book/discovery-call" },
  { icon: "💗", t: "Step into The Heart Field", w: "the free circle, open to every member", href: "/classes" },
  { icon: "🌙", t: "Wander the store", w: "meditations, sessions, wares", href: "/store" },
] as const;

export default function WelcomeFlow({ next = null }: { next?: string | null }) {
  const { fren: session, checked } = useFrenSession();
  /* the known-by name (the door's own rule): an email member is greeted by
     who they ARE once the name is claimed, never by the mailbox */
  const [knownBy, setKnownBy] = useState<string | null>(null);
  /* the walking shine (item 2): one door lit at a time, one after another.
     prefers-reduced-motion holds all three lit, still, no interval. */
  const [walkIdx, setWalkIdx] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

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

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!session || reducedMotion) return;
    const id = setInterval(() => setWalkIdx((i) => (i + 1) % DOORS.length), 2600);
    return () => clearInterval(id);
  }, [session, reducedMotion]);

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
          {/* Love's picture slot (item 4, her hands): an honest empty frame
              until her photo lands by email — never a stock face. */}
          <div style={{ margin: "4px auto 2px", width: 84, height: 84, borderRadius: "50%",
            border: "1.5px dashed var(--glass-edge)", display: "flex", alignItems: "center",
            justifyContent: "center", background: "rgba(255,255,255,.03)", overflow: "hidden" }}>
            {WELCOME_PHOTO_URL ? (
              <img src={WELCOME_PHOTO_URL} alt="Love" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span aria-hidden style={{ fontSize: "1.3rem", opacity: 0.5 }}>🕊️</span>
            )}
          </div>
          {!WELCOME_PHOTO_URL && (
            <p style={{ fontSize: ".64rem", color: "var(--muted)", margin: "4px 0 0" }}>
              Love&apos;s photo is on its way
            </p>
          )}

          <p style={{ fontSize: ".9rem", margin: "10px 0 4px" }}>
            welcome home{name ? <>, <b style={{ color: "#EBCB77" }}>{name}</b></> : ""} — your doors are open.
          </p>
          {/* the walking shine (item 2): the same border-beam recipe the
              fleet already runs on hover (.shine-hover, house.css,
              unedited) — this rule just fires it off a class instead of
              :hover, one door lit at a time. */}
          <style>{`
            .shine-hover.shine-walk::before{opacity:1;animation:shine-spin 2.4s linear infinite}
            @media (prefers-reduced-motion:reduce){
              .shine-hover.shine-walk::before{animation:none;opacity:.6}
            }
          `}</style>
          <div style={{ display: "grid", gap: 10, margin: "18px 0 0", textAlign: "left" }}>
            {DOORS.map((d, i) => (
              <Link key={d.t} href={d.href}
                className={`card shine-hover${reducedMotion || i === walkIdx ? " shine-walk" : ""}`}
                style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12,
                  textDecoration: "none", color: "var(--ink-body)", padding: "13px 16px",
                  background: "rgba(255,255,255,.05)", fontSize: ".85rem" }}>
                <span style={{ fontSize: "1.2rem" }}>{d.icon}</span>
                <span style={{ flex: 1 }}>
                  <b style={{ display: "block", fontFamily: "var(--font-h3)", fontWeight: 400, color: "var(--ink-strong)" }}>{d.t}</b>
                  <span style={{ fontSize: ".72rem", color: "var(--muted)" }}>{d.w}</span>
                </span>
                <span style={{ fontSize: ".66rem", fontWeight: 700, textTransform: "uppercase", color: "#EBCB77" }}>go</span>
              </Link>
            ))}
          </div>
          {/* TASK-259: one door at the bottom of what's-yours-now, carrying
              a same-origin `next` the rest of the way — a room's real
              title when it names one, else the plain word (continueLabel,
              derive-or-dash). Nothing here when there's no `next` at all;
              the three doors above are already the whole page then. */}
          {next && (
            <div style={{ margin: "14px 0 0" }}>
              <Link href={next} className="btn btn-rose"
                style={{ display: "block", width: "100%", boxSizing: "border-box", textDecoration: "none" }}>
                {continueLabel(next)}
              </Link>
            </div>
          )}
          <p style={{ margin: "18px 0 0", fontSize: ".68rem", color: "var(--muted)" }}>
            after your call, Love may open a month of the Weekly Intuitive for you 💛 · finish your
            constellation anytime on <Link href="/me" style={{ color: "#EBCB77" }}>your page</Link>
          </p>
        </>
      )}
    </div>
  );
}
