/**
 * THE STUDIO DOC'S STORE (TASK-191, 0018.06.18 a₿ · block 966119) — the
 * persistence half of the director's inputs (the shape and sanitize live
 * in doc.ts, re-exported below so server consumers keep one import). The
 * overlay route reads this doc and nothing else about the stage — code
 * carries no names, so a fork's roster is entirely theirs.
 *
 * Storage is the house pattern, KV first (the spec's "roster store on
 * KV"): the bare Upstash-REST helper site-config.ts uses, key tenant-
 * namespaced via tenant.ts, and the zero-infrastructure dev file
 * data/studio.json underneath. The public blob is deliberately NOT a
 * driver — a roster is the operator's working notes, not catalogue data,
 * and the vault is already the prod rail. A garbage doc can never 500 the
 * overlay — sanitize hands back the honest empty stage.
 *
 * Server-only. The /a/studio client imports the SHAPE from doc.ts.
 */

import { promises as fs } from "fs";
import path from "path";
import { TENANT } from "../tenant.ts";
import { defaultStudioDoc, sanitizeStudioDoc, type StudioDoc } from "./doc";

export * from "./doc";

/* ── the drivers: KV (prod) → dev file ─────────────────────────────────── */

const KV_KEY = `studio:doc:${TENANT}`;
const filePath = () => path.join(process.cwd(), "data", "studio.json");

function kvEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = kvEnv();
  if (!rest) return null;
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`studio doc: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

/** The live doc: stored doc sanitized over the empty-stage defaults. */
export async function getStudioDoc(): Promise<StudioDoc> {
  if (kvEnv()) {
    try {
      const raw = (await kv(["GET", KV_KEY])) as string | null;
      if (raw) return sanitizeStudioDoc(JSON.parse(raw));
    } catch {
      /* fall through to the dev file */
    }
  }
  try {
    return sanitizeStudioDoc(JSON.parse(await fs.readFile(filePath(), "utf8")));
  } catch {
    return defaultStudioDoc();
  }
}

/** Whole-doc save (the desk always edits the whole stage at once). Throws
 *  on a failed write — the caller (the server action) turns that into an
 *  honest refusal; nothing pretends a save happened. */
export async function saveStudioDoc(raw: unknown): Promise<StudioDoc> {
  const doc = sanitizeStudioDoc(raw);
  const body = JSON.stringify(doc, null, 2);
  if (kvEnv()) {
    await kv(["SET", KV_KEY, body]);
    return doc;
  }
  await fs.mkdir(path.dirname(filePath()), { recursive: true });
  const tmp = filePath() + ".tmp";
  await fs.writeFile(tmp, body, "utf8");
  await fs.rename(tmp, filePath());
  return doc;
}
