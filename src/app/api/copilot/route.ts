import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { getPuckPage, type PuckPageData } from "@/lib/puck-store";
import { generatePage, copilotConfigured, CopilotUnconfigured, CopilotRefused } from "@/lib/copilot";
import { lintForPublish, hasErrors } from "@/lib/lint";

export const dynamic = "force-dynamic";

/* Same gate() as api/puck: the copilot spends model tokens and
   can rewrite a page, so it is operator-only, re-checked server-side no
   matter what the client believes. */
function gate(request: Request): NextResponse | null {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, reason: "operators only" }, { status: 401 });
  }
  return null;
}

/** GET — a cheap readiness check so the studio's copilot panel can tell Love
 *  up front whether the AI key is set, instead of failing on first send. */
export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  return NextResponse.json({ ok: true, ready: copilotConfigured() });
}

/**
 * POST { slug, message } — Love's request against the current page.
 * Returns { ok, data } with the new Puck Data blob for the editor to drop
 * onto the canvas. Does NOT auto-save: Love reviews it live, then publishes
 * from the editor (the same /api/puck write path). This keeps the copilot a
 * proposer, not an unattended editor of the live site.
 */
export async function POST(request: Request) {
  const denied = gate(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as
    | { slug?: string; message?: string; content?: unknown[] }
    | null;
  const slug = body?.slug?.trim();
  const message = body?.message?.trim();
  if (!slug) return NextResponse.json({ ok: false, reason: "slug required" }, { status: 400 });
  if (!message) return NextResponse.json({ ok: false, reason: "tell me what you'd like on the page" }, { status: 400 });

  try {
    /* Prefer the live canvas Love is looking at (sent by the panel) so an
       edit-in-place request works on her unsaved work; fall back to the last
       saved page when the client doesn't send content. */
    const current: PuckPageData | null = Array.isArray(body?.content)
      ? { content: body!.content, root: {} }
      : await getPuckPage(slug);
    let data = await generatePage(message, current);
    /* THE RAILS GATE for AI output (Phase 1 step 4): the model's page runs
       the same lint as the Publish button. On errors, ONE retry with the
       findings fed back; still failing -> a clear refusal, never a broken
       canvas. The model cannot bypass what the editor enforces. */
    let findings = await lintForPublish(slug, data);
    if (hasErrors(findings)) {
      const feedback =
        message +
        "\n\n(Your previous attempt broke these house rules — fix them:\n" +
        findings
          .filter((f) => f.severity === "error")
          .map((f) => `- ${f.rule}: ${f.message}`)
          .join("\n") +
        ")";
      data = await generatePage(feedback, current);
      findings = await lintForPublish(slug, data);
      if (hasErrors(findings)) {
        return NextResponse.json(
          {
            ok: false,
            reason:
              "The generated page kept breaking the house rules (" +
              findings
                .filter((f) => f.severity === "error")
                .map((f) => f.rule)
                .join(", ") +
              "). Try a simpler or more specific request.",
          },
          { status: 422 },
        );
      }
    }
    return NextResponse.json({ ok: true, data, findings });
  } catch (err) {
    if (err instanceof CopilotUnconfigured) {
      return NextResponse.json(
        { ok: false, reason: "The AI key on the server is missing or invalid — ask the Admiral to re-add ANTHROPIC_API_KEY (the full ~108-character key)." },
        { status: 503 },
      );
    }
    if (err instanceof CopilotRefused) {
      return NextResponse.json({ ok: false, reason: err.message }, { status: 422 });
    }
    // Operator-only endpoint: surface the REAL error so we can diagnose the
    // "went sideways" case instead of guessing (temporary diagnostic).
    const e = err as { status?: number; message?: string; error?: { error?: { type?: string; message?: string } } };
    const detail = e?.status
      ? `${e.status} ${e.error?.error?.type ?? ""} ${e.error?.error?.message ?? e.message ?? ""}`.trim()
      : (e?.message ?? "unknown error");
    console.error("copilot generatePage error:", err);
    return NextResponse.json({ ok: false, reason: `Generation error: ${detail}`.slice(0, 400) }, { status: 500 });
  }
}
