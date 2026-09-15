import { memberFromRequest, MEMBER_COOKIE } from "@/lib/member-auth";
import { releaseHandle } from "@/lib/registry";

/* The right of exit: while the anchor is pending, a signed-in member can free
   their own name — it leaves the registry (and so the NIP-05 mapping) and
   goes back in the pool. Their key and their nostr posts are untouched;
   we never owned those. Etched names are refused: permanent is permanent. */
export async function POST(request: Request) {
  const fren = memberFromRequest(request);
  if (!fren) {
    return Response.json({ ok: false, reason: "sign in first" }, { status: 401 });
  }
  const result = await releaseHandle(fren.handle, fren.space);
  if (!result.ok) {
    return Response.json(result, { status: 409 });
  }
  /* the tag is gone, so the session that named it goes too */
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": `${MEMBER_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      },
    }
  );
}
