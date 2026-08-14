import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { frenFromRequest } from "@/lib/fren-auth";
import { mxidForSubject, roomsForMember, ensureInvited, matrixConfigured } from "@/lib/matrix";
import { tierForSubject } from "@/lib/member-tier";

export const dynamic = "force-dynamic";

/**
 * THE MATRIX DOOR (run book C2): a signed-in member walks in, and an
 * account on Love's homeserver walks out — born on first login, same soul
 * every time after. The JWT (shared secret with Synapse) is minted here,
 * lives five minutes, and never touches the client; only the resulting
 * Matrix access token does.
 *
 * Self-healing joins: any tier room the member is invited to gets joined
 * on the way through, so C3's server-side invites become memberships the
 * moment the member next opens a room.
 */

const HOMESERVER = (process.env.MATRIX_HOMESERVER ?? "https://matrix.onecocreation.com").replace(/\/$/, "");

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function mintJwt(localpart: string, secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(Buffer.from(JSON.stringify({ sub: localpart, iat: now, exp: now + 300 })));
  const sig = b64url(createHmac("sha256", secret).update(`${head}.${body}`).digest());
  return `${head}.${body}.${sig}`;
}

export async function POST(request: Request) {
  const fren = frenFromRequest(request);
  if (!fren) return NextResponse.json({ ok: false, reason: "sign in first (email or key)" }, { status: 401 });

  const secret = process.env.MATRIX_OCC_JWT_SECRET;
  if (!secret) return NextResponse.json({ ok: false, reason: "matrix login not configured" }, { status: 503 });

  const subject = `${fren.handle}@${fren.space}`;
  const mxid = mxidForSubject(subject);
  const localpart = mxid.slice(1, mxid.indexOf(":"));

  const res = await fetch(`${HOMESERVER}/_matrix/client/v3/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      type: "org.matrix.login.jwt",
      token: mintJwt(localpart, secret),
      initial_device_display_name: "One Cocreation (the site)",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string; user_id?: string; device_id?: string; errcode?: string; error?: string;
  };
  if (!res.ok || !data.access_token) {
    return NextResponse.json(
      { ok: false, reason: data.errcode ? `${data.errcode}: ${data.error ?? ""}` : "homeserver refused" },
      { status: 502 },
    );
  }

  // walk through every door open to this soul: `all` rooms for ANY member
  // (the free Community Circle), tier rooms for package holders. The bot
  // seats the invite, the member steps through — both idempotent.
  const joined: string[] = [];
  if (matrixConfigured()) {
    try {
      const tier = await tierForSubject(subject);
      const open = roomsForMember(tier);
      await ensureInvited(mxid, open);
      for (const room of open) {
        const j = await fetch(
          `${HOMESERVER}/_matrix/client/v3/join/${encodeURIComponent(room.id)}`,
          { method: "POST", headers: { Authorization: `Bearer ${data.access_token}`, "Content-Type": "application/json" }, body: "{}", cache: "no-store" },
        );
        if (j.ok) joined.push(room.id);
      }
    } catch { /* joins are a courtesy on the way through, never a blocker */ }
  }

  return NextResponse.json({
    ok: true,
    homeserver: HOMESERVER,
    userId: data.user_id,
    accessToken: data.access_token,
    deviceId: data.device_id,
    joined,
  });
}
