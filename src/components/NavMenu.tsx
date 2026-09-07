"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SiteConfig } from "@/lib/site-config";

/**
 * The consolidated nav (Admiral, 0018.05.13): main doors with sub-menus, so
 * the bar never crowds — and a hamburger below 920px.
 * The tail (basket + name) renders beside this and never wraps.
 *
 * TASK-129 (0018.06.16 a₿): the MENU is built from THE SWITCHES
 * (site-config.ts) — Sessions only when `sessions`, Store only when `store`,
 * Community only when `community` (Classes & rooms sub only when `classes`,
 * News & letters only when `news`), About · Memberships · Support always.
 * The free meditation stays reachable either way: under Community when the
 * community door is open, under Support when it isn't (same for News &
 * letters). SiteHeader can't pass the doc down (it's client-reachable via
 * FrenProfile/OperatorGate, so no server import may enter its graph), so the
 * switches ride the public half of /api/admin/site — same fetch idiom as
 * FrenBadge. Until the answer lands only the doors every config carries
 * render, so a hidden feature never flashes on.
 */

export interface MenuItem {
  label: string;
  href: string;
  subs?: { label: string; href: string }[];
}

/** MENU from the switches — pure, so tests/site-config.test.ts pins it.
    `null` = the pre-fetch paint: only the doors every config carries. */
export function buildMenu(s: SiteConfig | null): MenuItem[] {
  const menu: MenuItem[] = [
    { label: "About", href: "/about" },
    {
      label: "Memberships",
      href: "/memberships",
      subs: [
        { label: "Heart Field", href: "/memberships" },
        { label: "Three packages", href: "/packages" },
      ],
    },
  ];
  if (s?.features.sessions) {
    menu.push({
      label: "Sessions",
      href: "/book",
      subs: [
        { label: "Book a time", href: "/book" },
        ...(s.features.cuts ? [{ label: "ConsciousCuts & Waxing", href: "/services" }] : []),
      ],
    });
  }
  if (s?.features.store) {
    menu.push({
      label: "Store",
      href: "/store",
      subs: [{ label: "All offerings", href: "/store" }],
    });
  }
  if (s?.features.community) {
    menu.push({
      label: "Community",
      href: "/classes",
      subs: [
        ...(s.features.classes ? [{ label: "Classes & rooms", href: "/classes" }] : []),
        ...(s.features.news ? [{ label: "News & letters", href: "/news" }] : []),
        { label: "11:11 Live with Love", href: "/contact" },
        { label: "Free meditation", href: "/meditation" },
      ],
    });
  }
  const supportSubs = [
    ...(s && s.features.news && !s.features.community ? [{ label: "News & letters", href: "/news" }] : []),
    ...(s && !s.features.community ? [{ label: "Free meditation", href: "/meditation" }] : []),
  ];
  menu.push({ label: "Support", href: "/support", ...(supportSubs.length ? { subs: supportSubs } : {}) });
  return menu;
}

export default function NavMenu() {
  const [open, setOpen] = useState(false); // hamburger
  const [switches, setSwitches] = useState<SiteConfig | null>(null);
  const ref = useRef<HTMLElement>(null);
  const pathname = usePathname() ?? "";

  useEffect(() => {
    fetch("/api/admin/site", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.ok && d.config && setSwitches(d.config))
      .catch(() => {});
  }, []);

  const menu = buildMenu(switches);

  /* mockup C, blessed (Admiral, 0018.05.15): where-you-are wears the dawn —
     a parent lights for its own page AND any of its children's */
  const here = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const tabHere = (m: MenuItem) => here(m.href) || (m.subs ?? []).some((s) => here(s.href));

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  /* A parent with subs is a real door (Admiral, 0018.05.15): CLICK sails
     straight to its home — Memberships→Heart Field, Community→Classes &
     rooms — while HOVER breathes the submenu open (pure CSS,
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
        {menu.map((m) => (
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
