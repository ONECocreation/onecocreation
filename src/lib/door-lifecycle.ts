import { kv } from "@/lib/store";
import { mintJitsiRoom } from "@/lib/studio/jitsi-door";
import { zonedDateParts, DEFAULT_TZ } from "@/lib/booking-time";

/**
 * THE ROOM DOOR LIFECYCLE, SAID ONCE (TASK-475, block 968,624) — the
 * three-phase KV lifecycle `stage2.ts` (TASK-392) and `stage1.ts`
 * (TASK-438) each grew on their own: `closed` -> `prepared` ->
 * `published`, the midnight-Denver self-close (TASK-439 ruling 4), and
 * the fail-closed-on-any-doubt read. `stage2.ts` now BUILDS on this
 * factory (same KV key, same exports, same tests, byte-identical
 * behavior); `qa-door.ts` (TASK-475) is its second, brand-new tenant.
 * `stage1.ts` is left exactly as it was — it never publishes from closed
 * (Stage 1's own law, the one real behavioral fork this factory carries
 * as `allowPublishFromClosed`), and touching a file this close to
 * Saturday for a pure refactor was not worth the risk for one more
 * caller.
 *
 * A plain open/closed boolean would let a repeated "open" mint a second
 * room and let visitors in before the host had even started the call —
 * the three phases separate MINTING (`prepared`, private) from ISSUING
 * (`published`, the door exists). `publishedAtMs` (when set) or
 * `openedAtMs` anchors the midnight close: `doorExpired` compares
 * America/Denver CALENDAR dates (never a fixed UTC offset — the zone
 * carries the DST rules), so a Friday rehearsal room can never be
 * re-used on Saturday, and every reader (member route, operator route,
 * prepare, publish) sees `closed` at once past midnight.
 *
 * NO MODULE-LEVEL CACHE: every call reads KV fresh — the same honesty
 * `stage1.ts`/`stage2.ts` already kept under normal sequential operator
 * clicking. Two truly simultaneous PUTs are still not locked against —
 * unchanged scope, named here as it was in `stage2.ts`'s own docblock.
 */

export type DoorPhase = "closed" | "prepared" | "published";

export interface DoorState {
  /** the room slug on the house Jitsi (`mintJitsiRoom()`'s own
   *  `oc-<16 hex>` shape) — null only while `phase === "closed"`. */
  room: string | null;
  phase: DoorPhase;
  /** unix MILLISECONDS — when this room was minted (prepare, or the
   *  closed->publish convenience path); null only while `closed`. */
  openedAtMs: number | null;
  /** unix MILLISECONDS — when the phase became `published` (the
   *  midnight-close anchor); null while `closed` or `prepared`, and on a
   *  stored doc written without it (read as `null`). */
  publishedAtMs: number | null;
}

export const IDLE_DOOR: DoorState = { phase: "closed", room: null, openedAtMs: null, publishedAtMs: null };

/** `mintJitsiRoom()`'s own shape, checked again here rather than trusted —
 *  a stored value is never assumed to have come from that function. */
const ROOM_SHAPE = /^oc-[0-9a-f]{16}$/;

/** FAIL-CLOSED INVARIANT CHECK (mirrors `stage2.ts`'s own, Astra's review
 *  finding 7): `phase` must be one of the three known strings;
 *  `phase !== "closed"` requires `room` to be a non-empty string matching
 *  the mint shape; `phase === "closed"` requires `room === null`. Any
 *  mismatch — a hand-edited or half-written KV value — is not a real
 *  DoorState, never a half-trusted patch. */
function isValidDoorState(raw: unknown): raw is DoorState {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  if (o.phase !== "closed" && o.phase !== "prepared" && o.phase !== "published") return false;
  if (o.phase === "closed") return o.room === null;
  return typeof o.room === "string" && ROOM_SHAPE.test(o.room);
}

