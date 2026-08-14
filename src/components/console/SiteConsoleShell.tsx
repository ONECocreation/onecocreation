"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CONSOLE_ROOMS, CONSOLE_OVERVIEW, roomForPath } from "@/lib/console";
import { SiteChromeHeader, SiteChromeFooter } from "./site-chrome";

/**
 * The SITE chrome — the operator console living inside the artist's own site
 * (the captain's call, ~0018.05.03: Love's admin should be an extension of
 * onecocreation, not a spaceship they visit).
 *
 * This is a real ALTERNATIVE SHELL, not a token remap. The SCAR·LET shell's
 * theme switch can only recolour — the LCARS elbow ribbon is markup, so a
 * recolour leaves the arcade's geometry in place wearing someone else's
 * palette. A wellness practice is a different design language from an arcade:
 * rounded cards, a serif, cream ground, air. That needs different markup.
 *
 * Every ROOM is untouched — same pages, same APIs, same gate. Only the chrome
 * around them changes. Rooms come from the same console registry, so adding a
 * room still means one entry and both shells get it.
 *
 * Styling reads the SITE's own brand tokens (--serif, --cream, --ink, --gold…)
 * with arcade-safe fallbacks, so a clone that defines those in its globals.css
 * — as onecocreation already does — gets its own look with no edits here.
 */
/**
 * The house names its front page "SCAR·LET Overview" — that's the arcade's
 * bridge talking. In an artist's own site the same room is just their
 * dashboard, so the site chrome renames the few labels that carry house
 * branding. The registry is untouched; only the presentation changes.
 */
const SITE_LABELS: Record<string, string> = {
  overview: "Home & Calendar",
  store: "Items",
  booking: "Services",
  letters: "Letters",
  people: "People",
  money: "Money Jars",
  brand: "Brand",
};

/** Same treatment for blurbs — "where a first captain begins" is the house
    onboarding voice, not an artist's dashboard. */
const SITE_BLURBS: Record<string, string> = {
  overview: "today's sessions, the jars, and your week at a glance",
};

const label = (key: string, fallback: string) => SITE_LABELS[key] ?? fallback;
const blurb = (key: string, fallback?: string) => SITE_BLURBS[key] ?? fallback;

export default function SiteConsoleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/a";
  const current = roomForPath(pathname);
  // House furniture stays on the house's bridge. An artist running their own
  // shop has no use for a SIMULATOR or a FLEET MAP, and showing them would
  // make their admin feel like someone else's software.
  const rooms = [CONSOLE_OVERVIEW, ...CONSOLE_ROOMS].filter((r) => !r.houseOnly);

  return (
    <div className="mgmt-ground">
      <SiteChromeHeader />

      <div className="mgmt-wrap mgmt-shell">
        {/* the LEFT RAIL — wireframe v2: tabs down the side, stage beside */}
        <nav className="mgmt-rail" aria-label="Management sections">
          {rooms.map((r) => {
            const active = r.key === current.key;
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
            <h1 className="mgmt-title">{label(current.key, current.label)}</h1>
            {blurb(current.key, current.blurb) && (
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
