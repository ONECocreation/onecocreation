import { promises as fs } from "fs";
import path from "path";
import { put, get } from "@vercel/blob";
import { blobStoreEnabled } from "./registry";
import type { BookingConfig, Service } from "./booking-time";

/**
 * Booking — the storage half (spec: docs/booking-flow.md, steps 1–2).
 *
 * Services + availability are PUBLIC by nature — a visitor has to see what's
 * bookable and when — so this is the house dual-driver single-doc pattern,
 * same as the store catalog (data/booking-config.json in dev,
 * booking/config.json blob in prod; single-operator last-write-wins is the
 * accepted, documented trade). BOOKINGS and HOLDS carry a customer and land
 * in the private vault instead — they are step 3 and live nowhere in here.
 *
 * The shapes and the time math live in booking-time.ts and are re-exported
 * here so callers keep one import.
 */

export * from "./booking-time";

const emptyConfig = (): BookingConfig => ({
  schemaVersion: 1,
  services: [],
  rules: [],
  overrides: [],
});

/* ── the dual-driver doc ────────────────────────────────────────────────── */

const CONFIG_BLOB = "booking/config.json";
const configFile = () => path.join(process.cwd(), "data", "booking-config.json");

const CONFIG_KV = "booking:config";

async function cfgKv(cmd: unknown[]): Promise<unknown> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`booking config: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

export async function readConfig(): Promise<BookingConfig> {
  /* vault first — same CDN-staleness lesson as the store catalog */
  try {
    const raw = (await cfgKv(["GET", CONFIG_KV])) as string | null;
    if (raw) return JSON.parse(raw) as BookingConfig;
  } catch {
    /* fall through */
  }
  return readConfigLegacy();
}

async function readConfigLegacy(): Promise<BookingConfig> {
  if (blobStoreEnabled()) {
    try {
      const res = await get(CONFIG_BLOB, { access: "public" });
      if (res && res.statusCode === 200) {
        return JSON.parse(await new Response(res.stream).text()) as BookingConfig;
      }
    } catch {
      /* fall through to empty — an unwritten config is an empty calendar */
    }
    return emptyConfig();
  }
  try {
    return JSON.parse(await fs.readFile(configFile(), "utf8")) as BookingConfig;
  } catch {
    return emptyConfig();
  }
}

export async function writeConfig(doc: BookingConfig): Promise<void> {
  const json = JSON.stringify(doc, null, 2);
  try {
    const url = process.env.KV_REST_API_URL;
    if (url && (await cfgKv(["SET", CONFIG_KV, json])) !== null) return;
  } catch {
    /* fall through to legacy write */
  }
  if (blobStoreEnabled()) {
    await put(CONFIG_BLOB, json, {
      access: "public",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return;
  }
  await fs.mkdir(path.dirname(configFile()), { recursive: true });
  const tmp = configFile() + ".tmp";
  await fs.writeFile(tmp, json, "utf8");
  await fs.rename(tmp, configFile());
}

/** The shelf order Love wants spoken everywhere (Admiral, 0018.05.14):
 *  discovery first, then soul conversations, then the cuts — women before
 *  men, keeping their order among themselves. Any OTHER (non-ConsciousCuts)
 *  service defaults to rank 50 and sorts ahead of the whole group —
 *  ConsciousCuts goes LAST, everywhere sessions list (Love's meeting,
 *  0018.05.11). */
const SERVICE_RANK: Record<string, number> = {
  "discovery-call": 101,
  "soul-conversation": 102,
  "soul-conversation-women": 103,
  "soul-conversation-men": 104,
  "silent-haircut-women": 105,
  "silent-haircut-men": 106,
};

export function sortServices<T extends { id: string }>(services: T[]): T[] {
  return services
    .slice()
    .sort((a, b) => (SERVICE_RANK[a.id] ?? 50) - (SERVICE_RANK[b.id] ?? 50));
}

export async function listServices(opts?: { includeHidden?: boolean }): Promise<Service[]> {
  const { services } = await readConfig();
  return sortServices(opts?.includeHidden ? services : services.filter((s) => s.status === "live"));
}

export async function getService(id: string): Promise<Service | null> {
  const { services } = await readConfig();
  return services.find((s) => s.id === id) ?? null;
}

export function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
