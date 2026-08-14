import { NextResponse } from "next/server";
import {
  getPuckPage, getPuckDraft, setPuckDraft, publishDraft, listPuckPages,
  type PuckPageData,
} from "@/lib/puck-store";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { lintForPublish, hasErrors } from "@/lib/lint";

export const dynamic = "force-dynamic";

/* Same gate() as api/copy & api/copilot — every write re-checks the operator
   cookie server-side, no matter what the client believes. */
function gate(request: Request): NextResponse | null {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return null;
}

/** GET ?slug=home — the studio's load: returns { draft, live } so it can
 *  resume the working copy and tell Love whether it differs from live.
 *  GET (no slug) — returns { pages } for the page switcher.
 *  Operator-gated: drafts are unpublished, never exposed to the public. */
export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const url = new URL(request.url);
  const slug = (url.searchParams.get("slug") ?? "").trim();
  if (!slug) {
    return NextResponse.json({ ok: true, pages: await listPuckPages() });
  }
  const [draft, live] = await Promise.all([getPuckDraft(slug), getPuckPage(slug)]);
  return NextResponse.json({ ok: true, draft, live });
}

/**
 * POST — three actions:
 *   { slug, data }               → save DRAFT (autosave; does not go live)
 *   { slug, data, publish:true } → save DRAFT then publish it to LIVE
 *   { publishAll:true }          → publish every page's draft to live at once
 */
export async function POST(request: Request) {
  const denied = gate(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as
    | { slug?: string; data?: PuckPageData; publish?: boolean; publishAll?: boolean }
    | null;

  if (body?.publishAll) {
    const slugs = await listPuckPages();
    const published: string[] = [];
    const blocked: { slug: string; errors: number }[] = [];
    for (const slug of slugs) {
      const draft = await getPuckDraft(slug);
      if (!draft) continue;
      const findings = await lintForPublish(slug, draft);
      if (hasErrors(findings)) {
        blocked.push({ slug, errors: findings.filter((f) => f.severity === "error").length });
        continue;
      }
      await publishDraft(slug);
      published.push(slug);
    }
    return NextResponse.json({ ok: true, published, blocked });
  }

  if (!body?.slug?.trim()) {
    return NextResponse.json({ ok: false, reason: "slug required" }, { status: 400 });
  }
  if (!body.data || typeof body.data !== "object" || !Array.isArray(body.data.content)) {
    return NextResponse.json({ ok: false, reason: "data.content required" }, { status: 400 });
  }

  const slug = body.slug.trim();
  await setPuckDraft(slug, body.data);
  if (body.publish) {
    /* THE RAILS GATE (Phase 1 step 4): the server is the authority — lint
       errors block publish no matter what the client believed. The draft is
       already saved above, so nothing is lost; the page just isn't live. */
    const findings = await lintForPublish(slug, body.data);
    if (hasErrors(findings)) {
      return NextResponse.json(
        { ok: false, reason: "rails", findings, saved: "draft" },
        { status: 422 },
      );
    }
    await publishDraft(slug);
    return NextResponse.json({ ok: true, saved: "draft", live: true, findings });
  }
  return NextResponse.json({ ok: true, saved: "draft", live: false });
}
