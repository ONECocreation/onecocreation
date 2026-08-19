import { NextResponse } from "next/server";
import { getPuckPage, getPopupTriggers } from "@/lib/puck-store";
import { POPUP_PREFIX, popupName, popupNameProblem, mergedPopupTriggers } from "@/lib/puck-popups";
import { SEEDS } from "@/lib/puck-seeds";

/**
 * /api/puck-live (STUDIO P2) — the popup system's PUBLIC read seam. No
 * operator gate, so it is deliberately narrow:
 *
 *   GET (no slug)         → { popups } — the merged trigger registry (just
 *                           timing/page lists; the PopupHost reads it to
 *                           decide IF a popup shows on this route).
 *   GET ?slug=popup:<n>   → { doc } — that popup's LIVE document only,
 *                           falling back to its SEED (popups are brand
 *                           content shipping with the template — unlike /p
 *                           pages, which 404 unpublished).
 *
 * Regular page slugs are refused (their public route is /p/<slug>, which
 * also carries the shell + metadata), and DRAFTS are never served here —
 * unpublished work stays behind /api/puck's operator gate.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = (url.searchParams.get("slug") ?? "").trim();

  if (!slug) {
    return NextResponse.json({
      ok: true,
      popups: mergedPopupTriggers(await getPopupTriggers()),
    });
  }

  const name = popupName(slug);
  if (name === null || popupNameProblem(name) !== null) {
    return NextResponse.json(
      { ok: false, reason: `only ${POPUP_PREFIX}* slugs are served here` },
      { status: 403 },
    );
  }
  const doc = (await getPuckPage(slug)) ?? SEEDS[slug] ?? null;
  if (!doc) return NextResponse.json({ ok: false, reason: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, doc });
}
