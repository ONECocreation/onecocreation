import { promises as fs } from "fs";
import path from "path";
import { vaultCommand, vaultConfigured } from "./entitlement";

/**
 * T-541a: a tiny key-value layer for the subscriptions store: the same
 * vault (KV REST / redis) the entitlements use, with a file fallback under
 * data/subscriptions for dev and tests. Only the handful of commands the
 * store needs: get / set / del / set-if-absent (+ttl) / counter-in-window /
 * set add + members. Values are strings.
 */

const dir = () => path.join(process.cwd(), "data", "subscriptions");
const fname = (k: string) => path.join(dir(), encodeURIComponent(k) + ".json");

/** Production (Vercel / NODE_ENV=production) with no vault: the filesystem is
 *  ephemeral there, so the store REFUSES instead of silently writing to it. */
export function storeUnavailable(): boolean {
  return !vaultConfigured() && (process.env.VERCEL === "1" || process.env.NODE_ENV === "production");
}
function guard(): void {
  if (storeUnavailable()) throw new Error("subscriptions: vault not configured in production");
}

interface FileDoc { v: string | string[]; exp?: number }

async function readFile(k: string): Promise<FileDoc | null> {
  try {
    const doc = JSON.parse(await fs.readFile(fname(k), "utf8")) as FileDoc;
    if (doc.exp != null && Date.now() > doc.exp) return null;
    return doc;
  } catch {
    return null;
  }
}

async function writeFile(k: string, doc: FileDoc): Promise<void> {
  await fs.mkdir(dir(), { recursive: true });
  const tmp = fname(k) + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(doc), "utf8");
  await fs.rename(tmp, fname(k));
}

export async function kvGet(k: string): Promise<string | null> {
  guard();
  if (vaultConfigured()) {
    const res = await vaultCommand(["GET", k]);
    return typeof res?.result === "string" ? res.result : null;
  }
  const d = await readFile(k);
  return typeof d?.v === "string" ? d.v : null;
}

export async function kvSet(k: string, v: string): Promise<void> {
  guard();
  if (vaultConfigured()) {
    await vaultCommand(["SET", k, v]);
    return;
  }
  await writeFile(k, { v });
}

export async function kvDel(k: string): Promise<void> {
  guard();
  if (vaultConfigured()) {
    await vaultCommand(["DEL", k]);
    return;
  }
  await fs.rm(fname(k), { force: true });
}

/** true = we took it (it was absent); false = already there. */
export async function kvSetNx(k: string, v: string, ttlSec: number): Promise<boolean> {
  guard();
  if (vaultConfigured()) {
    const res = await vaultCommand(["SET", k, v, "NX", "EX", ttlSec]);
    return res?.result === "OK";
  }
  if (await readFile(k)) return false;
  await writeFile(k, { v, exp: Date.now() + ttlSec * 1000 });
  return true;
}

/** Count one hit in a fixed window; returns the count so far. */
export async function kvHit(k: string, windowSec: number): Promise<number> {
  guard();
  if (vaultConfigured()) {
    const res = await vaultCommand(["INCR", k]);
    const n = Number(res?.result ?? 0);
    if (n === 1) await vaultCommand(["EXPIRE", k, windowSec]);
    return n;
  }
  const d = await readFile(k);
  const n = (d && typeof d.v === "string" ? Number(d.v) : 0) + 1;
  await writeFile(k, { v: String(n), exp: d?.exp ?? Date.now() + windowSec * 1000 });
  return n;
}

export async function kvSadd(k: string, member: string): Promise<void> {
  guard();
  if (vaultConfigured()) {
    await vaultCommand(["SADD", k, member]);
    return;
  }
  const d = await readFile(k);
  const arr = Array.isArray(d?.v) ? d!.v : [];
  if (!arr.includes(member)) arr.push(member);
  await writeFile(k, { v: arr });
}

export async function kvSmembers(k: string): Promise<string[]> {
  guard();
  if (vaultConfigured()) {
    const res = await vaultCommand(["SMEMBERS", k]);
    return Array.isArray(res?.result) ? (res!.result as string[]) : [];
  }
  const d = await readFile(k);
  return Array.isArray(d?.v) ? d!.v : [];
}
