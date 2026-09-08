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
 * (site-config.ts) — Sessions only when `sessions`, Store only when `store`.
 * SiteHeader can't pass the doc down (it's client-reachable via
 * FrenProfile/OperatorGate, so no server import may enter its graph), so the
 * switches ride the public half of /api/admin/site — same fetch idiom as
 * FrenBadge. Until the answer lands only the doors every config carries
 * render, so a hidden feature never flashes on.
 *
 * TASK-137 (0018.06.17 a₿) — the menu Love can shape:
 *  · Community is now a HEADER, not a switch: it always renders because two
 *    of its children (Free meditation, 11:11 Live with Love) always exist.
 *    News & letters joins it only when `news` is ON; Classes & rooms only
 *    when `classes` is ON. Support goes back to carrying only Support — the
 *    old "meditation/news fall under Support while Community is off" dodge
 *    is gone (they used to hide there; the Admiral's ask was to surface
 *    them, not bury them one level down).
 *  · PAGE_CATALOG is the one place that knows every real route, its plain
 *    name, and which switch (if any) gates it — the nav editor's page
 *    picker, the public switch-filter below, and the "hidden by the X
 *    switch" grey-out all read the same table so they can never disagree.
 *  · buildMenu(s) now prefers `s.nav` (Love's saved rows) when present,
 *    running it through the SAME switch filter as the default menu — a
 *    page she placed under a header she invented still disappears the
 *    moment its switch goes OFF. No nav saved yet → the switch-driven
 *    default below, unchanged in spirit from T-129.
 */

export interface MenuItem {
  label: string;
  href: string;
  subs?: { label: string; href: string }[];
}

/** Every real route a nav item may point to: its plain name (the editor's
    page picker), and the switch that must be ON for it to show (`feature`
    omitted = always shown). One source for the public filter AND the
    editor's "hidden by the X switch" note — they can never disagree.
    Kept in sync by hand with KNOWN_NAV_HREFS in site-config.ts (the
    storage-layer allow-list; that file can't import this "use client"
    module, so the href *strings* are the seam between them). */
export const PAGE_CATALOG: { href: string; label: string; feature?: keyof SiteConfig["features"] }[] = [
  { href: "/about", label: "About" },
  { href: "/memberships", label: "Memberships" },
  { href: "/packages", label: "Packages" },
  { href: "/store", label: "Store", feature: "store" },
  { href: "/store/meditations", label: "Meditations shelf", feature: "store" },
  { href: "/store/memberships", label: "Memberships shelf", feature: "store" },
  { href: "/book", label: "Book", feature: "sessions" },
  { href: "/services", label: "Services", feature: "cuts" },
  { href: "/classes", label: "Classes", feature: "classes" },
  { href: "/news", label: "News", feature: "news" },
  { href: "/letters", label: "Letters", feature: "news" },
  { href: "/meditation", label: "Meditation" },
  { href: "/support", label: "Support" },
  { href: "/contact", label: "Contact" },
  { href: "/me", label: "Me…" },
];

/** The switch (if any) a given href needs ON to show publicly. Unknown
    hrefs (never fabricated — sanitize() already dropped them, this is only
    a second, cheap belt) are treated as always-on rather than hidden, since
    an unrecognized route was never gated by a switch in the first place. */
function featureForHref(href: string): keyof SiteConfig["features"] | undefined {
  return PAGE_CATALOG.find((p) => p.href === href)?.feature;
}

/** True when a page's own switch is ON (or it has none). `s === null` is
    the pre-fetch paint: only switch-free doors render, same law as before. */
function pageOn(s: SiteConfig | null, href: string): boolean {
  const feature = featureForHref(href);
  if (!feature) return true;
  return !!s?.features[feature];
}

/** The switch-driven default menu (T-129's shape, T-137's Community rule).
    Exported so the nav editor can seed its rows and answer "Reset to
    default" without re-deriving this logic. */
export function buildDefaultMenu(s: SiteConfig | null): MenuItem[] {
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
      /* Love's meeting (0018.06.17 a₿, RESUME NOTE): under the Store header,
         two buttons — Meditations and Memberships. The header itself stays
         the click-through door to the whole shelf (/store); store OFF still
         hides the header and its buttons with it. Plain routes (not #anchors)
         so a seeded nav survives sanitize()'s KNOWN_NAV_HREFS round-trip.
         TASK-176 (0018.06.18 a₿): the buttons open the shelf's own filtered
         routes now — Meditations → /store/meditations (the free meditation
         rides there as a card), Memberships → /store/memberships. The old
         /meditation button sent visitors to the gift page and they never
         saw the paid shelf; saved navs that still say /meditation under the
         Store header migrate on read in site-config.ts. The Community
         header's "Free meditation" child keeps /meditation — it IS the gift. */
      subs: [
        { label: "Meditations", href: "/store/meditations" },
        { label: "Memberships", href: "/store/memberships" },
      ],
    });
  }
  // Community is a HEADER (TASK-137): Free meditation and 11:11 Live with
  // Love always exist, so this always renders — the community SWITCH only
  // still gates the deeper rooms (Classes & rooms follows `classes`, same
  // as it always has; `community` itself no longer hides the header).
  menu.push({
    label: "Community",
    href: "/classes",
    subs: [
      ...(s?.features.news ? [{ label: "News & letters", href: "/news" }] : []),
      { label: "Free meditation", href: "/meditation" },
      { label: "11:11 Live with Love", href: "/contact" },
      ...(s?.features.classes ? [{ label: "Classes & rooms", href: "/classes" }] : []),
    ],
  });
  menu.push({ label: "Support", href: "/support" });
  return menu;
}

