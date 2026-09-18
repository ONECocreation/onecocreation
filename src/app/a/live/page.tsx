import type { Metadata } from "next";
import { redirect } from "next/navigation";

/**
 * /a/live — THE GO-LIVE DOOR (TASK-192, 0018.06.18 a₿ · H69 ruled A) — now
 * a REDIRECT (TASK-330, 0018.06.27 a₿, RULED Studio 0018.06.26 · 11:20
 * a₿): Live and Studio merge into ONE room, "Studio" — being in the
 * studio opens the go-live controls too (src/app/a/studio/page.tsx +
 * src/components/console/StudioHub.tsx). This file and go-live-room.tsx
 * both stay on disk (never-delete law); go-live-room.tsx is imported
 * unchanged from the merged Studio page instead of from here.
 *
 * decision 4: the redirect fires UNCONDITIONALLY, no operator gate in
 * this file at all — the merged room's own gate (/a/studio/page.tsx:
 * operatorFromCookieHeader + <OperatorGate>) covers it either way, so
 * gating twice would only be decorative. tests/go-live-door.test.ts
 * pins this (the "gates like every /a room" pin retired, honestly, for
 * "redirects to the merged room, which gates").
 *
 * decision 4 (query + anchors): every query key/value a bookmark or link
 * carried on /a/live rides along — searchParams IS visible server-side,
 * so it's threaded through studioRedirectPath (pure, exported so the
 * test pins the real resulting URL rather than a hand-typed string). A
 * URL FRAGMENT never reaches the server at all (RFC 7231 §7.1.2 — the
 * browser keeps it client-side only), so it can't be read or remapped
 * here; this lane inventoried /a/live for known section anchors before
 * writing this file — grepped the whole tree for `/a/live#` and for
 * `id=` attributes inside go-live-room.tsx — and found NONE: nothing
 * links into this room with a fragment today, and the room itself names
 * no id targets. So there is nothing to map, and the honest fallback
 * ("unknown anchors fall back to the room top") is exactly what happens
 * on its own: since studioRedirectPath's Location carries no fragment of
 * its own, a UA that DID carry one over from a bookmark keeps it
 * (standard redirect fragment carry-over) and lands wherever that id
 * exists on /a/studio, or the room's top if it doesn't — never a broken
 * link. See SUMMARY's anchors inventory.
 */

export const metadata: Metadata = {
  title: "Studio — admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Pure — builds the redirect target, every query key/value preserved,
 *  in the URL's own repeat-key order (URLSearchParams.append, never a
 *  Map that would collapse a repeated key). Exported so the tests pin the
 *  real resulting path (computed the same real way as the page), not a
 *  hand-typed string. */
export function studioRedirectPath(searchParams: Record<string, string | string[] | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v);
    } else {
      qs.append(key, value);
    }
  }
  const query = qs.toString();
  return query ? `/a/studio?${query}` : "/a/studio";
}

export default async function GoLivePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  redirect(studioRedirectPath(sp));
}
