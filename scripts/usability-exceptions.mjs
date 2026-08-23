/**
 * USABILITY EXCEPTIONS — the ruled list (TASK-27/S29 lane 2, 0018.06.01 a₿).
 *
 * Every entry here is a text/ground pair that FAILS the WCAG bar and SHIPS
 * ANYWAY because a ruling said so. The gate (scripts/check-usability.mjs)
 * cites these, never re-flags them: a matched pair prints in the EXCEPTED
 * table with its ruling; it never counts toward the exit code.
 *
 * THE LAW OF THIS LIST:
 *   - every entry carries its RULING reference — no ruling, no entry (the
 *     gate hard-fails an entry whose `ruling` is empty);
 *   - an entry whose pair no longer fails anywhere prints as STALE — when a
 *     pair is genuinely fixed, the entry leaves the list, it does not linger;
 *   - additions need a ruling line in the same commit. An exception without
 *     a ruling is just a leak with a comment.
 *
 * Matching: `fg`/`bg` are the RESOLVED, composited colors as #rrggbb (upper-
 * or lowercase, the gate normalizes); `bg` may be a list (a token that flips
 * value across themes, e.g. --gold-deep). `file` is a path substring the
 * pair's source location must contain.
 */
export const USABILITY_EXCEPTIONS = [
  {
    /* The studio's "Publish to live" button — white ink on the money gold.
     * src/components/PuckEditor.tsx renders it with
     * `background: GOLD /* var(--gold-deep) *‍/, color: "#fff"` — --gold-deep
     * is #D9B24E at night and #B4862B at dawn, so both values are listed. */
    fg: "#FFFFFF",
    bg: ["#D9B24E", "#B4862B"],
    file: "src/components/PuckEditor.tsx",
    ruling:
      "D2 ruling 0018.06.01 — white ink on gold stands in BOTH themes: " +
      "the money-button brand moment; do not \"fix\"",
    note: "measures ≈2.2:1 at night, ≈3.7:1 at dawn against the 4.5:1 body bar",
  },
];
