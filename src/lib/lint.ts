import { lintPage, type Finding, type Lane, type LintData } from "@pacsarcade/plugin-rails";
import { ONECOCREATION } from "@/brand/tokens";
import { getPalette, getPaletteDawn } from "./brand-palette";

/**
 * Host lint wrapper (Phase 1 step 4) — binds the pure rails engine to this
 * site's brand tokens, lane rules, and live palette. Used by:
 *   - /api/puck publish (server authority: errors → 422)
 *   - /api/copilot (AI output must pass before it reaches the canvas)
 *   - PuckEditor (client-side pre-check + findings display)
 */

/** Which lane a page slug lives in. Everything on Love's site is the brand
 *  lane except the practice sandbox and (future) /u/ fren pages. */
export function laneForSlug(slug: string): Lane {
  if (slug === "practice" || slug.startsWith("practice/") || slug.startsWith("u/")) {
    return "play";
  }
  return "brand";
}

/** Accepts the host's loose PuckPageData shape; the engine validates
 *  structurally as it walks. */
export async function lintForPublish(
  slug: string,
  data: { content: unknown[]; root?: unknown },
): Promise<Finding[]> {
  const [palette, dawn] = await Promise.all([getPalette(), getPaletteDawn()]);
  return lintPage(data as unknown as LintData, {
    tokens: ONECOCREATION,
    lane: laneForSlug(slug),
    palette: palette as unknown as Record<string, string>,
    paletteDawn: dawn as Record<string, string>,
  });
}

export { hasErrors, summarize, type Finding } from "@pacsarcade/plugin-rails";
