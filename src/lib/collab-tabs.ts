/**
 * COLLABORATIONS + doTERRA (TASK-637, build ruled at block 973,977 — K185
 * item 1, the Admiral's "ok to build" on the approved mockup; Love's text
 * 972653, uid 98): "add a Collaborations tab - sub tab 'Universally Local',
 * with a drop menu of: Local artist, Local practitioners, Stay Locally, map
 * link here for these - next to Collaborations, a doTERRA tab - a link to
 * her personal doTERRA set up - maybe a pop-up with a scan code when they
 * click the link."
 *
 * LOVE'S SEAM — the placeholders she replaces live HERE, in this one file,
 * no code dive:
 *
 *  · DOTERRA_URL — her personal doTERRA link. The pop-up's "Open the
 *    doTERRA site" button sails here; the scan code in the pop-up is a
 *    drawn placeholder square until she gives the real code.
 *  · COLLABORATIONS_SUBS — the drop menu's rows, in her list's order. The
 *    /collaborations/* paths are placeholders until those pages exist; the
 *    map row's URL is a stand-in for the map link she gives.
 *  · COLLABORATIONS_HREF — the tab's own door (the header row is a
 *    click-through, same idiom as Community→/classes); a placeholder until
 *    the landing page exists.
 *
 * The one-level nesting law (site-config.ts, nav-edit.ts) stands:
 * "Universally Local" rides as the drop's FIRST ROW (its own future page),
 * never a nested fly-out. isOpenNavHref (nav-edit.ts) already admits the
 * /collaborations/* paths and the https rows, so Love can re-shape these
 * tabs on /a/site/menu with no code change.
 */

/** The tab's own label. NavMenu keys the click pop-up on this label
    (case-insensitive), so renaming the tab HERE keeps the pop-up; a tab
    renamed on the board to something else becomes a plain link again. */
export const DOTERRA_TAB_LABEL = "doTERRA";

/** PLACEHOLDER — Love's personal doTERRA link replaces this. */
export const DOTERRA_URL = "https://www.doterra.com/";

export interface CollabSub {
  label: string;
  href: string;
}

/** PLACEHOLDER hrefs — Love's pages and her map link replace these. */
export const COLLABORATIONS_SUBS: CollabSub[] = [
  { label: "Universally Local", href: "/collaborations/universally-local" },
  { label: "Local artist", href: "/collaborations/local-artist" },
  { label: "Local practitioners", href: "/collaborations/local-practitioners" },
  { label: "Stay Locally", href: "/collaborations/stay-locally" },
  { label: "Find them on the map", href: "https://maps.example.com/universally-local" },
];

/** PLACEHOLDER — the Collaborations tab's own landing page. */
export const COLLABORATIONS_HREF = "/collaborations";