/**
 * THE MIDNIGHT CLOSE, pure (mirrors `stage2.ts`'s `stage2Expired`,
 * byte-for-byte): a non-closed state is expired once the America/Denver
 * CALENDAR DATE of its anchor (`publishedAtMs ?? openedAtMs`) is earlier
 * than `nowMs`'s. A non-closed state with NO anchor is expired (fail
 * closed); `closed` is never expired.
 */
export function doorExpired(state: DoorState, nowMs: number): boolean {
  if (state.phase === "closed") return false;
  const anchor = state.publishedAtMs ?? state.openedAtMs;
  if (anchor === null) return true;
  return zonedDateParts(new Date(anchor), DEFAULT_TZ).date < zonedDateParts(new Date(nowMs), DEFAULT_TZ).date;
}

export interface DoorLifecycle {
  getState(nowMs?: number): Promise<DoorState>;
  /** mints via `mintJitsiRoom()` and writes `prepared`, privately;
   *  idempotent on anything but `closed`. */
  prepare(): Promise<DoorState>;
  /** `prepared` -> `published` (same room); `published` is a no-op;
   *  `closed` -> `allowPublishFromClosed ? mint+publish : null` (never
   *  written on a refusal). */
  publish(): Promise<DoorState | null>;
  /** writes IDLE verbatim from any phase — trivially idempotent. */
  close(): Promise<DoorState>;
}

/**
 * Builds one door's KV-backed lifecycle over `key`.
 * `allowPublishFromClosed`: true is Stage 2's own convenience path (mint
 * + publish in one step, still exactly one mint) and what the Q&A door
 * takes too; false is Stage 1's law (publish from closed is refused —
 * `null`, nothing written — because that room must only ever exist
 * after a Prepare with the host standing inside it).
 */
export function createDoorLifecycle(key: string, opts: { allowPublishFromClosed: boolean }): DoorLifecycle {
  async function getState(nowMs: number = Date.now()): Promise<DoorState> {
    try {
      const res = (await kv(["GET", key])) as { result?: unknown } | null;
      if (typeof res?.result !== "string" || !res.result) return IDLE_DOOR;
      const parsed = JSON.parse(res.result) as unknown;
      if (!isValidDoorState(parsed)) return IDLE_DOOR;
      const state: DoorState = {
        phase: parsed.phase,
        room: parsed.room,
        openedAtMs: typeof parsed.openedAtMs === "number" ? parsed.openedAtMs : null,
        publishedAtMs: typeof parsed.publishedAtMs === "number" ? parsed.publishedAtMs : null,
      };
      return doorExpired(state, nowMs) ? IDLE_DOOR : state;
    } catch {
      return IDLE_DOOR;
    }
  }

  /** Writes are never silently swallowed: an unconfigured vault (`kv()`
   *  resolving null) THROWS, so prepare/publish/close can never report a
   *  transition they failed to store. */
  async function writeState(state: DoorState): Promise<void> {
    const res = await kv(["SET", key, JSON.stringify(state)]);
    if (res === null) throw new Error(`door state vault is not configured — nothing was written (${key})`);
  }

  async function prepare(): Promise<DoorState> {
    const current = await getState();
    if (current.phase !== "closed") return current;
    const next: DoorState = { phase: "prepared", room: mintJitsiRoom(), openedAtMs: Date.now(), publishedAtMs: null };
    await writeState(next);
    return next;
  }

  async function publish(): Promise<DoorState | null> {
    const current = await getState();
    if (current.phase === "published") return current;
    if (current.phase === "prepared") {
      const next: DoorState = { ...current, phase: "published", publishedAtMs: Date.now() };
      await writeState(next);
      return next;
    }
    // current.phase === "closed"
    if (!opts.allowPublishFromClosed) return null;
    const now = Date.now();
    const next: DoorState = { phase: "published", room: mintJitsiRoom(), openedAtMs: now, publishedAtMs: now };
    await writeState(next);
    return next;
  }

  async function close(): Promise<DoorState> {
    await writeState(IDLE_DOOR);
    return IDLE_DOOR;
  }

  return { getState, prepare, publish, close };
}
