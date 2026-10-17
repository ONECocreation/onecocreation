import type { NavChild, NavItem } from "@/lib/site-config";

/**
 * NAV EDIT — the menu editor's pure state helpers (TASK-188, 0018.06.18 a₿).
 *
 * The drag-and-drop the Admiral asked for ("could be better with a
 * drag-and-drop area") and the keyboard arrows both end here: no DOM, no
 * library, just NavItem[] in → NavItem[] out, so the tests exercise the
 * exact moves the editor makes. Two laws the helpers enforce:
 *
 *  - REORDER stays at one level: moveRow slides a row within its own level
 *    (the top list, or one header's children) — a drag never changes a
 *    row's parent by accident.
 *  - NESTING is one level deep (the existing law, site-config.ts): only a
 *    top-level LEAF (a page, no children of its own) may nest, and it
 *    always lands as the chosen header's LAST child. A header never goes
 *    under a header.
 *
 * Both helpers are total: anything they refuse returns the input unchanged,
 * and they never mutate — the editor setState()s the returned array.
 */

/** Where a row sits: `parent` is the top-level index of its header, or
    null for a top-level row; `index` is its position within that level. */
export interface RowRef {
  parent: number | null;
  index: number;
}

/** Slide a row to `toIndex` within ITS OWN level (clamped). Cross-level
    drops are the caller's business — nestUnder is the only door in. */
export function moveRow(items: NavItem[], from: RowRef, toIndex: number): NavItem[] {
  if (from.parent === null) {
    if (from.index < 0 || from.index >= items.length || from.index === toIndex) return items;
    const clamped = Math.max(0, Math.min(items.length - 1, toIndex));
    const next = items.slice();
    const [row] = next.splice(from.index, 1);
    next.splice(clamped, 0, row);
    return next;
  }
  const header = items[from.parent];
  const children = header?.children;
  if (!header || !children || from.index < 0 || from.index >= children.length || from.index === toIndex) {
    return items;
  }
  const clamped = Math.max(0, Math.min(children.length - 1, toIndex));
  const nextChildren = children.slice();
  const [row] = nextChildren.splice(from.index, 1);
  nextChildren.splice(clamped, 0, row);
  const next = items.slice();
  next[from.parent] = { ...header, children: nextChildren };
  return next;
}

/** Nest one level: pull a top-level LEAF out and drop it as the last child
    of the chosen header row. Refuses (returns items unchanged) when the row
    is a header, has no href of its own, or the target is the row itself. */
export function nestUnder(items: NavItem[], leafIndex: number, targetIndex: number): NavItem[] {
  const leaf = items[leafIndex];
  const target = items[targetIndex];
  if (!leaf || !target || leafIndex === targetIndex) return items;
  if (leaf.children?.length || !leaf.href) return items; // only a leaf nests
  const withoutLeaf = items.filter((_, idx) => idx !== leafIndex);
  const targetPos = withoutLeaf.indexOf(target);
  if (targetPos < 0) return items;
  const next = withoutLeaf.slice();
  const child: NavChild = { id: leaf.href, label: leaf.label, href: leaf.href };
  next[targetPos] = { ...target, children: [...(target.children ?? []), child] };
  return next;
}

/* ── T-615: change a row's PARENT ─────────────────────────────────────────
   The Admiral's moves ("Heart Field from under Memberships to under
   Community", "Sessions from a tab to a row under Store") need a row to
   change level: a child leaves its header for another header or for the top
   bar, and a top-level page goes under a header. moveRowTo does all of it in
   one pure call, one-level law intact. */

/** Where a row lands: `parent` is the TOP-LEVEL INDEX of the header it goes
    under, counted in the list as it stands BEFORE the move (null = the top
    bar itself); `index` is its final position inside that level, counted
    after the row has left its old place (clamped). */
export interface PlaceRef {
  parent: number | null;
  index: number;
}

/** A header whose only children point at the header's own page (Sessions
    with "Book a time", both /book) is a page in disguise: it may go under a
    tab, and the duplicate child folds away on the way. */
function foldsToLeaf(row: NavItem): boolean {
  const kids = row.children ?? [];
  return !!row.href && kids.every((c) => c.href === row.href);
}

/** The row at `ref`, as a top-level item (a child is promoted to a leaf),
    or null when the ref points at nothing. */
function rowAt(items: NavItem[], ref: RowRef): NavItem | null {
  if (ref.parent === null) return items[ref.index] ?? null;
  const c = items[ref.parent]?.children?.[ref.index];
  return c ? { id: c.id, label: c.label, href: c.href } : null;
}

/** May this row be placed under tab `parent` (index in `items`)? The one
    level law: a row that still carries real children never goes under a tab,
    a row never goes under itself, and a page-less row cannot be a child. */
export function canPlaceUnder(items: NavItem[], from: RowRef, parent: number | null): boolean {
  const row = rowAt(items, from);
  if (!row) return false;
  if (parent === null) return true;
  const target = items[parent];
  if (!target) return false;
  if (from.parent === null && from.index === parent) return false;
  if (!row.href) return false;
  if (from.parent === null && (row.children?.length ?? 0) > 0 && !foldsToLeaf(row)) return false;
  return true;
}

/** Take a row out of its place and put it at `to`. Total and non-mutating:
    anything the one-level law refuses returns `items` unchanged (same
    reference). A header that loses its last child stays as a plain page when
    it has one of its own, and goes away when it has none (an empty tab with
    no page is a dead door). */
export function moveRowTo(items: NavItem[], from: RowRef, to: PlaceRef): NavItem[] {
  const row = rowAt(items, from);
  if (!row || !canPlaceUnder(items, from, to.parent)) return items;

  // each top-level row keeps its ORIGINAL index while we edit, so the target
  // header is found again however the removal reshuffled the list
  let list = items.map((item, origin) => ({ item, origin }));
  if (from.parent === null) {
    list.splice(from.index, 1);
  } else {
    const header = items[from.parent];
    const kids = (header.children ?? []).filter((_, i) => i !== from.index);
    if (kids.length > 0) {
      list[from.parent] = { item: { ...header, children: kids }, origin: from.parent };
    } else if (header.href) {
      const { children: gone, ...bare } = header;
      void gone;
      list[from.parent] = { item: bare, origin: from.parent };
    } else {
      list = list.filter((e) => e.origin !== from.parent); // a dead header goes
    }
  }

  if (to.parent === null) {
    const at = Math.max(0, Math.min(list.length, to.index));
    // a child that leaves its header lands as a plain page (rowAt promoted it)
    list.splice(at, 0, { item: row, origin: -1 });
    return list.map((e) => e.item);
  }
  const slot = list.findIndex((e) => e.origin === to.parent);
  if (slot < 0) return items;
  const dest = list[slot].item;
  const kids = (dest.children ?? []).slice();
  kids.splice(Math.max(0, Math.min(kids.length, to.index)), 0, {
    id: row.href as string,
    label: row.label,
    href: row.href as string,
  });
  list[slot] = { ...list[slot], item: { ...dest, children: kids } };
  return list.map((e) => e.item);
}

/** A drop line sits BEFORE the row now at `slot.index` (the level's length =
    the end). Turn that into the place moveRowTo wants: when the row stays on
    its own level and was above the line, taking it out first shifts the
    landing up by one. */
export function slotToPlace(from: RowRef, slot: PlaceRef): PlaceRef {
  const sameLevel = from.parent === slot.parent;
  return sameLevel && from.index < slot.index ? { parent: slot.parent, index: slot.index - 1 } : slot;
}
