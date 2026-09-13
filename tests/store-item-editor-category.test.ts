import { describe, it, expect } from "vitest";
import { categoryOptionsFor, KIND_WORD, REAL_CATEGORIES } from "@/lib/store-category-words";

/**
 * TASK-215 (0018.06.23 a₿, Love's call #8/#30) — "the store item editor's
 * category becomes a dropdown of the real categories (an item today reads
 * 'not set' though every item resolves under one); on the shelf, categories
 * render as HEADERS grouping the items."
 *
 * The shelf's headers already group by kind (STORE_SECTIONS,
 * store-sections.test.ts pins that unchanged); this pins the editor half:
 * the dropdown's option set is the REAL categories (the distinct KIND_WORD
 * values — the same taxonomy STORE_SECTIONS groups by), never free text,
 * and it always carries a real value for every item — never "not set".
 */
describe("the real categories — the editor's dropdown, not free text", () => {
  it("every ItemKind maps to a real category word — no kind is left without one", () => {
    for (const kind of Object.keys(KIND_WORD) as (keyof typeof KIND_WORD)[]) {
      expect(typeof KIND_WORD[kind]).toBe("string");
      expect(KIND_WORD[kind].length).toBeGreaterThan(0);
    }
  });

  it("REAL_CATEGORIES is the distinct KIND_WORD set — every item's kind resolves under one", () => {
    expect(REAL_CATEGORIES).toEqual(["ware", "meditation", "membership", "session", "retreat seat"]);
    expect(new Set(REAL_CATEGORIES).size).toBe(REAL_CATEGORIES.length); // no duplicates
  });

  it("a blank/undefined category still offers only real options — never an empty/'not set' choice", () => {
    const opts = categoryOptionsFor("digital", undefined);
    expect(opts).toEqual(REAL_CATEGORIES);
    expect(opts).not.toContain("not set");
    expect(opts.every((o) => o.trim().length > 0)).toBe(true);
  });

  it("a real category is offered as-is, no duplicate added", () => {
    expect(categoryOptionsFor("package", "membership")).toEqual(REAL_CATEGORIES);
  });

  it("an older/custom category (set via the Categories tab rename) rides along, never dropped", () => {
    const opts = categoryOptionsFor("self", "merch table");
    expect(opts).toEqual([...REAL_CATEGORIES, "merch table"]);
  });
});
