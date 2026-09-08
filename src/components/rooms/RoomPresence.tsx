"use client";

/**
 * WHO'S HERE — ONLINE ONLY, ONE READ PER OPEN (TASK-184, 0018.06.18 a₿ ·
 * the 429 hunt; born TASK-149 as the online-only roster). The roster +
 * presence payload now arrives as a PROP: the room page reads it ONCE per
 * open, server-side, with the bot's own seat (matrix.ts's roomRoster,
 * per-request cached via rosterForRequest) — never again a per-mount
 * browser burst of member-token logins + directory + joined_members + 24
 * presence GETs, the fan-out the homeserver's rate limit answered 429 on.
 * The online FILTER is unchanged and shared with Love's Desk
 * (soulsOnline/isOnline below — the desk's RosterPanel runs the same pure
 * helpers over its own route's payload).
 *
 * THE 429 RULE (the ruling): a homeserver "too many requests" renders
 * honest words — "the room is busy — try again in a moment" — never a
 * blank room, never an invented roster. A gated visitor (the page skips
 * the read, roster === null) sees the soft door line, as before.
 * Derive-or-dash: an empty truth reads "— nobody here yet".
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

/** The roster payload the room page hands down — the exact shape
 *  matrix.ts's roomRoster returns (typed locally: matrix.ts is server-only,
 *  and this leaf must stay client-importable). */
export type RosterResult =
  | {
      ok: true;
      count: number;
      names: string[];
      joined: Record<string, MemberInfo>;
      presence: Record<string, PresenceInfo | null>;
    }
  | { ok: false; reason: string };

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
 *  alphabetical. Pure so tests pin it (classroom-stage / route-gates). */
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

/** The homeserver's rate-limit answer, whichever way it words it:
 *  Synapse's errcode (M_LIMIT_EXCEEDED, status 429) or a bare "http 429"
 *  from matrix.ts's call(). Pure — the fixture-429 test pins it. */
export function isLimitReason(reason: string | undefined): boolean {
  return !!reason && (/M_LIMIT_EXCEEDED/i.test(reason) || /\b429\b/.test(reason));
}

/** The 429 words, said once — the ruling's own sentence. */
export const ROOM_BUSY_LINE = "the room is busy — try again in a moment";

export default function RoomPresence({ roster }: { roster: RosterResult | null }) {
  const souls = roster?.ok ? soulsOnline(roster.joined, roster.presence) : [];

  return (
    <div className="card" style={{ padding: "14px 18px" }}>
      <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: ".98rem", margin: "0 0 10px", color: "var(--ink-strong)" }}>
        Who&apos;s here
      </h3>
      {/* the gate closed (no read taken) — the soft door line, as before */}
      {roster === null && (
        <p style={{ color: "var(--muted)", fontSize: ".82rem", margin: 0 }}>opens once this room does, for you</p>
      )}
      {/* the homeserver's 429 — honest words, never a blank room */}
      {roster !== null && !roster.ok && isLimitReason(roster.reason) && (
        <p style={{ color: "var(--muted)", fontSize: ".82rem", margin: 0 }}>{ROOM_BUSY_LINE}</p>
      )}
      {roster !== null && !roster.ok && !isLimitReason(roster.reason) && (
        <p style={{ color: "var(--muted)", fontSize: ".82rem", margin: 0 }}>who&apos;s here didn&apos;t answer — try again in a moment</p>
      )}
      {roster?.ok && (
        <>
          {souls.length === 0 ? (
            <p style={{ margin: 0, fontSize: ".82rem", color: "var(--muted)" }}>— nobody here yet</p>
          ) : (
            <>
              <p style={{ margin: "0 0 8px", fontSize: ".82rem", color: "var(--ink-body)" }}>
                {souls.length} here now
              </p>
              {/* aligned equal-height chips: the row stretches, the chip
                  centers its name; long names ellipsize rather than break
                  the row's height */}
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "stretch" }}>
                {souls.map((s) => (
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
