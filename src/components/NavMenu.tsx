"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * The consolidated nav (Admiral, 0018.05.13): five main doors with
 * sub-menus, so the bar never crowds — and a hamburger below 920px.
 * The tail (basket + name) renders beside this and never wraps.
 */
const MENU: { label: string; href: string; subs?: { label: string; href: string }[] }[] = [
  { label: "About", href: "/about" },
  {
    label: "Memberships",
    href: "/memberships",
    subs: [
      { label: "Heart Field", href: "/memberships" },
      { label: "Three packages", href: "/packages" },
    ],
  },
  {
    label: "Sessions",
    href: "/book",
    subs: [
      { label: "Book a time", href: "/book" },
      { label: "ConsciousCuts & Waxing", href: "/services" },
    ],
  },
  {
    label: "Store",
    href: "/store",
    subs: [
      { label: "All offerings", href: "/store" },
      // Adornments paused (Admiral, 0018.05.14) — /jewelry stays live but
      // unlisted until Love's product photos arrive.
      { label: "Free meditation", href: "/meditation" },
    ],
  },
  {
    label: "Community",
    href: "/classes",
    subs: [
      { label: "Classes & rooms", href: "/classes" },
      { label: "News & letters", href: "/news" },
      { label: "11:11 Live with Love", href: "/contact" },
    ],
  },
  { label: "Support", href: "/support" },
];

export default function NavMenu() {
  const [open, setOpen] = useState(false); // hamburger
  const ref = useRef<HTMLElement>(null);
  const pathname = usePathname() ?? "";

  /* mockup C, blessed (Admiral, 0018.05.15): where-you-are wears the dawn —
     a parent lights for its own page AND any of its children's */
  const here = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const tabHere = (m: (typeof MENU)[number]) => here(m.href) || (m.subs ?? []).some((s) => here(s.href));

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  /* A parent with subs is a real door (Admiral, 0018.05.15): CLICK sails
     straight to its home — Memberships→Heart Field, Sessions→Book a time,
     Store→All offerings — while HOVER breathes the submenu open (pure CSS,
     .has-sub). In the phone sheet the subs simply sit under their parent. */
  return (
    <nav ref={ref} className="site-nav nav-menu">
      <button
        className="nav-burger"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ☰
      </button>
      <div className={`nav-items${open ? " is-open" : ""}`}>
        {MENU.map((m) => (
          <div key={m.label} className={`nav-item${m.subs ? " has-sub" : ""}`}>
            <Link className={`nav-link${tabHere(m) ? " is-here" : ""}`} href={m.href}
              aria-current={tabHere(m) ? "page" : undefined} onClick={() => setOpen(false)}>
              {m.label}
            </Link>
            {m.subs && (
              <div className="nav-sub">
                {m.subs.map((s) => (
                  <Link key={s.href} href={s.href} className={here(s.href) ? "is-here" : undefined}
                    aria-current={here(s.href) ? "page" : undefined} onClick={() => setOpen(false)}>
                    {s.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
