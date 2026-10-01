/**
 * TASK-534: which composed letters are the automatic reading drafts. Pure and
 * client-safe on purpose: the server module that writes the drafts
 * (`reading-week-drafts.ts`) and the /a/letters room that groups them both
 * read this one list, and the room is a client page that must not import
 * the mail rail.
 */
export const READING_DRAFT_PREFIXES = ["next-reading-", "after-reading-"] as const;

export function isReadingDraftKey(key: string): boolean {
  return READING_DRAFT_PREFIXES.some((p) => key.startsWith(p));
}
