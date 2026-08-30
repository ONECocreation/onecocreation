import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import {
  getSquareCatalogSettings,
  saveSquareCatalogSettings,
  fetchSquareCatalogItems,
} from "@/lib/square-catalog";

export const dynamic = "force-dynamic";

/**
 * The Square-catalog-display control (one-way — see square-catalog.ts's
 * file header). Admin surface only: this route lets the operator enable a
 * read of their Square Catalog and pick which fetched items show, but
 * nothing here writes those items into the storefront's own catalog. GET
 * always reports the LIVE fetch (never trusts a stale settings-only view)
 * so the desk can show items that don't exist in `selectedIds` yet.
 * `?refresh=1` bypasses the brief cache.
 */
function gate(request: Request): NextResponse | null {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, reason: "operator session required" }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const force = new URL(request.url).searchParams.get("refresh") === "1";
  const settings = await getSquareCatalogSettings();
  const fetched = await fetchSquareCatalogItems(force);
  return NextResponse.json({ ok: true, settings, ...fetched });
}

export async function PUT(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { enabled?: boolean; selectedIds?: string[] } | null;
  if (!body) return NextResponse.json({ ok: false, reason: "bad request" }, { status: 400 });
  const settings = await saveSquareCatalogSettings(body);
  return NextResponse.json({ ok: true, settings });
}
