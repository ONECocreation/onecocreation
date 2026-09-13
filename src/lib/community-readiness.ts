import { ROOMS } from "./matrix-rooms";
import { getLetterOverride, LETTER_DEFAULTS } from "./letters";
import { getSiteConfig } from "./site-config";
import { mxidForSubject, localpartOf } from "./matrix";

/**
 * COMMUNITY READINESS (TASK-162, cut 0018.06.17 a₿ · block 966,080) — what
 * the Community door still needs before Love flips `features.community` ON
 * (H58 keeps it OFF today). Five probes, each LIVE-OR-DASH, never invented:
 * a probe that can't get an answer says "unknown — the site can't tell",
 * never a guessed ok. Every probe is a GET; nothing here writes to Matrix,
 * and no secret (token, key) ever rides a row's words — env NAMES only, the
 * rail-status rule from /api/admin/site.
 *
 * Server-only (env reads + outbound fetches). The operator-gated reader is
 * /api/admin/community-readiness; the card is console/CommunityDoorCard.
 * `roomsLive()` is ALSO read by the public /api/matrix/rooms feed so a room
 * the homeserver says isn't there can wear its honest "opens soon" — the
 * same directory answer feeds both, one derivation.
 *
 * The env mirrors below (MATRIX_HOMESERVER / MATRIX_BOT_TOKEN) copy
 * matrix.ts's private config() byte-for-byte — matrix.ts's own whoami
 * (botUserId) caches process-wide, which a fresh probe must never do.
 */

export type ReadinessState = "ok" | "missing" | "unknown";

export interface ReadinessRow {
  key: string;
  name: string;
  state: ReadinessState;
  /** the plain-words truth Love reads — what answers, or exactly what's absent */
  words: string;
}

/** Bounded like the mempool-status probe: a hung door must not hang the card. */
const TIMEOUT_MS = 6000;

function matrixBase(): string {
  // mirror of matrix.ts config() — same default, same trailing-slash trim
  return (process.env.MATRIX_HOMESERVER ?? "https://matrix.onecocreation.com").replace(/\/$/, "");
}

function matrixToken(): string | undefined {
  // mirror of matrix.ts config() — the bot seat's token, legacy name accepted
  return process.env.MATRIX_BOT_TOKEN ?? process.env.MATRIX_OCC_ADMIN_TOKEN;
}

