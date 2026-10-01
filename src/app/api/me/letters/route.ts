import { NextResponse } from "next/server";
import { memberFromRequest } from "@/lib/member-auth";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { listMailbox } from "@/lib/mailbox";
import { isLetterKey, getLetterOverride, LETTER_DEFAULTS } from "@/lib/letters";

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
  /* TASK-536: the welcome home letter is the permanent first row for ANY
     signed-in member (email or key). A synthetic row, not a delivery: no
     mailbox write, no invented time. Love's saved subject wins over the
     default. A mailbox "welcome" entry is replaced, so the row never
     doubles. Signed out gets nothing, so the subject stays sealed. */
  const override = fren ? await getLetterOverride("welcome") : null;
  const welcome = fren
    ? [{ key: "welcome", subject: override?.subject || LETTER_DEFAULTS.welcome?.subject || "Welcome home", atMs: 0, readable: true, pinned: true }]
    : [];
  const rows = [...welcome, ...letters.filter((l) => !(fren && l.key === "welcome"))];
  return NextResponse.json(
    { ok: true, signedIn: !!fren, operator, email, letters: rows },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
