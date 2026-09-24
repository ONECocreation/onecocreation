"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import useMemberSession from "@/hooks/useMemberSession";
import DoorSheet from "./DoorSheet";
import { MEMBER_MENU, proofFor } from "./door-machine";

/**
 * TASK-185 Phase B — the header's door chip. Signed out: a "Log in" button
 * that opens the small sheet right under it (Love's idea — the page behind
 * does not change). Signed in: the member's name in the brand's gold,
 * opening the member menu — what's yours now, my library, my sessions, the
 * reading room, sign out. That is the whole menu.
 *
 * Ruling 3 (the Admiral, 0018.06.18 a₿): the chip stays "Log in" until the
 * walk completes — NEVER a placeholder name mid-walk (the email verifies
 * before the name is claimed; the mailbox's local part is not a name).
 * Replaces FrenBadge in SiteHeader; FrenBadge itself is retired (ruling 2),
 * its known-by-name rule carried over below.
 */
/* the known-by name survives a client-side nav: the session store (unowned
   hook) carries only handle+space, so the claimed name is kept at module
   level until the next profile fetch confirms it from the server */
let lastKnownBy: string | null = null;

/* TASK-449 (block 968,364 — the design-drift law on this recorded file):
   the menu-row style is hoisted to ONE module-level const shared by the
   MEMBER_MENU rows and the Playground row alike, so adding the line never
   raises the file's style-block count; the S2-pinned always-night ink
   (#ECE3C9, the existing literal) rides the shared const. */
const menuRowStyle = {
  display: "block", padding: "9px 18px",
  /* TASK-210 shot bench, 390px: house.css's `.nav-tail a` phone rule
     (max-width 34vw + ellipsis, meant for the header's own chips) reaches
     these rows and clipped "What's yours now" / "The reading room" to
     "WHAT'S YO…" — the menu's rows are not tail chips; they keep their
     whole words */
  maxWidth: "none", overflow: "visible", textOverflow: "clip",
  color: "#ECE3C9", /* S2: pinned — same always-night ink as today's menu */
  fontSize: ".8rem", letterSpacing: ".04em", textTransform: "uppercase",
  textDecoration: "none",
} as const;

