import { removeSubscriber, verifyUnsubscribeToken } from "@/lib/subscribers";

export const dynamic = "force-dynamic";

/**
 * One click, no login, no guilt trip (email-rail brief: deliverability law,
 * and just polite). The link is signed — the mail itself is the credential.
 * Also answers POST for RFC 8058 One-Click (mail clients' unsubscribe button).
 */
async function unsubscribe(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const email = url.searchParams.get("e") ?? "";
  const token = url.searchParams.get("t") ?? "";

  if (!email || !verifyUnsubscribeToken(email, token)) {
    return new Response("This unsubscribe link is not valid.", { status: 400 });
  }
  await removeSubscriber(email);

  return new Response(
    `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#faf7f2;color:#2b2733;">
     <div style="max-width:480px;margin:15vh auto;text-align:center;padding:0 20px;">
       <h1 style="font-weight:400;">You are unsubscribed.</h1>
       <p>No more letters from us — and only warmth on the way out.
          If you ever want back in, the door at
          <a href="/" style="color:#b4862b;">onecocreation</a> stays open.</p>
     </div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: Request) {
  return unsubscribe(request);
}

export async function POST(request: Request) {
  return unsubscribe(request);
}
