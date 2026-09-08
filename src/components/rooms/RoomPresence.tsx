"use client";

import { useEffect, useState } from "react";

/**
 * WHO'S HERE — ONLINE ONLY (TASK-149, 0018.06.17 a₿, from Love's meeting:
 * the joined-roster list "looks like trash" — raw mxids and souls who left
 * days ago). The room's own `joined_members` still comes first (the exact
 * two-call shape RoomView.tsx proves: `/api/matrix/login` → resolve the
 * alias → `joined_members`), then each joined soul's presence is read from
 * the homeserver's own `/presence/{userId}/status` with the MEMBER'S OWN
 * token — the server answers because they share the room. Only souls the
 * server reports online, or last-seen within the last 5 minutes, wear a
 * chip. A server that won't say (presence disabled, lookup refused) simply
 * shows no chip for that soul — never an invented dot, never a joined
 * count dressed up as "here now". Derive-or-dash: an empty truth reads
 * "— nobody here yet".
 *
 * Every chip wears the soul's DISPLAY NAME (T-133's identity work keeps
 * those honest on the homeserver); a keyed member with no display name
 * shows their handle — the mxid's localpart — never the raw `@key-…:…`
 * string. Chips are keyed by mxid (the T-133 duplicate-key fix: two souls
 * may share a display name; mxids can't collide).
 */

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

interface MemberInfo {
  display_name?: string;
}

/** The homeserver's `/presence/{userId}/status` answer, the parts we read. */
interface PresenceInfo {
  presence?: string;
  last_active_ago?: number;
}

export interface Soul {
  mxid: string;
  name: string;
}

/** `@ada:onecocreation.com` → `ada` — the handle a keyed member wears when
 *  no display name is set (never the raw mxid). */
export function handleOf(mxid: string): string {
  const i = mxid.indexOf(":");
  return mxid.startsWith("@") && i > 1 ? mxid.slice(1, i) : mxid;
}

/** The online truth, per the spec's filter: the server says "online", or
 *  the soul was last-seen within the 5-minute window (an idle/"unavailable"
 *  soul who was here two minutes ago is still here). */
export function isOnline(p: PresenceInfo | null | undefined): boolean {
  if (!p) return false;
  if (p.presence === "online") return true;
  return typeof p.last_active_ago === "number" && p.last_active_ago <= ONLINE_WINDOW_MS;
}

/** joined roster × presence answers → the chips, display-name first,
 *  alphabetical. Pure so tests/classroom-stage.test.ts pins it. */
export function soulsOnline(
  joined: Record<string, MemberInfo>,
  presence: Record<string, PresenceInfo | null>,
): Soul[] {
  return Object.entries(joined)
    .filter(([mxid]) => isOnline(presence[mxid]))
    .map(([mxid, m]) => {
      const display = typeof m.display_name === "string" ? m.display_name.trim() : "";
      return { mxid, name: display || handleOf(mxid) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

type Status = "loading" | "signedout" | "locked" | "open" | "error";

interface State {
  status: Status;
  souls: Soul[];
}

/** Presence is asked for at most this many souls per poll — a big room
 *  costs one bounded batch, never an unbounded fan-out. */
const PRESENCE_CAP = 24;

export default function RoomPresence({ alias }: { alias: string }) {
  const [state, setState] = useState<State>({ status: "loading", souls: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      const login = await fetch("/api/matrix/login", { method: "POST" }).catch(() => null);
      if (!login) { if (alive) setState({ status: "error", souls: [] }); return; }
      if (login.status === 401) { if (alive) setState({ status: "signedout", souls: [] }); return; }
      const auth = (await login.json().catch(() => null)) as
        | { ok?: boolean; homeserver?: string; accessToken?: string }
        | null;
      if (!auth?.ok || !auth.accessToken || !auth.homeserver) { if (alive) setState({ status: "error", souls: [] }); return; }
      const headers = { Authorization: `Bearer ${auth.accessToken}` };
      const dir = await fetch(`${auth.homeserver}/_matrix/client/v3/directory/room/${encodeURIComponent(alias)}`, { headers })
        .then((r) => r.json()).catch(() => null) as { room_id?: string } | null;
      const roomId = dir?.room_id;
      if (!roomId) { if (alive) setState({ status: "error", souls: [] }); return; }
      const res = await fetch(`${auth.homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/joined_members`, { headers });
      if (res.status === 403) { if (alive) setState({ status: "locked", souls: [] }); return; }
      if (!res.ok) { if (alive) setState({ status: "error", souls: [] }); return; }
      const data = (await res.json().catch(() => ({}))) as { joined?: Record<string, MemberInfo> };
      const joined = data.joined ?? {};
      /* one bounded presence batch over the joined list: the homeserver
         answers for souls who share a room with the asking member; a soul
         the server won't speak for simply wears no chip */
      const batch = Object.keys(joined).slice(0, PRESENCE_CAP);
      const answers = await Promise.all(
        batch.map(async (mxid) => {
          const p = await fetch(
            `${auth.homeserver}/_matrix/client/v3/presence/${encodeURIComponent(mxid)}/status`,
            { headers },
          ).then((r) => (r.ok ? r.json() : null)).catch(() => null) as PresenceInfo | null;
          return [mxid, p] as const;
        }),
      );
      if (!alive) return;
      setState({ status: "open", souls: soulsOnline(joined, Object.fromEntries(answers)) });
    })();
    return () => { alive = false; };
  }, [alias]);

  return (
    <div className="card" style={{ padding: "14px 18px" }}>
      <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: ".98rem", margin: "0 0 10px", color: "var(--ink-strong)" }}>
        Who&apos;s here
      </h3>
      {state.status === "loading" && <p style={{ color: "var(--muted)", fontSize: ".82rem", margin: 0 }}>counting souls…</p>}
      {(state.status === "signedout" || state.status === "locked" || state.status === "error") && (
        <p style={{ color: "var(--muted)", fontSize: ".82rem", margin: 0 }}>opens once this room does, for you</p>
      )}
      {state.status === "open" && (
        <>
          {state.souls.length === 0 ? (
            <p style={{ margin: 0, fontSize: ".82rem", color: "var(--muted)" }}>— nobody here yet</p>
          ) : (
            <>
              <p style={{ margin: "0 0 8px", fontSize: ".82rem", color: "var(--ink-body)" }}>
                {state.souls.length} here now
              </p>
              {/* aligned equal-height chips: the row stretches, the chip
                  centers its name; long names ellipsize rather than break
                  the row's height */}
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "stretch" }}>
                {state.souls.map((s) => (
                  <li
                    key={s.mxid}
                    title={s.name}
                    style={{
                      display: "inline-flex", alignItems: "center", minHeight: 26,
                      maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      fontSize: ".76rem", color: "var(--muted)", background: "var(--glass)",
                      border: "1px solid var(--glass-edge)", borderRadius: 999, padding: "2px 10px",
                    }}
                  >
                    {s.name}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
