import { ONECOCREATION } from "@/brand/tokens";

/**
 * Brand palette — the promote-to-token rail (Phase 1 step 2, Admiral-gated).
 * The 5 palette slots (p1 lead / p2 mid / p3 soft / p4 counter / p5 deep)
 * live in KV so Love can re-roll and SAVE a palette; the root layout exposes
 * them as --p1..--p5, and any block whose colour picked a slot follows the
 * new palette instantly. Defaults come from the brand cartridge
 * (@pacsarcade/puck-config/tokens).
 *
 * Same bare Upstash-REST kv() helper as puck-store.ts (each lib file
 * carries its own, per the house pattern).
 */

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = restEnv();
  if (!rest) return null;
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`brand-palette: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

const KEY = "brand:palette:onecocreation";
const DAWN_KEY = "brand:palette-dawn:onecocreation";
const HEX = /^#[0-9a-fA-F]{6}$/;

export type Palette = { p1: string; p2: string; p3: string; p4: string; p5: string };

export function defaultPalette(): Palette {
  const out = {} as Record<string, string>;
  for (const slot of ONECOCREATION.palette) out[slot.key] = slot.value;
  return out as Palette;
}

export function isPalette(v: unknown): v is Palette {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (["p1", "p2", "p3", "p4", "p5"] as const).every(
    (k) => typeof o[k] === "string" && HEX.test(o[k] as string),
  );
}

/** The live palette: saved override if present, else the cartridge default. */
export async function getPalette(): Promise<Palette> {
  try {
    const raw = (await kv(["GET", KEY])) as string | null;
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isPalette(parsed)) return parsed;
    }
  } catch {
    /* fall through to default */
  }
  return defaultPalette();
}

export async function setPalette(p: Palette): Promise<void> {
  await kv(["SET", KEY, JSON.stringify(p)]);
}

/** Dawn overrides — a PARTIAL palette (sibling KV key, forward-only:
 *  the flat night palette shape above never changes). */
export type PaletteDawn = Partial<Palette>;

export function isPaletteDawn(v: unknown): v is PaletteDawn {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return Object.entries(o).every(
    ([k, val]) => ["p1", "p2", "p3", "p4", "p5"].includes(k) && typeof val === "string" && HEX.test(val),
  );
}

export function defaultPaletteDawn(): PaletteDawn {
  const out: PaletteDawn = {};
  for (const slot of ONECOCREATION.palette) {
    const d = (slot as { varianted?: Record<string, string> }).varianted?.dawn;
    if (d) out[slot.key as keyof Palette] = d;
  }
  return out;
}

export async function getPaletteDawn(): Promise<PaletteDawn> {
  try {
    const raw = (await kv(["GET", DAWN_KEY])) as string | null;
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isPaletteDawn(parsed)) return parsed;
    }
  } catch {
    /* fall through to cartridge default */
  }
  return defaultPaletteDawn();
}

export async function setPaletteDawn(p: PaletteDawn): Promise<void> {
  await kv(["SET", DAWN_KEY, JSON.stringify(p)]);
}
