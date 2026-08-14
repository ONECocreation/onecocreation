import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { ROOMS } from "@/lib/matrix-rooms";

export const dynamic = "force-dynamic";

/**
 * THE ROOM CEREMONY (run book C1) — mints Love's seven rooms on her own
 * homeserver, idempotently: existing aliases are left exactly as they are.
 *
 * The one-way doors (matrix.ts law, set at BIRTH because they can never be
 * changed after):
 *  - encryption OFF (recordings on the shelf must outlive device churn, and
 *    a late Evening Star buyer must be able to read three weeks of class)
 *  - history_visibility: shared (same reason)
 *  - join_rule: invite — the site is the only front desk
 *  - m.federate: false — paid media never replicates to servers a kick
 *    cannot claw back
 *
 * Operator-gated; runs ON Vercel where the (sensitive) admin token lives.
 */

function cfg(): { base: string; token: string } | null {
  const base = (process.env.MATRIX_HOMESERVER ?? "https://matrix.onecocreation.com").replace(/\/$/, "");
  const token = process.env.MATRIX_BOT_TOKEN ?? process.env.MATRIX_OCC_ADMIN_TOKEN;
  return token ? { base, token } : null;
}

/** Operator-gated health peek: which matrix envs are present, and the jwt
 *  secret's sha256 PREFIX — compare against the VPS side without either
 *  secret ever entering a chat or a log. */
export async function GET(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, reason: "operator session required" }, { status: 401 });
  }
  const { createHash } = await import("crypto");
  const jwt = process.env.MATRIX_OCC_JWT_SECRET;

  // each room's standing: does it exist, and is encryption on?
  const c = cfg();
  const rooms: { alias: string; exists: boolean; encryption: string }[] = [];
  if (c) {
    const headers = { Authorization: `Bearer ${c.token}` };
    for (const room of ROOMS) {
      const look = await fetch(`${c.base}/_matrix/client/v3/directory/room/${encodeURIComponent(room.id)}`, { headers, cache: "no-store" });
      if (!look.ok) { rooms.push({ alias: room.id, exists: false, encryption: "—" }); continue; }
      const { room_id } = (await look.json()) as { room_id?: string };
      const enc = await fetch(`${c.base}/_matrix/client/v3/rooms/${encodeURIComponent(room_id!)}/state/m.room.encryption`, { headers, cache: "no-store" });
      const alg = enc.ok ? ((await enc.json()) as { algorithm?: string }).algorithm ?? "on" : "off";
      rooms.push({ alias: room.id, exists: true, encryption: alg });
    }
  }

  // ?subject=… — trace one member: their tier as the login rail sees it,
  // their derived mxid, and their membership in each room
  const subject = new URL(request.url).searchParams.get("subject");
  let trace: unknown = null;
  if (subject && c) {
    const { tierFor, getEntitlement } = await import("@/lib/entitlement");
    const { mxidForSubject } = await import("@/lib/matrix");
    const mxid = mxidForSubject(subject);
    const memberships: Record<string, string> = {};
    for (const r of rooms) {
      if (!r.exists) continue;
      const look = await fetch(`${c.base}/_matrix/client/v3/directory/room/${encodeURIComponent(r.alias)}`, { headers: { Authorization: `Bearer ${c.token}` }, cache: "no-store" });
      const { room_id } = (await look.json()) as { room_id?: string };
      const mem = await fetch(`${c.base}/_matrix/client/v3/rooms/${encodeURIComponent(room_id!)}/state/m.room.member/${encodeURIComponent(mxid)}`, { headers: { Authorization: `Bearer ${c.token}` }, cache: "no-store" });
      memberships[r.alias] = mem.ok ? ((await mem.json()) as { membership?: string }).membership ?? "?" : "none";
    }
    trace = { subject, mxid, tier: await tierFor(subject), entitlement: await getEntitlement(subject), memberships };
  }

  // ?settleOrder=<id> — re-run the entitlement settle for one order in
  // daylight and return the verdict verbatim (idempotent: also the repair)
  const settleOrder = new URL(request.url).searchParams.get("settleOrder");
  let settle: unknown = null;
  if (settleOrder) {
    const { getOrder } = await import("@/lib/store");
    const { settleEntitlementFromOrder } = await import("@/lib/entitlement-fulfil");
    const order = await getOrder(settleOrder);
    settle = order ? await settleEntitlementFromOrder(order) : { error: "no such order" };
  }

  return NextResponse.json({
    ok: true,
    adminToken: !!(process.env.MATRIX_BOT_TOKEN ?? process.env.MATRIX_OCC_ADMIN_TOKEN),
    jwtSecret: jwt ? { chars: jwt.length, sha256Prefix: createHash("sha256").update(jwt).digest("hex").slice(0, 12) } : null,
    rooms,
    trace,
    settle,
  });
}

