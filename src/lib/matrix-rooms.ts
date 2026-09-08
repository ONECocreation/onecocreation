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

/* ── TASK-150 (0018.06.17 a₿): the shelf speaks in PACKAGES — one card, ──
   one door. Love: "too many buttons on the bottom" — two cards per package
   became one card that names the package and lists its rooms as lines. */

/** Shelf order: the Commons leads, then the packages by tier rank. */
const PACKAGE_ORDER = ["all", "A", "B", "C"] as const;

/** The Commons "package" — membership itself, no /packages/[slug] door. */
export const COMMONS_PACKAGE_NAME = "Heart Field Commons";

/* Fallback names + /packages/[slug] doors — they mirror TIERS (entitlement.ts)
   and rooms/tier-slug.ts. The rooms feed's `neededName` (derived server-side
   from TIERS, the one source of truth) always wins when present. */
const PACKAGE_FALLBACK: Record<Tier, { name: string; slug: string }> = {
  A: { name: "Weekly Intuitive", slug: "weekly-intuitive" },
  B: { name: "Observer", slug: "observer" },
  C: { name: "Evening Star", slug: "evening-star" },
};

export interface RoomPackage<T> {
  tier: Tier | "all";
  /** package display name — the feed's neededName when it carries one */
  name: string;
  /** /packages/[slug] for the SEE door; null for the Commons */
  packageSlug: string | null;
  /** every room of the package open to this visitor (one door per card) */
  open: boolean;
  rooms: T[];
  /** the ENTER door's target — the package's first room (the class leads) */
  primary: T;
}

/**
 * Group a rooms feed into its packages — one card per package. Feed order
 * is preserved inside each package; packages with no rooms are skipped.
 * `open`/`neededName` come from the feed; pure ROOMS data falls back to
 * PACKAGE_FALLBACK names and reports open=false (nothing derived, no fake).
 */
export function groupRoomsByPackage<
  T extends { minTier: string; neededName?: string | null; open?: boolean },
>(rooms: T[]): RoomPackage<T>[] {
  const out: RoomPackage<T>[] = [];
  for (const tier of PACKAGE_ORDER) {
    const inTier = rooms.filter((r) => r.minTier === tier);
    if (inTier.length === 0) continue;
    out.push({
      tier,
      name:
        tier === "all"
          ? COMMONS_PACKAGE_NAME
          : inTier.find((r) => r.neededName)?.neededName ?? PACKAGE_FALLBACK[tier].name,
      packageSlug: tier === "all" ? null : PACKAGE_FALLBACK[tier].slug,
      open: inTier.every((r) => r.open),
      rooms: inTier,
      primary: inTier[0],
    });
  }
  return out;
}

/**
 * Under a class's calendar (The Circle vantage) the shelf shows only THAT
 * class's package rooms plus the Commons — not every room in the house.
 * Unknown/active-less slugs degrade to the Commons alone (derive-or-dash).
 */
export function shelfRoomsForRoom<T extends { slug: string; minTier: string }>(
  rooms: T[],
  activeSlug: string,
): T[] {
  const active = rooms.find((r) => r.slug === activeSlug);
  if (!active || active.minTier === "all") return rooms.filter((r) => r.minTier === "all");
  return rooms.filter((r) => r.minTier === "all" || r.minTier === active.minTier);
}
