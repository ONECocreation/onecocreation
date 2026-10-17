import { describe, it, expect } from "vitest";
import { moveRow, nestUnder, moveRowTo, canPlaceUnder, slotToPlace, addTab, addPage, isOpenNavHref, type RowRef } from "@/lib/nav-edit";
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


/* T-615: change a row's parent. The Admiral's own menu moves, on the
   shape of the live saved menu. */
const kid = (href: string, label = href) => ({ id: href, label, href });
const LIVE: NavItem[] = [
  leaf("/about", "About"),
  { id: "/memberships", label: "Memberships", href: "/memberships", children: [kid("/rooms/heart-field", "Heart Field"), kid("/packages", "Three packages")] },
  { id: "/book", label: "Sessions", href: "/book", children: [kid("/book", "Book a time")] },
  { id: "/store", label: "Store", href: "/store", children: [kid("/store/meditations", "Meditations"), kid("/store/memberships", "Memberships")] },
  { id: "/classes", label: "Community", href: "/classes", children: [kid("/reading", "Read with Love"), kid("/contact", "11:11")] },
  leaf("/support", "Support"),
];
const hrefsOf = (items: NavItem[]) => items.flatMap((r) => (r.children?.length ? r.children.map((c) => c.href) : [r.href]));

describe("moveRowTo - change a row's parent (T-615)", () => {
  it("Heart Field: from under Memberships to under Community", () => {
    const next = moveRowTo(LIVE, { parent: 1, index: 0 }, { parent: 4, index: 1 });
    expect(next[4].children?.map((c) => c.label)).toEqual(["Read with Love", "Heart Field", "11:11"]);
    expect(next[1].children?.map((c) => c.label)).toEqual(["Three packages"]);
  });

  it("Three packages: the last child leaves, the header stays as a plain page", () => {
    let next = moveRowTo(LIVE, { parent: 1, index: 0 }, { parent: 4, index: 9 });
    next = moveRowTo(next, { parent: 1, index: 0 }, { parent: 3, index: 9 });
    expect(next[3].children?.map((c) => c.href)).toEqual(["/store/meditations", "/store/memberships", "/packages"]);
    expect(next[1].children).toBeUndefined();
    expect(next[1].href).toBe("/memberships");
  });

  it("Sessions (with its Book a time twin) goes under Store as ONE row", () => {
    const next = moveRowTo(LIVE, { parent: null, index: 2 }, { parent: 3, index: 0 });
    expect(next.map((r) => r.id)).toEqual(["/about", "/memberships", "/store", "/classes", "/support"]);
    const store = next.find((r) => r.id === "/store");
    expect(store?.children?.map((c) => c.label)).toEqual(["Sessions", "Meditations", "Memberships"]);
    expect(store?.children?.[0].href).toBe("/book");
  });

  it("a tab with real children never goes under a tab (the one-level law)", () => {
    expect(canPlaceUnder(LIVE, { parent: null, index: 1 }, 4)).toBe(false);
    expect(moveRowTo(LIVE, { parent: null, index: 1 }, { parent: 4, index: 0 })).toBe(LIVE);
  });

  it("a row never goes under itself", () => {
    expect(moveRowTo(LIVE, { parent: null, index: 3 }, { parent: 3, index: 0 })).toBe(LIVE);
  });

  it("a child comes out to be a tab of its own, at the chosen place", () => {
    const next = moveRowTo(LIVE, { parent: 4, index: 0 }, { parent: null, index: 1 });
    expect(next.map((r) => r.label)).toEqual(["About", "Read with Love", "Memberships", "Sessions", "Store", "Community", "Support"]);
    expect(next[1]).toEqual({ id: "/reading", label: "Read with Love", href: "/reading" });
  });

  it("a top-level page goes under a tab, then back up", () => {
    const down = moveRowTo(LIVE, { parent: null, index: 0 }, { parent: 4, index: 0 });
    expect(down[3].children?.[0]).toEqual({ id: "/about", label: "About", href: "/about" });
    const up = moveRowTo(down, { parent: 3, index: 0 }, { parent: null, index: 0 });
    expect(up[0].href).toBe("/about");
  });

  it("reorders inside the same tab (same parent) and across the top level", () => {
    const next = moveRowTo(LIVE, { parent: 3, index: 0 }, { parent: 3, index: 1 });
    expect(next[3].children?.map((c) => c.label)).toEqual(["Memberships", "Meditations"]);
    const top = moveRowTo(LIVE, { parent: null, index: 5 }, { parent: null, index: 0 });
    expect(top[0].id).toBe("/support");
  });

  it("the whole move set lands the Admiral's layout, nothing doubled, nothing lost", () => {
    let m = moveRowTo(LIVE, { parent: 1, index: 0 }, { parent: 4, index: 1 }); // Heart Field -> Community
    m = moveRowTo(m, { parent: 1, index: 0 }, { parent: 3, index: 9 }); // Three packages -> Store
    m = moveRowTo(m, { parent: null, index: 2 }, { parent: 3, index: 0 }); // Sessions -> Store
    m = m.filter((r) => r.id !== "/memberships"); // the Memberships tab folds away
    expect(m.map((r) => r.label)).toEqual(["About", "Store", "Community", "Support"]);
    expect(m[1].children?.map((c) => c.label)).toEqual(["Sessions", "Meditations", "Memberships", "Three packages"]);
    expect(m[2].children?.map((c) => c.label)).toEqual(["Read with Love", "Heart Field", "11:11"]);
    const all = hrefsOf(m);
    expect(new Set(all).size).toBe(all.length);
  });

  it("a header with no page of its own goes when its last child leaves", () => {
    const items: NavItem[] = [leaf("/about", "About"), { id: "h", label: "H", children: [kid("/news", "News")] }];
    const next = moveRowTo(items, { parent: 1, index: 0 }, { parent: 0, index: 0 });
    expect(next.map((r) => r.id)).toEqual(["/about"]);
    expect(next[0].children?.map((c) => c.href)).toEqual(["/news"]);
  });

  it("is a no-op on a bad row or a bad parent, and never mutates", () => {
    const before = JSON.stringify(LIVE);
    expect(moveRowTo(LIVE, { parent: null, index: 99 }, { parent: null, index: 0 })).toBe(LIVE);
    expect(moveRowTo(LIVE, { parent: 1, index: 9 }, { parent: null, index: 0 })).toBe(LIVE);
    expect(moveRowTo(LIVE, { parent: null, index: 0 }, { parent: 99, index: 0 })).toBe(LIVE);
    moveRowTo(LIVE, { parent: 1, index: 0 }, { parent: 4, index: 0 });
    expect(JSON.stringify(LIVE)).toBe(before);
  });
});

