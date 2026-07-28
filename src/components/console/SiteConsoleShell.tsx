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
  overview: "Overview",
  store: "Shelf",
  booking: "Calendar",
  brand: "Brand",
};

const label = (key: string, fallback: string) => SITE_LABELS[key] ?? fallback;

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

      <div className="mgmt-wrap">
        <header className="mgmt-head">
          <p className="mgmt-eyebrow">Manage</p>
          <h1 className="mgmt-title">{label(current.key, current.label)}</h1>
          {current.blurb && <p className="mgmt-blurb">{current.blurb}</p>}
        </header>

        <nav className="mgmt-nav" aria-label="Management sections">
          {rooms.map((r) => {
            const active = r.key === current.key;
            return (
              <Link
                key={r.key}
                href={r.href}
                className={`mgmt-tab${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {label(r.key, r.label)}
              </Link>
            );
          })}
        </nav>

        <main className="mgmt-body">{children}</main>
      </div>

      <SiteChromeFooter />
    </div>
  );
}
