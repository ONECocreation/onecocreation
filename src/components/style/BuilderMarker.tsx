"use client";

import { createContext, useContext, useId, type ReactNode } from "react";
import { nip19 } from "nostr-tools";

/**
 * BuilderMarker (TASK-342, cut 0018.06.28 a₿ · block 967,633) — the
 * signed-in builder's own name, on the /style canvas ONLY, on the two
 * session-aware blocks that render live per-viewer content there today:
 * MeSwitch and LoginDoor (the ground-fact-7 pair, T-296 wave B). Design of
 * record: the Admiral's spark 0018.06.27 a₿, "something simple like that"
 * — dotted-underlined name, hover/focus tooltip "you are seeing this as
 * <who>". Mockup shape approved 0018.06.28 a₿ (a right-aligned label row,
 * a small uppercase VIEW eyebrow + the name).
 *
 * THE SAFETY NET: `BuilderMarkerContext` defaults to `null`. The blocks
 * this wraps (`createMeSwitch`/`createLoginDoor`) render on the LIVE
 * published page too (once /me or /login is published through Puck) via
 * the exact same `config.components` object PuckEditor uses — so every
 * render path that never sits under `<BuilderMarkerContext.Provider>`
 * (every real visitor, everywhere) reads `null` and gets back its
 * `children` completely unwrapped: no extra DOM node, no behavior change.
 * Only `PuckEditor.tsx` ever provides a value.
 *
 * NO WRAPPING BOX around `children` (ground fact 10): (TASK-352, OC UI kit
 * lane 4 — corrects the stale shape this note used to describe) MeSwitch's
 * signed-in branches each render one kit `Tabs` element now (Profile/
 * Calendar/Purchases), not the three-sibling Fragment
 * (`<>{ConstellationCard}{MemberQuickCards}{MePanel}</>`) this note
 * originally named — either way, a wrapper element here would still
 * disturb whatever MeSwitch renders, so `BuilderMarker` returns a Fragment
 * holding the label row FIRST, then `children` untouched and unwrapped
 * right after it: MeSwitch's own render stays exactly its own shape (now
 * with one extra row ahead of it) and LoginDoor's one child stays one
 * child. The label row/tooltip
 * anchor their own absolute position off the trigger BUTTON itself
 * (`position: relative` on the button, not on any wrapping element) so
 * they never depend on a `position: relative` ancestor Band doesn't
 * promise to provide.
 *
 * COLOUR: the pop-bg/pop-edge/pop-shadow/nav-gold jug already pours every
 * other floating panel on this site (the nav dropdown `.nav-sub`, the
 * door button's sheet menu — `src/components/door/DoorButton.tsx`,
 * `src/app/house.css:635`) — reused here rather than inventing a token.
 * Neither `--pop-bg` nor `--nav-gold` carries a `html[data-oc-theme="light"]`
 * override (both are single, theme-invariant definitions), so the pairing
 * grades the same in both themes — measured by the WCAG relative-
 * luminance formula against the opaque approximation of `--pop-bg`
 * (`rgba(20,16,32,.97)`, composited over the darkest AND lightest page
 * grounds this site ships — the 3% see-through moves the composite by
 * under one hex step either way): **~11.6:1 on night, ~10.9:1 on dawn**
 * (both comfortably past the 4.5:1 AA floor the legibility doctrine
 * sets) — cited in SUMMARY.md, not eyeballed.
 */

export const BuilderMarkerContext = createContext<string | null>(null);

/** Short npub for display: "npub18…h6w6" (npub + 2 + … + last 4) — a LOCAL
 *  copy of `src/components/BbConsole.tsx`'s `shortNpub`, not an import: that
 *  module pulls Hatchery/BuddyDevice/useMemberSession and the rest of its
 *  own client graph into any bundle that imports it, for one string helper.
 *  Identical format to the original — decided and documented, per the
 *  brief's "either acceptable" call. */
const shortNpub = (n: string) => (n.length > 15 ? `${n.slice(0, 7)}…${n.slice(-4)}` : n);

const HEX_PUBKEY = /^[0-9a-f]{64}$/i;

