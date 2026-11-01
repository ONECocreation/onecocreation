"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { SiteConfig } from "@/lib/site-config";
import { READING_PAGE_PATH, READING_ROOM_PATH } from "@/lib/reading-room";
import { COLLABORATIONS_HREF, COLLABORATIONS_SUBS, DOTERRA_TAB_LABEL, DOTERRA_URL, PLACEHOLDER_NAV_HREFS } from "@/lib/collab-tabs";

/**
 * The consolidated nav (Admiral, 0018.05.13): main doors with sub-menus, so
 * the bar never crowds — and a hamburger below 1000px (was 920 — TASK-257: six links + a signed-in name overflowed the row between 920 and 1000).
 * The tail (basket + name) renders beside this and never wraps.
 *
 * TASK-129 (0018.06.16 a₿): the MENU is built from THE SWITCHES
 * (site-config.ts) — Sessions only when `sessions`, Store only when `store`.
 * SiteHeader can't pass the doc down (it's client-reachable via
 * MemberProfile/OperatorGate, so no server import may enter its graph), so the
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
export const PAGE_CATALOG: {
  href: string;
  label: string;
  /** TASK-187: a route may need MORE than one switch ON (the Store shelf's
      Memberships button needs `store` AND `memberships`) — an array means
      every listed switch must be ON. */
  feature?: keyof SiteConfig["features"] | (keyof SiteConfig["features"])[];
}[] = [
  { href: "/about", label: "About" },
  { href: "/memberships", label: "Memberships", feature: "memberships" },
  { href: "/packages", label: "Packages", feature: "memberships" },
  { href: "/store", label: "Store", feature: "store" },
  { href: "/store/meditations", label: "Meditations shelf", feature: "store" },
  { href: "/store/memberships", label: "Memberships shelf", feature: ["store", "memberships"] },
  { href: "/book", label: "Book", feature: "sessions" },
  { href: "/services", label: "Services", feature: "cuts" },
  { href: "/classes", label: "Classes", feature: "classes" },
  { href: "/news", label: "News", feature: "news" },
  { href: "/letters", label: "Letters", feature: "news" },
  { href: "/meditation", label: "Meditation" },
  { href: "/support", label: "Support" },
  { href: "/contact", label: "Contact" },
  { href: "/me", label: "Me…" },
  /* TASK-391 (block 968,088): the Saturday reading's own public front door
     — the schedule/countdown page at /reading, the reading's public
     landing spot. Never to be confused with "The reading room" below
     (the free room's own Stage, READING_ROOM_PATH). Ungated (decision D):
     the reading is the site's public front door this week. */
  { href: "/reading", label: "Read with Love" },
  /* TASK-496 (block 969,088+): the Replays page - every recorded reading,
     playable on the site. Ungated (same standing as Free meditation): the
     page is public and always exists; the list ships empty and the page's
     designed empty state carries it until the first paste. The Admiral:
     under Community, NOT Sessions. */
  { href: "/replays", label: "Replays" },
  /* TASK-213 (0018.06.23 a₿, Love's call #19): the reading gets its own
     door under Community — the SAME derived room reading-room.ts already
     feeds ReadWithLove, the member menu, and the Heart Field row (never a
     second spelling). No `feature`: the door is gated only by the room's
     own presence in the registry (derive-or-dash), same as Free meditation
     and 11:11. Omitted entirely when no free room exists — the editor's
     picker never offers a dead page. */
  ...(READING_ROOM_PATH ? [{ href: READING_ROOM_PATH, label: "Heart Field" }] : []),
];

/** The switch (if any) a given href needs ON to show publicly. Unknown
    hrefs (never fabricated — sanitize() already dropped them, this is only
    a second, cheap belt) are treated as always-on rather than hidden, since
    an unrecognized route was never gated by a switch in the first place. */
