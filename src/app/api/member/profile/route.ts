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
 *
 * FOLLOW-UP (Number One's review, same block): D5 as first shipped had a
 * hole — every name saved BEFORE this lane carries no `accountname:<name>`
 * reservation at all (the PUT only reserves on an actual CHANGE). A legacy
 * holder simply re-saving their own unchanged name never reserved it, so
 * ANY other member could `SET … NX` that same name and win — this lane
 * would have CREATED new duplicates instead of preventing them. Fixed with
 * a lazy heal: whenever GET or PUT reads a profile whose `accountName` is
 * already non-empty, it fires `SET accountname:<name> <email> NX` and
 * ignores a non-OK result (NX never overwrites — a legacy twin who beat
 * this member to healing keeps it; this never 409s a member for reading
 * or re-saving their OWN already-saved name). `ConstellationCard.tsx`
 * fetches this GET on every `/me` load, so every visiting member
 * self-heals over time — `scripts/account-name-dupe-sweep.mjs --backfill`
 * (same commit) is the batch path for members who never visit.
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

/** The 409 wording (D5; reworded block 968,624 — Love's iPhone walk, S5:
 *  the vague "already claimed" read as "The name could not be claimed"
 *  with no way to tell a real conflict from her own retry). Plain words,
 *  no em dash, matching registry.ts's own `HANDLE_TAKEN_REASON` so an
 *  email member's name collision reads in the same voice as a key
 *  member's. */
const NAME_TAKEN_REASON = "That name is taken. Try another.";

/** The reservation's pure verdict (block 968,624): given who currently
 *  holds `accountname:<name>` (null = nobody) and who is asking, decide
 *  what happens. THE SAME member re-submitting their OWN already-claimed
 *  name — a double submit: a re-tap before the first request's response
 *  painted (iOS Safari's own lag that block 968,624's walk hit), or a
 *  race against this route's own `healReservation` — is "mine": an
 *  idempotent success, never a refusal. A DIFFERENT holder is "taken". */
export type NameClaimVerdict = "claim" | "mine" | "taken";
export function decideNameClaim(heldBy: string | null, requester: string): NameClaimVerdict {
  if (heldBy == null) return "claim";
  return heldBy === requester ? "mine" : "taken";
}

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

/** The lazy heal (follow-up fix, above): best-effort only — a heal never
 *  blocks or fails the read/write it rides on. `SET … NX` either reserves
 *  the name for THIS member (nobody held it yet) or silently no-ops (it's
 *  already held — by this same member already-healed, or by a legacy twin
 *  who got here first; either way, never a 409, never a throw). */
async function healReservation(name: string, holder: string): Promise<void> {
  if (!name) return;
  try {
    await kv(["SET", accountNameKey(name), holder, "NX"]);
  } catch {
    /* best-effort — never breaks the GET/PUT it rides on */
  }
}

export async function GET(request: Request) {
  const fren = memberFromRequest(request);
  if (!fren || fren.space !== "email") return NextResponse.json({ ok: false }, { status: 401 });
  const raw = (await kv(["GET", key(fren.handle)])) as string | null;
  const profile: ProfileDoc = raw ? JSON.parse(raw) : {};
  if (profile.accountName) await healReservation(profile.accountName, fren.handle);
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
          // SET…NX refused — somebody already holds this reservation. Read
          // WHO before refusing: this member's own retried click (a
          // double submit) must never read as a refusal, only a
          // DIFFERENT holder really is "taken" (block 968,624).
          const heldBy = (await kv(["GET", accountNameKey(want)])) as string | null;
          if (decideNameClaim(heldBy, fren.handle) === "taken") {
            return NextResponse.json({ ok: false, reason: NAME_TAKEN_REASON }, { status: 409 });
          }
          // "mine" — already reserved by this same member; proceed idempotently
        }
      }
      accountName = want;
    }
  }
  // FOLLOW-UP heal: the name is NOT changing this PUT (either because this
  // PUT never mentioned accountName at all, or it resubmitted the same
  // value) — if this member already has a name on their doc, make sure
  // it's actually reserved. A freshly-changed name is already reserved by
  // the branch above; this only ever fires for the unchanged case.
  if (!nameChanged && accountName) {
    await healReservation(accountName, fren.handle);
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
