import type { BookingConfig, DateOverride, Retreat } from "./booking-time";
import { getItem, listOrders, removeItem, upsertItem, SETTLED_FAMILY, type OrderState } from "./store";

/**
 * RETREATS — the glue (Admiral's blessing, 0018.05.28). A retreat's days
 * become blocked overrides in the booking config (regular session slots
 * vanish for everyone), and its seats become plain store items riding the
 * ordinary cart + bitcoin rail. Nothing new to pay with; nothing new to
 * reconcile. The guest list is the order book filtered to the seat items.
 */

export const retreatOverrideId = (retreatId: string, date: string) => `retreat-${retreatId}-${date}`;
export const retreatItemId = (retreatId: string) => `retreat-${retreatId}`;
export const retreatDepositItemId = (retreatId: string) => `retreat-${retreatId}-deposit`;

/** Every YYYY-MM-DD from start to end inclusive (validated ≤ 60 days). */
export function retreatDates(r: Pick<Retreat, "startDate" | "endDate">): string[] {
  const out: string[] = [];
  let t = Date.parse(`${r.startDate}T00:00:00Z`);
  const end = Date.parse(`${r.endDate}T00:00:00Z`);
  while (t <= end && out.length <= 61) {
    out.push(new Date(t).toISOString().slice(0, 10));
    t += 86_400_000;
  }
  return out;
}

/** Rewrite the config's overrides for this retreat (pure; caller writes). */
export function syncRetreatOverrides(config: BookingConfig, r: Retreat): void {
  const prefix = `retreat-${r.id}-`;
  config.overrides = config.overrides.filter((o) => !o.id.startsWith(prefix));
  if (r.status !== "live") return;
  for (const date of retreatDates(r)) {
    const o: DateOverride = {
      id: retreatOverrideId(r.id, date),
      date,
      kind: "blocked",
      note: `Retreat — ${r.title}`,
    };
    config.overrides.push(o);
  }
}

/** Upsert the seat items (full seat + optional deposit) on the shelf. */
export async function syncRetreatItems(r: Retreat): Promise<void> {
  const dates = `${r.startDate} → ${r.endDate}`;
  await upsertItem({
    id: retreatItemId(r.id),
    schemaVersion: 2,
    title: `${r.title} — a seat`,
    blurb: `${r.location} · ${dates} · paid in full`,
    images: [],
    media: { images: [] },
    kind: "retreat",
    price: { sats: r.priceSats },
    fulfillment: "retreat",
    status: r.status === "live" ? "live" : "hidden",
  });
  if (r.depositSats != null) {
    await upsertItem({
      id: retreatDepositItemId(r.id),
      schemaVersion: 2,
      title: `${r.title} — seat deposit`,
      blurb: `${r.location} · ${dates} · holds your seat, the rest settles by letter`,
      images: [],
      media: { images: [] },
      kind: "retreat",
      price: { sats: r.depositSats },
      fulfillment: "retreat",
      status: r.status === "live" ? "live" : "hidden",
    });
  } else {
    await removeItem(retreatDepositItemId(r.id)).catch(() => {});
  }
}

export async function removeRetreatItems(retreatId: string): Promise<void> {
  await removeItem(retreatItemId(retreatId)).catch(() => {});
  await removeItem(retreatDepositItemId(retreatId)).catch(() => {});
}

/** Seats taken = settled-family orders holding either seat item. */
export async function seatsTaken(retreatId: string): Promise<number> {
  const ids = new Set([retreatItemId(retreatId), retreatDepositItemId(retreatId)]);
  let taken = 0;
  for (const o of await listOrders()) {
    if (!SETTLED_FAMILY.includes(o.state as OrderState)) continue;
    if (o.state === "refunded") continue; // a refunded seat is a freed seat
    for (const l of o.lineItems) {
      if (ids.has(l.itemId)) taken += l.qty ?? 1;
    }
  }
  return taken;
}

/** The public read: live retreats with seat math, soonest first. */
export async function listLiveRetreats(config: BookingConfig): Promise<(Retreat & { seatsLeft: number })[]> {
  const live = (config.retreats ?? []).filter((r) => r.status === "live");
  const out = await Promise.all(
    live.map(async (r) => ({ ...r, seatsLeft: Math.max(0, r.seats - (await seatsTaken(r.id))) })),
  );
  return out.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** Keep the seat items' sold-out truth in step with the seat math. */
export async function refreshRetreatSoldOut(r: Retreat & { seatsLeft: number }): Promise<void> {
  for (const id of [retreatItemId(r.id), retreatDepositItemId(r.id)]) {
    const item = await getItem(id);
    if (!item) continue;
    const want = r.status !== "live" ? "hidden" : r.seatsLeft <= 0 ? "soldout" : "live";
    if (item.status !== want) await upsertItem({ ...item, status: want });
  }
}
