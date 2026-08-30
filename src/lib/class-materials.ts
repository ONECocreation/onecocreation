import { promises as fs } from "fs";
import path from "path";
import { ROOMS } from "./matrix-rooms";

/**
 * CLASS MATERIALS — the room-scoped shelf (Love's Desk Week/Day altitudes'
 * "materials shelf" rail, loves-desk plan Lane DESK).
 *
 * STORAGE DECISION (the honest mirror the brief asked for): a material's
 * `url` is a private, tier-gated deliverable — the exact shape store.ts
 * calls out for `ItemMedia.deliverable.blobPath` ("THE LEAK RULE") —
 * NEVER a public product shot. store.ts answers that split with TWO
 * drivers for two different things: the catalog (public by nature, the
 * dual-driver single-doc) vs orders (PII, the PRIVATE driver — KV in
 * prod / files in dev, never a public blob, same shape entitlement.ts's
 * vault uses). Materials are closer to orders than to the catalog: there
 * is no un-gated "browse the shelf" view anywhere in this house — every
 * read is already behind a tier check (GET /api/rooms/[slug]/materials)
 * — so this file rides the PRIVATE driver, full stop. A public dual-driver
 * doc (booking.ts / store.ts catalog's own pattern) would put every
 * material's url — including recordings sold at tier C — in a blob
 * reachable at a fixed, guessable pathname with NO gate at all; that is
 * exactly the wrong answer here and the brief's "honestly wrong" case.
 *
 * The file bytes themselves ride the store's upload-deliverable shape
 * (random-suffixed blob pathname in prod, unreadable without the
 * pathname) via /api/admin/classroom/upload — this module only ever
 * stores the resulting url/pathname string, never moves bytes itself.
 */

export type MaterialKind = "recording" | "pdf" | "file";

export type MaterialAttachment =
  | { kind: "session"; /** an opaque session id — Love's Desk passes the
        selected booking's id (AdminWeekGrid/booking-orders' Chip.bookingId
        shape); this file never interprets it */ sessionKey: string }
  | { kind: "shelf" };

export interface MaterialItem {
  id: string;
  roomSlug: string;
  name: string;
  kind: MaterialKind;
  /** the private file pointer — a blob URL/pathname, never rendered on
   *  any surface the room's tier gate hasn't already cleared */
  url: string;
  attachedTo: MaterialAttachment;
  addedAtMs: number;
}

/* ── the vault (same REST-only shape as entitlement.ts / live.ts) ───────── */

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

function vaultConfigured(): boolean {
  return restEnv() !== null;
}

/** Prod requires the vault; dev uses files. False = the shelf honestly
 *  refuses rather than ever falling back to public storage. */
export function materialsConfigured(): boolean {
  if (process.env.VERCEL === "1") return vaultConfigured();
  return true;
}

async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = restEnv();
  if (!rest) throw new Error("materials vault not configured");
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`materials vault: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

const kvKey = (roomSlug: string) => `classroom:materials:${roomSlug}`;
const materialsDir = () => path.join(process.cwd(), "data", "classroom-materials");
const materialsFile = (roomSlug: string) => path.join(materialsDir(), `${roomSlug}.json`);

function safeRoomSlug(slug: string): boolean {
  return ROOMS.some((r) => r.id.slice(1, r.id.indexOf(":")) === slug);
}

async function readRoom(roomSlug: string): Promise<MaterialItem[]> {
  if (vaultConfigured()) {
    const raw = (await kv(["GET", kvKey(roomSlug)])) as string | null;
    return raw ? (JSON.parse(raw) as MaterialItem[]) : [];
  }
  try {
    return JSON.parse(await fs.readFile(materialsFile(roomSlug), "utf8")) as MaterialItem[];
  } catch {
    return [];
  }
}

async function writeRoom(roomSlug: string, items: MaterialItem[]): Promise<void> {
  const json = JSON.stringify(items, null, 2);
  if (vaultConfigured()) {
    await kv(["SET", kvKey(roomSlug), json]);
    return;
  }
  await fs.mkdir(materialsDir(), { recursive: true });
  const tmp = materialsFile(roomSlug) + ".tmp";
  await fs.writeFile(tmp, json, "utf8");
  await fs.rename(tmp, materialsFile(roomSlug));
}

/** One room's shelf, or every room's (admin overview) when `roomSlug` is
 *  omitted — the omitted form fans out across ROOMS since materials are
 *  stored one doc per room, never a single all-rooms blob. */
export async function listMaterials(roomSlug?: string): Promise<MaterialItem[]> {
  if (roomSlug) {
    if (!safeRoomSlug(roomSlug)) return [];
    return readRoom(roomSlug);
  }
  const all = await Promise.all(
    ROOMS.map((r) => readRoom(r.id.slice(1, r.id.indexOf(":")))),
  );
  return all.flat().sort((a, b) => b.addedAtMs - a.addedAtMs);
}

export async function addMaterial(
  input: Omit<MaterialItem, "id" | "addedAtMs">,
): Promise<{ ok: true; item: MaterialItem } | { ok: false; reason: string }> {
  if (!safeRoomSlug(input.roomSlug)) return { ok: false, reason: "unknown room" };
  if (!input.name?.trim()) return { ok: false, reason: "a name" };
  if (!["recording", "pdf", "file"].includes(input.kind)) return { ok: false, reason: "a kind (recording/pdf/file)" };
  if (!input.url?.trim()) return { ok: false, reason: "a file — upload one first" };
  const item: MaterialItem = {
    id: crypto.randomUUID(),
    roomSlug: input.roomSlug,
    name: input.name.trim(),
    kind: input.kind,
    url: input.url.trim(),
    attachedTo: input.attachedTo,
    addedAtMs: Date.now(),
  };
  const items = await readRoom(input.roomSlug);
  items.push(item);
  await writeRoom(input.roomSlug, items);
  return { ok: true, item };
}

/** Removes by id across every room (the caller rarely knows the room up
 *  front from a bare id) — cheap at this shelf's scale. */
export async function removeMaterial(id: string): Promise<boolean> {
  for (const r of ROOMS) {
    const slug = r.id.slice(1, r.id.indexOf(":"));
    const items = await readRoom(slug);
    const next = items.filter((m) => m.id !== id);
    if (next.length !== items.length) {
      await writeRoom(slug, next);
      return true;
    }
  }
  return false;
}

export async function attachMaterial(
  id: string,
  target: MaterialAttachment,
): Promise<{ ok: true; item: MaterialItem } | { ok: false; reason: string }> {
  for (const r of ROOMS) {
    const slug = r.id.slice(1, r.id.indexOf(":"));
    const items = await readRoom(slug);
    const at = items.findIndex((m) => m.id === id);
    if (at < 0) continue;
    items[at] = { ...items[at], attachedTo: target };
    await writeRoom(slug, items);
    return { ok: true, item: items[at] };
  }
  return { ok: false, reason: "no such material" };
}