/** MENU from Love's saved nav, or the switches — pure, so tests pin it.
    `null` = the pre-fetch paint: only the doors every config carries.
    A LEAF item (no children) is gated by its own href's switch. A HEADER
    (children present) is gated by its CHILDREN's switches only — never its
    own href — which is exactly why Community always survives: it always
    has at least one always-on child (Free meditation, 11:11), so it's
    never empty, so it's never dropped, no matter what its own href is. A
    header whose every child switches off has nothing left to show and
    disappears with them. */
export function buildMenu(s: SiteConfig | null): MenuItem[] {
  const nav = s?.nav;
  if (!nav || nav.items.length === 0) return buildDefaultMenu(s);
  const menu: MenuItem[] = [];
  for (const item of nav.items) {
    const rawChildren = item.children ?? [];
    if (rawChildren.length === 0) {
      if (item.href && pageOn(s, item.href)) menu.push({ label: item.label, href: item.href });
      continue;
    }
    const subs = rawChildren.filter((c) => pageOn(s, c.href)).map((c) => ({ label: c.label, href: c.href }));
    if (subs.length === 0) continue;
    menu.push({ label: item.label, href: item.href ?? subs[0].href, subs });
  }
  return menu;
}

/** WHERE-YOU-ARE (Admiral, 0018.06.18 a₿ — TASK-176's pin): a header tab
    is underlined ONLY when the page IS that tab — pathname === its own
    href, never for a child. Before this, tabHere lit a parent for any of
    its children too (mockup C's rule), so /memberships wore a constant
    underline on the Store tab just because Memberships rides its submenu.
    The child button keeps its own current mark (navChildHere below). Pure
    and exported so tests pin the ruling without a DOM. */
export function navTabHere(pathname: string, m: MenuItem): boolean {
  return pathname === m.href;
}

/** A child's own current mark: its exact page, or one of its own sub-paths
    (/book/xyz still marks a Book child). */
export function navChildHere(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
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

  /* where-you-are wears the dawn — the TASK-176 ruling: the TAB lights only
     for its own page (never a child's); a CHILD keeps its own mark */
  const here = (href: string) => navChildHere(pathname, href);
  const tabHere = (m: MenuItem) => navTabHere(pathname, m);

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
