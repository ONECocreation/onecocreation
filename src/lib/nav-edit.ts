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
