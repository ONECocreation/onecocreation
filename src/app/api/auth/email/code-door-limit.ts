/**
 * TASK-185 Phase B · K7 (0018.06.17 a₿) — real or bot: the code door's
 * meter. A real inbox answers ONE code; a script asks for a hundred. The
 * meter counts codes SENT to one email inside one window (the code's own
 * ten-minute life) and holds the door past three — the honest limit, no
 * third-party captcha (the Admiral: keep it simple). The verify side is
 * already metered (src/lib/email-auth.ts burns the window after five wrong
 * tries); this meter guards the SEND, so a bot can't turn Love's mailer
 * against a stranger's inbox.
 *
 * Self-contained on purpose: this lane's sanctioned exception covers
 * src/app/api/auth/email/** ONLY, so the meter speaks the same KV REST
 * protocol as src/lib/email-auth.ts without touching that unowned file.
 */

export const SEND_WINDOW_S = 600; // the code's own ten-minute life
export const MAX_SENDS = 3;

/** allow | hold — the whole decision, pure and pinned by tests. */
export function sendVerdict(sends: number): "allow" | "hold" {
  return sends <= MAX_SENDS ? "allow" : "hold";
}

export const CODE_DOOR_HELD =
  "too many codes asked for — give it a few minutes and try again";

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

/* the same two-command KV REST dialect email-auth.ts speaks (SET/INCR/
   EXPIRE over POST) — duplicated, not shared, per the sanction's border */
async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = restEnv();
  if (!rest) throw new Error("code door meter: vault not configured");
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`code door meter: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

const sendsKey = (email: string) => `auth:email:sends:${email.toLowerCase()}`;

/** Count this send against the window; the caller decides on the count. */
export async function countSend(email: string): Promise<number> {
  const sends = Number((await kv(["INCR", sendsKey(email)])) ?? 1);
  await kv(["EXPIRE", sendsKey(email), String(SEND_WINDOW_S)]);
  return sends;
}
