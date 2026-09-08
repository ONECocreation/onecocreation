import { NextResponse } from "next/server";
import { frenFromRequest } from "@/lib/fren-auth";

export const dynamic = "force-dynamic";

/**
 * The email-member's little profile (the Admiral's dual-path ruling):
 * key members carry kind-0 profiles; email members get a display name of
 * their choosing, kept in the vault. Email + npub stay the primary keys —
 * this record hangs off the email.
 */
function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = restEnv();
  if (!rest) throw new Error("member profile: vault not configured");
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`member profile: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

const key = (email: string) => `member:profile:${email.toLowerCase()}`;

/** TASK-186 (0018.06.18 a₿) — the additive money word: which denomination
 *  the member reads first ("fiat" | "sats"). Signed in wins over the
 *  browser's `oc-money` cookie (money-preference.ts). Absent = never chose. */
interface ProfileDoc {
  displayName?: string;
  accountName?: string;
  moneyPrefer?: "fiat" | "sats";
}

const normPrefer = (v: unknown): "fiat" | "sats" | undefined =>
  v === "fiat" || v === "sats" ? v : undefined;

export async function GET(request: Request) {
  const fren = frenFromRequest(request);
  if (!fren || fren.space !== "email") return NextResponse.json({ ok: false }, { status: 401 });
  const raw = (await kv(["GET", key(fren.handle)])) as string | null;
  const profile: ProfileDoc = raw ? JSON.parse(raw) : {};
  return NextResponse.json({
    ok: true,
    email: fren.handle,
    displayName: profile.displayName ?? "",
    accountName: profile.accountName ?? "",
    moneyPrefer: profile.moneyPrefer ?? null,
  });
}

export async function PUT(request: Request) {
  const fren = frenFromRequest(request);
  if (!fren || fren.space !== "email") return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as {
    displayName?: string;
    accountName?: string;
    moneyPrefer?: unknown;
  };
  const raw = (await kv(["GET", key(fren.handle)])) as string | null;
  const cur: ProfileDoc = raw ? JSON.parse(raw) : {};
  const displayName = (body.displayName ?? cur.displayName ?? "").trim().slice(0, 48);
  // the ACCOUNT NAME (Admiral's welcome answers, 0018.05.15): their chosen
  // @onecocreation community name — held on the profile now, and the very
  // tag their future key claims. Handle-shaped, never someone else's.
  let accountName = cur.accountName ?? "";
  if (body.accountName != null) {
    const want = body.accountName.trim().toLowerCase().slice(0, 24);
    if (want && !/^[a-z0-9][a-z0-9_-]{1,23}$/.test(want)) {
      return NextResponse.json({ ok: false, reason: "letters, numbers, - and _ (2–24)" }, { status: 400 });
    }
    accountName = want;
  }
  // TASK-186 — the money word is additive: a valid choice replaces, anything
  // else leaves the saved word standing (never a silent wipe)
  const moneyPrefer = normPrefer(body.moneyPrefer) ?? cur.moneyPrefer;
  await kv(["SET", key(fren.handle), JSON.stringify({ displayName, accountName, moneyPrefer })]);
  return NextResponse.json({ ok: true, displayName, accountName, moneyPrefer: moneyPrefer ?? null });
}
