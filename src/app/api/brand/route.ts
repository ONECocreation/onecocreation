import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { getPalette, setPalette, defaultPalette, isPalette, getPaletteDawn, setPaletteDawn, defaultPaletteDawn, isPaletteDawn } from "@/lib/brand-palette";

export const dynamic = "force-dynamic";

/* Same gate() as api/puck & api/copilot — saving a palette re-skins every
   slot-coloured block on the site, so it is operator-only. */
function gate(request: Request): NextResponse | null {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return null;
}

/** GET — the live palette (operator-gated; the public gets the values via
 *  CSS variables in the layout, never this endpoint). */
export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const [palette, dawn] = await Promise.all([getPalette(), getPaletteDawn()]);
  return NextResponse.json({ ok: true, palette, dawn, default: defaultPalette(), defaultDawn: defaultPaletteDawn() });
}

/** POST { palette } — save (promote-to-token); { reset: true } — back to the
 *  cartridge default. */
export async function POST(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as
    | { palette?: unknown; dawn?: unknown; reset?: boolean }
    | null;
  if (body?.reset) {
    await Promise.all([setPalette(defaultPalette()), setPaletteDawn(defaultPaletteDawn())]);
    return NextResponse.json({ ok: true, palette: defaultPalette(), dawn: defaultPaletteDawn() });
  }
  if (!isPalette(body?.palette)) {
    return NextResponse.json(
      { ok: false, reason: "palette must be {p1..p5} as #rrggbb" },
      { status: 400 },
    );
  }
  if (body?.dawn !== undefined && !isPaletteDawn(body.dawn)) {
    return NextResponse.json(
      { ok: false, reason: "dawn must be a partial {p1..p5} as #rrggbb" },
      { status: 400 },
    );
  }
  await setPalette(body.palette);
  if (body?.dawn !== undefined) await setPaletteDawn(body.dawn);
  return NextResponse.json({ ok: true, palette: body.palette, dawn: body?.dawn });
}
