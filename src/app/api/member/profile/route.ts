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

export async function GET(request: Request) {
  const fren = frenFromRequest(request);
  if (!fren || fren.space !== "email") return NextResponse.json({ ok: false }, { status: 401 });
  const raw = (await kv(["GET", key(fren.handle)])) as string | null;
  const profile = raw ? (JSON.parse(raw) as { displayName?: string; accountName?: string }) : {};
  return NextResponse.json({
    ok: true,
    email: fren.handle,
    displayName: profile.displayName ?? "",
    accountName: profile.accountName ?? "",
  });
}

export async function PUT(request: Request) {
  const fren = frenFromRequest(request);
  if (!fren || fren.space !== "email") return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { displayName?: string; accountName?: string };
  const raw = (await kv(["GET", key(fren.handle)])) as string | null;
  const cur = raw ? (JSON.parse(raw) as { displayName?: string; accountName?: string }) : {};
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
  await kv(["SET", key(fren.handle), JSON.stringify({ displayName, accountName })]);
  return NextResponse.json({ ok: true, displayName, accountName });
}
