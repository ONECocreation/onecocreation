"use client";

import Link from "next/link";
import { useCallback, useSyncExternalStore } from "react";
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

/** Which sub-row a path marks current — /a/site itself is the Switches
    room (the default), an unmapped deeper /a/site/* path marks Switches
    too, and anything outside /a/site marks nothing. */
export function siteSubForPath(pathname: string): SiteSubKey | null {
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

function SiteRoomAccordion({ active, title, pathname }: { active: boolean; title: string; pathname: string }) {
  const [open, toggle] = useSiteAccordionOpen();

  const currentSub = siteSubForPath(pathname);
  return (
    <div>
      <button
        type="button"
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
      </button>
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
  // House furniture stays on the house's bridge. An artist running their own
  // shop has no use for a SIMULATOR or a FLEET MAP, and showing them would
  // make their admin feel like someone else's software.
  // TASK-330 (0018.06.27 a₿): Live and Brand drop off the top-level rail —
  // Live folds into Studio (being in the studio opens the go-live door
  // too), Brand folds into Site as a sub-row (below). Chained after the
  // existing sort so SITE_NAV_ORDER/siteRoomOrder's own contract (and
  // tests/console.test.ts's import of it) stays exactly as it was.
  const rooms = siteRoomOrder([CONSOLE_OVERVIEW, ...CONSOLE_ROOMS].filter((r) => !r.houseOnly)).filter(
    (r) => r.key !== "live" && r.key !== "brand",
  );

  return (
    <div className="mgmt-ground">
      <SiteChromeHeader />

      <div className="mgmt-wrap mgmt-shell">
        {/* the LEFT RAIL — wireframe v2: tabs down the side, stage beside */}
        <nav className="mgmt-rail" aria-label="Management sections">
          {rooms.map((r) => {
            // TASK-330: Brand folded under Site (a sub-row, not its own
            // rail entry) — the Site row itself must still read active
            // when the current room IS Brand, so it highlights.
            const active = r.key === current.key || (r.key === "site" && current.key === "brand");
            /* TASK-188: the Site row is the accordion — every other console
               item is the same flat link it always was. */
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
            <h1 className="mgmt-title">{siteChromeTitle(current, label(current.key, current.label))}</h1>
            {!current.houseOnly && blurb(current.key, current.blurb) && (
              <p className="mgmt-blurb">{blurb(current.key, current.blurb)}</p>
            )}
          </header>
          <main className="mgmt-body">{children}</main>
        </div>
      </div>

      <SiteChromeFooter />
    </div>
  );
}
