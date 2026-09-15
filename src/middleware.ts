import { NextResponse, type NextRequest } from "next/server";
import { roomsDoorRedirect } from "@/lib/rooms-door";
import { hasValidSessionEdge } from "@/lib/member-auth-edge";

/**
 * The rooms' front door (see src/lib/rooms-door.ts). Everything else passes
 * untouched.
 *
 * TASK-259 (0018.06.24 a₿, the Admiral's walk: "after I choose my name it
 * goes to a Continue screen that took me nowhere; when I refreshed it
 * asked me to sign in again"): the cookie's VALIDITY gates the door now,
 * not just its presence — the cookie is still named "pa-fren"
 * (member-auth.ts's `MEMBER_COOKIE`, the one definition; member-auth-edge.
 * ts's own copy is pinned equal to it). A plain `.has()` check let a stale/
 * tampered/foreign-secret cookie sail straight past here into the room
 * page's own "please sign in" card — from the soul's chair that reads as
 * "Continue took me nowhere". Edge-safe verify: `@/lib/member-auth-edge`
 * (Web Crypto only, no node:crypto, no node:fs — see its own docblock for
 * why it isn't just an addition to member-auth.ts). TASK-279 (0018.06.25
 * a₿): migrated off the fren-auth-edge.ts compat shim — this is the only
 * caller, no reason to leave it on the compat path.
 */
export async function middleware(request: NextRequest) {
  const hasSession = await hasValidSessionEdge(request.headers.get("cookie"));
  const to = roomsDoorRedirect(request.nextUrl.pathname, hasSession);
  if (!to) return NextResponse.next();
  return NextResponse.redirect(new URL(to, request.url));
}

export const config = { matcher: ["/rooms/:path*", "/live", "/live/:path*"] };