export async function POST(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, reason: "operator session required" }, { status: 401 });
  }
  const c = cfg();
  if (!c) return NextResponse.json({ ok: false, reason: "matrix admin token not configured" }, { status: 503 });

  // {action:"remint"} — an ENCRYPTED room's alias moves to a fresh plaintext
  // room (encryption is a one-way door; the room itself can never go back).
  // The old room is left, alias-less and orphaned — history preserved, doors
  // closed. Ruling 0018.05.17: Love's rooms are plaintext; privacy lives in
  // invite-only + her own server + federation off. E2EE is tabled as a
  // frens.earth TEMPLATE option, not a Love default.
  const body = (await request.json().catch(() => ({}))) as { action?: string; subject?: string };
  const remint = body.action === "remint";

  // {action:"revoke", subject} — the artist's own hand closes the doors:
  // tier revoked, member kicked from the gated rooms (the `all` commons
  // stays theirs — they're still a member). The kind letter is still owed
  // to the mail rail (logged in the run book), so the caller is told.
  if (body.action === "revoke" && body.subject) {
    const { tierForSubject } = await import("@/lib/member-tier");
    const { revokeTier, normalizeNpub } = await import("@/lib/entitlement");
    const { removeFromTierRooms, mxidForSubject } = await import("@/lib/matrix");
    const { getEntry } = await import("@/lib/registry");
    const held = await tierForSubject(body.subject);
    if (!held) return NextResponse.json({ ok: false, reason: "that soul holds no tier" }, { status: 404 });
    const at = body.subject.lastIndexOf("@");
    const [h, sp] = [body.subject.slice(0, at), body.subject.slice(at + 1)];
    const grantKey = sp === "email" ? body.subject : normalizeNpub((await getEntry(h, sp))?.npub);
    const rooms = await removeFromTierRooms(mxidForSubject(body.subject), { reason: "membership ended" });
    if (grantKey) await revokeTier(grantKey);
    let letter = "no email door — tell them yourself";
    try {
      const { emailForSubject } = await import("@/lib/member-tier");
      const { sendRevokeLetter } = await import("@/lib/entitlement-fulfil");
      const to = await emailForSubject(body.subject);
      if (to) { await sendRevokeLetter(to, held, false); letter = `kind letter queued to ${to}`; }
    } catch { letter = "letter failed to queue — resend by hand"; }
    return NextResponse.json({ ok: true, revoked: held, rooms, letter });
  }

  const headers = { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" };
  const results: { alias: string; title: string; status: string; roomId?: string }[] = [];

  for (const room of ROOMS) {
    const localAlias = room.id.slice(1, room.id.indexOf(":")); // "#heart-field:…" → "heart-field"

    // already minted? the ceremony never re-forges a door…
    const look = await fetch(`${c.base}/_matrix/client/v3/directory/room/${encodeURIComponent(room.id)}`, {
      headers, cache: "no-store",
    });
    if (look.ok) {
      const { room_id } = (await look.json()) as { room_id?: string };
      // …unless reminting AND the standing room is encrypted
      let encrypted = false;
      if (remint && room_id) {
        const enc = await fetch(
          `${c.base}/_matrix/client/v3/rooms/${encodeURIComponent(room_id)}/state/m.room.encryption`,
          { headers, cache: "no-store" },
        );
        encrypted = enc.ok;
      }
      if (!encrypted) {
        results.push({ alias: room.id, title: room.title, status: "already standing", roomId: room_id });
        continue;
      }
      // free the alias; the encrypted room stays behind, orphaned
      await fetch(`${c.base}/_matrix/client/v3/directory/room/${encodeURIComponent(room.id)}`, {
        method: "DELETE", headers, cache: "no-store",
      });
      if (room_id) {
        await fetch(`${c.base}/_matrix/client/v3/rooms/${encodeURIComponent(room_id)}/leave`, {
          method: "POST", headers, body: "{}", cache: "no-store",
        }).catch(() => {});
      }
    }

    const res = await fetch(`${c.base}/_matrix/client/v3/createRoom`, {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({
        name: room.title,
        room_alias_name: localAlias,
        topic: room.kind === "class" ? "A One Cocreation classroom" : "A One Cocreation commons",
        visibility: "private",
        preset: "private_chat",
        creation_content: { "m.federate": false },
        initial_state: [
          { type: "m.room.join_rules", state_key: "", content: { join_rule: "invite" } },
          { type: "m.room.history_visibility", state_key: "", content: { history_visibility: "shared" } },
          { type: "m.room.guest_access", state_key: "", content: { guest_access: "forbidden" } },
        ],
        // the one-way door, GUARDED: enabling encryption needs PL 150 — above
        // even room admins, so a well-meaning Element tap can't relock what
        // this ruling opened (accident-proof, not admin-proof: PL100 could
        // still lower the bar deliberately)
        power_level_content_override: { events: { "m.room.encryption": 150 } },
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { room_id?: string; errcode?: string; error?: string };
    results.push(
      res.ok
        ? { alias: room.id, title: room.title, status: remint ? "re-minted plaintext ✓" : "minted ✓", roomId: data.room_id }
        : { alias: room.id, title: room.title, status: `failed: ${data.errcode ?? res.status} ${data.error ?? ""}` },
    );
  }

  return NextResponse.json({ ok: true, results });
}
