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

/** a letter we wrote to try the room ("Test title"): the word "test" in its title or subject */
export function isTestLetter(l: { title?: string | null; override?: { subject?: string | null } | null }): boolean {
  return /\btest\b/i.test(`${l.title ?? ""} ${l.override?.subject ?? ""}`);
}

/** Your letters in their own order, the test letters moved to the bottom */
export function testsLast<T extends { title?: string | null; override?: { subject?: string | null } | null }>(letters: T[]): T[] {
  return [...letters.filter((l) => !isTestLetter(l)), ...letters.filter(isTestLetter)];
}
