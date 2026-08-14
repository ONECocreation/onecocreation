import { createHmac, randomInt } from "node:crypto";

/**
 * EMAIL SIGN-IN (the Admiral's ask, 0018.05.15): a code to your inbox, no
 * keys needed — the reach door beside the sovereign one. The code lives in
 * the vault for ten minutes; the session that follows is a normal fren
 * session in the special space "email", so every "signed in?" check on the
 * site just works. Bitcoin-native identity stays the first door; this one
 * is for the soul who only has an inbox.
 */

const CODE_TTL_S = 600;
const MAX_TRIES = 5;

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = restEnv();
  if (!rest) throw new Error("email auth: vault not configured");
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`email auth: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

export function emailAuthConfigured(): boolean {
  return restEnv() !== null;
}

const codeKey = (email: string) => `auth:email:code:${email.toLowerCase()}`;
const triesKey = (email: string) => `auth:email:tries:${email.toLowerCase()}`;

/** The code is stored HASHED — a vault peek must not mint sessions. */
function hashCode(email: string, code: string): string {
  return createHmac("sha256", process.env.SEAT_SECRET || "")
    .update(`${email.toLowerCase()}|${code}`)
    .digest("hex");
}

export async function mintCode(email: string): Promise<string> {
  const code = String(randomInt(100000, 1000000));
  await kv(["SET", codeKey(email), hashCode(email, code), "EX", String(CODE_TTL_S)]);
  await kv(["DEL", triesKey(email)]);
  return code;
}

export async function verifyCode(email: string, code: string): Promise<boolean> {
  const tries = Number((await kv(["INCR", triesKey(email)])) ?? 1);
  await kv(["EXPIRE", triesKey(email), String(CODE_TTL_S)]);
  if (tries > MAX_TRIES) return false; // burn the window, not the inbox
  const stored = (await kv(["GET", codeKey(email)])) as string | null;
  if (!stored || stored !== hashCode(email, code)) return false;
  await kv(["DEL", codeKey(email)]);
  await kv(["DEL", triesKey(email)]);
  return true;
}
