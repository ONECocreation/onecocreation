import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { squareAdapter, squareEnv, squareFetch, loadSquareVaultEnv } from "@/lib/payments";
import { siteBase } from "@/lib/subscribers";

export const dynamic = "force-dynamic";

/**
 * SQUARE — THE CARDS CARD'S DESK (TASK-136, rebuilt per the Admiral's walk
 * TASK-167, 0018.06.17 a₿: "it would be nice to see the vercel items
 * underneath the test button, and we could give a check box on all the
 * items in the env settings, and if one fails an indicator that shows the
 * error so we know what to fix"). This route now answers PER-ROW:
 *
 *  GET  — which of the five SQUARE_* names are env-set (never their values)
 *         + the vault's saved/at status per field + the CONNECTION VERDICT
 *         (one cached call to Square's own Locations endpoint — the honest
 *         proof for the access-token / location-ID rows, and the host it
 *         answered from for the environment row) + the two webhook proof
 *         markers the webhook route writes (`square:webhook:last-verified`
 *         / `square:webhook:last-rejected`) for the webhook key/URL rows.
 *         `?refresh=1` bypasses the connection verdict's brief cache.
 *         The old "bitcoin on this Square location" check is GONE (T-167 —
 *         Square offers no bitcoin purchase feature for a merchant's
 *         customers; the site's bitcoin rail is BTCPay, so the check could
 *         never verify anything real).
 *  POST — either a vault field save/clear (`{ field, value }` /
 *         `{ field, clear: true }`) OR `{ action: "test" }`, the "Test the
 *         connection" button: forces a fresh Locations call and reports
 *         "connected as <location name>" or the error text — NEVER the
 *         token, in either direction. The button's verdict IS the
 *         checklist's verdict: it lands in the same cache the GET reads.
 *
 * Every vault write re-warms payments.ts's warm cache (loadSquareVaultEnv())
 * and drops the connection verdict cache (the values it proved may have
 * just changed), so "saved keys go live at once" is true on THIS instance
 * the moment the save lands — no redeploy. Values are write-only: GET never
 * echoes a saved value, only {saved, at}, same law as the Stripe drawer.
 */

const FIELDS = {
  "access-token": {
    kv: "oc:square:access-token",
    env: "SQUARE_ACCESS_TOKEN",
    // Square personal/access tokens (both sandbox and production) start EAAA
    prefixes: ["EAAA"],
    label: "access token",
  },
  "location-id": {
    kv: "oc:square:location-id",
    env: "SQUARE_LOCATION_ID",
    prefixes: ["L"],
    label: "location ID",
  },
  environment: {
    kv: "oc:square:environment",
    env: "SQUARE_ENVIRONMENT",
    // a two-way toggle, not free text — validated by enum, not prefix
    prefixes: [] as string[],
    label: "environment",
  },
  "webhook-signature-key": {
    kv: "oc:square:webhook-signature-key",
    env: "SQUARE_WEBHOOK_SIGNATURE_KEY",
    prefixes: [] as string[],
    label: "webhook signature key",
  },
  "webhook-url": {
    kv: "oc:square:webhook-url",
    env: "SQUARE_WEBHOOK_URL",
    prefixes: [] as string[],
    label: "webhook URL",
  },
} as const;

type FieldName = keyof typeof FIELDS;
const savedAtKey = (kv: string) => `${kv}:saved-at`;

