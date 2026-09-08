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

/**
 * THE NAV (TASK-137, cut 0018.06.17 a₿) — Love's own menu, no AI required.
 * `nav` is absent by default: absent means "build the menu from the
 * switches" (buildMenu's own default in NavMenu.tsx). Only once Love saves
 * an edited nav from the console does this field appear, and even then
 * sanitize() will hand back `undefined` rather than an empty/garbage doc —
 * a broken nav file can never blank the menu, it just falls back to the
 * switch-driven default. hrefs are checked against KNOWN_NAV_HREFS below
 * (the site's real routes) so a hand-edited doc can't point the menu
 * somewhere the house didn't build; the feature-gating itself (a page whose
 * switch is OFF never renders publicly even if nav lists it) lives in
 * NavMenu.tsx's buildMenu, which is the one place that already knows both
 * the switches and the catalog.
 */
export interface NavChild {
  id: string;
  label: string;
  href: string;
}
export interface NavItem {
  id: string;
  label: string;
  /** headers may omit href (pure grouping) or carry one (click-through) */
  href?: string;
  /** one level only — the editor never nests a child under a child */
  children?: NavChild[];
}
export interface NavConfig {
  items: NavItem[];
}

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
    /** TASK-137: VDO.Ninja room prefix — guests get ?room=<prefix>-<booking> */
    vdoRoomPrefix: string;
    /** TASK-137: the standing meeting link for the static rail (Zoom, Webex,
        anything) — entered here by the operator, never in code */
    staticUrl: string;
  };
  /** TASK-137: the menu Love can shape. Absent = switch-driven default. */
  nav?: NavConfig;
}

export type SiteConfigPatch = {
  features?: Partial<SiteConfig["features"]>;
  payments?: Partial<SiteConfig["payments"]>;
  meeting?: Partial<SiteConfig["meeting"]>;
  /** whole-document replace when present (a partial nav patch makes no
      sense — the editor always saves its full row set) */
  nav?: NavConfig;
};

/** The site's real routes a nav item may point to (TASK-137) — kept in sync
    by hand with PAGE_CATALOG in NavMenu.tsx, which carries the plain names
    and feature-gating; this list is only the storage-layer allow-list so a
    hand-edited doc can never grow a door (or an external link) the house
    didn't build. */
export const KNOWN_NAV_HREFS: readonly string[] = [
  "/about", "/memberships", "/packages", "/store", "/book", "/services",
  "/classes", "/news", "/letters", "/meditation", "/support", "/contact", "/me",
];

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
      vdoRoomPrefix: SPACE_NAME,
      staticUrl: "",
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
  const rail = (RAILS as readonly string[]).includes(m.rail as string)
    ? (m.rail as SiteConfig["meeting"]["rail"])
    : d.meeting.rail;
  return {
    features: bools(o.features, d.features),
    payments: bools(o.payments, d.payments),
    meeting: {
      rail,
      jitsiDomain:
        typeof m.jitsiDomain === "string" && m.jitsiDomain.trim()
          ? m.jitsiDomain.trim()
          : d.meeting.jitsiDomain,
      // the static rail IMPLIES the "any link" door is allowed — choosing it
      // in /a/site is the operator's own consent, no separate toggle needed
      allowStaticLinks:
        rail === "static"
          ? true
          : typeof m.allowStaticLinks === "boolean"
            ? m.allowStaticLinks
            : d.meeting.allowStaticLinks,
      vdoRoomPrefix:
        typeof m.vdoRoomPrefix === "string" && m.vdoRoomPrefix.trim()
          ? m.vdoRoomPrefix.trim().slice(0, 40)
          : d.meeting.vdoRoomPrefix,
      staticUrl: typeof m.staticUrl === "string" ? m.staticUrl.trim().slice(0, 300) : d.meeting.staticUrl,
    },
    nav: sanitizeNav(o.nav),
  };
}

/** One child row: a leaf that must point at a real, known route — an
    unknown href (hand-edited doc, or a route this house never built) is
    simply dropped, never fabricated into a dead link. */
function sanitizeNavChild(raw: unknown): NavChild | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const href = typeof o.href === "string" ? o.href : "";
  if (!KNOWN_NAV_HREFS.includes(href)) return null;
  const label = typeof o.label === "string" && o.label.trim() ? o.label.trim().slice(0, 60) : href;
  const id = typeof o.id === "string" && o.id.trim() ? o.id.trim().slice(0, 60) : href;
  return { id, label, href };
}

/** One top-level row: a leaf (href) or a header (children), one level of
    nesting only. A row that ends up with neither a valid href nor any
    surviving children is a dead header and is dropped. */
function sanitizeNavItem(raw: unknown): NavItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const childrenRaw = Array.isArray(o.children) ? o.children : [];
  const children = childrenRaw
    .map(sanitizeNavChild)
    .filter((c): c is NavChild => c !== null)
    .slice(0, 12);
  const hrefRaw = typeof o.href === "string" ? o.href : undefined;
  const href = hrefRaw && KNOWN_NAV_HREFS.includes(hrefRaw) ? hrefRaw : undefined;
  if (!href && children.length === 0) return null;
  const fallbackLabel = href ?? children[0]?.label ?? "Untitled";
  const label = typeof o.label === "string" && o.label.trim() ? o.label.trim().slice(0, 60) : fallbackLabel;
  const fallbackId = href ?? `header-${children[0]?.id ?? "x"}`;
  const id = typeof o.id === "string" && o.id.trim() ? o.id.trim().slice(0, 60) : fallbackId;
  return { id, label, ...(href ? { href } : {}), ...(children.length ? { children } : {}) };
}

/** The whole nav doc → known-good rows, or `undefined` when there's nothing
    left standing — an empty or garbage doc can never blank the menu, it
    just falls back to the switch-driven default (buildMenu's own job). */
function sanitizeNav(raw: unknown): NavConfig | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const itemsRaw = Array.isArray(o.items) ? o.items : [];
  const items = itemsRaw
    .map(sanitizeNavItem)
    .filter((i): i is NavItem => i !== null)
    .slice(0, 20);
  if (items.length === 0) return undefined;
  return { items };
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
 * Under the fs driver (dev) every call re-reads the file, so a flipped
 * switch is honored the very next render no matter which module graph asks
 * (dev runs route handlers and page renders in separate graphs — a warm
 * cache in one never lies to the other). Under KV/blob a synchronous read
 * is impossible: saveSiteConfig()/getSiteConfig() warm the cache, and a
 * cold instance serves the DEFAULTS until its first real read — the honest
 * edge, documented, never a guessed-ON presented as truth.
 */
export function siteSwitchesSync(): SiteConfig {
  if (!kvEnv() && !blobStoreEnabled()) {
    try {
      cache = sanitize(JSON.parse(readFileSync(filePath(), "utf8")));
      return cache;
    } catch {
      /* no dev file yet — defaults */
    }
    return defaultSiteConfig();
  }
  return cache ?? defaultSiteConfig();
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
    // nav is a whole row-set, never merged field-by-field: the editor always
    // saves its complete list, and omitting `nav` from the patch (every
    // OTHER save on this route — features, payments, meeting) must leave
    // Love's saved menu untouched rather than wiping it.
    nav: patch.nav !== undefined ? patch.nav : current.nav,
  });
  await writeStored(next);
  cache = next;
  return next;
}
