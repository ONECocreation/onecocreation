"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { CONSOLE_ROOMS, CONSOLE_OVERVIEW, roomForPath, siteChromeTitle } from "@/lib/console";
import { SiteChromeHeader, SiteChromeFooter } from "./site-chrome";

/**
 * The SITE chrome — the operator console living inside the artist's own site
 * (the captain's call, ~0018.05.03: Love's admin should be an extension of
 * onecocreation, not a spaceship they visit).
 *
 * This is a real ALTERNATIVE SHELL, not a token remap. The SCAR·LET shell's
 * theme switch can only recolour — the LCARS elbow ribbon is markup, so a
 * recolour leaves the SCAR shell's geometry in place wearing someone else's
 * palette. A wellness practice is a different design language from a game
 * console: rounded cards, a serif, cream ground, air. That needs different
 * markup.
 *
 * Every ROOM is untouched — same pages, same APIs, same gate. Only the chrome
 * around them changes. Rooms come from the same console registry, so adding a
 * room still means one entry and both shells get it.
 *
 * Styling reads the SITE's own brand tokens (--serif, --cream, --ink, --gold…)
 * with console-safe fallbacks, so a clone that defines those in its globals.css
 * — as onecocreation already does — gets its own look with no edits here.
 */
/**
 * The house names its front page "SCAR·LET Overview" — that's the old
 * house's bridge talking. In an artist's own site the same room is just their
 * dashboard, so the site chrome renames the few labels that carry house
 * branding. The registry is untouched; only the presentation changes.
 */
export const SITE_LABELS: Record<string, string> = {
  overview: "Home",
  store: "Items",
  booking: "Sessions & hours",
  letters: "Letters",
  people: "People",
  money: "Money",
  brand: "Brand",
  live: "Live",
  studio: "Studio",
  site: "Site",
};

/** Same treatment for blurbs — "where a first captain begins" is the house
    onboarding voice, not an artist's dashboard. */
const SITE_BLURBS: Record<string, string> = {
  overview: "today's sessions, the jars, and your week at a glance",
  studio: "the broadcast desk — scenes, overlays, and guest links",
};

/* TASK-323 (0018.06.26 a₿) — the rail follows Love's day, not the registry.
   Presentation-only: CONSOLE_ROOMS itself keeps its order (the registry
   drives the SCAR·LET house shell too); only what this shell renders sorts. */
export const SITE_NAV_ORDER = [
  "overview",
  "booking",
  "live",
  "studio",
  "letters",
  "people",
  "money",
  "store",
  "site",
  "brand",
];

/** Sort rooms into the site rail's working order (TASK-323). Exported so the
    order pin in tests/console.test.ts applies the same real logic. */
export function siteRoomOrder<T extends { key: string }>(rooms: T[]): T[] {
  return [...rooms].sort(
    (a, b) => SITE_NAV_ORDER.indexOf(a.key) - SITE_NAV_ORDER.indexOf(b.key),
  );
}

const label = (key: string, fallback: string) => SITE_LABELS[key] ?? fallback;
const blurb = (key: string, fallback?: string) => SITE_BLURBS[key] ?? fallback;

/* ── TASK-188 (0018.06.18 a₿ · block 966,112) — the Site room breathes ──
   "A collapsible item under the menu item Site — many sites have accordion
   views" (the Admiral). Closed, Site is one row like every other; open, its
   sub-rooms show as indented rows, each its own view under /a/site/<sub>.
   The accordion remembers open/closed in localStorage and marks the current
   sub-row. Only the Site row changes — every other console item renders
   exactly as before. "Community & rooms" is omitted on purpose: no such
   card exists on /a/site (the spec's own condition). */

export const SITE_SUBS = [
  { key: "switches", href: "/a/site", label: "Switches" },
  { key: "menu", href: "/a/site/menu", label: "Menu" },
  { key: "community-door", href: "/a/site/community-door", label: "Community door" },
  { key: "about-videos", href: "/a/site/about-videos", label: "Videos on About" },
  /* TASK-496 (block 969,088+): the Replays list - the links /replays plays,
     pasted one per row. */
  { key: "replays", href: "/a/site/replays", label: "Replays" },
  /* TASK-387 (block 968,088+): hide the chat fully for a room, or flip it
     live mid-session — the saved default IS the session switch (Named
     decision A). */
  { key: "chat", href: "/a/site/chat", label: "Room chat" },
  /* TASK-330 (0018.06.27 a₿): Brand drops off the top-level rail and
     folds in here as a fifth sub-row — its own route (/a/brand) and
     houseOnly filtering are untouched (it's still a real CONSOLE_ROOMS
     entry, src/lib/console.ts:285-294 — this is presentation-only, the
     T-323 escape hatch). siteSubForPath's existing "exact" match below
     already answers "/a/brand" → "brand" once this entry exists — no
     separate case needed there (verified: no code change on that
     function was required, see SUMMARY). */
  { key: "brand", href: "/a/brand", label: "Brand" },
] as const;

