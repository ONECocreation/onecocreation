"use client";

import { usePenMode } from "./PenMode";

/**
 * Love's Pen toggle — the header's edit-mode switch (P1, 2026-08-10).
 * Renders nothing for non-operators: not hidden by CSS, not in the DOM at
 * all, so there's zero footprint for the common case (mirrors the
 * AdminDeckRow pattern in FrenMenu.tsx). Follows ThemeLantern's shape: a
 * small icon button flipping a boolean, in the header's nav-tail.
 */
export default function PenToggle() {
  const { isOperator, penOn, setPenOn } = usePenMode();
  if (!isOperator) return null;

  return (
    <button
      type="button"
      className={`pen-toggle${penOn ? " is-on" : ""}`}
      onClick={() => setPenOn(!penOn)}
      aria-label={penOn ? "done editing words" : "edit words"}
      title={penOn ? "done editing words" : "edit words"}
      aria-pressed={penOn}
    >
      🖊️
    </button>
  );
}
