import { NextResponse, type NextRequest } from "next/server";
import { roomsDoorRedirect } from "@/lib/rooms-door";

const FREN_COOKIE = "pa-fren"; // src/lib/fren-auth.ts — edge code cannot import that module's node-only helpers

/** The rooms' front door (see src/lib/rooms-door.ts). Everything else passes untouched. */
export function middleware(request: NextRequest) {
  const to = roomsDoorRedirect(request.nextUrl.pathname, request.cookies.has(FREN_COOKIE));
  if (!to) return NextResponse.next();
  return NextResponse.redirect(new URL(to, request.url));
}

export const config = { matcher: ["/rooms/:path*", "/live", "/live/:path*"] };
