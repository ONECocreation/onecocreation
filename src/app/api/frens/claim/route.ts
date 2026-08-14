import { verifyEvent } from "nostr-tools";
import { nip19 } from "nostr-tools";
import { claimHandle } from "@/lib/registry";
import { spaceForHost } from "@/lib/identity-config";
import { effectiveMempoolNode, MEMPOOL_URL_DEFAULT } from "@/lib/nodeconfig";
import { makeFrenToken, FREN_COOKIE } from "@/lib/fren-auth";

/* Bitcoin time for the entry — "player since block N". Best-effort with a
   short leash: a slow or down explorer must never block a claim. Server-side,
   so it reads the admiral's configured mempool node directly (sovereignty fix,
   2026-07-11) rather than a hardcoded third party — the public mempool.space is
   only the fallback when the configured node is dark. */
async function tipFrom(base: string): Promise<number | null> {
  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/api/blocks/tip/height`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const h = parseInt((await res.text()).trim(), 10);
    return Number.isFinite(h) && h > 0 ? h : null;
  } catch {
    return null;
  }
}

async function currentTipHeight(): Promise<number | null> {
  const { url } = await effectiveMempoolNode();
  const h = await tipFrom(url);
  if (h != null) return h;
  // configured node dark → fall back to the public default, then give up (the
  // requestedAt date is the ultimate fallback — never block a claim on this)
  return url !== MEMPOOL_URL_DEFAULT ? tipFrom(MEMPOOL_URL_DEFAULT) : null;
}

export async function POST(request: Request) {
  let body: {
    handle?: string;
    npub?: string;
    space?: string;
    /** a signed PACS-LOGIN event — claim + sign-in as ONE atomic step
     *  (the welcome flow). Skips the reverse lookup entirely, so the
     *  blob CDN's lag can never strand a fresh claim at the door. */
    event?: { content?: string; pubkey?: string; sig?: string; created_at?: number; kind?: number; tags?: unknown; id?: string };
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, reason: "invalid request" }, { status: 400 });
  }

  if (typeof body.handle !== "string" || typeof body.npub !== "string") {
    return Response.json({ ok: false, reason: "handle and npub required" }, { status: 400 });
  }

  // The registration page says which space it issues from; host is the fallback
  const space =
    typeof body.space === "string" ? body.space : spaceForHost(request.headers.get("host")).space;
  const result = await claimHandle(body.handle, body.npub, space, await currentTipHeight());
  if (!result.ok) {
    return Response.json(result, { status: 409 });
  }

  // the atomic door: the event proves the claimer HOLDS the claimed key —
  // fresh challenge, valid signature, pubkey == npub — so the session is
  // minted right here, no lookup, no lag window
  if (body.event?.content && body.event.pubkey && body.event.sig) {
    const m = body.event.content.match(/^PACS-LOGIN-(\d+)$/);
    const fresh = m && Math.abs(Date.now() - Number(m[1])) < 5 * 60 * 1000;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const signed = fresh && verifyEvent(body.event as any);
    const sameKey = signed && nip19.npubEncode(body.event.pubkey!) === body.npub;
    if (sameKey) {
      const handle = body.handle.trim().toLowerCase();
      const token = makeFrenToken(handle, space);
      return Response.json(
        { ...result, session: { handle, space, npub: body.npub } },
        {
          headers: {
            "Set-Cookie": `${FREN_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`,
          },
        },
      );
    }
  }

  return Response.json(result);
}
