import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

/**
 * THE CARD RAIL'S KEY DRAWER (Admiral, 0018.05.23): Love pastes her own
 * Stripe keys from her own dashboard — self-service, no hand-holding call.
 * Values land in the vault (oc:stripe:*) and are NEVER echoed back; the desk
 * only ever sees "saved ✓ <date>". The payment adapter that READS these keys
 * ships in the next build — this drawer is storage + instructions only.
 */

const FIELDS = {
  "secret-key": {
    kv: "oc:stripe:secret-key",
    // restricted keys arrive as rk_…; classic secret keys as sk_…
    prefixes: ["rk_", "sk_"],
    label: "restricted API key",
  },
  "webhook-secret": {
    kv: "oc:stripe:webhook-secret",
    prefixes: ["whsec_"],
    label: "webhook signing secret",
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
  if (!res.ok) throw new Error(`stripe drawer: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

function gate(request: Request): NextResponse | null {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, reason: "operator session required" }, { status: 401 });
  }
  return null;
}

/** Status only — the values themselves never ride a response. */
export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const status: Record<string, { saved: boolean; at: string | null }> = {};
  try {
    for (const [name, f] of Object.entries(FIELDS)) {
      const present = ((await kv(["EXISTS", f.kv])) as number) === 1;
      const at = present ? ((await kv(["GET", savedAtKey(f.kv)])) as string | null) : null;
      status[name] = { saved: present, at };
    }
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: `vault unreachable: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, status });
}

/** Save (or clear) one field. Write-only: nothing is echoed back. */
export async function POST(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as {
    field?: string;
    value?: string;
    clear?: boolean;
  } | null;
  if (!body?.field || !(body.field in FIELDS)) {
    return NextResponse.json({ ok: false, reason: "unknown field" }, { status: 400 });
  }
  const f = FIELDS[body.field as FieldName];
  try {
    if (body.clear) {
      await kv(["DEL", f.kv]);
      await kv(["DEL", savedAtKey(f.kv)]);
      return NextResponse.json({ ok: true, cleared: true });
    }
    const value = (body.value ?? "").trim();
    if (!value) return NextResponse.json({ ok: false, reason: "nothing to save" }, { status: 400 });
    if (!f.prefixes.some((p) => value.startsWith(p))) {
      return NextResponse.json(
        { ok: false, reason: `that doesn't look like a ${f.label} — it should start with ${f.prefixes.join(" or ")}` },
        { status: 400 },
      );
    }
    const at = new Date().toISOString();
    await kv(["SET", f.kv, value]);
    await kv(["SET", savedAtKey(f.kv), at]);
    return NextResponse.json({ ok: true, saved: true, at });
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: `vault unreachable: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 503 },
    );
  }
}
