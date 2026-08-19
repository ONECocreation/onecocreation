"use client";

/**
 * The console's shared glass grammar (Items-room redesign, 0018.05.22):
 * gold labeled-rule section heads, frosted cards, white fields, and the
 * little status chips. One vocabulary so no admin room ever looks like a
 * wireframe again.
 */

/* inputs stay lit paper in both themes — dark ink is deliberate */
export const field: React.CSSProperties = {
  border: "1px solid rgba(139,118,196,.45)",
  borderRadius: 10,
  padding: "8px 12px",
  background: "var(--field-bg, #fff)",
  fontSize: ".9rem",
  color: "var(--field-ink, #4a4458)",
  fontFamily: "inherit",
};

export const glassCard: React.CSSProperties = {
  background: "var(--glass)",
  border: "1px solid var(--glass-edge)",
  borderRadius: 18,
  padding: "16px 18px",
  boxShadow: "var(--soft-sm, 0 18px 44px -28px rgba(120,100,160,.45))",
};

/* the popup primitive lives in components/Sheet.tsx now (cartridge walk
   step 6) — prefer <Sheet> for new work; these styles remain for the desks
   that compose the pieces themselves, and they match the primitive 1:1 */
export { default as Sheet, SCRIM, SCRIM_LIGHTBOX } from "@/components/Sheet";

export const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(24,18,38,.55)",
  zIndex: "var(--z-sheet, 60)" as unknown as number,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 18,
};

export const sheet: React.CSSProperties = {
  background: "var(--sheet-bg, #fffdf8)", borderRadius: 16, border: "1px solid rgba(139,118,196,.4)",
  boxShadow: "0 18px 50px rgba(24,18,38,.35)", padding: 22, width: "100%", maxWidth: 460,
  maxHeight: "86vh", overflowY: "auto",
};

export function SectionHead({ label }: { label: string }) {
  /* the section pill is LAVENDER (info) — never gold-by-default (the
     relaxed gold law: gold is curated to money + earned accents) */
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "26px 0 10px" }}>
      <span style={{ borderRadius: 999, padding: "4px 16px", fontSize: ".72rem", fontWeight: 700,
        letterSpacing: ".08em", textTransform: "uppercase", color: "var(--info, #5f4b96)",
        border: "1.5px solid rgba(139,118,196,.45)", background: "rgba(139,118,196,.10)", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <span style={{ flex: 1, height: 1, background: "rgba(139,118,196,.25)" }} />
    </div>
  );
}

const CHIP_TONES = {
  green: { background: "rgba(78,138,95,.14)", color: "var(--ok)", border: "1px solid rgba(78,138,95,.4)" },
  grey: { background: "rgba(137,127,151,.12)", color: "var(--muted)", border: "1px dashed rgba(137,127,151,.5)" },
  rose: { background: "rgba(197,110,139,.13)", color: "var(--err)", border: "1px solid rgba(197,110,139,.4)" },
  lavender: { background: "rgba(139,118,196,.14)", color: "var(--info)", border: "1px solid rgba(139,118,196,.4)" },
  teal: { background: "rgba(78,160,175,.13)", color: "var(--teal-deep)", border: "1px solid rgba(78,160,175,.4)" },
  gold: { background: "rgba(217,178,78,.14)", color: "var(--warn)", border: "1px solid rgba(180,134,43,.5)" },
} as const;

export function Chip({ tone, children }: { tone: keyof typeof CHIP_TONES; children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-block", borderRadius: 999, padding: "2px 10px", fontSize: ".64rem",
      fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", whiteSpace: "nowrap",
      ...CHIP_TONES[tone] }}>
      {children}
    </span>
  );
}
