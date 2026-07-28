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

export async function readConfig(): Promise<BookingConfig> {
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

export async function listServices(opts?: { includeHidden?: boolean }): Promise<Service[]> {
  const { services } = await readConfig();
  return opts?.includeHidden ? services : services.filter((s) => s.status === "live");
}

export async function getService(id: string): Promise<Service | null> {
  const { services } = await readConfig();
  return services.find((s) => s.id === id) ?? null;
}

export function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