function featuresForHref(href: string): (keyof SiteConfig["features"])[] {
  const f = PAGE_CATALOG.find((p) => p.href === href)?.feature;
  if (!f) return [];
  return Array.isArray(f) ? f : [f];
}

/** True when EVERY switch a page needs is ON (or it needs none). `s === null`
    is the pre-fetch paint: only switch-free doors render, same law as before. */
function pageOn(s: SiteConfig | null, href: string): boolean {
  const features = featuresForHref(href);
  if (features.length === 0) return true;
  return features.every((feature) => !!s?.features[feature]);
}

/** The switch-driven default menu (T-129's shape, T-137's Community rule).
    Exported so the nav editor can seed its rows and answer "Reset to
    default" without re-deriving this logic. */
export function buildDefaultMenu(s: SiteConfig | null): MenuItem[] {
  /* T-615 (the Admiral: "ok to move to this layout"): the built-in menu is
     About | Store | Community | Collaborations | doTERRA | Support (the two
     tabs before Support are TASK-637's). Store carries Sessions (Book a time
     folds into it, same /book page), Meditations, Memberships and Three
     packages; Community carries Read with Love, Replays, Heart Field, 11:11
     Live with Love, Free meditation, then Classes and News & letters (each
     behind its own switch). There is no separate Memberships tab or Sessions
     tab any more: their pages stay, reached through Store. Every row follows
     its own page's switch (pageOn), so a header with nothing left on drops
     away, exactly like a saved menu does in buildMenu. */
  const store: MenuItem["subs"] = [
    { label: "Sessions", href: "/book" },
    ...(s?.features.cuts ? [{ label: "ConsciousCuts & Waxing", href: "/services" }] : []),
    { label: "Meditations", href: "/store/meditations" },
    { label: "Memberships", href: "/store/memberships" },
    { label: "Three packages", href: "/packages" },
  ].filter((c) => pageOn(s, c.href));
  const menu: MenuItem[] = [{ label: "About", href: "/about" }];
  if (store.length > 0) menu.push({ label: "Store", href: s?.features.store ? "/store" : store[0].href, subs: store });
  // Community is a HEADER (TASK-137): Free meditation and 11:11 Live with
  // Love always exist, so it always renders. Heart Field is the free room
  // (derive-or-dash: no free room in the registry, no row).
  menu.push({
    label: "Community",
    href: "/classes",
    subs: [
      { label: "Read with Love", href: READING_PAGE_PATH },
      { label: "Replays", href: "/replays" },
      ...(READING_ROOM_PATH ? [{ label: "Heart Field", href: READING_ROOM_PATH }] : []),
      { label: "11:11 Live with Love", href: "/contact" },
      { label: "Free meditation", href: "/meditation" },
      ...(s?.features.classes ? [{ label: "Classes", href: "/classes" }] : []),
      ...(s?.features.news ? [{ label: "News & letters", href: "/news" }] : []),
    ],
  });
  /* TASK-637 (block 973,977, Love's text 972653): the Collaborations tab
     between Community and Support, and the doTERRA tab beside it. Both
     ride the placeholders in src/lib/collab-tabs.ts (Love's seam — she
     swaps the hrefs there, no code dive). No switch gates either tab. The
     one-level law stands: "Universally Local" is the drop's FIRST ROW, its
     own future page, never a nested fly-out. The doTERRA row is a leaf;
     the component below opens its pop-up instead of sailing out. */
  menu.push({ label: "Collaborations", href: COLLABORATIONS_HREF, subs: [...COLLABORATIONS_SUBS] });
  menu.push({ label: DOTERRA_TAB_LABEL, href: DOTERRA_URL });
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
  const [doterra, setDoterra] = useState(false); // T-637: the doTERRA pop-up
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

  /* TASK-637: the doTERRA tab. Love's text (972653): "a link to her
     personal doTERRA set up - maybe a pop-up with a scan code when they
     click the link". The link AND the scan code stay placeholders
     (src/lib/collab-tabs.ts is her seam) until she gives them; the tab
     opens the pop-up below instead of sailing out. Keyed on the tab's own
     label so no other row changes — a tab Love renames on the board to
     something else becomes a plain link again. */
  const doterraItem = menu.find((m) => !m.subs && m.label.toLowerCase() === DOTERRA_TAB_LABEL.toLowerCase());

  useEffect(() => {
    if (!doterra) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDoterra(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [doterra]);

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
            {m === doterraItem ? (
              /* the bare .nav-link class carries every look (size, case,
                 spacing — house.css:679 already resets a button's chrome);
                 NO inline typography, so the tab matches its siblings
                 exactly (Number One's note on the mockup) */
              <button type="button" className="nav-link"
                onClick={() => { setOpen(false); setDoterra(true); }}>
                {m.label}
              </button>
            ) : (
            <Link className={`nav-link${tabHere(m) ? " is-here" : ""}`} href={m.href}
              prefetch={PLACEHOLDER_NAV_HREFS.has(m.href) ? false : undefined}
              aria-current={tabHere(m) ? "page" : undefined} onClick={() => setOpen(false)}>
              {m.label}
            </Link>
            )}
            {m.subs && (
              <div className="nav-sub">
                {m.subs.map((s) => (
                  <Link key={s.href} href={s.href} className={here(s.href) ? "is-here" : undefined}
                    prefetch={PLACEHOLDER_NAV_HREFS.has(s.href) ? false : undefined}
                    aria-current={here(s.href) ? "page" : undefined} onClick={() => setOpen(false)}>
                    {s.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {/* T-637: the pop-up portals to body (house.css's .doterra-* block
          says why) and centres on both axes at every width — the Admiral's
          pins on the mockup set. */}
      {doterra && doterraItem && createPortal(
        <div role="dialog" aria-modal="true" aria-label="doTERRA" className="doterra-overlay"
          onClick={() => setDoterra(false)}>
          <div className="doterra-card" onClick={(e) => e.stopPropagation()}>
            <p className="kicker doterra-kicker">doTERRA</p>
            <p className="doterra-intro">
              Love&apos;s own doTERRA page opens from here. Scan the code with your phone, or open the link below.
            </p>
            {/* placeholder scan code: Love's real doTERRA scan code replaces this square */}
            <svg width="132" height="132" viewBox="0 0 132 132" role="img" className="doterra-qr"
              aria-label="Placeholder scan code - Love's real doTERRA scan code goes here">
              {[0, 96, 0].map((x, i) => (
                <g key={i} className="qr-ink">
                  <rect x={[4, 92, 4][i]} y={[4, 4, 92][i]} width="36" height="36" rx="4" />
                  <rect x={[10, 98, 10][i]} y={[10, 10, 98][i]} width="24" height="24" rx="2" className="qr-paper" />
                  <rect x={[16, 104, 16][i]} y={[16, 16, 104][i]} width="12" height="12" rx="2" className="qr-ink" />
                </g>
              ))}
              {[52, 66, 80, 96, 110].map((x, i) =>
                [52, 74, 96, 110].map((y, j) =>
                  (i * 7 + j * 13) % 3 === 0 ? <rect key={`${x}-${y}`} x={x} y={y} width="10" height="10" className="qr-ink" /> : null
                )
              )}
              {[52, 66, 80].map((y, i) =>
                [8, 22, 36].map((x, j) =>
                  (i + j) % 2 === 0 ? <rect key={`m${x}-${y}`} x={x} y={y} width="10" height="10" className="qr-ink" /> : null
                )
              )}
            </svg>
            <p className="doterra-note">
              placeholder: the scan code and the link are Love&apos;s to give
            </p>
            <div className="doterra-asks">
              <a className="btn btn-sm" href={doterraItem.href} target="_blank" rel="noopener noreferrer">
                Open the doTERRA site
              </a>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDoterra(false)}>
                Not now
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </nav>
  );
}
