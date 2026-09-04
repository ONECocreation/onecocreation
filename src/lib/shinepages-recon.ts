/**
 * The ShinePages recon manifest (TASK-105, cut 0018.06.12 a₿): Love's old
 * site, captured page-for-page into docs/shinepages-recon/ (committed with
 * the recon vault, main tip 799a71f). This module is the ONE list of what
 * the /studio REFERENCE group shows — the pages popover's second group and
 * the /studio/reference/[slug] viewer both read from here.
 *
 * Pure data, client-safe by construction (PagesPanel is a client component):
 * no fs, no env, no process. The server side (viewer page, recon-img route)
 * resolves these relative paths against RECON_ROOT itself.
 *
 * READ-ONLY LAW (the brief's item 4): nothing in the reference group is
 * editable, nothing writes to KV, and the rows NEVER mix into the KV page
 * order — they are static, in exactly this order. `observer-2` is captured
 * in the vault but deliberately NOT listed (the brief's row list excludes
 * it — it's the older duplicate carrying the Weekly Intuitive copy).
 */

export const RECON_ROOT = "docs/shinepages-recon";

export interface ReconPage {
  /** viewer slug — the capture file's stem, e.g. /studio/reference/about */
  slug: string;
  /** the panel row label */
  title: string;
  /** the verbatim copy, relative to RECON_ROOT */
  md: string;
  /** scroll-series / residual shots, relative to RECON_ROOT, in page order */
  shots: string[];
}

const series = (stem: string, n: number): string[] =>
  Array.from({ length: n }, (_, i) => `shots/scroll-series/${stem}-${i + 1}.jpg`);

export const RECON_PAGES: ReconPage[] = [
  { slug: "home", title: "home", md: "pages/home.md", shots: series("home", 3) },
  { slug: "about", title: "About", md: "pages/about.md", shots: series("about", 3) },
  { slug: "memberships", title: "memberships", md: "pages/memberships.md", shots: series("memberships", 2) },
  { slug: "consciouscuts-waxing", title: "consciouscuts-waxing", md: "pages/consciouscuts-waxing.md", shots: series("consciouscuts", 3) },
  { slug: "contact", title: "contact", md: "pages/contact.md", shots: series("contact", 2) },
  { slug: "gallaria-my-fav-products", title: "Gallaria (my fav products)", md: "pages/gallaria-my-fav-products.md", shots: series("gallaria", 3) },
  { slug: "book-a-call", title: "book-a-call", md: "pages/book-a-call.md", shots: series("book-a-call", 2) },
  { slug: "weekly-intuitive", title: "weekly-intuitive", md: "pages/weekly-intuitive.md", shots: series("weekly-intuitive", 3) },
  { slug: "evening-star", title: "evening-star", md: "pages/evening-star.md", shots: series("evening-star", 3) },
  { slug: "leap-of-faith", title: "leap-of-faith", md: "pages/leap-of-faith.md", shots: series("leap-of-faith", 3) },
  { slug: "thank-you-page", title: "thank-you-page", md: "pages/thank-you-page.md", shots: series("thank-you-page", 2) },
  { slug: "observer-funnel", title: "observer (funnel)", md: "pages/residuals/observer-funnel.md", shots: ["shots/residuals/observer-funnel-top.jpg"] },
  { slug: "thank-you-iam-worthy", title: "thank-you — I AM worthy", md: "pages/residuals/thank-you-iam-worthy.md", shots: ["shots/residuals/thank-you-iam-worthy.jpg"] },
  { slug: "thank-you-large-sums-of-money", title: "thank-you — large sums of money", md: "pages/residuals/thank-you-large-sums-of-money.md", shots: ["shots/residuals/thank-you-large-sums-of-money.jpg"] },
  { slug: "thank-you-morning-meditation", title: "thank-you — morning meditation", md: "pages/residuals/thank-you-morning-meditation.md", shots: ["shots/residuals/thank-you-morning-meditation.jpg"] },
];

export function reconPage(slug: string): ReconPage | null {
  return RECON_PAGES.find((p) => p.slug === slug) ?? null;
}

/** The exact group heading the brief pins for the popover's second group. */
export const RECON_GROUP_HEADING = "REFERENCE · ShinePages capture 0018.06.12 · read-only";
