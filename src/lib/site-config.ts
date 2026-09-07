import { promises as fs, readFileSync } from "fs";
import path from "path";
import { put, get } from "@vercel/blob";
import { TENANT } from "./tenant.ts";
import { SPACE_NAME, domainForSpace } from "./identity-config.ts";

/**
 * THE SWITCHES (TASK-129, cut 0018.06.16 a₿) — one site-config doc so Love
 * can run the streamlined site while the full one is being finished: every
 * unfinished feature hides behind a switch, and every payment rail flips on
 * or off from /a/site instead of a redeploy. Dual-driver exactly like
 * nodeconfig.ts: KV first when KV_REST_API_* is present (key tenant-
 * namespaced via tenant.ts, same bare Upstash-REST helper as brand-palette),
 * prod Vercel Blob `config/site.json` behind blobStoreEnabled()'s VERCEL
 * guard, and the zero-infrastructure dev file `data/site-config.json` last.
 *
 * A rail is LIVE only when its switch is ON **and** its env is configured —
 * the switch can hide a configured rail, never conjure an unconfigured one.
 * Unknown keys in a stored doc are sanitized out on read, so an old or
 * hand-edited file can never grow a door the house didn't build.
 *
 * Server-only. Public API: getSiteConfig() / saveSiteConfig(patch).
 * siteSwitchesSync() exists for payments.ts's liveAdapter, whose signature
 * the square-payments harness pins synchronous; see its note below.
 */

export interface SiteConfig {
  features: {
    community: boolean;
    classes: boolean;
    store: boolean;
    sessions: boolean;
    cuts: boolean;
    jars: boolean;
    news: boolean;
  };
  payments: { btcpay: boolean; square: boolean; stripe: boolean };
  meeting: {
    /** static = "Zoom / any link" */
    rail: "jitsi" | "vdo" | "static";
    jitsiDomain: string;
    allowStaticLinks: boolean;
  };
}

export type SiteConfigPatch = {
  features?: Partial<SiteConfig["features"]>;
  payments?: Partial<SiteConfig["payments"]>;
  meeting?: Partial<SiteConfig["meeting"]>;
};

/** Love's streamlined site (the Admiral, 0018.06.16 a₿): only the jars and
    the news stay up; bitcoin + card rails live, stripe still dark; meetings
    on the house jitsi, no "any link" door (Love has no Zoom). */
export function defaultSiteConfig(): SiteConfig {
  return {
    features: {
      community: false,
      classes: false,
      store: false,
      sessions: false,
      cuts: false,
      jars: true,
      news: true,
    },
    payments: { btcpay: true, square: true, stripe: false },
    meeting: {
      rail: "jitsi",
      jitsiDomain: `meet.${domainForSpace(SPACE_NAME)}`,
      allowStaticLinks: false,
    },
  };
}

const RAILS = ["jitsi", "vdo", "static"] as const;

/** Stored doc → honest config: defaults underneath, known keys only, wrong
    types ignored. An unknown key simply never survives the read. */
function sanitize(raw: unknown): SiteConfig {
  const d = defaultSiteConfig();
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Record<string, unknown>;
  const bools = <G extends Record<string, boolean>>(src: unknown, def: G): G => {
    const out = { ...def };
    if (src && typeof src === "object") {
      for (const k of Object.keys(def) as (keyof G)[]) {
        const v = (src as Record<string, unknown>)[k as string];
        if (typeof v === "boolean") out[k] = v as G[keyof G];
      }
    }
    return out;
  };
  const m = (o.meeting ?? {}) as Record<string, unknown>;
  return {
    features: bools(o.features, d.features),
    payments: bools(o.payments, d.payments),
    meeting: {
      rail: (RAILS as readonly string[]).includes(m.rail as string)
        ? (m.rail as SiteConfig["meeting"]["rail"])
        : d.meeting.rail,
      jitsiDomain:
        typeof m.jitsiDomain === "string" && m.jitsiDomain.trim()
          ? m.jitsiDomain.trim()
          : d.meeting.jitsiDomain,
      allowStaticLinks:
        typeof m.allowStaticLinks === "boolean" ? m.allowStaticLinks : d.meeting.allowStaticLinks,
    },
  };
}

