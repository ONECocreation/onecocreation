import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { listQuestions, markAnswered, replyToQuestion } from "@/lib/qa-questions";

export const dynamic = "force-dynamic";

/**
 * THE QUESTIONS ROOM'S DOOR (TASK-603 phase 2, K182) — /api/admin/qa-questions,
 * mirroring api/admin/qa-door/route.ts's `gate()` shape exactly: the client
 * screen is a courtesy, this check is the gate; every response carries
 * `Cache-Control: no-store`; a write that throws is caught and answered
 * no-store (SEC-4), never a bare 500.
 *
 * GET — the operator list (this month whole + earlier months' open rows
 * carried over). PUT — `{ action: "reply", id, reply }` mails the asker and
 * ticks the row answered in one motion, or `{ action: "mark-answered", id }`
 * ticks without mail when no email was left.
 */

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function gate(request: Request): NextResponse | null {
  const operator = operatorFromCookieHeader(request.headers.get("cookie"));
  if (!operator) return jsonNoStore({ ok: false, reason: "operator session required" }, 401);
  return null;
}

export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  try {
    const { thisMonthKey, rows } = await listQuestions();
    return jsonNoStore({ ok: true, thisMonthKey, rows });
  } catch {
    return jsonNoStore({ ok: false, reason: "the questions store didn't answer - nothing changed" }, 500);
  }
}

export async function PUT(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  let body: { action?: unknown; id?: unknown; reply?: unknown };
  try {
    body = (await request.json()) as { action?: unknown; id?: unknown; reply?: unknown };
  } catch {
    return jsonNoStore({ ok: false, reason: "bad request" }, 400);
  }
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return jsonNoStore({ ok: false, reason: "which question?" }, 400);
  try {
    if (body.action === "mark-answered") {
      const row = await markAnswered(id);
      if (!row) return jsonNoStore({ ok: false, reason: "that question isn't on the list" }, 404);
      return jsonNoStore({ ok: true });
    }
    if (body.action === "reply") {
      const reply = typeof body.reply === "string" ? body.reply.trim().slice(0, 5000) : "";
      if (!reply) return jsonNoStore({ ok: false, reason: "the reply is the one thing needed" }, 400);
      const result = await replyToQuestion(id, reply);
      if (result === null) return jsonNoStore({ ok: false, reason: "that question isn't on the list" }, 404);
      if (result === "no-email") {
        return jsonNoStore({ ok: false, reason: "no email was left - mark it answered instead" }, 409);
      }
      return jsonNoStore({ ok: true });
    }
    return jsonNoStore({ ok: false, reason: "action must be reply or mark-answered" }, 400);
  } catch (err) {
    console.error("qa-questions write failed:", err);
    return jsonNoStore({ ok: false, reason: "the send or the store didn't answer - nothing changed" }, 500);
  }
}
