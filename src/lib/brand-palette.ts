import { ONECOCREATION } from "@/brand/tokens";
import { TENANT } from "@/lib/tenant";

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

/* TASK-97 (cut 0018.06.10 a₿): the tenant tail rides the ONE constant —
   default 'onecocreation' keeps these keys byte-identical to the originals */
const KEY = `brand:palette:${TENANT}`;
const DAWN_KEY = `brand:palette-dawn:${TENANT}`;
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

/* ── FACES (TASK-182, 0018.06.18 a₿) — the site's top faces ride the same
   promote-to-token rail as the palette: one KV key, the same /api/brand
   route, the same pour (PaletteVars). The three slots are the house's own
   type ladder — display (cartridge.css's --font-h1), heading (--font-h2)
   and body (--font-body) — and a slot's value is a KEY into FACE_CHOICES,
   never a raw stack, so a face outside the house's shelf is refused in
   words before disk is ever touched.

   The shelf is deliberately closed: Love's blessed FONT TRIO (0018.05.17 —
   Barlow / Helvetica / Lucida), the system stack, the faces layout.tsx
   already registers on <html> (Roboto, Open Sans, OpenDyslexic, Press
   Start 2P) and the house mono. NO new webfont downloads — every stack
   below either resolves to an already-registered variable or to fonts the
   visitor's own system carries. */

export const FACE_KEYS = ["display", "heading", "body"] as const;
export type FaceKey = (typeof FACE_KEYS)[number];
/** a Faces value is a FACE_CHOICES key per slot */
export type Faces = Record<FaceKey, string>;

export const FACE_CHOICES: Record<string, { label: string; stack: string }> = {
  /* the blessed trio, stacks verbatim from cartridge.css's --font-h1 /
     --font-h2 / --font-h3 */
  barlow:    { label: "Barlow",        stack: "var(--font-barlow,'Barlow'),'Barlow',-apple-system,sans-serif" },
  helvetica: { label: "Helvetica",     stack: "'Helvetica Neue',Helvetica,Arial,sans-serif" },
  lucida:    { label: "Lucida",        stack: "'Lucida Grande','Lucida Sans Unicode','Lucida Sans',Verdana,sans-serif" },
  /* the plain stack (--font-body-app) */
  system:    { label: "System stack",  stack: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" },
  /* registered on <html> by the root layout — already downloaded */
  roboto:    { label: "Roboto",        stack: "var(--font-roboto,'Roboto'),'Roboto',sans-serif" },
  "open-sans": { label: "Open Sans",   stack: "var(--font-open-sans,'Open Sans'),'Open Sans',sans-serif" },
  "open-dyslexic": { label: "OpenDyslexic", stack: "var(--font-opendyslexic,'OpenDyslexic'),'OpenDyslexic',sans-serif" },
  "press-start": { label: "Press Start 2P", stack: "var(--font-press-start,'Press Start 2P'),monospace" },
  /* the house mono (--font-mono) */
  mono:      { label: "Monospace",     stack: "ui-monospace,Menlo,Consolas,monospace" },
};

/** which house token each face slot pours (cartridge.css's type ladder) */
export const FACE_CSS_VAR: Record<FaceKey, string> = {
  display: "--font-h1",
  heading: "--font-h2",
  body: "--font-body",
};

/** the cartridge's own faces — derived from cartridge.css's :root
 *  declarations (--font-h1 Barlow, --font-h2 and --font-body Helvetica) */
export function defaultFaces(): Faces {
  return { display: "barlow", heading: "helvetica", body: "helvetica" };
}

export function isFaces(v: unknown): v is Faces {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return FACE_KEYS.every(
    (k) => typeof o[k] === "string" && Object.prototype.hasOwnProperty.call(FACE_CHOICES, o[k]),
  );
}

/** the shelf as a list, for the route to hand down to the pickers (the
 *  client never hardcodes the shelf — one truth, this module) */
export function faceChoiceList(): { key: string; label: string; stack: string }[] {
  return Object.entries(FACE_CHOICES).map(([key, c]) => ({ key, label: c.label, stack: c.stack }));
}

const FACES_KEY = `brand:faces:${TENANT}`;

/** The live faces: saved override if present, else the cartridge default. */
export async function getFaces(): Promise<Faces> {
  try {
    const raw = (await kv(["GET", FACES_KEY])) as string | null;
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isFaces(parsed)) return parsed;
    }
  } catch {
    /* fall through to default */
  }
  return defaultFaces();
}

export async function setFaces(f: Faces): Promise<void> {
  await kv(["SET", FACES_KEY, JSON.stringify(f)]);
}