function matrixHost(): string {
  return matrixBase().replace(/^https?:\/\//, "");
}

/** The same shape check matrix.ts's isMxid runs (`@local:server`). */
const MXID_RE = /^@[^:\s]+:[^:\s]+$/;

const row = (key: string, name: string, state: ReadinessState, words: string): ReadinessRow => ({
  key,
  name,
  state,
  words,
});

/* ── probe 1: the homeserver answers ────────────────────────────────────── */

async function probeHomeserver(): Promise<ReadinessRow> {
  const KEY = "homeserver";
  const NAME = "The Matrix homeserver answers";
  try {
    const res = await fetch(`${matrixBase()}/_matrix/client/versions`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as { versions?: unknown };
      if (Array.isArray(data.versions) && data.versions.length > 0) {
        return row(KEY, NAME, "ok", `${matrixHost()} answers and speaks Matrix`);
      }
      return row(KEY, NAME, "unknown", `${matrixHost()} answered but with no versions list — not a healthy answer`);
    }
    return row(KEY, NAME, "unknown", `${matrixHost()} answered HTTP ${res.status} — not a healthy answer`);
  } catch {
    return row(KEY, NAME, "unknown", `${matrixHost()} didn't answer — the site can't tell from here`);
  }
}

/* ── probe 2: the house's bot seat resolves ─────────────────────────────── */

/* TASK-210 (0018.06.23 a₿ — Love's 0018.06.18 call, 00:21:46: "the
   Community door check says Love's Matrix identity resolves to the
   Admiral's name"). It did: this row was NAMED "Love's Matrix identity" but
   asked whoami with the BOT's token, so it printed the bot seat
   (adminpacman — the Admiral's account by the ceremony's design). The
   lookup was the wrong account's, not the words. Now two honest rows: THIS
   one says what the bot seat is, and probe 2b resolves Love's OWN seat —
   the operator signed into this card — by the same derivation the login
   door uses (matrix.ts's mxidForSubject) and asks the homeserver who that
   is. */
async function probeSeat(): Promise<ReadinessRow & { mxid: string | null }> {
  const KEY = "seat";
  const NAME = "The house's bot seat resolves";
  const token = matrixToken();
  const out = (r: ReadinessRow, mxid: string | null = null) => ({ ...r, mxid });
  if (!token) {
    return out(row(
      KEY, NAME, "missing",
      "MATRIX_BOT_TOKEN isn't set — the house can't speak in the rooms or seat invites until it is",
    ));
  }
  try {
    const res = await fetch(`${matrixBase()}/_matrix/client/v3/account/whoami`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as { user_id?: unknown };
      if (typeof data.user_id === "string" && MXID_RE.test(data.user_id)) {
        return out(
          row(KEY, NAME, "ok", `the house speaks as ${data.user_id} — the bot seat (invites and the opening words ride it), not Love's own`),
          data.user_id,
        );
      }
      return out(row(KEY, NAME, "unknown", "the homeserver answered whoami with no usable user id"));
    }
    if (res.status === 401 || res.status === 403) {
      return out(row(KEY, NAME, "missing", `the homeserver refuses the house's token (HTTP ${res.status}) — the seat doesn't resolve`));
    }
    return out(row(KEY, NAME, "unknown", `${matrixHost()} answered HTTP ${res.status} — the site can't tell`));
  } catch {
    return out(row(KEY, NAME, "unknown", `${matrixHost()} didn't answer — the seat can't be checked from here`));
  }
}

/* ── probe 2b: Love's OWN identity resolves ─────────────────────────────── */

/** The operator this card is open for: an allowlisted email seat's address
 *  (Love's own door today) or a keyed operator's pubkey hex. */
export type OperatorSeat = string | null | undefined;

async function probeIdentity(operator: OperatorSeat, botMxid: string | null): Promise<ReadinessRow> {
  const KEY = "identity";
  const NAME = "Love's Matrix identity resolves";
  if (!operator) {
    return row(KEY, NAME, "unknown", "open this card signed in as Love — the site resolves the seat you are in, never a guessed one");
  }
  if (!operator.includes("@")) {
    return row(KEY, NAME, "unknown", "you are in by key — the rooms derive Love's seat from her email sign-in; open this card through that door to check it");
  }
  const mxid = mxidForSubject(`${operator}@email`);
  if (botMxid && localpartOf(mxid) === localpartOf(botMxid)) {
    return row(KEY, NAME, "missing", `Love's derived seat would be the bot's own (${botMxid}) — the T-133 hatch re-seats her; say so to Number One`);
  }
  const token = matrixToken();
  if (!token) {
    return row(KEY, NAME, "unknown", `Love's seat derives as ${mxid} — MATRIX_BOT_TOKEN isn't set, so the homeserver can't be asked who that is`);
  }
  try {
    const res = await fetch(`${matrixBase()}/_matrix/client/v3/profile/${encodeURIComponent(mxid)}/displayname`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as { displayname?: unknown };
      const name = typeof data.displayname === "string" && data.displayname.trim() ? data.displayname.trim() : null;
      return row(
        KEY, NAME, "ok",
        name
          ? `Love resolves as ${mxid} — the homeserver knows her as "${name}"`
          : `Love resolves as ${mxid} — the homeserver carries no display name yet (her first room visit sets it)`,
      );
    }
    if (res.status === 404) {
      return row(KEY, NAME, "missing", `no account yet for ${mxid} — the homeserver mints it on Love's first room visit`);
    }
    if (res.status === 401 || res.status === 403) {
      return row(KEY, NAME, "unknown", `the homeserver refuses the house's token (HTTP ${res.status}) — Love's seat can't be checked from here`);
    }
    return row(KEY, NAME, "unknown", `${matrixHost()} answered HTTP ${res.status} — the site can't tell`);
  } catch {
    return row(KEY, NAME, "unknown", `${matrixHost()} didn't answer — Love's seat can't be checked from here`);
  }
}

/* ── probe 3: at least one room is live (stands on the homeserver) ──────── */

export interface RoomLive {
  slug: string;
  title: string;
  /** true — the homeserver's directory resolves the alias · false — the
   *  server SAYS no such room (its "opens soon" is earned) · null — the
   *  server won't say (unreachable, unparsable) — derive-or-dash: no marker
   *  is the only honest paint */
  live: boolean | null;
}

/**
 * Every room in `rooms` against the homeserver's directory — one bounded
 * batch of GETs (read-only; room creation stays the setup script's job,
 * matrix.ts's file header). The bot token rides along when configured —
 * directory reads are public on most homeservers, and a server that asks
 * for auth gets the house's own seat, never a member's.
 */
export async function roomsLive(): Promise<RoomLive[]> {
  const token = matrixToken();
  return Promise.all(
    ROOMS.map(async (r) => {
      const slug = r.id.slice(1, r.id.indexOf(":"));
      try {
        const res = await fetch(
          `${matrixBase()}/_matrix/client/v3/directory/room/${encodeURIComponent(r.id)}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            signal: AbortSignal.timeout(TIMEOUT_MS),
            cache: "no-store",
          },
        );
        if (res.ok) {
          const data = (await res.json().catch(() => ({}))) as { room_id?: unknown };
          return { slug, title: r.title, live: typeof data.room_id === "string" ? true : null };
        }
        // 404 is the server SAYING the room isn't there — a real answer
        return { slug, title: r.title, live: res.status === 404 ? false : null };
      } catch {
        return { slug, title: r.title, live: null };
      }
    }),
  );
}

async function probeRooms(): Promise<ReadinessRow> {
  const KEY = "rooms";
  const NAME = "At least one room is live";
  const rooms = await roomsLive();
  const answered = rooms.filter((r) => r.live !== null);
  if (answered.length === 0) {
    return row(KEY, NAME, "unknown", `${matrixHost()} won't say — the site can't tell which rooms exist`);
  }
  const live = rooms.filter((r) => r.live === true);
  if (live.length === 0) {
    return row(
      KEY, NAME, "missing",
      `no room resolves on ${matrixHost()} yet — the rooms are born from the room-setup script, not from the site`,
    );
  }
  return row(
    KEY, NAME, "ok",
    `${live.length} of ${rooms.length} rooms resolve on ${matrixHost()} — ${live[0].title} leads`,
  );
}

/* ── probe 4: the meeting rail domain answers ───────────────────────────── */

async function probeMeetingRail(): Promise<ReadinessRow> {
  const KEY = "meeting";
  const NAME = "The meeting rail answers";
  const meeting = (await getSiteConfig()).meeting;
  if (meeting.rail === "static") {
    return row(KEY, NAME, "ok", "the 'any link' rail needs no server — the standing link is the whole door");
  }
  const domain = meeting.rail === "vdo" ? "vdo.ninja" : meeting.jitsiDomain;
  try {
    const res = await fetch(`https://${domain}/`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (res.ok) {
      return row(KEY, NAME, "ok", `${domain} answers — the rooms' stage opens there`);
    }
    return row(KEY, NAME, "unknown", `${domain} answered HTTP ${res.status} — not a healthy answer`);
  } catch {
    return row(KEY, NAME, "unknown", `${domain} didn't answer — the site can't tell from here`);
  }
}

/* ── probe 5: the first-sign-in welcome letter exists (T-156) ───────────── */

async function probeWelcomeLetter(): Promise<ReadinessRow> {
  const KEY = "welcome-letter";
  const NAME = "The welcome letter waits for the first sign-in";
  try {
    // the exact read the send path runs (lead-magnet.ts's
    // enqueueWelcomeLetter): Love's override first, the built-in words under
    const override = await getLetterOverride("welcome");
    if (override && override.body.trim()) {
      return row(KEY, NAME, "ok", "Love's own words are saved in the Letters room — the first sign-in is met by her voice");
    }
    if (LETTER_DEFAULTS.welcome?.body.trim()) {
      return row(
        KEY, NAME, "ok",
        "the built-in welcome words stand — a first sign-in is met today; Love's own words replace them from the Letters room",
      );
    }
    return row(KEY, NAME, "missing", "no welcome letter resolves — neither Love's words nor the built-in ones");
  } catch {
    return row(KEY, NAME, "unknown", "the letters vault didn't answer — the site can't tell");
  }
}

/**
 * The six rows, all probes at once (each is independently bounded by its
 * own timeout — one slow door never holds the others). Order is the card's
 * order: the server, the bot seat, Love's seat, the rooms, the stage, the
 * letter. `operator` is the seat this card is open for (the route reads it
 * off the operator gate) — Love's own identity is resolved for HER, never
 * printed from the bot's whoami (TASK-210).
 */
export async function communityReadiness(opts: { operator?: OperatorSeat } = {}): Promise<ReadinessRow[]> {
  const [homeserver, seat, rooms, meeting, letter] = await Promise.all([
    probeHomeserver(),
    probeSeat(),
    probeRooms(),
    probeMeetingRail(),
    probeWelcomeLetter(),
  ]);
  const identity = await probeIdentity(opts.operator, seat.mxid);
  const { mxid: _seatMxid, ...seatRow } = seat;
  void _seatMxid;
  return [homeserver, seatRow, identity, rooms, meeting, letter];
}
