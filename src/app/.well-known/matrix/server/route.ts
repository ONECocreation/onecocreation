import { NextResponse } from "next/server";

/**
 * Matrix server delegation (vps-run step 6): onecocreation.com's homeserver
 * lives at matrix.onecocreation.com on our VPS — this file is how other
 * homeservers find it, no DNS SRV needed.
 */
export function GET() {
  return NextResponse.json(
    { "m.server": "matrix.onecocreation.com:443" },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" } },
  );
}