export type SiteSubKey = (typeof SITE_SUBS)[number]["key"];

/* TASK-545 (Admiral, 2026-10-03): "move the weekly reading left menu to be
   under the studio. love knows the studio is for this kind of stuff."
   Menu placement ONLY - the page stays at /a/site/reading (and its /go/<door>
   one-tap links), it just lists under Studio instead of Site. */
export const STUDIO_SUBS = [
  { key: "reading", href: "/a/site/reading", label: "Weekly reading" },
] as const;

export type StudioSubKey = (typeof STUDIO_SUBS)[number]["key"];

/** Which Studio sub-row a path marks current - /a/site/reading and anything
    under it (the go/<door> links) mark The weekly reading; all else nothing. */
export function studioSubForPath(pathname: string): StudioSubKey | null {
  const sub = STUDIO_SUBS.find((x) => pathname === x.href || pathname.startsWith(`${x.href}/`));
  return sub ? sub.key : null;
}

/** Which sub-row a path marks current — /a/site itself is the Switches
    room (the default), an unmapped deeper /a/site/* path marks Switches
    too, and anything outside /a/site marks nothing. */
export function siteSubForPath(pathname: string): SiteSubKey | null {
  // TASK-545: the reading lives under Studio now - Site marks nothing for it
  if (studioSubForPath(pathname)) return null;
  const exact = SITE_SUBS.find((s) => s.href === pathname);
  if (exact) return exact.key;
  if (pathname.startsWith("/a/site/")) {
    const sub = SITE_SUBS.find((s) => s.href !== "/a/site" && pathname.startsWith(s.href));
    return sub ? sub.key : "switches";
  }
  return null;
}

const SITE_ACCORDION_KEY = "oc-console-site-open";
/* same-tab writes don't fire "storage" — this event is the accordion's own
   change bell so useSyncExternalStore re-reads after a toggle */
const SITE_ACCORDION_EVENT = "oc-console-site-open-change";

function readSiteAccordionOpen(): boolean {
  try {
    return window.localStorage.getItem(SITE_ACCORDION_KEY) === "1";
  } catch {
    return false; // storage can be denied — closed is the honest default
  }
}

/** open/closed, remembered in localStorage. useSyncExternalStore keeps the
    server paint (closed) and the remembered state from forking hydration —
    and no setState rides an effect. */
function useSiteAccordionOpen(): [boolean, () => void] {
  const open = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      window.addEventListener(SITE_ACCORDION_EVENT, onChange);
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(SITE_ACCORDION_EVENT, onChange);
      };
    },
    readSiteAccordionOpen,
    () => false,
  );
  const toggle = useCallback(() => {
    try {
      window.localStorage.setItem(SITE_ACCORDION_KEY, readSiteAccordionOpen() ? "0" : "1");
    } catch {
      /* storage denied — nothing to remember; the row stays closed */
    }
    window.dispatchEvent(new Event(SITE_ACCORDION_EVENT));
  }, []);
  return [open, toggle];
}

/* TASK-545 - the Studio group: same markup, classes and behaviour as the Site
   accordion, with two differences the ask names. (1) it is OPEN by default so
   The weekly reading is in sight the moment Love lands on /a; she can close it
   by hand, and that is remembered in sessionStorage only (a new browser
   session or a fresh sign-in shows it open again). (2) the row itself is the
   link to /a/studio, with a small toggle beside it, so clicking "Studio"
   still opens the studio. */
const STUDIO_CLOSED_KEY = "oc-console-studio-closed";
const STUDIO_CLOSED_EVENT = "oc-console-studio-closed-change";

function readStudioClosed(): boolean {
  try {
    return window.sessionStorage.getItem(STUDIO_CLOSED_KEY) === "1";
  } catch {
    return false; // storage denied - open is the honest default here
  }
}

