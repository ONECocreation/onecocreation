import { NextResponse } from "next/server";

/**
 * Matrix client delegation — Element and friends read this to find the
 * homeserver for @…:onecocreation.com accounts. CORS * is part of the spec.
 */
export function GET() {
  return NextResponse.json(
    { "m.homeserver": { "base_url": "https://matrix.onecocreation.com" } },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" } },
  );
}
