/**
 * Matrix — classes + community, tier-gated (Phase 4).
 *
 * Same as Pac's Arcade (RTFM 005 "Classroom Setups & Management"): Element
 * re-brands by config alone, server_name set once. One Cocreation gets its own
 * branded space — classes as rooms, a community space, teacher moderation.
 * Paying for a package → a Matrix invite to the rooms that tier unlocks.
 *
 * STATUS: STUB. Needs MATRIX_HOMESERVER / MATRIX_ADMIN_TOKEN.
 */

import type { Tier } from "./entitlement";

export interface MatrixRoom {
  id: string; // room alias, e.g. #claire-senses:onecocreation.com
  title: string;
  kind: "class" | "community";
  minTier: Tier | "all";
}

/** The room map (illustrative until the homeserver is provisioned). */
export const ROOMS: MatrixRoom[] = [
  { id: "#heart-field:onecocreation.com", title: "The Heart Field — Commons", kind: "community", minTier: "all" },
  { id: "#claire-senses:onecocreation.com", title: "Claire Senses — Foundations", kind: "class", minTier: "A" },
  { id: "#tune-up:onecocreation.com", title: "Daily Tune-Up & Check-ins", kind: "community", minTier: "A" },
  { id: "#weekly-reading:onecocreation.com", title: "Chronicles: Weekly Reading", kind: "class", minTier: "B" },
  { id: "#observers-circle:onecocreation.com", title: "The Observers' Circle", kind: "community", minTier: "B" },
  { id: "#quantum-healing:onecocreation.com", title: "Quantum Healing — Deep Dive", kind: "class", minTier: "C" },
  { id: "#inner-sanctum:onecocreation.com", title: "Evening Star — Inner Sanctum", kind: "community", minTier: "C" },
];

export function matrixConfigured(): boolean {
  return Boolean(process.env.MATRIX_HOMESERVER && process.env.MATRIX_ADMIN_TOKEN);
}

export async function inviteToTierRooms(_npub: string, _tier: Tier): Promise<void> {
  if (!matrixConfigured()) throw new Error("Matrix not provisioned (Phase 4).");
  // TODO(phase-4): resolve the member's matrix id, invite to every ROOM whose
  // minTier the member satisfies.
  throw new Error("inviteToTierRooms: not implemented (scaffold)");
}
