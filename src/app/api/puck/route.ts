import { NextResponse } from "next/server";
import {
  getPuckPage, getPuckDraft, setPuckDraft, publishDraft, listPuckPages,
  renamePuckPage, deletePuckPage, duplicatePuckPage,
  getPageOrder, setPageOrder, puckStoreReady,
  getPopupTriggers, setPopupTrigger, removePopupTrigger,
  type PuckPageData, type PopupTrigger,
} from "@/lib/puck-store";
import { isValidSlug, slugProblem } from "@/lib/puck-slugs";
import {
  popupSlug, popupNameProblem, popupTriggerProblem, mergedPopupTriggers, NEW_POPUP_TRIGGER,
} from "@/lib/puck-popups";
import { SEEDS } from "@/lib/puck-seeds";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { lintForPublish, hasErrors } from "@/lib/lint";

export const dynamic = "force-dynamic";

/* Same gate() as api/copilot — every write re-checks the operator
   cookie server-side, no matter what the client believes. */
function gate(request: Request): NextResponse | null {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return null;
}

/** GET ?slug=home — the studio's load: returns { draft, live } so it can
 *  resume the working copy and tell Love whether it differs from live.
 *  GET (no slug) — returns { pages, order, store } for the page switcher
 *  and the pages panel (store=false in dev: KV unconfigured, panel says so).
 *  Operator-gated: drafts are unpublished, never exposed to the public. */
export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const url = new URL(request.url);
  const slug = (url.searchParams.get("slug") ?? "").trim();
  if (!slug) {
    return NextResponse.json({
      ok: true,
      pages: await listPuckPages(),
      order: await getPageOrder(),
      store: puckStoreReady(),
      /* the popup registry, defaults merged with the operator's overrides —
         the popups panel edits this through the popup-* actions below */
      popups: mergedPopupTriggers(await getPopupTriggers()),
    });
  }
  const [draft, live] = await Promise.all([getPuckDraft(slug), getPuckPage(slug)]);
  return NextResponse.json({ ok: true, draft, live });
}

/* STUDIO P1 — page-management actions for the pages panel. SEED PROTECTION:
   seed slugs (the new-site rebuilds and the *-old archive lane) can't be
   renamed or deleted — they're canon, the panel offers duplicate instead.
   Namespaced slugs (`popup:` lane) fail slugProblem's pattern, so the
   page actions can't touch them; the popup-* actions (STUDIO P2) are the
   popup lane's own door, validating the <name> part with the same rules. */
