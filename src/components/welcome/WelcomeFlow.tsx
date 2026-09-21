"use client";

/* eslint-disable @next/next/no-img-element -- WELCOME_PHOTO_URL is an
   arbitrary URL Love emails in, not a build-time asset next/image can
   optimize; the ServiceCard.tsx precedent disables the same rule for the
   same reason. */

import Link from "next/link";
import { useEffect, useState } from "react";
import useMemberSession from "@/hooks/useMemberSession";
import { cartridge } from "@/brand/cartridge";
import { continueLabel } from "@/components/door/door-machine";
import Field from "@/components/kit/Field";
import Button from "@/components/kit/Button";

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
 *
 * TASK-358 (the Admiral, block 967,926, Named decision 2 — the recommended
 * path): an email member with no `accountName` yet meets a real claim form
 * here — the constellation's "claim your community name" star already
 * points at this URL for them, and until now it landed on nothing to type
 * into. Reuses the EXACT `PUT /api/member/profile` call `DoorSheet.tsx` and
 * `SignInCard.tsx` already make (`accountName`/`displayName` both set to
 * the same trimmed value), now guarded server-side by D5's atomic
 * `SET … NX` reservation — a name already held by another email member, or
 * a live key handle, comes back as a 409 whose `reason` renders inline,
 * same as the doors already show it. A successful save clears the form and
 * lights the star on the member's next `/me` visit (ConstellationCard's own
 * fetch, unedited here).
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
  const { member: session, checked } = useMemberSession();
  /* the known-by name (the door's own rule): an email member is greeted by
     who they ARE once the name is claimed, never by the mailbox */
  const [knownBy, setKnownBy] = useState<string | null>(null);
  /* TASK-358: whether this email member has ALREADY claimed an
     accountName — null until the profile fetch resolves, so the claim
     form never flashes on then off while that first answer is in flight. */
  const [accountName, setAccountName] = useState<string | null>(null);
  const [nameWish, setNameWish] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
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
        if (p?.ok) setAccountName(p.accountName ?? "");
      })
      .catch(() => {});
  }, [session]);

  /* D5 (the Admiral, block 967,926): the same claim-write pattern
     DoorSheet.tsx/SignInCard.tsx already use — accountName and displayName
     both set to the same trimmed value — now guarded server-side by the
     SET…NX reservation. A 409 comes back with `reason` set to the exact
     wording those doors already surface ("already claimed"). */
  async function claimAccountName(ev: React.FormEvent) {
    ev.preventDefault();
    const want = nameWish.trim();
    if (!want || claiming) return;
    setClaiming(true);
    setClaimError(null);
    try {
      const res = await fetch("/api/member/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountName: want, displayName: want }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; reason?: string; accountName?: string } | null;
      if (!res.ok || !data?.ok) {
        setClaimError(data?.reason ?? "that name couldn't be claimed — try another");
        return;
      }
      setAccountName(data.accountName ?? want);
      setKnownBy(data.accountName ?? want);
      setNameWish("");
    } catch {
      setClaimError("couldn't reach the server — try again");
    } finally {
      setClaiming(false);
    }
  }

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!session || reducedMotion) return;
    /* one door = one full lap of the rim (shine-spin is 2.4s), then the
       light hands over to the next door down: top, middle, bottom. */
    const id = setInterval(() => setWalkIdx((i) => (i + 1) % DOORS.length), 2400);
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

          {/* TASK-358, D5/Named decision 2: an email member with no
              accountName yet gets a real place to type one — the
              constellation's "claim your community name" star points
              here for exactly this reason. Key members already claimed
              their @tag at the door, so this never renders for them. */}
          {session.space === "email" && accountName === "" && (
            <form onSubmit={claimAccountName} style={{ display: "grid", gap: 10, margin: "16px 0 4px", textAlign: "left" }}>
              <p style={{ fontSize: ".8rem", color: "var(--ink-body)", margin: 0 }}>
                Claim your own <b>@onecocreation</b> name — yours, once you save it.
              </p>
              <Field
                id="welcome-account-name"
                label="Your community name"
                placeholder="yourname"
                value={nameWish}
                onChange={(e) => { setNameWish(e.target.value); setClaimError(null); }}
                error={claimError ?? undefined}
                disabled={claiming}
                maxLength={24}
              />
              <Button type="submit" variant="main" sm disabled={claiming || nameWish.trim().length < 2}>
                {claiming ? "saving…" : "claim your name"}
              </Button>
            </form>
          )}

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
                /* overflow visible: .card clips at its padding box, and the
                   shine rim rides 1.5px OUTSIDE it — clipped, the light never
                   showed (the Admiral's walk, 0018.07.02). */
                style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12,
                  overflow: "visible", textDecoration: "none", color: "var(--ink-body)", padding: "13px 16px",
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