/**
 * `operator` (from `operatorFromCookieHeader`, `packages/operator-auth`) is
 * EITHER a hex pubkey or an allowlisted email/handle seat — "nothing in
 * here knows a customer's name" (ground fact 2). A hex pubkey becomes a
 * short npub; anything else (email/handle) prints AS-IS, matching the one
 * existing precedent for "signed in as X" (`OperatorGate.tsx:116`'s full-
 * address display) rather than inventing an unprecedented truncation. A
 * malformed value (fails npub encoding despite looking hex-shaped) falls
 * back to the raw string — this never throws.
 */
export function operatorDisplayName(operator: string): string {
  if (HEX_PUBKEY.test(operator)) {
    try {
      return shortNpub(nip19.npubEncode(operator.toLowerCase()));
    } catch {
      return operator;
    }
  }
  return operator;
}

function BuilderMarkerLabel({ name, note, align, tooltipId }: {
  name: string;
  note: string | undefined;
  align: "end" | "center";
  tooltipId: string;
}) {
  const sentence = note ? `you are seeing this as ${name}. ${note}` : `you are seeing this as ${name}`;
  return (
    <div
      className="oc-builder-marker-row"
      style={{ display: "flex", justifyContent: align === "center" ? "center" : "flex-end", padding: "0 0 6px", fontFamily: "var(--font-body)" }}
    >
      {/* the style tag carries the :hover/:focus-visible rule — inline
          style objects can't express pseudo-classes; the same idiom
          PuckEditor's own FindingsPanel already uses for a hover rule */}
      <style>{`
        .oc-builder-marker-btn .oc-builder-marker-tip{opacity:0;transform:translateY(-3px);transition:opacity .12s,transform .12s;pointer-events:none}
        .oc-builder-marker-btn:hover .oc-builder-marker-tip,.oc-builder-marker-btn:focus-visible .oc-builder-marker-tip{opacity:1;transform:none}
        @media (prefers-reduced-motion: reduce){.oc-builder-marker-tip{transition:none}}
      `}</style>
      <button
        type="button"
        className="oc-builder-marker-btn"
        aria-describedby={tooltipId}
        style={{
          position: "relative", display: "inline-flex", alignItems: "center", gap: 6,
          background: "var(--pop-bg)", border: "1px solid var(--pop-edge)", borderRadius: 999,
          padding: "4px 10px", cursor: "help", font: "500 13px var(--font-body)", color: "var(--nav-gold, #FAC51C)",
        }}
      >
        <span aria-hidden style={{ fontFamily: "var(--font-mono, ui-monospace)", fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase" }}>
          VIEW
        </span>
        <span style={{ textDecoration: "underline dotted var(--nav-gold, #FAC51C)", textDecorationThickness: 2, textUnderlineOffset: 3 }}>
          {name}
        </span>
        <span
          role="tooltip"
          id={tooltipId}
          className="oc-builder-marker-tip"
          style={{
            position: "absolute", top: "calc(100% + 8px)",
            ...(align === "center" ? { left: "50%", transform: "translateX(-50%)" } : { right: 0 }),
            background: "var(--pop-bg)", border: "1px solid var(--pop-edge)", boxShadow: "var(--pop-shadow)",
            borderRadius: 6, padding: "7px 11px", color: "var(--nav-gold, #FAC51C)",
            font: "500 12.5px var(--font-body)", whiteSpace: "normal", width: "max-content", maxWidth: "min(80vw, 340px)",
            zIndex: 3, textAlign: align === "center" ? "center" : "left",
          }}
        >
          {sentence}
        </span>
      </button>
    </div>
  );
}

export default function BuilderMarker({ children, note, align = "end" }: {
  children: ReactNode;
  /** appended to the tooltip sentence — reserved for the later
   *  locked-preview-Hero lane (CUT NOTE, 0018.06.28 a₿); unused today. */
  note?: string;
  /** where the label row sits — reserved for the same later lane; both
   *  blocks this lane wires (MeSwitch, LoginDoor) take the "end" default. */
  align?: "end" | "center";
}) {
  const name = useContext(BuilderMarkerContext);
  const tooltipId = useId();
  if (!name) return <>{children}</>;
  return (
    <>
      <BuilderMarkerLabel name={name} note={note} align={align} tooltipId={tooltipId} />
      {children}
    </>
  );
}
