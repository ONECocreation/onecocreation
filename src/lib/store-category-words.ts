import type { ItemKind } from "./store";

/**
 * TASK-145 (0018.06.17 a₿) — the ShinePages type words, mapped onto the
 * existing ItemKind (nothing invented: ware→self/fourthwall,
 * meditation→digital, membership→package, session→service). Pulled out of
 * the admin page component (TASK-215, 0018.06.23 a₿) so it's a plain,
 * side-effect-free module a test can import directly — the admin screen
 * ("use client") stays the only place that renders it.
 */
export const KIND_WORD: Record<ItemKind, string> = {
  self: "ware",
  fourthwall: "ware",
  digital: "meditation",
  package: "membership",
  service: "session",
  retreat: "retreat seat",
};

/** TASK-215 (0018.06.23 a₿, Love's call #8/#30) — THE REAL CATEGORIES: the
 *  distinct KIND_WORD values, the exact taxonomy the public shelf already
 *  groups its headers by (STORE_SECTIONS, store-sections.ts). The editor's
 *  category field is a dropdown of these, never free text — every item's
 *  kind already resolves to one of them, so the field can never read
 *  "not set". */
export const REAL_CATEGORIES: string[] = [...new Set(Object.values(KIND_WORD))];

/** the dropdown's options: the real set, plus the item's own category if
 *  it's an older/custom word not in that set — never silently dropped. */
export function categoryOptionsFor(kind: ItemKind, category: string | undefined): string[] {
  const c = category?.trim();
  return c && !REAL_CATEGORIES.includes(c) ? [...REAL_CATEGORIES, c] : REAL_CATEGORIES;
}
