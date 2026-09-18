/**
 * The Jitsi one-time door (TASK-337, 0018.06.28 a₿ · Love's ask via the
 * Admiral: "give her the option of starting a 1-time session from the
 * jitsi side as well"). A fourth card beside the desk's three existing VDO
 * copy doors (StudioRoom.tsx): press "New room" once, the server mints a
 * fresh unguessable room slug and persists it in KV so a refresh doesn't
 * lose it. Room names are one-time — a new mint overwrites the KV value
 * and the old name is simply abandoned, never reused, never reachable
 * from the desk again.
 *
 * Slug shape: `oc-<16 lowercase hex>` (64 bits of crypto.randomUUID(),
 * hyphens stripped). A guest-enabled public Jitsi room (see the run
 * sheet's §11 smoke test) makes the room NAME itself the only secret — an
 * 8-hex/32-bit space is both guessable at scale and makes a 2000-draw
 * uniqueness test flaky, so this follows the wider of the codebase's two
 * mint shapes (class-materials.ts:137's full UUID) rather than the
 * shorter one (copilot.ts:400's slice(0, 8), fine for a human-facing
 * content id, not fine for a room name standing in as a shared secret).
 *
 * KV: this lane's single string value doesn't need roster.ts's heavier
 * dual-path Upstash-REST client (built for the whole stage doc) — it uses
 * store.ts's `kv()` directly, same tenant-namespacing precedent as
 * order-receipt.ts. `getJitsiDoor()` returns null on any KV miss or
 * unconfigured vault — never throws, never fabricates a room (derive-or-
 * dash). If KV is unset in local dev, minting still works, it just won't
 * survive a refresh — the UI says so honestly rather than faking a
 * dev-file fallback for a one-time room name.
 */
import { kv } from "@/lib/store";
import { TENANT } from "@/lib/tenant";

const doorKey = () => `studio:jitsi-door:${TENANT}`;

export function mintJitsiRoom(): string {
  return `oc-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export async function getJitsiDoor(): Promise<string | null> {
  try {
    const res = (await kv(["GET", doorKey()])) as { result?: unknown } | null;
    return typeof res?.result === "string" && res.result ? res.result : null;
  } catch {
    return null; /* a vault the room can't reach never fabricates a room name */
  }
}

export async function setJitsiDoor(room: string): Promise<void> {
  await kv(["SET", doorKey(), room]);
}
