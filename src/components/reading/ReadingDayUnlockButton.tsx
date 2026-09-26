"use client";

import { useState } from "react";
import { useReadingPart } from "./ReadingPartContext";
import type { ReadingPart } from "@/lib/reading-parts";

/**
 * THE READING DAY BRICK'S UNLOCK BUTTON (TASK-467, block 968,561) —
 * `AddTierButton.tsx`'s own POST-then-walk-to-/cart logic (`src/components
 * /store/AddTierButton.tsx`), rewritten as a SIBLING rather than reused
 * directly: that component wears the legacy `.btn`/`.btn-gold` classes,
 * and this page's one button size is `kit-btn kit-btn-main kit-btn-sm`
 * (the brief's own law — see the register for why a sibling, not a
 * restyle). Always locked (the row that mounts this one is only ever the
 * NOT-entitled branch), so the lock glyph rides inside every render — the
 * exact inline shape TASK-466's `ReadingStage.tsx` draws (its
 * `PLAYGROUND_LOCK_ICON`), copied here so the two locks match; decorative
 * only (`aria-hidden`), the meaning is the visible label text.
 *
 * `label` stays SHORT on purpose (R-071: button text never wraps, and a
 * long package name measured wider than the card itself on a 360px
 * phone — see the register). `ariaLabel`, when given, is the fuller
 * sentence for anyone on a screen reader; sighted visitors read the
 * short label plus the row's own words right above it.
 *
 * Fix round (block 968,624, the Admiral's Chrome walk) — "only the chosen
 * pick shines": THIRD pass. The first pass gave every signed-in Unlock a
 * blanket `kit-btn-second`, which broke the rule the moment the SELECTED
 * part itself was the locked one (Q&A open and chosen, visitor tier A —
 * no button on the whole card shone). The real rule: signed in, a row's
 * Unlock reads `kit-btn-main` + `aria-current="true"` when ITS OWN part is
 * the one currently selected, `kit-btn-second` otherwise — the exact same
 * shine/second law `ReadingPartSelectLink` already keeps, read from the
 * SAME shared `useReadingPart()` context, never a second selection state.
 * `part` (the caller's own row number) is what makes this button
 * "part-aware" at all: `ReadingDayBody.tsx` passes it ONLY while signed in
 * (`part={signedIn ? 3 : undefined}`); omitted, this renders plain
 * `kit-btn-main` unconditionally — the signed-out row's own unchanged
 * look, AND the top screen's own not-owned card
 * (`ReadingStagePart3`/`4.tsx`, no "row" to compare a selection against),
 * neither of which ever passes `part`.
 */

const LOCK_ICON = (
  <svg className="kit-lock-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export default function ReadingDayUnlockButton({
  itemId,
  label,
  ariaLabel,
  part,
}: {
  itemId: string;
  label: string;
  ariaLabel?: string;
  /** fix round (block 968,624) — see the module docblock. Present only
   *  while signed in (the agenda card's own rows 3/4); absent everywhere
   *  else, which always reads as plain, unshining `kit-btn-main`. */
  part?: ReadingPart;
}) {
  const { selected } = useReadingPart();
  const isSelected = part !== undefined && selected === part;
  const variant = part !== undefined && !isSelected ? "second" : "main";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlock() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    })
      .then((r) => r.json())
      .catch(() => null);
    if (res?.ok) {
      window.dispatchEvent(new Event("oc-cart-changed"));
      window.location.assign("/cart");
    } else {
      /* two sentences, never an em dash (the Admiral's house rule) */
      setError(res?.reason ?? "That didn't add. Try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={`kit-btn kit-btn-${variant} kit-btn-sm`}
        onClick={unlock}
        disabled={busy}
        aria-label={ariaLabel}
        aria-current={isSelected ? "true" : undefined}
      >
        {!busy && LOCK_ICON}
        {busy ? "Adding…" : label}
      </button>
      {error && (
        <p className="kit-field-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
