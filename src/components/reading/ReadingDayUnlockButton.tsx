"use client";

import { useState } from "react";

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
}: {
  itemId: string;
  label: string;
  ariaLabel?: string;
}) {
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
        className="kit-btn kit-btn-main kit-btn-sm"
        onClick={unlock}
        disabled={busy}
        aria-label={ariaLabel}
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
