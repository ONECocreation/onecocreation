/**
 * THE MAILBOX (Admiral, 0018.05.15): every letter PUBLISHED to the list is
 * remembered per recipient, so /letters can be each member's own reading
 * room — only the letters they actually received. Recorded at publish
 * time; the drip queue's automated letters (codes, receipts) stay out.
 */

export interface MailboxEntry {
  key: string;
  subject: string;
  atMs: number;
}

const KEY = (email: string) => `mailbox:${email.trim().toLowerCase()}`;

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = restEnv();
  if (!rest) return null;
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`mailbox: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

/** Newest first on read; capped so a mailbox never grows without bound. */
export async function recordDelivery(email: string, entry: MailboxEntry): Promise<void> {
  if (!restEnv() || !email.includes("@")) return;
  await kv(["LPUSH", KEY(email), JSON.stringify(entry)]);
  await kv(["LTRIM", KEY(email), 0, 199]);
}

export async function listMailbox(email: string): Promise<MailboxEntry[]> {
  if (!restEnv()) return [];
  const raw = (await kv(["LRANGE", KEY(email), 0, 99])) as string[] | null;
  if (!Array.isArray(raw)) return [];
  const out: MailboxEntry[] = [];
  for (const r of raw) {
    try {
      const e = JSON.parse(r) as MailboxEntry;
      if (e?.key && e?.subject) out.push(e);
    } catch { /* a malformed row never breaks the room */ }
  }
  return out;
}
