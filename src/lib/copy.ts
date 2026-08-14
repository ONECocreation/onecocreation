/**
 * Love's Pen — the copy-override store (P1, Admiral-approved 2026-08-10).
 * Same shape as letters.ts's kv() helper (that file's not shared out, so
 * this duplicates it rather than reaching across libs — matches the
 * existing pattern of one bare kv() per lib file).
 *
 * Key namespace: copy:override:<id>, id being an <Editable id="..."> like
 * "about.p1". Plain text only (no HTML) — the API route strips/rejects tags
 * before a value ever reaches here.
 */

/** Per-field clamp — headings and paragraphs both live under one cap for
 *  now (P1); a tighter per-kind cap can split out later if needed. */
export const COPY_MAX_LENGTH = 2000;

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
  if (!res.ok) throw new Error(`copy: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

const key = (id: string) => `copy:override:${id}`;

export async function getCopyOverride(id: string): Promise<string | null> {
  try {
    const raw = (await kv(["GET", key(id)])) as string | null;
    return raw ?? null;
  } catch {
    return null;
  }
}

/** Batch read for a page's whole id list — MGET in one round trip, falling
 *  back to per-key GETs if MGET ever comes back empty-handed (e.g. no vault
 *  configured, kv() returns null for every command anyway). */
export async function getAllCopyOverrides(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const out: Record<string, string> = {};
  try {
    const raw = (await kv(["MGET", ...ids.map(key)])) as (string | null)[] | null;
    if (Array.isArray(raw)) {
      ids.forEach((id, i) => {
        const v = raw[i];
        if (typeof v === "string") out[id] = v;
      });
      return out;
    }
  } catch {
    /* fall through to per-key reads */
  }
  await Promise.all(
    ids.map(async (id) => {
      const v = await getCopyOverride(id);
      if (v != null) out[id] = v;
    })
  );
  return out;
}

export async function setCopyOverride(id: string, text: string): Promise<void> {
  if (text.length > COPY_MAX_LENGTH) {
    throw new Error(`copy: text over ${COPY_MAX_LENGTH} chars`);
  }
  await kv(["SET", key(id), text]);
}

export async function deleteCopyOverride(id: string): Promise<void> {
  await kv(["DEL", key(id)]);
}
