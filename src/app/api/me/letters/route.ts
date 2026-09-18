import { NextResponse } from "next/server";
import { memberFromRequest } from "@/lib/member-auth";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { listMailbox } from "@/lib/mailbox";
import { isLetterKey } from "@/lib/letters";

export const dynamic = "force-dynamic";

/**
 * The reader's own mailbox, read PER REQUEST from the cookie — never
 * cached, never rendered ahead (the Admiral saw a signed-out browser
 * wearing adminpacman's letters; the router cache was serving a stale
 * page. This endpoint is the cure: the page asks fresh every time).
 */
export async function GET(request: Request) {
  const fren = memberFromRequest(request);
  const operator = !!operatorFromCookieHeader(request.headers.get("cookie"));
  const email = fren && fren.space === "email" && fren.handle.includes("@") ? fren.handle : null;
  const letters = email
    ? await Promise.all(
        (await listMailbox(email)).map(async (l) => ({ ...l, readable: await isLetterKey(l.key) })),
      )
    : [];
  return NextResponse.json(
    { ok: true, signedIn: !!fren, operator, email, letters },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
