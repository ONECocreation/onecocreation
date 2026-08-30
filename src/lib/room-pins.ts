import { promises as fs } from "fs";
import path from "path";
import { put, get } from "@vercel/blob";
import { blobStoreEnabled } from "./registry";
import { roomForSlug } from "./live";
import { postToRoom, setRoomPinnedEvent, matrixConfigured } from "./matrix";

/**
 * ROOM PINS — Love's Desk Day altitude's "pinned welcome leads" rail
 * (loves-desk plan, Lane DESK). One teacher welcome per room, editable
 * inline by the operator.
 *
 * STORAGE — the honest split (recon 0018.06.07): the real Matrix rail
 * (`m.room.pinned_events` + the pinned message itself) DOES work here —
 * the bot (adminpacman) is room creator/PL100 in every one of Love's
 * rooms (matrix.ts's file header), well above the state_default a pin
 * requires, so `setRoomPinnedEvent` (matrix.ts) is a real door, not a
 * fantasy one. But a pin's welcome text is low-stakes, public-within-
 * the-room copy — not a secret, not PII — so this file keeps the SAME
 * house dual-driver single-doc pattern the booking config and store
 * catalog use as the ONE source of truth `getPin` reads (KV in prod,
 * `data/room-pins.json` in dev, `room-pins.json` blob as prod's no-KV
 * fallback) — fast, and correct even before Matrix ever answers.
 * `setPin` writes that doc FIRST (the durable, always-honest half), then
 * best-effort mirrors the same text into the room's real pinned-message
 * state so a member reading the room natively (Element, or a future
 * RoomView pin banner) sees the same words. The mirror's outcome is
 * reported back to the caller (`matrixPinned` / `matrixReason`) rather
 * than swallowed — a silent partial success would be its own small lie.
 */

export interface RoomPin {
  text: string;
  updatedAtMs: number;
}

type PinsDoc = Record<string, RoomPin>;

const PINS_BLOB = "room-pins.json";
const pinsFile = () => path.join(process.cwd(), "data", "room-pins.json");
const PINS_KV = "classroom:pins";

async function pinsKv(cmd: unknown[]): Promise<unknown> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`room pins: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

async function readDoc(): Promise<PinsDoc> {
  try {
    const raw = (await pinsKv(["GET", PINS_KV])) as string | null;
    if (raw) return JSON.parse(raw) as PinsDoc;
  } catch {
    /* fall through */
  }
  if (blobStoreEnabled()) {
    try {
      const res = await get(PINS_BLOB, { access: "public" });
      if (res && res.statusCode === 200) {
        return JSON.parse(await new Response(res.stream).text()) as PinsDoc;
      }
    } catch {
      /* an unwritten doc reads as "no pins yet" */
    }
    return {};
  }
  try {
    return JSON.parse(await fs.readFile(pinsFile(), "utf8")) as PinsDoc;
  } catch {
    return {};
  }
}

async function writeDoc(doc: PinsDoc): Promise<void> {
  const json = JSON.stringify(doc, null, 2);
  try {
    const url = process.env.KV_REST_API_URL;
    if (url && (await pinsKv(["SET", PINS_KV, json])) !== null) return;
  } catch {
    /* fall through to the legacy write */
  }
  if (blobStoreEnabled()) {
    await put(PINS_BLOB, json, {
      access: "public",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return;
  }
  await fs.mkdir(path.dirname(pinsFile()), { recursive: true });
  const tmp = pinsFile() + ".tmp";
  await fs.writeFile(tmp, json, "utf8");
  await fs.rename(tmp, pinsFile());
}

/** No KV and no blob and no writable data/ dir would all read as "doc
 *  stays empty" rather than throwing — same honest-refuse shape the rest
 *  of the house's dual-driver docs use (booking.ts, store.ts's catalog). */
export function pinsConfigured(): boolean {
  return true; // the fs driver always exists in dev; KV/blob are additive in prod
}

export async function getPin(roomSlug: string): Promise<RoomPin | null> {
  const doc = await readDoc();
  return doc[roomSlug] ?? null;
}

export async function listPins(): Promise<PinsDoc> {
  return readDoc();
}

/**
 * Set (or clear, with an empty string) the room's pinned welcome. Writes
 * the durable doc first — that write's success is what `ok` reports — then
 * best-effort mirrors into the real Matrix room. `matrixPinned` says
 * whether the mirror landed; a `false` there is never a reason to treat
 * the whole call as failed, since the doc (the source `getPin` reads) is
 * already correct.
 */
export async function setPin(
  roomSlug: string,
  text: string,
): Promise<{ ok: true; matrixPinned: boolean; matrixReason?: string } | { ok: false; reason: string }> {
  const room = roomForSlug(roomSlug);
  if (!room) return { ok: false, reason: "unknown room" };
  const trimmed = text.trim();

  const doc = await readDoc();
  if (trimmed) doc[roomSlug] = { text: trimmed, updatedAtMs: Date.now() };
  else delete doc[roomSlug];
  try {
    await writeDoc(doc);
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "pin store unreachable" };
  }

  if (!matrixConfigured()) {
    return { ok: true, matrixPinned: false, matrixReason: "matrix bot token not configured" };
  }
  try {
    if (!trimmed) {
      const cleared = await setRoomPinnedEvent(room.id, null);
      return cleared.ok
        ? { ok: true, matrixPinned: true }
        : { ok: true, matrixPinned: false, matrixReason: cleared.reason };
    }
    const posted = await postToRoom(room.id, `📌 ${trimmed}`);
    if (!posted.ok || !posted.eventId) {
      return { ok: true, matrixPinned: false, matrixReason: posted.ok ? "message sent but no event id returned" : posted.reason };
    }
    const pinned = await setRoomPinnedEvent(room.id, posted.eventId);
    return pinned.ok
      ? { ok: true, matrixPinned: true }
      : { ok: true, matrixPinned: false, matrixReason: pinned.reason };
  } catch (err) {
    return { ok: true, matrixPinned: false, matrixReason: err instanceof Error ? err.message : "matrix mirror failed" };
  }
}