describe("slotToPlace - a drop line becomes a final place (T-615)", () => {
  it("shifts up by one only on the row's own level, when it was above the line", () => {
    expect(slotToPlace({ parent: null, index: 0 }, { parent: null, index: 3 })).toEqual({ parent: null, index: 2 });
    expect(slotToPlace({ parent: null, index: 4 }, { parent: null, index: 1 })).toEqual({ parent: null, index: 1 });
    expect(slotToPlace({ parent: 1, index: 0 }, { parent: 1, index: 2 })).toEqual({ parent: 1, index: 1 });
    expect(slotToPlace({ parent: 1, index: 0 }, { parent: 4, index: 2 })).toEqual({ parent: 4, index: 2 });
    expect(slotToPlace({ parent: null, index: 2 }, { parent: 3, index: 0 })).toEqual({ parent: 3, index: 0 });
  });
});

describe("T-620 the board's new doors", () => {
  const base: NavItem[] = [
    { id: "/about", label: "About", href: "/about" },
    { id: "/store", label: "Store", href: "/store", children: [{ id: "/book", label: "Sessions", href: "/book" }] },
  ];
  it("addTab puts a page tab or a heading-only tab at the end", () => {
    expect(addTab(base, "Support", "/support")[2]).toEqual({ id: "/support", label: "Support", href: "/support" });
    const h = addTab(base, "Gifts")[2];
    expect(h.label).toBe("Gifts");
    expect(h.children).toEqual([]);
    expect(h.href).toBeUndefined();
    expect(addTab(base, "   ")).toBe(base);
  });
  it("addPage adds a tab or the last card under a tab, any link included", () => {
    expect(addPage(base, "Travels", "https://lovestravels.example", null)[2].href).toBe("https://lovestravels.example");
    const under = addPage(base, "Meditations", "/store/meditations", 1);
    expect(under[1].children?.map((c) => c.label)).toEqual(["Sessions", "Meditations"]);
    expect(addPage(base, "", "/x", null)).toBe(base);
  });
  it("isOpenNavHref takes https links and plain paths only", () => {
    expect(isOpenNavHref("https://a.example/x")).toBe(true);
    expect(isOpenNavHref("/travels")).toBe(true);
    expect(isOpenNavHref("http://a.example")).toBe(false);
    expect(isOpenNavHref("javascript:alert(1)")).toBe(false);
    expect(isOpenNavHref("//evil.example")).toBe(false);
  });
});
