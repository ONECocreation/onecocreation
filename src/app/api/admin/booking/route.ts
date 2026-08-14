import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import {
  readConfig,
  writeConfig,
  validateService,
  validateRule,
  validateOverride,
  validateRetreat,
  slugify,
  DEFAULT_TZ,
  type Service,
  type AvailabilityRule,
  type DateOverride,
  type Retreat,
} from "@/lib/booking";
import { removeRetreatItems, syncRetreatItems, syncRetreatOverrides } from "@/lib/retreats";

export const dynamic = "force-dynamic";

/**
 * The artist's calendar shop — services + weekly rules + date overrides
 * (spec: docs/booking-flow.md, step 1).
 *
 * Stakes model (storefront-framework.md, /a/store stakes): describing WHEN
 * you work and WHAT you offer is cosmetic-tier — session-only. The
 * per-action nostr signature belongs on money rails and refunds, which live
 * in step 3, not here.
 */

/** The client screens are a courtesy; this check is the gate. */
function gate(request: Request): NextResponse | null {
  const operator = operatorFromCookieHeader(request.headers.get("cookie"));
  if (!operator) return NextResponse.json({ ok: false, reason: "operator session required" }, { status: 401 });
  return null;
}

/**
 * Every mutation is Origin-checked: the cookie alone is CSRF bait
 * (storefront-framework.md, route gate matrix).
 */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser caller; the session gate still stands
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

const id = () => Math.random().toString(36).slice(2, 10);

export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const config = await readConfig();
  return NextResponse.json({ ok: true, ...config, defaultTz: DEFAULT_TZ });
}

export async function PUT(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, reason: "bad origin" }, { status: 403 });

  let body: { kind: "service" | "rule" | "override" | "ical" | "retreat"; value: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad request" }, { status: 400 });
  }

  const config = await readConfig();

  if (body.kind === "service") {
    const s = body.value as Service;
    s.schemaVersion = 1;
    s.id = s.id || slugify(s.title ?? "");
    if (!s.id) return NextResponse.json({ ok: false, reason: "needs a title" }, { status: 400 });
    s.artistTz = s.artistTz || DEFAULT_TZ;
    s.pricingMode = s.pricingMode === "pwyc" ? "pwyc" : "fixed";
    s.price = s.price ?? {};
    s.blurb = (s.blurb ?? "").trim();
    const check = validateService(s);
    if (!check.ok) return NextResponse.json({ ok: false, reason: `needs ${check.reason}` }, { status: 400 });
    const at = config.services.findIndex((x) => x.id === s.id);
    if (at >= 0) config.services[at] = s;
    else config.services.push(s);
  } else if (body.kind === "rule") {
    const r = body.value as AvailabilityRule;
    r.id = r.id || id();
    r.serviceIds = Array.isArray(r.serviceIds) ? r.serviceIds : [];
    const check = validateRule(r);
    if (!check.ok) return NextResponse.json({ ok: false, reason: `needs ${check.reason}` }, { status: 400 });
    const at = config.rules.findIndex((x) => x.id === r.id);
    if (at >= 0) config.rules[at] = r;
    else config.rules.push(r);
  } else if (body.kind === "ical") {
    // the external calendar's secret address — empty string unhooks it
    const url = String((body.value as { url?: string })?.url ?? "").trim();
    if (url && !/^https?:\/\//.test(url)) {
      return NextResponse.json({ ok: false, reason: "an iCal address starting with http(s)://" }, { status: 400 });
    }
    if (url) config.icalUrl = url;
    else delete config.icalUrl;
  } else if (body.kind === "override") {
    const o = body.value as DateOverride;
    o.id = o.id || id();
    const check = validateOverride(o);
    if (!check.ok) return NextResponse.json({ ok: false, reason: `needs ${check.reason}` }, { status: 400 });
    const at = config.overrides.findIndex((x) => x.id === o.id);
    if (at >= 0) config.overrides[at] = o;
    else config.overrides.push(o);
  } else if (body.kind === "retreat") {
    const r = body.value as Retreat;
    r.id = r.id || slugify(r.title ?? "") || id();
    r.title = (r.title ?? "").trim();
    r.location = (r.location ?? "").trim();
    r.blurb = (r.blurb ?? "").trim();
    r.status = r.status === "live" ? "live" : "hidden";
    r.seats = Math.floor(Number(r.seats));
    r.priceSats = Math.floor(Number(r.priceSats));
    r.depositSats = r.depositSats != null && Number(r.depositSats) > 0 ? Math.floor(Number(r.depositSats)) : undefined;
    const check = validateRetreat(r);
    if (!check.ok) return NextResponse.json({ ok: false, reason: `needs ${check.reason}` }, { status: 400 });
    config.retreats = config.retreats ?? [];
    const at = config.retreats.findIndex((x) => x.id === r.id);
    if (at >= 0) r.createdAtMs = config.retreats[at].createdAtMs;
    else r.createdAtMs = Date.now();
    if (at >= 0) config.retreats[at] = r;
    else config.retreats.push(r);
    // its days become blocked overrides; its seats become shelf items
    syncRetreatOverrides(config, r);
    await syncRetreatItems(r);
  } else {
    return NextResponse.json({ ok: false, reason: "unknown kind" }, { status: 400 });
  }

  await writeConfig(config);
  return NextResponse.json({ ok: true, ...config });
}

export async function DELETE(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, reason: "bad origin" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");
  const target = searchParams.get("id");
  if (!target) return NextResponse.json({ ok: false, reason: "id required" }, { status: 400 });

  const config = await readConfig();
  if (kind === "service") {
    config.services = config.services.filter((s) => s.id !== target);
    // A rule that named ONLY this service must go with it. Left behind, its
    // serviceIds would empty out — and an empty list means "all services",
    // so deleting one service would silently open its hours to every other.
    config.rules = config.rules.flatMap((r) => {
      if (!r.serviceIds.includes(target)) return [r];
      const rest = r.serviceIds.filter((sid) => sid !== target);
      return rest.length > 0 ? [{ ...r, serviceIds: rest }] : [];
    });
  } else if (kind === "rule") {
    config.rules = config.rules.filter((r) => r.id !== target);
  } else if (kind === "override") {
    config.overrides = config.overrides.filter((o) => o.id !== target);
  } else if (kind === "retreat") {
    config.retreats = (config.retreats ?? []).filter((r) => r.id !== target);
    config.overrides = config.overrides.filter((o) => !o.id.startsWith(`retreat-${target}-`));
    await removeRetreatItems(target);
  } else {
    return NextResponse.json({ ok: false, reason: "unknown kind" }, { status: 400 });
  }

  await writeConfig(config);
  return NextResponse.json({ ok: true, ...config });
}