/** the webhook route's proof markers (TASK-167) — read here, written there */
const KV_WEBHOOK_VERIFIED = "square:webhook:last-verified";
const KV_WEBHOOK_REJECTED = "square:webhook:last-rejected";

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = restEnv();
  if (!rest) throw new Error("vault not configured");
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`square drawer: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

function gate(request: Request): NextResponse | null {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, reason: "operator session required" }, { status: 401 });
  }
  return null;
}

/** The default webhook URL this site would ask Square to call — prefilled,
 *  editable; matches the real route (src/app/api/store/webhook/square). */
function defaultWebhookUrl(): string {
  return `${siteBase()}/api/store/webhook/square`;
}

// ---------------------------------------------------------------------------
// The connection verdict — ONE cached Locations call proves three rows at
// once: access token + location ID (the name Square answers with) and the
// environment (which Square host answered). Brief + re-checkable, the same
// convention as the house's other operator-facing live checks.
// ---------------------------------------------------------------------------

export interface ConnectionVerdict {
  ok: boolean;
  at: string; // ISO — the desk shows "checked <date>"
  /** the name Square answered with ("connected as OneCocreation") — ok only */
  locationName?: string;
  /** the Square host that answered — the environment row's proof */
  host?: string;
  /** the error sentence, verbatim, when !ok — shown beside the red mark */
  reason?: string;
}

function squareHost(environment: "sandbox" | "production"): string {
  // mirrors payments.ts's squareBaseUrl() host map — kept in words here so
  // the desk can SAY which host answered without a payments.ts seam
  return environment === "production" ? "connect.squareup.com" : "connect.squareupsandbox.com";
}

let connectionCache: { key: string; atMs: number; verdict: ConnectionVerdict } | null = null;
const CONNECTION_TTL_MS = 5 * 60 * 1000;

async function verifyConnection(force = false): Promise<ConnectionVerdict | null> {
  const env = squareEnv();
  if (!env) return null; // token + location ID not both set — never asked
  const key = `${env.accessToken}|${env.locationId}|${env.environment}`;
  if (!force && connectionCache?.key === key && Date.now() - connectionCache.atMs < CONNECTION_TTL_MS) {
    return connectionCache.verdict;
  }
  let verdict: ConnectionVerdict;
  const at = new Date().toISOString();
  try {
    const res = await squareFetch(`/v2/locations/${env.locationId}`, env);
    if (!res.ok) {
      // Square's own error text, never the token that made the call
      const errBody = (await res.json().catch(() => null)) as { errors?: { detail?: string }[] } | null;
      verdict = { ok: false, at, host: squareHost(env.environment), reason: errBody?.errors?.[0]?.detail ?? `Square responded ${res.status}` };
    } else {
      const data = (await res.json()) as { location?: { name?: string } };
      verdict = { ok: true, at, locationName: data.location?.name ?? "your Square location", host: squareHost(env.environment) };
    }
  } catch (err) {
    verdict = { ok: false, at, host: squareHost(env.environment), reason: `Square unreachable — ${err instanceof Error ? err.message : "network error"}` };
  }
  connectionCache = { key, atMs: Date.now(), verdict };
  return verdict;
}

/** a saved/cleared value may be exactly what the verdict proved — drop it */
function invalidateConnection(): void {
  connectionCache = null;
}

async function readMarker(key: string): Promise<Record<string, string> | null> {
  const raw = (await kv(["GET", key])) as string | null;
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    return v && typeof v === "object" ? (v as Record<string, string>) : null;
  } catch {
    return null; // a marker that won't parse reads as absent, never as proof
  }
}

export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;

  // always re-warm from the vault first — the desk's own view of "is this
  // configured" must be the freshest one in the house
  await loadSquareVaultEnv();

  const envSet: Record<string, boolean> = {};
  for (const [name, f] of Object.entries(FIELDS)) {
    envSet[name] = Boolean(process.env[f.env]?.trim());
  }

  const vault: Record<string, { saved: boolean; at: string | null }> = {};
  let webhookVerified: Record<string, string> | null = null;
  let webhookRejected: Record<string, string> | null = null;
  try {
    for (const [name, f] of Object.entries(FIELDS)) {
      const present = ((await kv(["EXISTS", f.kv])) as number) === 1;
      const at = present ? ((await kv(["GET", savedAtKey(f.kv)])) as string | null) : null;
      vault[name] = { saved: present, at };
    }
    webhookVerified = await readMarker(KV_WEBHOOK_VERIFIED);
    webhookRejected = await readMarker(KV_WEBHOOK_REJECTED);
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: `vault unreachable: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 503 },
    );
  }

  const configured = squareAdapter.configured();
  // the desk's own words, per the two load-bearing fields — env wins,
  // else the vault, else honestly unset
  const source: "env" | "vault" | "unset" =
    envSet["access-token"] && envSet["location-id"]
      ? "env"
      : vault["access-token"]?.saved && vault["location-id"]?.saved
        ? "vault"
        : "unset";

  const force = new URL(request.url).searchParams.get("refresh") === "1";
  const connection = await verifyConnection(force);

  return NextResponse.json({
    ok: true,
    configured,
    source,
    envSet,
    vault,
    defaultWebhookUrl: defaultWebhookUrl(),
    connection,
    webhook: { verified: webhookVerified, rejected: webhookRejected },
  });
}

/** Save/clear one vault field, or run the "Test the connection" check. */
export async function POST(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as {
    action?: string;
    field?: string;
    value?: string;
    clear?: boolean;
  } | null;
  if (!body) return NextResponse.json({ ok: false, reason: "bad request" }, { status: 400 });

  if (body.action === "test") {
    if (!squareEnv()) return NextResponse.json({ ok: false, reason: "not configured — paste the keys first" }, { status: 400 });
    // the button forces a fresh verdict AND that verdict is the one the
    // checklist shows on the next GET — one cache, one truth
    const verdict = await verifyConnection(true);
    if (!verdict) return NextResponse.json({ ok: false, reason: "not configured — paste the keys first" }, { status: 400 });
    if (!verdict.ok) return NextResponse.json({ ok: false, reason: verdict.reason ?? "Square unreachable" });
    return NextResponse.json({ ok: true, message: `connected as ${verdict.locationName}` });
  }

  if (!body.field || !(body.field in FIELDS)) {
    return NextResponse.json({ ok: false, reason: "unknown field" }, { status: 400 });
  }
  const f = FIELDS[body.field as FieldName];
  try {
    if (body.clear) {
      await kv(["DEL", f.kv]);
      await kv(["DEL", savedAtKey(f.kv)]);
      await loadSquareVaultEnv();
      invalidateConnection();
      return NextResponse.json({ ok: true, cleared: true });
    }
    const value = (body.value ?? "").trim();
    if (!value) return NextResponse.json({ ok: false, reason: "nothing to save" }, { status: 400 });
    if (body.field === "environment") {
      if (value !== "sandbox" && value !== "production") {
        return NextResponse.json({ ok: false, reason: "environment must be sandbox or production" }, { status: 400 });
      }
    } else if (f.prefixes.length && !f.prefixes.some((p) => value.startsWith(p))) {
      return NextResponse.json(
        { ok: false, reason: `that doesn't look like a ${f.label} — it should start with ${f.prefixes.join(" or ")}` },
        { status: 400 },
      );
    }
    const at = new Date().toISOString();
    await kv(["SET", f.kv, value]);
    await kv(["SET", savedAtKey(f.kv), at]);
    await loadSquareVaultEnv(); // "saved keys go live at once" — no redeploy
    invalidateConnection();
    return NextResponse.json({ ok: true, saved: true, at });
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: `vault unreachable: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 503 },
    );
  }
}
