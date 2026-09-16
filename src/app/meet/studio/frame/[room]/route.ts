import { NextResponse } from "next/server";
import { getSiteConfig } from "@/lib/site-config";
import { resolveStudioRoom, mintStudioFrameTarget } from "../../room-access";

export const dynamic = "force-dynamic";

/**
 * THE FRAME ROUTE (TASK-297, 0018.06.25 a₿ · block ~967,218) — the ONLY
 * door through which a keyed studio URL is ever minted on this route
 * tree. The meeting page's iframe src is THIS same-origin route; its 302
 * Location carries the keyed URL (T-292 §4's posture: the key rides only
 * inside the iframe src our server mints — never in the page's HTML,
 * never in the URL we hand out). Same capability as the page itself
 * (room-access.ts's ONE read): an unknown room is a 404, never a minted
 * key for an arbitrary name.
 *
 * Query (all public, all from the pre-join card): `label` (the name the
 * room sees), `camera`/`mic` (`1` = arrive with it on — the card's
 * toggles; default off, Love's both-off ruling).
 */
export async function GET(request: Request, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const access = await resolveStudioRoom(room);
  if (!access) {
    return new NextResponse("no such room", { status: 404 });
  }

  const url = new URL(request.url);
  const label = (url.searchParams.get("label") ?? "").slice(0, 48);
  const camera = url.searchParams.get("camera") === "1";
  const mic = url.searchParams.get("mic") === "1";

  /* the frame's postMessage target must be the ORIGIN THE VISITOR IS
     ACTUALLY ON (x-forwarded first, the request's own URL as the honest
     fallback) — the studio only ever addresses what we mint here (fork
     `main.js:6728-6734`), so a wrong guess would silently drop the
     `hungup` event our end card listens for. */
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const origin = `${proto}://${host}`;

  const config = await getSiteConfig();
  const target = mintStudioFrameTarget({
    vdoHost: config.meeting.vdoHost,
    room,
    label: label.trim() || "Guest",
    camera,
    mic,
    origin,
  });

  return NextResponse.redirect(target, {
    status: 302,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
