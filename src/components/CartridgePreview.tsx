"use client";

import { useEffect, useSyncExternalStore } from "react";
import { cartridges, type CartridgeId } from "@/brand/cartridge";

/**
 * THE PREVIEW STRIP (S11 lane 2 — see it before you wear it).
 *
 * The Brand Board's picker dresses the whole site for EVERYONE — a save
 * written into the cartridge file. This component is the OTHER gesture: the
 * operator LOOKS at a cartridge on the real site without moving the default.
 * It is not a new rendering path. The non-default twins already ship in
 * every build and pour off the one attribute (html[data-oc-cartridge],
 * src/app/cartridges.css), so a preview is that attribute applied
 * deliberately and temporarily, in the operator's own browser, off a flag
 * (sessionStorage "oc-cartridge-preview") that only the gated dressing room
 * sets. No flag → the pour never happens and the strip renders null: no
 * attribute, no DOM, no observable byte. It is NOT a per-visitor theme
 * switcher — an ordinary visitor never carries the flag and never sees the
 * strip. The visitor's own night/dawn toggle (data-oc-theme) is untouched
 * and composes on top, exactly as it does with a saved selection.
 *
 * The flag is read through useSyncExternalStore: the server snapshot is
 * null (the server cannot see a browser's session storage, and LOVE's
 * rendered output must not carry the strip), and the client's first
 * post-hydration check picks the flag up — the sanctioned pattern for a
 * value only the browser knows, no hydration fork.
 *
 * One honest limit, said in the dressing room's copy too: the pour is the
 * cartridge's SKIN — tokens, faces, bands, the hero's treatment. The
 * non-CSS dressing (logos, hero art, the words) is read from the saved
 * cartridge at render time and does not follow the preview.
 */
const FLAG = "oc-cartridge-preview";

function subscribe() {
  /* the flag changes only by the strip's own exit (which reloads) or the
     dressing room (another tab) — nothing to listen to */
  return () => {};
}
function getSnapshot(): string | null {
  try { return sessionStorage.getItem(FLAG); } catch { return null; /* private mode */ }
}
function getServerSnapshot(): string | null {
  return null;
}

export default function CartridgePreview() {
  const flagged = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const previewId: CartridgeId | null =
    flagged && flagged in cartridges ? (flagged as CartridgeId) : null;

  useEffect(() => {
    if (flagged && !previewId) {
      /* a stale or hand-set flag naming no cartridge is cleared, never worn */
      try { sessionStorage.removeItem(FLAG); } catch { /* private mode */ }
      return;
    }
    if (!previewId) return;
    /* the pour: the same single attribute the root layout would set for a
       SAVED selection. LOVE is the attribute's ABSENCE (the layout's own
       law — the default wears nothing), so previewing LOVE takes the
       attribute off; anything else puts it on. */
    const root = document.documentElement;
    if (previewId === "love") root.removeAttribute("data-oc-cartridge");
    else root.setAttribute("data-oc-cartridge", previewId);
  }, [flagged, previewId]);

  if (!previewId) return null;
  /* the ID leads, not the name: EARTHSIDE keeps Love's brand name ("One
     Cocreation" is the house, not the dressing), so only the registry id
     tells the operator WHICH cartridge is on — nobody wonders. */
  const name = cartridges[previewId].name;

  function exitPreview() {
    try { sessionStorage.removeItem(FLAG); } catch { /* private mode */ }
    window.location.reload();
  }

  /* the strip's face is PINNED, reading no tokens: it must look like no
     cartridge's furniture, so nobody mistakes the tooling for the skin.
     It rides the foot of every page while the flag lives — the header and
     the hero keep their honest preview, and leaving is one tap. */
  return (
    <div role="status" aria-label={`preview — the site is wearing the ${previewId} cartridge in this browser only`}
      style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
      <div aria-hidden style={{ height: 4,
        background: "repeating-linear-gradient(45deg,#E94FC9 0 14px,#14101c 14px 28px)" /* pinned — the hazard edge, cartridge-independent */ }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
        flexWrap: "wrap", padding: "7px 14px", background: "#14101c", /* pinned */
        color: "#F4ECFF", /* pinned */
        fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 13, lineHeight: 1.5 }}>
        <strong style={{ letterSpacing: ".14em", whiteSpace: "nowrap" }}>👁 PREVIEW</strong>
        <span style={{ textAlign: "center" }}>
          <strong>{previewId.toUpperCase()}</strong> cartridge · {name} — only THIS browser sees it · the site default has NOT changed
        </span>
        <button onClick={exitPreview} title="clear the preview flag and reload — back to the site everyone sees"
          aria-label="exit preview"
          style={{ padding: "4px 14px", borderRadius: 999, border: "none", cursor: "pointer",
            background: "#F4ECFF", color: "#14101c", /* pinned */
            fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, letterSpacing: ".04em" }}>
          exit preview
        </button>
      </div>
    </div>
  );
}
