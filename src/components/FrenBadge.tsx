"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * The nav's who-am-I (v2, the Admiral's spec): signed out → "Log In";
 * signed in → the member's name in the brand's gold, opening a themed
 * dropdown — profile · classes · purchases. No glyph prefix.
 */
export default function FrenBadge() {
  const [name, setName] = useState<string | null>(null);
  const [space, setSpace] = useState<string>("");
  const [handle, setHandle] = useState<string>("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/frens/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { ok?: boolean; handle?: string; space?: string } | null) => {
        if (d?.ok && d.handle) {
          setHandle(d.handle);
          setSpace(d.space ?? "");
          setName(d.space === "email" ? d.handle.split("@")[0] : d.handle);
          // the known-by name wins (Love's ask, mid-walk 0018.05.15): once an
          // email member claims their names, the chip says who they ARE —
          // "firefly", never the mailbox
          if (d.space === "email") {
            fetch("/api/member/profile")
              .then((r) => (r.ok ? r.json() : null))
              .then((p: { ok?: boolean; displayName?: string; accountName?: string } | null) => {
                const known = p?.displayName || p?.accountName;
                if (p?.ok && known) setName(known);
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  if (!name) return <Link href="/login">Log In</Link>;
  const short = name.length > 12 ? `${name.slice(0, 11)}…` : name;
  const profileHref = space === "email" ? "/me" : `/u/${handle}@${space}`;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--gold-2, #EBCB77)",
          font: "inherit",
          fontWeight: 700,
          letterSpacing: ".05em",
          textTransform: "uppercase",
          fontSize: ".78rem",
          whiteSpace: "nowrap",
        }}
        title={name}
      >
        {short}
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 10px)",
            minWidth: 180,
            /* the one nav-dropdown recipe — poured from the --pop-* jug,
               same as .nav-sub (cartridge walk step 6) */
            background: "var(--pop-bg)",
            border: "1.5px solid var(--pop-edge)",
            borderRadius: 16,
            padding: "10px 0",
            boxShadow: "var(--pop-shadow)",
            zIndex: "var(--z-sheet, 60)" as unknown as number,
          }}
        >
          {/* one door per destination (Admiral, 0018.05.15) — "Your page",
              "Profile" and "Purchases" all led to /me for email members */}
          {[
            { label: "My field", href: "/me" },
            { label: "Calendar", href: "/me/calendar" },
            ...(space !== "email" ? [{ label: "Public page", href: profileHref }] : []),
            { label: "Classes", href: "/classes" },
          ].map((i) => (
            <Link
              key={i.label}
              role="menuitem"
              href={i.href}
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                padding: "9px 18px",
                color: "#ECE3C9", /* S2: pinned — needs a ruling (always-night --pop-* dropdown; no pinned-night ink token) */
                fontSize: ".8rem",
                letterSpacing: ".04em",
                textTransform: "uppercase",
              }}
            >
              {i.label}
            </Link>
          ))}
          <button
            role="menuitem"
            onClick={async () => {
              await fetch("/api/frens/session", { method: "DELETE" }).catch(() => {});
              window.location.assign("/");
            }}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "9px 18px",
              background: "none",
              border: "none",
              borderTop: "1px solid rgba(217,178,78,.25)",
              marginTop: 6,
              color: "var(--lavender-bright)",
              fontSize: ".8rem",
              letterSpacing: ".04em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
