/**
 * ROOMS as PURE DATA — client-importable (no entitlement/redis chain; the
 * Turbopack lesson of 0018.05.15: a client card importing matrix.ts dragged
 * the vault driver into the browser bundle). matrix.ts re-exports these.
 */
import type { Tier } from "./entitlement";

export interface MatrixRoom {
  /** room ALIAS, e.g. #clair-senses:onecocreation.com */
  id: string;
  title: string;
  kind: "class" | "community";
  minTier: Tier | "all";
}

/* ── CONTENT: Love's rooms ──────────────────────────────────────────────── */
export const ROOMS: MatrixRoom[] = [
  { id: "#heart-field:onecocreation.com", title: "The Heart Field — Commons", kind: "community", minTier: "all" },
  { id: "#clair-senses:onecocreation.com", title: "Clair Senses — Foundations", kind: "class", minTier: "A" },
  { id: "#tune-up:onecocreation.com", title: "Daily Tune-Up & Check-ins", kind: "community", minTier: "A" },
  { id: "#weekly-reading:onecocreation.com", title: "Chronicles: Weekly Reading", kind: "class", minTier: "B" },
  { id: "#observers-circle:onecocreation.com", title: "The Observers' Circle", kind: "community", minTier: "B" },
  { id: "#quantum-healing:onecocreation.com", title: "Quantum Healing — Deep Dive", kind: "class", minTier: "C" },
  { id: "#inner-sanctum:onecocreation.com", title: "Evening Star — Inner Sanctum", kind: "community", minTier: "C" },
];

/** Which rooms a tier opens. `all` rooms are open to any paying member. */
