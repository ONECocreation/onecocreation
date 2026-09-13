/**
 * TASK-214 — the letters desk's toolbar, as pure functions.
 *
 * Root cause (Ms. Kimi's read, stood at hand-off): the old toolbar's
 * bold/italic buttons called `insert()`, which always appended the literal
 * string `**text**` to the END of the body — the buttons never touched
 * whatever was actually selected. These helpers operate on a plain
 * {text, start, end} selection (a textarea's value + selectionStart/End)
 * and hand back the next text AND where to put the caret/selection after —
 * the component wires them onto a real textarea ref; no DOM lives here, so
 * they run anywhere (Node tests included, no jsdom needed).
 */

export interface MarkSelection {
  text: string;
  start: number;
  end: number;
}

export interface MarkResult {
  text: string;
  /** the selection to restore once the caller applies `text` to a real
   *  textarea — start === end is a caret, not a selection */
  start: number;
  end: number;
}

/**
 * Toggle a symmetric mark ("**" bold, "*" italic) on the selection:
 *  - selection already sits between two marks → the marks come off
 *  - the selection's own edges carry the marks → strip them, keep the inner text selected
 *  - otherwise → wrap the selection (or insert a `text` placeholder at an empty caret)
 *
 * Marks are runs of one repeated character ("*"/"**"), which makes bold and
 * italic collide at a boundary — `**hi**` with "hi" selected must NOT read
 * as "already italic" just because the char right before/after the
 * selection happens to be "*". `hasExactRun` requires the matched run to be
 * exactly `mark`'s length: the character just outside it must not be the
 * same character, or the run belongs to a longer (bold) marker, not this
 * (italic) one.
 */
function endsWithExactRun(s: string, mark: string): boolean {
  const m = mark.length;
  const c = mark[0];
  return s.slice(-m) === mark && s.slice(-(m + 1), -m) !== c;
}
function startsWithExactRun(s: string, mark: string): boolean {
  const m = mark.length;
  const c = mark[0];
  return s.slice(0, m) === mark && s.slice(m, m + 1) !== c;
}

export function toggleMark(sel: MarkSelection, mark: string): MarkResult {
  const { text, start, end } = sel;
  const before = text.slice(0, start);
  const selected = text.slice(start, end);
  const after = text.slice(end);
  const m = mark.length;

  if (endsWithExactRun(before, mark) && startsWithExactRun(after, mark)) {
    const next = before.slice(0, -m) + selected + after.slice(m);
    return { text: next, start: start - m, end: end - m };
  }
  if (
    selected.length >= 2 * m &&
    startsWithExactRun(selected, mark) &&
    endsWithExactRun(selected, mark)
  ) {
    const inner = selected.slice(m, selected.length - m);
    return { text: before + inner + after, start, end: start + inner.length };
  }
  const body = selected || "text";
  const next = `${before}${mark}${body}${mark}${after}`;
  return { text: next, start: start + m, end: start + m + body.length };
}

/** [selection or "link text"](https://) — the URL lands selected, ready to type over. */
export function insertLink(sel: MarkSelection, url = "https://"): MarkResult {
  const { text, start, end } = sel;
  const before = text.slice(0, start);
  const label = text.slice(start, end) || "link text";
  const after = text.slice(end);
  const piece = `[${label}](${url})`;
  const urlStart = before.length + label.length + 3; // "[" + label + "]("
  return { text: before + piece + after, start: urlStart, end: urlStart + url.length };
}

/** A plain insert at the caret — replaces the selection, caret lands after
 *  (the image-upload button, an emoji, any machine-built snippet). */
export function insertAtCaret(sel: MarkSelection, piece: string): MarkResult {
  const { text, start, end } = sel;
  const next = text.slice(0, start) + piece + text.slice(end);
  const pos = start + piece.length;
  return { text: next, start: pos, end: pos };
}