function useStudioOpen(): [boolean, () => void] {
  const closed = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      window.addEventListener(STUDIO_CLOSED_EVENT, onChange);
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(STUDIO_CLOSED_EVENT, onChange);
      };
    },
    readStudioClosed,
    () => false, // server paint = open
  );
  const toggle = useCallback(() => {
    try {
      window.sessionStorage.setItem(STUDIO_CLOSED_KEY, readStudioClosed() ? "0" : "1");
    } catch {
      /* storage denied - nothing to remember */
    }
    window.dispatchEvent(new Event(STUDIO_CLOSED_EVENT));
  }, []);
  return [!closed, toggle];
}

/* TASK-545: the ONE native button in this rail - both accordions (Site's
   whole-row toggle, Studio's small toggle) render through it, so the
   operator census keeps a single button family for this file. */
/* TASK-586: `menu` = the two side-menu buttons (Rooms, Close) - the house
   ghost pill, one size, through this same single button. */
function RailToggle({ menu, ...props }: React.ComponentProps<"button"> & { menu?: boolean }) {
  return <button type="button" {...props} className={menu ? `btn btn-ghost btn-sm ${props.className ?? ""}`.trim() : props.className} />;
}

/* TASK-586 (Admiral, forge set oc-t552-letters-room-r4, phone shot of
   /a/letters): "this nav on top looks bad. can we make them a side menu".
   On a phone the rooms are a SIDE MENU: hidden until one "Rooms" button opens
   it, slides in from the left over the page with a scrim. The breakpoint is
   the one the rail already stacked at (house.css, 760px) - ONE number, so the
   old pill block and the new menu can never both show. Desktop is untouched:
   the same nav, the same rows; only a CSS-hidden button rides beside it. */
export const ROOMS_PHONE_QUERY = "(max-width: 760px)";

