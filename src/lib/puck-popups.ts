import { isValidSlug } from "./puck-slugs";
import type { PopupTrigger } from "./puck-store";

/**
 * The popup lane (STUDIO P2): popups are full Puck documents at
 * `popup:<name>` slugs, edited in the same studio canvas. This module is the
 * shared brain — slug helpers, the code-side DEFAULT registry, and trigger
 * validation — imported by the API routes (server) and the panels/host
 * (client). Type-only import of PopupTrigger keeps puck-store's server
 * code out of the client bundle.
 */

export const POPUP_PREFIX = "popup:";
export const popupSlug = (name: string) => `${POPUP_PREFIX}${name}`;

/** The `<name>` part of a popup slug, or null for non-popup slugs. */
export function popupName(slug: string): string | null {
  return slug.startsWith(POPUP_PREFIX) ? slug.slice(POPUP_PREFIX.length) : null;
}

/* The code-side registry — the ruled FACT timing for the rebuild of the
   original's only popup. The KV trigger map (puck:popup-config) overrides
   per name; the popups panel edits that, never this file. The page list is
   content (Pac's veto flag), so the panel can rewrite every entry here. */
export const DEFAULT_POPUP_TRIGGERS: Record<string, PopupTrigger> = {
  "free-guide": {
    enabled: true,
    delayMs: 2000,
    oncePerSession: true,
    pages: ["/", "/about", "/classes", "/memberships"],
  },
};

/** Defaults overlaid with the operator's KV overrides (per popup name). */
export function mergedPopupTriggers(
  overrides: Record<string, PopupTrigger> | null,
): Record<string, PopupTrigger> {
  return { ...DEFAULT_POPUP_TRIGGERS, ...(overrides ?? {}) };
}

/* A brand-new popup starts dark: disabled, no pages — the operator turns it
   on deliberately (nothing ambushes a visitor by default). */
export const NEW_POPUP_TRIGGER: PopupTrigger = {
  enabled: false,
  delayMs: 2000,
  oncePerSession: true,
  pages: [],
};

/** One honest reason a popup name or trigger can't be saved, or null. */
export function popupNameProblem(name: string): string | null {
  if (!name) return "give the popup a name";
  if (!isValidSlug(name)) return "lowercase letters, numbers and dashes only";
  return null;
}

export function popupTriggerProblem(t: unknown): string | null {
  if (!t || typeof t !== "object") return "trigger must be an object";
  const tr = t as Partial<PopupTrigger>;
  if (typeof tr.enabled !== "boolean") return "enabled must be true or false";
  if (typeof tr.delayMs !== "number" || !Number.isFinite(tr.delayMs) || tr.delayMs < 0 || tr.delayMs > 60000) {
    return "delay must be 0–60000 ms";
  }
  if (typeof tr.oncePerSession !== "boolean") return "oncePerSession must be true or false";
  if (!Array.isArray(tr.pages) || !tr.pages.every((p) => typeof p === "string" && /^\/[^\s]*$/.test(p))) {
    return "pages must be site paths like / or /about";
  }
  return null;
}
