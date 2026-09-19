import MeSwitch from "@/components/me/MeSwitch";
import BuilderMarker from "@/components/style/BuilderMarker";

/**
 * MeSwitch block (TASK-296 wave B, me-login pair — 0018.06.25 a₿): the
 * { id }-only shape (the JoinSurface/FormDoors precedent, H116 A's "a
 * data-bound block … so the designer never freezes live data"). The stored
 * Puck doc holds only the block id; the block renders the REAL MeSwitch —
 * the member's own room, switched client-side on /api/member/session (key
 * members get the nostr control room, email members their own home, a
 * signed-out visitor the honest sign-in-first state the widget already
 * owns). Nothing is fossilised: the session is read fresh on every view,
 * on the published page AND on the designer canvas. The component itself
 * is never edited — this file only imports and mounts it (derive-or-dash:
 * no session ⇒ the widget's own empty state, never a fabricated one).
 *
 * TASK-342 (0018.06.28 a₿): wrapped in `BuilderMarker`, which is a no-op
 * everywhere but the /style canvas (its context defaults to `null` — see
 * BuilderMarker.tsx). `BuilderMarker` renders NO wrapping box around
 * `children` on the canvas either (ground fact 10): MeSwitch's own render
 * is a bare Fragment of three siblings, and a wrapping div here would
 * collapse those three flex/grid items into one.
 */
export function createMeSwitch() {
  return {
    label: "Me switch (the member's own room — session-aware)",
    fields: {},
    render: () => <BuilderMarker><MeSwitch /></BuilderMarker>,
  };
}
