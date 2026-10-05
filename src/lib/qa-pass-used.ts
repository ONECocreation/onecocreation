import { kv } from "@/lib/store";

/**
 * THE Q&A PASS'S "USED DAY" (TASK-561, block 970,086) — the Admiral's
 * ruling: "the qa pass 33.33 is a one time deal for that one session."
 * One tiny record per pass ORDER: key `qa:pass-used:<orderId>`, value the
 * door's own calendar day (`YYYY-MM-DD`, `door-lifecycle.ts`'s
 * `doorDay`) on which that pass was first spent. No `TENANT` prefix, the
 * same as `store:order:<id>` it hangs off (an order id is already unique
 * on its own).
 *
 * WRITE-ONCE: `SET … NX` (the house idiom, `createOrder`'s own), so a
 * second stamp for the same order — a raced second device, a poll a
 * moment later — never moves the first day. The order record itself is
 * never touched (no order shape change).
 *
 * NO VAULT (dev, tests): `kv()` resolves `null`, and the stamps live in a
 * module-level map instead, the same "honest local stand-in" the order
 * store keeps with its files when no vault is configured. Per-process,
 * gone on restart, which in dev only means a pass reads as unused again.
 * An orders-only vault is never half-configured here: a vault that is
 * configured but throws makes the READ throw, and the caller fails
 * CLOSED (`qa-entitlement.ts`).
 *
 * Orders bought before this shipped have no record, so they read as
 * unused: each is good for one more Q&A day.
 */

const usedKey = (orderId: string) => `qa:pass-used:${orderId}`;

/** Only used when no vault is configured. */
const localUsed = new Map<string, string>();

/** Order id -> the day it was spent. An id with no entry is unused. */
export type QaPassUsedDays = Record<string, string>;

/** Reads the used day of each given order id; absent ids are unused.
 *  THROWS on a vault failure (the caller fails closed). */
export async function readQaPassUsedDays(orderIds: string[]): Promise<QaPassUsedDays> {
  const out: QaPassUsedDays = {};
  await Promise.all(
    orderIds.map(async (id) => {
      const res = await kv(["GET", usedKey(id)]);
      const day = res === null ? localUsed.get(id) : res.result;
      if (typeof day === "string" && day) out[id] = day;
    }),
  );
  return out;
}

/** Stamps `day` on `orderId` ONLY if it has no day yet; returns the day
 *  now on file (the earlier one if the order was already stamped). */
export async function stampQaPassUsed(orderId: string, day: string): Promise<string> {
  const res = await kv(["SET", usedKey(orderId), day, "NX"]);
  if (res === null) {
    if (!localUsed.has(orderId)) localUsed.set(orderId, day);
    return localUsed.get(orderId) as string;
  }
  if (res.result === null) {
    const prior = await kv(["GET", usedKey(orderId)]);
    if (typeof prior?.result === "string" && prior.result) return prior.result;
  }
  return day;
}
