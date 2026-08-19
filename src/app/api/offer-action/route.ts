import { NextResponse } from "next/server";
import {
  verifyOfferToken,
  offerDecision,
  decideOfferWithLetters,
} from "@/lib/pwyc-letters";

export const dynamic = "force-dynamic";

/**
 * THE ONE-TAP DOORS (Love's ask, 0018.05.23): the offer letter in her inbox
 * carries two links here — accept / decline — each an HMAC-signed one-time
 * token (SEAT_SECRET, 7 days). One GET = the same decidePwyc machinery the
 * /a desk uses: buyer letter enqueued, refund minted on a paid decline,
 * single-use marker dropped. A second click meets "already decided" — the
 * link is idempotent, never a double-fire.
 *
 * GET renders a tiny branded page, not JSON — this URL is clicked from a
 * mail client, and the answer should feel like the house.
 */

function page(opts: { emoji: string; title: string; message: string; sub?: string }): NextResponse {
  /* S2: the wordmark + "the desk" gold stay literal — decorative gold awaits
     the taste-maker's ruling (gold law). */
  /* S2: everything stays literal — this page loads no stylesheet, so var()
     never resolves (integrator ruling 0018.05.25 a₿). */
  const html = `<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex"/>
<title>${opts.title} — One Cocreation</title></head>
<body style="margin:0;padding:0;background:#faf7f2;">
<div style="max-width:480px;margin:0 auto;padding:56px 24px;font-family:Arial,Helvetica,sans-serif;color:#2b2733;text-align:center;">
  <div style="padding-bottom:20px;border-bottom:1px solid #e8e2d8;">
    <img src="/brand/onecocreation-mark.svg" width="44" height="44" alt="" style="vertical-align:middle;margin-right:10px"/><span style="font-size:20px;letter-spacing:.12em;vertical-align:middle;">ONE <span style="color:#b4862b;">Cocreation</span></span>
  </div>
  <div style="font-size:44px;margin:34px 0 10px;">${opts.emoji}</div>
  <h1 style="font-weight:400;font-size:24px;margin:0 0 14px;">${opts.title}</h1>
  <p style="font-size:15px;line-height:1.7;margin:0 0 8px;color:#4a4458;">${opts.message}</p>
  ${opts.sub ? `<p style="font-size:13px;line-height:1.6;margin:0;color:#8a8494;">${opts.sub}</p>` : ""}
  <p style="margin-top:36px;padding-top:16px;border-top:1px solid #e8e2d8;font-size:12px;color:#8a8494;">
    One Cocreation · <a href="/a" style="color:#b4862b;">the desk</a> holds every offer's record
  </p>
</div></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const parsed = verifyOfferToken(token);
  if (!parsed) {
    return page({
      emoji: "🕰️",
      title: "This door has faded",
      message: "The link is past its seven days, or isn't one of ours.",
      sub: "The offer still waits on the desk at /a — the same two buttons live there.",
    });
  }

  // idempotent: the marker (or an already-cleared flag) means "already decided"
  const prior = await offerDecision(parsed.orderId);
  if (prior) {
    const was = prior.decision === "accept" ? "accepted with love 💛" : "declined, with care 🕊️";
    return page({
      emoji: "✅",
      title: "Already decided",
      message: `This offer was ${was} on ${new Date(prior.atMs).toLocaleDateString()} — the letter has already gone out.`,
      sub: "Nothing fired twice; the first decision stands.",
    });
  }

  const decided = await decideOfferWithLetters(parsed.orderId, parsed.action, "email");
  if (!decided) {
    return page({
      emoji: "✅",
      title: "Already decided",
      message: "No offer is waiting on that order — it was decided from the desk, or has moved on.",
      sub: "Nothing fired twice; the first decision stands.",
    });
  }

  if (parsed.action === "accept") {
    return page({
      emoji: "💛",
      title: "Done, with love — the desk agrees",
      message: "The offer is accepted; their letter is on its way, and the Pay-It-Forward jar carries the gap.",
    });
  }
  return page({
    emoji: "🕊️",
    title: "Done, with care",
    message: decided.refundLink
      ? "The offer is declined; their letter carries a claim-your-sats-back link, minted just now."
      : "The offer is declined; their letter kindly asks for a lightning address so the sats can come home.",
  });
}
