import { NextResponse } from "next/server";
import { memberFromRequest } from "@/lib/member-auth";
import { isAvailable } from "@/lib/registry";
import { spaceForHost } from "@/lib/identity-config";

export const dynamic = "force-dynamic";

/**
 * The email-member's little profile (the Admiral's dual-path ruling):
 * key members carry kind-0 profiles; email members get a display name of
 * their choosing, kept in the vault. Email + npub stay the primary keys —
 * this record hangs off the email.
 *
 * TASK-358, D5 (the Admiral, block 967,926 — "do the name claim sweep"):
 * `accountName` now carries a real uniqueness claim. Before this, the PUT
 * validated SHAPE only — two email members could hold the identical name,
 * and an email member could hold a name a key member already owns as a
 * handle. A change of name now reserves `accountname:<want>` atomically
 * (`SET … NX` — the house's own idiom, gift-vouchers.ts/mail-booking.ts)
 * before anything is written, and refuses a name a live key handle already
 * owns (the same registry the doors' own availability check reads). The
 * old name's reservation is released only AFTER the new one holds and the
 * profile doc is written — releasing first would let a third party steal
 * the old name mid-swap — and only when the held value still names this
 * same member (a value-guarded GET-then-DEL; no Lua precedent in this repo
 * to build an atomic compare-and-delete on, so none is invented here). A
 * crash between the write and the release leaks a stale reservation on the
 * old name; `scripts/account-name-dupe-sweep.mjs` is the named backstop
 * for exactly that leak, not a guarantee against it.
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

/** The reservation index key for D5's uniqueness claim — a separate
 *  namespace from the profile doc itself, holding the email that reserved
 *  the name (the value the release step guards against). */
const accountNameKey = (name: string) => `accountname:${name}`;

/** The 409 wording (D5) — reused verbatim from this repo's own key-claim
 *  path (registry.ts's `already claimed`, the same word DoorSheet.tsx and
 *  SignInCard.tsx already surface for a taken key handle), so an email
 *  member's name collision reads in the same voice as a key member's. */
const NAME_TAKEN_REASON = "already claimed";

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
  const fren = memberFromRequest(request);
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
  const fren = memberFromRequest(request);
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
  const oldName = cur.accountName ?? "";
  let nameChanged = false;
  if (body.accountName != null) {
    const want = body.accountName.trim().toLowerCase().slice(0, 24);
    if (want && !/^[a-z0-9][a-z0-9_-]{1,23}$/.test(want)) {
      return NextResponse.json({ ok: false, reason: "letters, numbers, - and _ (2–24)" }, { status: 400 });
    }
    if (want !== oldName) {
      nameChanged = true;
      if (want) {
        // D5(a): reserve the NEW name before anything is written. A naive
        // GET-then-SET loses the race (A GET→null, B GET→null, A SET, B
        // SET overwrites — both believe they hold it); SET…NX is the
        // atomic gate.
        const space = spaceForHost(request.headers.get("host")).space;
        const keyHandleFree = await isAvailable(want, space);
        if (!keyHandleFree) {
          return NextResponse.json({ ok: false, reason: NAME_TAKEN_REASON }, { status: 409 });
        }
        const reserved = await kv(["SET", accountNameKey(want), fren.handle, "NX"]);
        if (reserved !== "OK") {
          return NextResponse.json({ ok: false, reason: NAME_TAKEN_REASON }, { status: 409 });
        }
      }
      accountName = want;
    }
  }
  // TASK-186 — the money word is additive: a valid choice replaces, anything
  // else leaves the saved word standing (never a silent wipe)
  const moneyPrefer = normPrefer(body.moneyPrefer) ?? cur.moneyPrefer;
  await kv(["SET", key(fren.handle), JSON.stringify({ displayName, accountName, moneyPrefer })]);

  // Release the OLD reservation only AFTER the new one holds and the doc is
  // written (order (1)(2)(3) — D5(a)). Value-guarded: only delete when the
  // held value still names THIS member, so a stale write can never delete
  // someone else's live reservation.
  if (nameChanged && oldName) {
    const held = (await kv(["GET", accountNameKey(oldName)])) as string | null;
    if (held === fren.handle) {
      await kv(["DEL", accountNameKey(oldName)]);
    }
  }

  return NextResponse.json({ ok: true, displayName, accountName, moneyPrefer: moneyPrefer ?? null });
}
