/**
 * THE SWAP POINT — one file, one edit, per clone.
 *
 * The `site` console chrome (SiteConsoleShell) renders the operator rooms
 * inside the ARTIST'S OWN header and footer, so managing the shop looks and
 * feels like being on their site rather than visiting a spaceship. Which
 * header and footer those are is the only thing that differs per clone, so
 * it lives here alone.
 *
 * onecocreation's clone changes exactly these two lines to their SiteHeader
 * and SiteFooter — and inherits everything else. This file joins the
 * de-house-ing checklist in docs/storefront-framework.md.
 */
export { default as SiteChromeHeader } from "@/components/ArcadeHeader";
export { default as SiteChromeFooter } from "@/components/EarthFooter";
