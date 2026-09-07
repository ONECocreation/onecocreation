import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { squareAdapter, squareEnv, squareFetch, squareBitcoinEnabled, loadSquareVaultEnv } from "@/lib/payments";
import { siteBase } from "@/lib/subscribers";

export const dynamic = "force-dynamic";

/**
 * SQUARE — THE ONE CARD'S DESK (TASK-136, 0018.06.17 a₿, folding the dead
 * "soon" chip's replacement together with the paste-keys drawer the
 * Admiral asked for: "the square button says soon... i have square. can we
 * build that one in.") This ONE route now carries everything the Money
 * desk's Square card needs:
 *
 *  GET  — configured() + which of the five SQUARE_* names are env-set
 *         (never their values) + the vault's saved/at status per field +
 *         the bitcoin-enablement check (unchanged from the old status-only
 *         route) — `?refresh=1` bypasses that check's brief cache.
 *  POST — either a vault field save/clear (mirrors StripeRailCard's key
 *         drawer exactly: `{ field, value }` to save, `{ field, clear:
 *         true }` to clear) OR `{ action: "test" }`, the "test the
 *         connection" button: calls Square's own Locations endpoint with
 *         whatever squareEnv() resolves (env-then-vault) and reports
 *         "connected as <location name>" or the error text — NEVER the
 *         token, in either direction.
 *
 * Every vault write re-warms payments.ts's warm cache (loadSquareVaultEnv())
 * before responding, so "saved keys go live at once" is true on THIS
 * instance the moment the save lands — no redeploy, no waiting on a second
 * request to notice. Values are write-only: GET never echoes a saved value,
 * only {saved, at}, same law as the Stripe drawer.
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

export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;

  // always re-warm from the vault first — the desk's own view of "is this
  // configured" must be the freshest one in the house, same spirit as
  // squareBitcoinEnabled's live re-check below
  await loadSquareVaultEnv();

  const envSet: Record<string, boolean> = {};
  for (const [name, f] of Object.entries(FIELDS)) {
    envSet[name] = Boolean(process.env[f.env]?.trim());
  }

  const vault: Record<string, { saved: boolean; at: string | null }> = {};
  try {
    for (const [name, f] of Object.entries(FIELDS)) {
      const present = ((await kv(["EXISTS", f.kv])) as number) === 1;
      const at = present ? ((await kv(["GET", savedAtKey(f.kv)])) as string | null) : null;
      vault[name] = { saved: present, at };
    }
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
  const squareBitcoin = configured ? await squareBitcoinEnabled(force) : null;

  return NextResponse.json({
    ok: true,
    configured,
    source,
    envSet,
    vault,
    defaultWebhookUrl: defaultWebhookUrl(),
    squareBitcoin,
  });
}

/** Save/clear one vault field, or run the "test the connection" check. */
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
    const env = squareEnv();
    if (!env) return NextResponse.json({ ok: false, reason: "not configured — paste the keys first" }, { status: 400 });
    try {
      const res = await squareFetch(`/v2/locations/${env.locationId}`, env);
      if (!res.ok) {
        // Square's own error text, never the token that made the call
        const errBody = (await res.json().catch(() => null)) as { errors?: { detail?: string }[] } | null;
        const detail = errBody?.errors?.[0]?.detail ?? `Square responded ${res.status}`;
        return NextResponse.json({ ok: false, reason: detail });
      }
      const data = (await res.json()) as { location?: { name?: string } };
      const name = data.location?.name ?? "your Square location";
      return NextResponse.json({ ok: true, message: `connected as ${name}` });
    } catch (err) {
      return NextResponse.json({ ok: false, reason: err instanceof Error ? err.message : "Square unreachable" });
    }
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
    return NextResponse.json({ ok: true, saved: true, at });
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: `vault unreachable: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 503 },
    );
  }
}
