import { isReadingDraftKey } from "./reading-draft-keys";

/**
 * T-552: which letters the room's Drafted group holds. Pure and client-safe
 * (the room is a client page and must not import the mail rail).
 *
 * Drafted = a reading draft the helper wrote that Love has not published yet,
 * or any letter born in the room (`draft: true`) that she has not published.
 * A legacy composed letter has no flag, so it is never a draft: no migration.
 * A letter leaves Drafted when Love presses Publish (`reviewedAtMs` is set
 * and `draft` is cleared).
 */
export interface DraftMeta {
  draft?: boolean | null;
  reviewedAtMs?: number | null;
}

export function isDrafted(key: string, meta: DraftMeta | null | undefined): boolean {
  if (meta?.draft === true) return true;
  return isReadingDraftKey(key) && !meta?.reviewedAtMs;
}

/** who started it, in the plain words the room says under a draft's name */
export function draftWhoWords(key: string, createdAtMs: number | null | undefined, weekday: (ms: number) => string, hasWords = true): string {
  const day = createdAtMs ? ` on ${weekday(createdAtMs)}` : "";
  return isReadingDraftKey(key) ? `Drafted by the helper${day}, waiting for you.` : `Started by you${day}, ${hasWords ? "waiting for your review" : "not finished yet"}.`;
}
