/**
 * Puck slug rules (STUDIO P1 — "a built page is a real page"), shared by the
 * pages panel (client) and /api/puck (server) so both sides say the same no.
 */

/** lowercase url-safe: letters, numbers, single dashes between runs.
 *  Namespaced slugs containing `:` (the future popup: lane — a later stack)
 *  fail here too, which keeps them out of the pages panel and blocks
 *  rename/delete of them server-side. */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/** "brand" is RESERVED: /studio/brand is the brand board, never a page. */
export const RESERVED_SLUGS = ["brand"] as const;

/** One honest reason a page slug can't be used, or null when it's fine. */
export function slugProblem(slug: string): string | null {
  if (!slug) return "give the page a name";
  if (!isValidSlug(slug)) return "lowercase letters, numbers and dashes only";
  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) {
    return `'${slug}' is reserved — pick another name`;
  }
  return null;
}
