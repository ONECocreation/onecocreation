"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import { config } from "@/lib/puck-config";
import type { PopupTrigger } from "@/lib/puck-store";

/**
 * PopupHost (STUDIO P2): mounts on the ruled routes (home /, /about,
 * /classes, /memberships) and on studio-built /p/<slug> pages (gate ruling
 * 0018.05.25 a₿ — a built page is a real page, popups included); it stays
 * a no-op everywhere else. It asks the public seam (/api/puck-live) for the
 * merged registry, finds the first popup whose trigger lists THIS path,
 * fetches that popup's LIVE document (seed fallback server-side), and after
 * delayMs shows it as a centered card on a dimmed backdrop, rendered through
 * Puck like any page.
 *
 * Honesty laws: one popup at a time (first registry match wins); fires at
 * most once per mount (strict-mode safe); oncePerSession caps via
 * sessionStorage (marked when the popup OPENS, so a reload mid-delay never
 * double-fires); dismiss is ✕, backdrop click, or Esc; reduced motion
 * appears instantly with no transition; and any fetch trouble renders
 * NOTHING — a popup must never error the page.
 *
 * Dialog a11y (gate punch-list, 0018.05.25 a₿): the dialog portals to
 * <body> so the page behind can be made inert while it's open; focus moves
 * INTO the card on open (initial focus on ✕), Tab is trapped inside it,
 * the body is scroll-locked, and focus returns to whatever had it before.
 */

const seenKey = (name: string) => `oc-popup-seen:${name}`;

/* the keep-dark law, hand-carried: the card is an always-night surface
   (--pop-bg, deliberate — the header family), but it portals to <body>,
   OUTSIDE the reach of `main .keep-dark` (cartridge.css) — so the same
   eight night pins ride inline and the Puck seed content never flips to
   dawn ink on the night card (S21: the 1.71 headline at dawn). Values
   verbatim from the keep-dark scope. */
const POPUP_NIGHT_PINS = {
  "--ink-strong": "#F4ECFF", "--ink-body": "#D9D2E4", "--muted": "#9a8fae",
  "--rose": "#E7B2C3", "--gold-deep": "#D9B24E", "--teal-bright": "#8FD0D8",
  "--glass": "var(--glass-night)", "--glass-edge": "var(--glass-night-edge)",
} as CSSProperties;

export default function PopupHost() {
  const pathname = usePathname();
  const [doc, setDoc] = useState<Data | null>(null);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    /* no "fired" ref: the cleanup below is the only guard, so React's
       strict-mode double-invoke (dev) cancels run 1 and run 2 proceeds —
       the popup can't be suppressed, and re-renders don't re-run this */
    let dead = false;
    (async () => {
      try {
        const reg = (await fetch("/api/puck-live").then((r) => (r.ok ? r.json() : null))) as
          { popups?: Record<string, PopupTrigger> } | null;
        const hit = Object.entries(reg?.popups ?? {}).find(([, t]) =>
          t?.enabled && Array.isArray(t.pages) && t.pages.includes(pathname));
        if (!hit) return;
        const [name, t] = hit;
        if (t.oncePerSession) {
          try { if (sessionStorage.getItem(seenKey(name))) return; } catch { /* private mode — show it */ }
        }
        const d = (await fetch(`/api/puck-live?slug=popup:${encodeURIComponent(name)}`)
          .then((r) => (r.ok ? r.json() : null))) as { doc?: Data } | null;
        if (!d?.doc || dead) return;
        setDoc(d.doc);
        timerRef.current = window.setTimeout(() => {
          if (dead) return;
          if (t.oncePerSession) {
            try { sessionStorage.setItem(seenKey(name), "1"); } catch { /* private mode */ }
          }
          setOpen(true);
        }, typeof t.delayMs === "number" ? t.delayMs : 2000);
      } catch { /* registry/doc unreachable — nothing renders */ }
    })();
    return () => {
      dead = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [pathname]);

  /* Esc dismisses, only while open */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /* dialog behavior while open: initial focus on ✕, Tab trapped inside the
     card, every other <body> subtree inert, body scroll-locked, focus
     restored on close. inert via the attribute (TS's lib lags the property);
     it also removes the background from the AT tree, so no aria-hidden twin */
  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const card = cardRef.current;
    const silenced: HTMLElement[] = [];
    for (const el of Array.from(document.body.children)) {
      if (!(el instanceof HTMLElement) || (card && el.contains(card))) continue;
      el.setAttribute("inert", "");
      silenced.push(el);
    }
    closeRef.current?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !card) return;
      const focusables = card.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const outside = !card.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = prevOverflow;
      for (const el of silenced) el.removeAttribute("inert");
      window.removeEventListener("keydown", trap);
      prevFocus?.focus?.();
    };
  }, [open]);

  if (!open || !doc) return null;

  /* the entrance is a CSS animation, not rAF-driven state: it starts on
     insertion with zero JS timing (a starved rAF can never leave the card
     invisible), and the media query freezes it for reduced motion. The
     portal to <body> is what lets the open-effect inert the page behind. */
  return createPortal(
    <div
      role="presentation"
      className="oc-popup-backdrop"
      onClick={() => setOpen(false)}
      style={{ position: "fixed", inset: 0, zIndex: 1200, display: "flex",
        alignItems: "center", justifyContent: "center", padding: 20,
        background: "rgba(10,8,20,.84)", /* gate 0018.05.25 a₿: the .66 scrim left body copy competing */
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
        animation: "ocPopupFade .25s ease" }}
    >
      <style>{`
        @keyframes ocPopupFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ocPopupRise { from { transform: translateY(10px) } to { transform: translateY(0) } }
        .oc-popup-card :is(h1, h2, h3) { text-wrap: balance; }
        @media (prefers-reduced-motion: reduce) {
          .oc-popup-backdrop, .oc-popup-card { animation: none !important; }
        }
      `}</style>
      <div
        role="dialog" aria-modal="true" aria-label="One Cocreation"
        className="oc-popup-card"
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", width: "min(440px, 100%)", maxHeight: "86vh", overflowY: "auto",
          background: "var(--pop-bg)", border: "1px solid rgba(139,118,196,.45)", borderRadius: 20,
          padding: "30px 26px", boxShadow: "0 30px 80px rgba(0,0,0,.6)",
          animation: "ocPopupRise .25s ease", ...POPUP_NIGHT_PINS }}
      >
        <button
          ref={closeRef}
          onClick={() => setOpen(false)}
          aria-label="close"
          title="close"
          style={{ position: "absolute", top: 10, right: 12, zIndex: 2, border: "none",
            background: "none", color: "#D9D2E4", /* S2: pinned (always-night card) — the --ink-body night value; the old #9a8fae muted failed contrast at 16px */ fontSize: 18, lineHeight: 1, cursor: "pointer", padding: 8 }}
        >✕</button>
        <Render config={config} data={doc} />
      </div>
    </div>,
    document.body,
  );
}
