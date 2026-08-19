import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { getPalette, setPalette, defaultPalette, isPalette, getPaletteDawn, setPaletteDawn, defaultPaletteDawn, isPaletteDawn } from "@/lib/brand-palette";
import { cartridge } from "@/brand/cartridge";
import { IDENTITY_FIELDS, identitySnapshot, isIdentityField, isVoiceRow, writeIdentityField, writeVoiceRow } from "@/lib/cartridge-identity";

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
 *  CSS variables in the layout, never this endpoint), plus the cartridge's
 *  identity values for the board's dressing room. `identity` is read from
 *  the cartridge THIS SERVER imported — a file edit lands here only after
 *  a reload or a fresh deploy (identityNote says so). */
export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const [palette, dawn] = await Promise.all([getPalette(), getPaletteDawn()]);
  return NextResponse.json({
    ok: true, palette, dawn, default: defaultPalette(), defaultDawn: defaultPaletteDawn(),
    identity: identitySnapshot(cartridge),
    voices: cartridge.voices.map((v) => ({ quote: v.quote, name: v.name, who: v.who, href: v.href })),
    identityNote: "the dressing read from the running server — a cartridge edit reaches this list after a reload or a fresh deploy",
  });
}

/** POST { palette } — save (promote-to-token); { reset: true } — back to the
 *  cartridge default; { identity: { field, value } } — dress ONE cartridge
 *  identity field; { voice: { op, index, row } } — add, edit or remove ONE
 *  voice of the field (src/lib/cartridge-identity writes the file, one
 *  literal — or one pinned row — at a time, exactly-once or not at all). */
export async function POST(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as
    | { palette?: unknown; dawn?: unknown; reset?: boolean; identity?: unknown; voice?: unknown }
    | null;
  if (body?.voice !== undefined) {
    const v = body.voice as { op?: unknown; index?: unknown; row?: unknown } | null;
    const op = v?.op;
    if (!v || (op !== "add" && op !== "edit" && op !== "remove")) {
      return NextResponse.json(
        { ok: false, reason: `voice must be { op: "add" | "edit" | "remove", index, row: { quote, name, who, href } }` },
        { status: 400 },
      );
    }
    if (op !== "add" && (typeof v.index !== "number" || !Number.isInteger(v.index) || v.index < 0)) {
      return NextResponse.json({ ok: false, reason: "edit and remove name the voice by its index on the shelf" }, { status: 400 });
    }
    if (op !== "remove" && !isVoiceRow(v.row)) {
      return NextResponse.json({ ok: false, reason: "a voice row is { quote, name, who, href } — all four, as strings" }, { status: 400 });
    }
    const result = await writeVoiceRow(op, typeof v.index === "number" ? v.index : -1, isVoiceRow(v.row) ? v.row : undefined);
    return NextResponse.json(result, { status: result.ok ? 200 : result.status });
  }
  if (body?.identity !== undefined) {
    const id = body.identity as { field?: unknown; value?: unknown } | null;
    if (!id || !isIdentityField(id.field) || typeof id.value !== "string") {
      return NextResponse.json(
        { ok: false, reason: `identity must be { field, value } — field one of: ${IDENTITY_FIELDS.join(", ")}` },
        { status: 400 },
      );
    }
    const result = await writeIdentityField(id.field, id.value);
    return NextResponse.json(result, { status: result.ok ? 200 : result.status });
  }
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
