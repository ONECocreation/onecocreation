import type { Data } from "@puckeditor/core";
import { ONECOCREATION } from "@/brand/tokens";

/**
 * BOARD_SAMPLE — the brand board's specimen page (BRAND BOARD batch,
 * 2026-08-14). A constant Data rendered through the REAL registry
 * (<Render config data={BOARD_SAMPLE}/>) in both theme panes, so what the
 * board shows IS what the blocks do — never an approximation.
 *
 * NEVER saved or POSTed anywhere: this is a read-only specimen, not a page.
 *
 * The type ladder is the brand's honest six-step scale from
 * ONECOCREATION.type.sizes (display 46 / h1 37 / h2 30 / h3 24 / body 19 /
 * small 15 — the schema has no h4-h6, so the board doesn't invent them).
 * Each step carries a small Eyebrow label naming step + px (the registry
 * has no mono text block; Eyebrow is its label voice).
 */

const SIZES = ONECOCREATION.type.sizes;

/** dense StyleProps, as every block's defaultProps ship it */
const style = (over: Partial<{
  font: string; size: number; kerning: number; lineHeight: number;
  color: string; spaceAbove: number; spaceBelow: number;
}> = {}) => ({
  font: "default", size: 0, kerning: 0, lineHeight: 0,
  color: "default", spaceAbove: 0, spaceBelow: 0, ...over,
});

const eyebrow = (id: string, text: string, spaceAbove = 18) => ({
  type: "Eyebrow",
  props: { id, text, align: "left" as const, style: style({ spaceAbove, spaceBelow: 2 }) },
});

const heading = (id: string, text: string, level: "h1" | "h2" | "h3", size: number) => ({
  type: "Heading",
  props: { id, text, level, align: "left" as const, style: style({ size }) },
});

const text = (id: string, body: string, size: number) => ({
  type: "Text",
  props: { id, text: body, align: "left" as const, style: style({ size }) },
});

export const BOARD_SAMPLE: Data = {
  root: { props: { title: "Brand board specimen" } },
  content: [
    /* ── the type ladder — six honest steps ─────────────────────────── */
    eyebrow("bb-lab-display", `display · ${SIZES.display}px`, 4),
    heading("bb-display", "The night sky, cocreated", "h1", SIZES.display),
    eyebrow("bb-lab-h1", `h1 · ${SIZES.h1}px`),
    heading("bb-h1", "A page title speaks once", "h1", SIZES.h1),
    eyebrow("bb-lab-h2", `h2 · ${SIZES.h2}px`),
    heading("bb-h2", "Sections keep the rhythm", "h2", SIZES.h2),
    eyebrow("bb-lab-h3", `h3 · ${SIZES.h3}px`),
    heading("bb-h3", "Sub-sections stay quiet", "h3", SIZES.h3),
    eyebrow("bb-lab-body", `body · ${SIZES.body}px`),
    text(
      "bb-body",
      "Body copy carries the story — long enough to read, set at the brand's true reading size, on the theme's own ground.",
      SIZES.body,
    ),
    eyebrow("bb-lab-small", `small · ${SIZES.small}px`),
    text("bb-small", "Small print keeps its footing: captions, credits, the fine details.", SIZES.small),

    /* ── buttons — the solid voice and the quiet one ────────────────── */
    eyebrow("bb-lab-buttons", "buttons"),
    {
      type: "Buttons",
      props: {
        id: "bb-buttons",
        align: "left" as const,
        buttons: [
          { label: "Solid — book a reading", href: "/book", variant: "gold" },
          { label: "Quiet — learn more", href: "/about", variant: "quiet" },
        ],
      },
    },

    /* ── a glass panel holding copy ─────────────────────────────────── */
    eyebrow("bb-lab-panel", "glass panel"),
    {
      type: "Panel",
      props: {
        id: "bb-panel",
        content: [
          {
            type: "Text",
            props: {
              id: "bb-panel-text",
              text: "Panels float copy over the ground on the house glass — the text-safe layer every theme keeps legible.",
              align: "left" as const,
              style: style(),
            },
          },
        ],
      },
    },
  ],
} as unknown as Data;