function useIsPhone(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(ROOMS_PHONE_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(ROOMS_PHONE_QUERY).matches,
    () => false, // server paint = desktop
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function StudioRoomAccordion({ active, title, href, pathname }: { active: boolean; title: string; href: string; pathname: string }) {
  const [openByHand, toggle] = useStudioOpen();
  const currentSub = studioSubForPath(pathname);
  // on The weekly reading's own pages the group is always open (the marked row must show)
  const open = openByHand || currentSub !== null;
  return (
    <div>
      <div className="mgmt-rail-row">
        <Link
          href={href}
          className={`mgmt-rail-tab${active ? " is-active" : ""}`}
          aria-current={active && currentSub === null ? "page" : undefined}
        >
          {title}
        </Link>
        <RailToggle
          onClick={toggle}
          aria-expanded={open}
          aria-controls="mgmt-studio-subs"
          aria-label={`${open ? "Hide" : "Show"} the ${title} pages`}
          className="mgmt-rail-tab mgmt-rail-toggle"
        >
          <span aria-hidden="true">{open ? "▾" : "▸"}</span>
        </RailToggle>
      </div>
      {open && (
        <div id="mgmt-studio-subs">
          {STUDIO_SUBS.map((s) => {
            const subActive = currentSub === s.key;
            return (
              <Link
                key={s.key}
                href={s.href}
                className={`mgmt-rail-tab mgmt-rail-sub${subActive ? " is-active" : ""}`}
                aria-current={subActive ? "page" : undefined}
              >
                {s.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SiteRoomAccordion({ active, title, pathname }: { active: boolean; title: string; pathname: string }) {
  const [open, toggle] = useSiteAccordionOpen();

  const currentSub = siteSubForPath(pathname);
  return (
    <div>
      <RailToggle
        onClick={toggle}
        aria-expanded={open}
        aria-controls="mgmt-site-subs"
        className={`mgmt-rail-tab${active ? " is-active" : ""}`}
        style={{
          width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          /* a button's UA background would grey the tab; undefined lets the
             class's own is-active background win */
          background: active ? undefined : "none",
        }}
      >
        {title}
        <span aria-hidden="true" style={{ fontSize: ".68rem" }}>{open ? "▾" : "▸"}</span>
      </RailToggle>
      {open && (
        <div id="mgmt-site-subs">
          {SITE_SUBS.map((s) => {
            const subActive = currentSub === s.key;
            return (
              <Link
                key={s.key}
                href={s.href}
                className={`mgmt-rail-tab${subActive ? " is-active" : ""}`}
                aria-current={subActive ? "page" : undefined}
                style={{ paddingLeft: 28, fontSize: ".78rem" }}
              >
                {s.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SiteConsoleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/a";
  const current = roomForPath(pathname);
  // TASK-545: the weekly reading lists under Studio, so its page heading says
  // Studio too (the route still resolves to the Site room; the rail uses `current`).
  const headRoom =
    (studioSubForPath(pathname) !== null && CONSOLE_ROOMS.find((r) => r.key === "studio")) || current;
  // House furniture stays on the house's bridge. An artist running their own
  // shop has no use for a SIMULATOR or a FLEET MAP, and showing them would
  // make their admin feel like someone else's software.
  // TASK-330 (0018.06.27 a₿): Live and Brand drop off the top-level rail —
  // Live folds into Studio (being in the studio opens the go-live door
  // too), Brand folds into Site as a sub-row (below). Chained after the
  // existing sort so SITE_NAV_ORDER/siteRoomOrder's own contract (and
  // tests/console.test.ts's import of it) stays exactly as it was.
  const isPhone = useIsPhone();
  const [openRaw, setOpen] = useState(false);
  const open = openRaw && isPhone; // a wide screen never keeps the drawer open
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus(); // focus goes home to the button
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !navRef.current) return;
      const els = Array.from(navRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      const at = document.activeElement;
      if (!navRef.current.contains(at)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && at === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && at === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  const rooms = siteRoomOrder([CONSOLE_OVERVIEW, ...CONSOLE_ROOMS].filter((r) => !r.houseOnly)).filter(
    (r) => r.key !== "live" && r.key !== "brand",
  );

  return (
    <div className="mgmt-ground">
      <SiteChromeHeader />

      <div className="mgmt-wrap mgmt-shell">
        {/* the LEFT RAIL — wireframe v2: tabs down the side, stage beside */}
        {/* TASK-586: phone only (CSS hides it above 760px) - the one door to the side menu */}
        <RailToggle
          ref={triggerRef}
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="mgmt-rooms-nav"
          className="mgmt-rooms-btn"
          menu
        >
          Rooms
        </RailToggle>
        {open && <div className="mgmt-rooms-scrim" onClick={close} aria-hidden="true" />}
        <nav
          id="mgmt-rooms-nav"
          ref={navRef}
          className={`mgmt-rail${open ? " is-open" : ""}`}
          aria-label="Management sections"
          {...(open ? { role: "dialog", "aria-modal": true } : {})}
          onClick={(e) => {
            // choosing a room (any real link) closes the menu; accordion toggles do not
            if (open && (e.target as HTMLElement).closest("a[href]")) setOpen(false);
          }}
        >
          {open && (
            <div className="mgmt-rail-head">
              <span className="mgmt-rail-headname">Rooms</span>
              <RailToggle ref={closeRef} onClick={close} menu>
                Close
              </RailToggle>
            </div>
          )}
          {rooms.map((r) => {
            // TASK-330: Brand folded under Site (a sub-row, not its own
            // rail entry) — the Site row itself must still read active
            // when the current room IS Brand, so it highlights.
            // TASK-545: the reading's pages belong to Studio's group, so the
            // Site row does not light for them (the sub-row is the mark).
            const onReading = studioSubForPath(pathname) !== null;
            const active =
              r.key === "studio"
                ? r.key === current.key || onReading
                : r.key === "site"
                  ? (r.key === current.key || current.key === "brand") && !onReading
                  : r.key === current.key;
            /* TASK-188: the Site row is the accordion — every other console
               item is the same flat link it always was. */
            if (r.key === "studio") {
              return (
                <StudioRoomAccordion
                  key={r.key}
                  active={active}
                  title={label(r.key, r.label)}
                  href={r.href}
                  pathname={pathname}
                />
              );
            }
            if (r.key === "site") {
              return (
                <SiteRoomAccordion
                  key={r.key}
                  active={active}
                  title={label(r.key, r.label)}
                  pathname={pathname}
                />
              );
            }
            return (
              <Link
                key={r.key}
                href={r.href}
                className={`mgmt-rail-tab${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {label(r.key, r.label)}
              </Link>
            );
          })}
        </nav>

        <div className="mgmt-stage">
          <header className="mgmt-head">
            <p className="mgmt-eyebrow">Manage</p>
            {/* TASK-135: siteChromeTitle is the one choke point that keeps a
                houseOnly room's real name (DUTY ROSTER, BRIDGE, …) off this
                chrome, whichever path resolved to it (Admiral's catch). */}
            <h1 className="mgmt-title">{siteChromeTitle(headRoom, label(headRoom.key, headRoom.label))}</h1>
            {!headRoom.houseOnly && blurb(headRoom.key, headRoom.blurb) && (
              <p className="mgmt-blurb">{blurb(headRoom.key, headRoom.blurb)}</p>
            )}
          </header>
          <main className="mgmt-body">{children}</main>
        </div>
      </div>

      <SiteChromeFooter />
    </div>
  );
}
