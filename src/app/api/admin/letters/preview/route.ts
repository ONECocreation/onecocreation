import { NextResponse } from "next/server";
import { letterHtml } from "@/lib/letters";
import { operatorFromCookieHeader } from "@/lib/operator-auth";

/**
 * TASK-214 — THE PREVIEW'S SERVER RENDER. "No preview found" on the call;
 * this is the NEW side panel's data source. mail.ts imports nodemailer, so
 * the render can't happen in the client bundle — this route calls the exact
 * same letterHtml() the send route fires (send/route.ts's htmlFor), so the
 * panel shows the email AS IT WILL RENDER, never a client-side guess that
 * could drift from the real send. Unsaved, still-being-typed text only —
 * nothing here reads or writes the vault.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const input = (await request.json().catch(() => null)) as { body?: string } | null;
  if (typeof input?.body !== "string") {
    return NextResponse.json({ ok: false, reason: "body required" }, { status: 400 });
  }
  // a placeholder unsubscribe link — a real one is minted per-recipient at
  // send time (subscribers.ts's unsubscribeUrl); the preview just needs the
  // shell's unsubscribe row to render so the layout reads true
  const html = letterHtml(input.body, { unsubscribeUrl: "#preview-unsubscribe" });
  return NextResponse.json({ ok: true, html });
}