async function pageAction(body: {
  action: string; slug?: string; from?: string; to?: string; order?: string[];
  name?: string; config?: PopupTrigger;
}): Promise<NextResponse> {
  const fail = (reason: string, status = 400) =>
    NextResponse.json({ ok: false, reason }, { status });
  const taken = async (slug: string) =>
    Boolean(SEEDS[slug]) || (await listPuckPages()).includes(slug);

  if (body.action === "popup-create") {
    const name = (body.name ?? "").trim();
    const problem = popupNameProblem(name);
    if (problem) return fail(problem);
    if (await taken(popupSlug(name))) return fail(`'${name}' already exists`, 409);
    /* an empty draft so the popup exists + a dark-by-default trigger */
    await setPuckDraft(popupSlug(name), { content: [], root: {} });
    await setPopupTrigger(name, NEW_POPUP_TRIGGER);
    return NextResponse.json({ ok: true, name });
  }

  if (body.action === "popup-delete") {
    const name = (body.name ?? "").trim();
    /* seed popups are canon like seed pages (popup:free-guide is one) */
    if (SEEDS[popupSlug(name)]) return fail(`'${name}' is a seed popup — it can't be deleted`, 403);
    const problem = popupNameProblem(name);
    if (problem) return fail(`can't delete '${name}': ${problem}`);
    /* same existence honesty as rename (gate 0018.05.25 a₿): no silent 200s */
    if (!(await listPuckPages()).includes(popupSlug(name))) return fail(`no popup named '${name}'`, 404);
    await deletePuckPage(popupSlug(name));
    await removePopupTrigger(name);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "popup-config") {
    const name = (body.name ?? "").trim();
    const nameProblem = popupNameProblem(name);
    if (nameProblem) return fail(nameProblem);
    const trigProblem = popupTriggerProblem(body.config);
    if (trigProblem) return fail(trigProblem);
    await setPopupTrigger(name, body.config as PopupTrigger);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "create") {
    const slug = (body.slug ?? "").trim();
    const problem = slugProblem(slug);
    if (problem) return fail(problem);
    if (await taken(slug)) return fail(`'${slug}' already exists`, 409);
    await setPuckDraft(slug, { content: [], root: {} });
    return NextResponse.json({ ok: true, slug });
  }

  if (body.action === "reorder") {
    if (!Array.isArray(body.order) || !body.order.every((s) => typeof s === "string" && isValidSlug(s))) {
      return fail("order must be a list of valid slugs");
    }
    await setPageOrder(body.order);
    return NextResponse.json({ ok: true });
  }

  const from = (body.from ?? "").trim();
  const to = (body.to ?? "").trim();

  if (body.action === "delete") {
    if (SEEDS[from]) return fail(`'${from}' is a seed page — it can't be deleted`, 403);
    const problem = slugProblem(from);
    if (problem) return fail(`can't delete '${from}': ${problem}`);
    /* same existence honesty as rename (gate 0018.05.25 a₿): no silent 200s */
    if (!(await listPuckPages()).includes(from)) return fail(`no page named '${from}'`, 404);
    await deletePuckPage(from);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "rename" || body.action === "duplicate") {
    const verb = body.action === "rename" ? "renamed" : "duplicated";
    if (body.action === "rename" && SEEDS[from]) {
      return fail(`'${from}' is a seed page — duplicate it instead of renaming`, 403);
    }
    const fromProblem = slugProblem(from);
    if (fromProblem) return fail(`'${from}' can't be ${verb}: ${fromProblem}`);
    const toProblem = slugProblem(to);
    if (toProblem) return fail(toProblem);
    if (to === from) return fail("that's the same name");
    if (await taken(to)) return fail(`'${to}' already exists`, 409);
    if (body.action === "rename") {
      if (!(await listPuckPages()).includes(from)) return fail(`no page named '${from}'`, 404);
      await renamePuckPage(from, to);
    } else {
      /* duplicate copies LIVE ?? draft ?? seed into the new slug's draft */
      const seed = SEEDS[from];
      if (seed) await setPuckDraft(to, seed);
      else if (!(await duplicatePuckPage(from, to))) {
        return fail(`nothing to copy from '${from}'`, 404);
      }
    }
    return NextResponse.json({ ok: true });
  }

  return fail("unknown action");
}

/**
 * POST — three save shapes plus the page-management actions:
 *   { slug, data }               → save DRAFT (autosave; does not go live)
 *   { slug, data, publish:true } → save DRAFT then publish it to LIVE
 *   { publishAll:true }          → publish every page's draft to live at once
 *   { action: create | rename | delete | duplicate | reorder, ... } → pageAction
 *   { action: popup-create | popup-delete | popup-config, ... }   → pageAction
 */
export async function POST(request: Request) {
  const denied = gate(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as
    | { slug?: string; data?: PuckPageData; publish?: boolean; publishAll?: boolean;
        action?: "create" | "rename" | "delete" | "duplicate" | "reorder"
               | "popup-create" | "popup-delete" | "popup-config";
        from?: string; to?: string; order?: string[];
        name?: string; config?: PopupTrigger }
    | null;

  if (body?.action) return pageAction(body as { action: string; slug?: string; from?: string; to?: string; order?: string[]; name?: string; config?: PopupTrigger });

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
