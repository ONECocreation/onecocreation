/**
 * TASK-601 (block 971,279, the Admiral's A on Love's standing adjustments):
 * the ONE cover both sides read. The reading stage (ReadingStage.tsx, T-456)
 * and the weekly next-reading letter (reading-week-drafts.ts) show the SAME
 * book, so the constant lives here, a neutral module: no "use client", no
 * server-only imports, and the letter's hero always carries the cover the
 * stage shows.
 */
export const READING_COVER_SRC = "/images/reading-love-cover.jpg";