export default function DoorButton() {
  const { member: session, checked, signOut } = useMemberSession();
  const [open, setOpen] = useState<"sheet" | "menu" | null>(null);
  /* the known-by name (Love's ask, carried over from FrenBadge): an email
     member's chip says who they ARE once the names are claimed */
  const [knownBy, setKnownBy] = useState<string | null>(lastKnownBy);
  /* TASK-449 (ruling 5): the Playground menu line's open truth — fetched
     only while the menu is open (decision E: a header-level always-on
     poll for every signed-in page was rejected as waste) */
  const [playgroundOpen, setPlaygroundOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session || session.space !== "email") return;
    fetch("/api/member/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((p: { ok?: boolean; displayName?: string; accountName?: string } | null) => {
        const known = p?.displayName || p?.accountName;
        if (p?.ok && known) {
          lastKnownBy = known;
          setKnownBy(known);
        }
      })
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  /* TASK-449 (ruling 5): while the menu is open, read the Playground's
     open truth once and on the same 20 s cadence Stage2Door polls at — a
     failed read renders NO line (derive-or-dash: a line that can't know
     its truth says nothing). Pickup fix: a rejected fetch and a closed
     menu both clear the line, so a stale "open" never survives into the
     next opening. */
  useEffect(() => {
    if (open !== "menu") return;
    let alive = true;
    function poll() {
      fetch("/api/stage2", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive) setPlaygroundOpen(d?.ok && d.open === true);
        })
        .catch(() => {
          if (alive) setPlaygroundOpen(false);
        });
    }
    poll();
    const id = setInterval(poll, 20_000);
    return () => {
      alive = false;
      clearInterval(id);
      setPlaygroundOpen(false);
    };
  }, [open]);

  /* the first session answer hasn't landed — render nothing judgmental */
  if (!checked) return null;

  /* Ruling 3: while a walk owns the sheet the chip stays "Log in" — the
     session can flip mid-walk (the email verifies before the name is
     claimed) and a placeholder name must never show. */
  const walking = open === "sheet";
  const name = !walking && session ? knownBy ?? (session.space === "email" ? session.handle.split("@")[0] : session.handle) : null;
  const short = name && name.length > 14 ? `${name.slice(0, 13)}…` : name;
  /* K7 — real or bot: how this soul proved themselves, listed in the menu */
  const proof = session ? proofFor(session.space) : null;

  /* the one nav-dropdown recipe — poured from the --pop-* jug, same as
     .nav-sub; the sheet and the menu drink from it alike, via house.css's
     .door-anchor/.door-pop rules (T-386 moved the position half there so
     the phone breakpoint can re-anchor it) */
  return (
    <div ref={ref} className="door-anchor">
      {!name ? (
        <button
          onClick={() => {
            /* inert while a walk owns the sheet (ruling 3) — the chip only
               ever opens the walk, it never interrupts one */
            if (!walking) setOpen("sheet");
          }}
          aria-expanded={walking}
          aria-haspopup="dialog"
          style={{
            /* TASK-356 (the Admiral's desktop walk, REVIEW-K87 item 7 —
               "Dawn LOG IN RIDES"): this chip lives on the always-night
               header, which never theme-flips — `color: "inherit"` used
               to inherit whatever ink the DOCUMENT was wearing, so on
               dawn it read the dawn `--ink` (#4A4458, ≈1.2:1 on the dark
               header — nearly invisible). Pinned to the same always-night
               ink the signed-in menu rows already wear (line ~144 below,
               "S2: pinned"), one literal value, both themes. */
            background: "none", border: "none", cursor: walking ? "default" : "pointer", color: "#ECE3C9",
            font: "inherit", letterSpacing: ".05em", textTransform: "uppercase",
            fontSize: ".78rem", whiteSpace: "nowrap",
          }}
        >
          Log in
        </button>
      ) : (
        <button
          onClick={() => setOpen((o) => (o === "menu" ? null : o === "sheet" ? "sheet" : "menu"))}
          aria-expanded={open === "menu"}
          aria-haspopup="menu"
          title={name}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--gold-2, #EBCB77)", font: "inherit", fontWeight: 700,
            letterSpacing: ".05em", textTransform: "uppercase", fontSize: ".78rem",
            whiteSpace: "nowrap",
          }}
        >
          {short}
        </button>
      )}

      {/* the walk owns the sheet until it's done — a mid-walk session flip
          (the email verifies before the name is claimed) must NOT unmount
          the sheet from under a new soul */}
      {open === "sheet" && (
        <div className="door-pop door-pop--sheet" style={{ padding: 10 }}>
          <DoorSheet
            mount="sheet"
            onIn={(n) => { lastKnownBy = n; setKnownBy(n); }}
            onClose={() => setOpen(null)}
          />
        </div>
      )}

      {open === "menu" && name && (
        <div role="menu" className="door-pop door-pop--menu" style={{ minWidth: 190, padding: "10px 0" }}>
          {/* the soul, listed — with K7's one honest badge: how they proved
              themselves (an inbox answered a code / a signer signed) */}
          <p style={{ margin: 0, padding: "2px 18px 10px", borderBottom: "1px solid rgba(217,178,78,.25)" }}>
            <span style={{ display: "block", color: "#ECE3C9", fontSize: ".8rem", fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase" }}>
              {name}
            </span>
            {proof && (
              <span style={{ fontSize: ".64rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)" }}>
                {proof}
              </span>
            )}
          </p>
          {MEMBER_MENU.map((i) => (
            <Link
              key={i.label}
              role="menuitem"
              href={i.href}
              onClick={() => setOpen(null)}
              style={menuRowStyle}
            >
              {i.label}
            </Link>
          ))}
          {/* TASK-449 (ruling 5) — the Playground line, only while Stage 2
              is open; it rides the SAME shared row style as the map rows */}
          {playgroundOpen && (
            <Link
              role="menuitem"
              href="/reading/playground"
              onClick={() => setOpen(null)}
              style={menuRowStyle}
            >
              The Playground · open now
            </Link>
          )}
          <button
            role="menuitem"
            onClick={async () => {
              setOpen(null);
              await signOut();
              window.location.assign("/");
            }}
            style={{
              display: "block", width: "100%", textAlign: "left", padding: "9px 18px",
              background: "none", border: "none", borderTop: "1px solid rgba(217,178,78,.25)",
              marginTop: 6, color: "var(--lavender-bright)", fontSize: ".8rem",
              letterSpacing: ".04em", textTransform: "uppercase", cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
