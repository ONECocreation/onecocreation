import { describe, it, expect } from "vitest";
import { moveRow, nestUnder, type RowRef } from "@/lib/nav-edit";
import type { NavItem } from "@/lib/site-config";

/**
 * TASK-188 (0018.06.18 a₿ · block 966,112) — the menu editor's drag state
 * helpers. The drag-and-drop and the keyboard arrows both run through these
 * pure functions, so the pins here cover the exact moves the editor makes:
 *
 *   · moveRow reorders WITHIN one level only (top list or one header's
 *     children), clamps, and never mutates
 *   · nestUnder moves a top-level LEAF under a header as its last child
 *     (one level — the existing law), and refuses everything else
 */

const leaf = (href: string, label = href): NavItem => ({ id: href, label, href });
const header = (id: string, children: { href: string; label?: string }[]): NavItem => ({
  id,
  label: id,
  href: `/${id}`,
  children: children.map((c) => ({ id: c.href, label: c.label ?? c.href, href: c.href })),
});

const MENU: NavItem[] = [
  leaf("/about", "About"),
  header("community", [{ href: "/classes" }, { href: "/free" }]),
  leaf("/store", "Store"),
  leaf("/sessions", "Sessions"),
];

describe("moveRow — reorder at one level", () => {
  it("slides a top-level row earlier and later", () => {
    expect(moveRow(MENU, { parent: null, index: 2 }, 0).map((r) => r.id)).toEqual([
      "/store", "/about", "community", "/sessions",
    ]);
    expect(moveRow(MENU, { parent: null, index: 0 }, 2).map((r) => r.id)).toEqual([
      "community", "/store", "/about", "/sessions",
    ]);
  });

  it("slides a child within its own header, leaving the other levels alone", () => {
    const next = moveRow(MENU, { parent: 1, index: 0 }, 1);
    expect(next[1].children?.map((c) => c.href)).toEqual(["/free", "/classes"]);
    expect(next.map((r) => r.id)).toEqual(MENU.map((r) => r.id));
  });

  it("clamps out-of-range landings to the level's ends", () => {
    expect(moveRow(MENU, { parent: null, index: 0 }, 99).map((r) => r.id)[3]).toBe("/about");
    expect(moveRow(MENU, { parent: null, index: 3 }, -5).map((r) => r.id)[0]).toBe("/sessions");
  });

  it("is a no-op on a same-index move, a bad row, or a bad parent", () => {
    expect(moveRow(MENU, { parent: null, index: 1 }, 1)).toBe(MENU);
    expect(moveRow(MENU, { parent: null, index: 9 }, 0)).toBe(MENU);
    expect(moveRow(MENU, { parent: 0, index: 0 }, 1)).toBe(MENU); // row 0 has no children
    expect(moveRow(MENU, { parent: 1, index: 5 }, 0)).toBe(MENU);
  });

  it("never mutates the input", () => {
    const before = JSON.stringify(MENU);
    moveRow(MENU, { parent: null, index: 2 }, 0);
    moveRow(MENU, { parent: 1, index: 0 }, 1);
    expect(JSON.stringify(MENU)).toBe(before);
  });
});

describe("nestUnder — one level, the existing law", () => {
  it("pulls a top-level leaf out and drops it as the header's LAST child", () => {
    const next = nestUnder(MENU, 2, 1); // Store under Community
    expect(next.map((r) => r.id)).toEqual(["/about", "community", "/sessions"]);
    expect(next[1].children?.map((c) => c.href)).toEqual(["/classes", "/free", "/store"]);
    expect(next[1].children?.[2]).toEqual({ id: "/store", label: "Store", href: "/store" });
  });

  it("handles the index shift when the target sits BEFORE the leaf", () => {
    const next = nestUnder(MENU, 0, 1); // About under Community (target after it)
    expect(next.map((r) => r.id)).toEqual(["community", "/store", "/sessions"]);
    expect(next[0].children?.map((c) => c.href)).toEqual(["/classes", "/free", "/about"]);
  });

  it("refuses to nest a header, an href-less row, or a row onto itself", () => {
    expect(nestUnder(MENU, 1, 0)).toBe(MENU); // the Community header is no leaf
    const bare: NavItem[] = [{ id: "x", label: "group", children: [] }, leaf("/a")];
    expect(nestUnder(bare, 0, 1)).toBe(bare); // no href of its own
    expect(nestUnder(MENU, 2, 2)).toBe(MENU); // onto itself
    expect(nestUnder(MENU, 9, 1)).toBe(MENU); // no such leaf
  });

  it("composes with moveRow the way a drag does: slide, then nest", () => {
    const at: RowRef = { parent: null, index: 3 };
    const moved = moveRow(MENU, at, 0); // Sessions to the top
    expect(moved.map((r) => r.id)).toEqual(["/sessions", "/about", "community", "/store"]);
    const nested = nestUnder(moved, 0, 2); // Sessions under Community
    expect(nested.map((r) => r.id)).toEqual(["/about", "community", "/store"]);
    expect(nested[1].children?.map((c) => c.href)).toEqual(["/classes", "/free", "/sessions"]);
  });

  it("never mutates the input", () => {
    const before = JSON.stringify(MENU);
    nestUnder(MENU, 2, 1);
    expect(JSON.stringify(MENU)).toBe(before);
  });
});
