/**
 * THE SWAP POINT — one file, one edit, per clone.
 *
 * The `site` console chrome (SiteConsoleShell) renders the operator rooms
 * inside the ARTIST'S OWN header and footer, so managing the shop looks and
 * feels like being on their site rather than visiting a spaceship.
 *
 * ── ONE COCREATION's clone: pointed at Love's real site chrome. ──
 * Upstream (frens.earth) re-exports ArcadeHeader/EarthFooter here; this is
 * the de-housed version and is EXPECTED to conflict on upstream merges —
 * always keep this side. See docs/storefront-framework.md's de-housing
 * checklist.
 */
export { default as SiteChromeHeader } from "@/components/SiteHeader";
export { default as SiteChromeFooter } from "@/components/SiteFooter";
