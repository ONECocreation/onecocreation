import type { Tier } from "./entitlement";

/**
 * THE ROOM GATE, SAID ONCE (TASK-174, 0018.06.17 a₿ · block 966094) — the
 * Stage's video slot and the room's chat follow the SAME door: the room's
 * minTier against the visitor's tier. One helper, so the two can never
 * disagree.
 *
 * PURE and CLIENT-IMPORTABLE — the same discipline as matrix-rooms.ts (the
 * Turbopack lesson of 0018.05.15 its docblock records): entitlement.ts is
 * server-only (fs/vault), so the tier ladder below MIRRORS its
 * tierSatisfies RANK table instead of importing it, and the Tier type rides
 * in type-only. The visitor's signedIn/tier are computed by the caller (the
 * room page reads them server-side and threads them down; the rooms feed
 * derives them from the same vault truth).
 */

/** Where the door sends this visitor: the stage, the sign-in card, or the
 *  package words. */
export type RoomGate = "open" | "signin" | "package";

/* Mirrors entitlement.ts's tierSatisfies RANK — progressive: C ⊇ B ⊇ A. */
const RANK: Record<Tier, number> = { A: 1, B: 2, C: 3 };

/** The ONE door decision: the room's minTier vs the visitor's tier. A
 *  signed-out visitor always meets the sign-in door first — even the free
 *  Commons opens for members, never for guests. */
export function roomGate(
  minTier: Tier | "all",
  visitor: { signedIn: boolean; tier: Tier | null },
): RoomGate {
  if (!visitor.signedIn) return "signin";
  if (minTier === "all") return "open";
  return visitor.tier && RANK[visitor.tier] >= RANK[minTier] ? "open" : "package";
}

/** The sign-in door's line — the room's own name rides it, so the visitor
 *  knows which door they're knocking on. */
export function signInDoorLine(roomTitle: string): string {
  return `${roomTitle} opens for members — sign in and the room knows you.`;
}

/** The sign-in door's target — back to this room once the code matches
 *  (the T-156 next-path rule keeps it same-origin). No slug → plain /login. */
export function signInDoorHref(slug: string | null): string {
  return slug ? `/login?next=${encodeURIComponent(`/rooms/${slug}`)}` : "/login";
}

/** The lower-tier door's line — names the package when the house knows it
 *  (the server threads TIERS' own name down), honest without it. */
export function packageDoorLine(packageName: string | null): string {
  return packageName
    ? `This stage opens with the ${packageName} package — and everything above it.`
    : "This door opens with a higher package.";
}