/* ── the three drivers ─────────────────────────────────────────────────── */

const KV_KEY = `site:config:${TENANT}`;
const BLOB_PATH = "config/site.json";
const filePath = () => path.join(process.cwd(), "data", "site-config.json");

/* registry.ts's blobStoreEnabled(), inlined byte-for-byte — payments.ts
   imports THIS module and scripts/square-payments.test.mjs loads payments.ts
   through Node's own ESM resolver, where registry.ts's extensionless
   "./identity-config" import doesn't resolve (the calendar-view harness
   registers a resolver hook; the square one doesn't, and the harnesses are
   gates this lane doesn't own). Same env contract: Blob only on Vercel or
   under REGISTRY_DRIVER=blob. */
function blobStoreEnabled(): boolean {
  return (
    !!process.env.BLOB_READ_WRITE_TOKEN &&
    (process.env.VERCEL === "1" || process.env.REGISTRY_DRIVER === "blob")
  );
}

function kvEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = kvEnv();
  if (!rest) return null;
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`site-config: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

async function readStored(): Promise<unknown> {
  if (kvEnv()) {
    try {
      const raw = (await kv(["GET", KV_KEY])) as string | null;
      return raw ? JSON.parse(raw) : null;
    } catch {
      /* fall through to the next driver */
    }
  }
  if (blobStoreEnabled()) {
    try {
      const res = await get(BLOB_PATH, { access: "public" });
      if (res && res.statusCode === 200) return JSON.parse(await new Response(res.stream).text());
    } catch {
      /* unconfigured */
    }
    return null;
  }
  try {
    return JSON.parse(await fs.readFile(filePath(), "utf8"));
  } catch {
    return null;
  }
}

async function writeStored(config: SiteConfig): Promise<void> {
  const body = JSON.stringify(config, null, 2);
  if (kvEnv()) {
    await kv(["SET", KV_KEY, body]);
    return;
  }
  if (blobStoreEnabled()) {
    await put(BLOB_PATH, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return;
  }
  const p = filePath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, body, "utf8");
}

/* ── the cache + the sync bridge ───────────────────────────────────────── */

let cache: SiteConfig | null = null;

/**
 * The switches, synchronously — the ONLY consumer is payments.ts's
 * liveAdapter, whose sync signature scripts/square-payments.test.mjs pins.
 * Warmed by every getSiteConfig()/saveSiteConfig(); a cold process reads the
 * dev file synchronously (fs driver) or serves the DEFAULTS (KV/blob can't
 * answer synchronously — a cold prod instance assumes Love's streamlined
 * defaults until the first real read warms it; the /a/site save warms the
 * instance that took it). Honest edge, never a guessed ON for a rail whose
 * switch actually says OFF anywhere a read already happened.
 */
export function siteSwitchesSync(): SiteConfig {
  if (cache) return cache;
  if (!kvEnv() && !blobStoreEnabled()) {
    try {
      cache = sanitize(JSON.parse(readFileSync(filePath(), "utf8")));
      return cache;
    } catch {
      /* no dev file yet — defaults */
    }
  }
  return defaultSiteConfig();
}

/** The live switches: stored doc sanitized over Love's defaults. */
export async function getSiteConfig(): Promise<SiteConfig> {
  const config = sanitize(await readStored());
  cache = config;
  return config;
}

/** Merge a patch (per group), sanitize, persist, warm. Returns the doc as
    it now stands — the /a/site room repaints straight from this. */
export async function saveSiteConfig(patch: SiteConfigPatch): Promise<SiteConfig> {
  const current = await getSiteConfig();
  const next = sanitize({
    features: { ...current.features, ...(patch.features ?? {}) },
    payments: { ...current.payments, ...(patch.payments ?? {}) },
    meeting: { ...current.meeting, ...(patch.meeting ?? {}) },
  });
  await writeStored(next);
  cache = next;
  return next;
}
