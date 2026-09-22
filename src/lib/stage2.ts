import { kv } from "@/lib/store";
import { TENANT } from "@/lib/tenant";
import { mintJitsiRoom } from "@/lib/studio/jitsi-door";

/**
 * STAGE 2 — THE AFTER-READING JITSI PILOT (TASK-392, block 968,091) — the
 * three-phase lifecycle: `closed` → `prepared` → `published`. Mirrors
 * `live.ts`'s `LiveState`/`oc:live` shape (one KV doc, sanitised on every
 * read, IDLE on any doubt), never `site-config.ts`'s dual-driver shape —
 * this lane deliberately never touches `site-config.ts` (Ground: the
 * public `/api/admin/site` GET hands its whole config to any anonymous
 * caller, so Stage 2's room name must never live there).
 *
 * A plain open/closed boolean would let a repeated "open" mint a second
 * room and let members in before Love had even started the call
 * (Astra's review, finding 5) — the three phases separate MINTING
 * (`prepared`, private) from ISSUING (`published`, the door exists).
 *
 * KV key `stage2:state:${TENANT}` via `store.ts`'s `kv()` — the same
 * tenant-namespaced REST client `studio/jitsi-door.ts` already uses for
 * its own one-time-room precedent. NO MODULE-LEVEL CACHE: every function
 * below reads KV fresh, which is what keeps the transitions honest under
 * normal sequential operator clicking. Two truly simultaneous PUTs (two
 * admins clicking at the same instant) are NOT locked against by this
 * pilot — a real mutex is out of scope for one builder-day, named here
 * and in the brief's Honestly-broken section, not hidden.
 */

export type Stage2Phase = "closed" | "prepared" | "published";

export interface Stage2State {
  phase: Stage2Phase;
  /** the room slug on the house Jitsi (`mintJitsiRoom()`'s own
   *  `oc-<16 hex>` shape) — null only while `phase === "closed"`. */
  room: string | null;
  /** unix MILLISECONDS — when this room was minted (prepare or the
   *  closed→publish convenience path); null only while `closed`. */
  openedAtMs: number | null;
}

/** The one KV key this whole lane reads and writes. */
const KEY = `stage2:state:${TENANT}`;

export const IDLE: Stage2State = { phase: "closed", room: null, openedAtMs: null };

/** `mintJitsiRoom()`'s own shape, checked again here rather than trusted —
 *  a stored value is never assumed to have come from that function. */
const ROOM_SHAPE = /^oc-[0-9a-f]{16}$/;

/**
 * FAIL-CLOSED INVARIANT CHECK (Astra's review, finding 7): `phase` must be
 * one of the three known strings; `phase !== "closed"` requires `room` to
 * be a non-empty string matching the mint shape; `phase === "closed"`
 * requires `room === null`. Any mismatch — a hand-edited or half-written
 * KV value — is not a real Stage2State, never a half-trusted patch.
 */
function isValidState(raw: unknown): raw is Stage2State {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  if (o.phase !== "closed" && o.phase !== "prepared" && o.phase !== "published") return false;
  if (o.phase === "closed") return o.room === null;
  return typeof o.room === "string" && ROOM_SHAPE.test(o.room);
}

/** GET, JSON-parse in a try/catch → any failure OR any invariant
 *  violation fails CLOSED to IDLE, never a guessed-open state. */
export async function getStage2State(): Promise<Stage2State> {
  try {
    const res = (await kv(["GET", KEY])) as { result?: unknown } | null;
    if (typeof res?.result !== "string" || !res.result) return IDLE;
    const parsed = JSON.parse(res.result) as unknown;
    if (!isValidState(parsed)) return IDLE;
    return {
      phase: parsed.phase,
      room: parsed.room,
      openedAtMs: typeof parsed.openedAtMs === "number" ? parsed.openedAtMs : null,
    };
  } catch {
    return IDLE;
  }
}

async function writeStage2State(state: Stage2State): Promise<void> {
  await kv(["SET", KEY, JSON.stringify(state)]);
}

/** Reads fresh state; `phase !== "closed"` is idempotent — returns the
 *  state unchanged, mints nothing (a second click never double-mints).
 *  `phase === "closed"` mints via `mintJitsiRoom()` (imported, read-only)
 *  and writes `prepared`, privately — nothing members can see yet. */
export async function prepareStage2(): Promise<Stage2State> {
  const current = await getStage2State();
  if (current.phase !== "closed") return current;
  const next: Stage2State = { phase: "prepared", room: mintJitsiRoom(), openedAtMs: Date.now() };
  await writeStage2State(next);
  return next;
}

/** Reads fresh state; `published` is an idempotent no-op; `prepared`
 *  flips to `published` with the SAME room, no remint; `closed` mints AND
 *  publishes in one step (a convenience path — still exactly one mint). */
export async function publishStage2(): Promise<Stage2State> {
  const current = await getStage2State();
  if (current.phase === "published") return current;
  if (current.phase === "prepared") {
    const next: Stage2State = { ...current, phase: "published" };
    await writeStage2State(next);
    return next;
  }
  const next: Stage2State = { phase: "published", room: mintJitsiRoom(), openedAtMs: Date.now() };
  await writeStage2State(next);
  return next;
}

/** Writes IDLE verbatim regardless of current phase — trivially
 *  idempotent. Clears our own issuance record; it does not and cannot
 *  forcibly disconnect anyone already inside the old Jitsi room (Ground —
 *  only Love ending the call, with everyone gone, actually ends it). */
export async function closeStage2(): Promise<Stage2State> {
  await writeStage2State(IDLE);
  return IDLE;
}
