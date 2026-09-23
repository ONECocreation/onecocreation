"use client";

/**
 * THE GO-LIVE ROOM (TASK-192, 0018.06.18 a₿ · H69 ruled A) — the client
 * half of /a/live: ONE door on Love's desk, four ways in, each with its
 * own rail. The strip on top is the desk's one truth about what is live
 * (not live / LIVE · room · since · who's here · End), read from the same
 * live flag as everything else — /api/admin/live here (the operator's own
 * gated read of the SAME vault flag /api/live serves the site), never a
 * second store.
 *
 * The four cards, one door open at a time (opening one closes the others —
 * the words say so on the page):
 *
 *  1. Read live on the site — the folded-in class door: room chips from
 *     ROOMS (the Commons first, LiveDoorCard's doorRoomGroups model), the
 *     existing /api/admin/live open/close, the room's Stage link, and
 *     "sign in as Love at the door".
 *  2. YouTube live — T-191's studio VDO links (derived server-side from
 *     the meeting config's prefix). The studio's live state is NOT probed:
 *     the kit exposes none here, so the card says "the studio's state
 *     comes with the kit" in words — never an invented camera state.
 *
 * TASK-235 (0018.06.23 a₿) — once the "Read live on the site" door is OPEN
 * and the meeting rail is the studio (`meeting.rail === "vdo"`, T-245's
 * flip), the opened card grows a "Next" row: Love's own studio camera
 * (`studioVdo.push`, the exact seat the stage's `?view=host` watches) and
 * the two scene doors StudioRoom otherwise carries alone — Waiting scene
 * (the "In 20 min" semantics: `activeScene: "starting"`, `startsAt` now +
 * 20 min) and On camera (`activeScene: "solo"`). Both ride the SAME write
 * rail as open/close, `POST /api/admin/live` with `action: "scene"` — a
 * new block on that route, gated the same way, that patches the studio
 * doc rather than the live flag. `GET /api/admin/live`'s `scene` field
 * tells the card which door is already open. House `btn`/`btn-ghost` only
 * — gold is money-and-join only, never these.
 *  3. Discovery call · 1:1 — today's confirmed bookings from the booking
 *     store (live.ts's confirmedToday, server-derived), one button each →
 *     /meet/<id> — Love hosts (the operator's director seat rides the same
 *     page).
 *  4. Co-create with a guest — a room name field, rail chips Jitsi | VDO
 *     from the meeting config, the guest link derived (never stored) and
 *     copy-able.
 *
 * TASK-236 (0018.06.23 a₿) — the opened "Read live on the site" card gains
 * ONE more row, ALL rails (unlike the vdo-only "Next" row above): "then, in
 * N minutes: <room ▾> [Set] [Clear]" — the deeper-dive door Love's call #3
 * asked for ("Weekly Intuitive members join Love in the members' room 45
 * minutes later"). Writes through the SAME rail as open/close/scene,
 * `POST /api/admin/live` with `action: "after-hours"` / `"after-hours-
 * clear"` — a new pair of blocks on that route, gated the same way, that
 * patch the live flag's OWN `afterHours` field (live.ts). The room picker
 * excludes the free Commons (`minTier: "all"`, never a legitimate
 * after-hours target — the write route 400s it too) and defaults to the
 * first TIER-A room (Weekly Intuitive's own room, PACKAGE_FALLBACK's
 * naming in matrix-rooms.ts). House `btn-ghost` only — gold is money-
 * and-join only, never this row.
 *
 * The Admiral's law holds on every card: the buttons hug the bottom,
 * stacked, uniform.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Chip, field, glassCard } from "@/components/console/glass";
import { doorRoomGroups, type DoorRoom } from "@/components/console/LiveDoorCard";
import type { TodaySession } from "@/lib/live";
// TASK-261: the pure URL builders live in live-links.ts (no server
// imports) so this client component can pull them in as VALUES, not just
// types — a VALUE import from live.ts would drag its server-only
// entitlement/mail-queue chain into the client bundle (the Turbopack
// lesson recorded on matrix-rooms.ts). guestSlug/guestMeetingLink used to
// be duplicated inline here for exactly that reason; this split removes
// the duplication instead. Re-exported below so tests/go-live-door.test.ts's
// existing `import { guestMeetingLink } from "@/app/a/live/go-live-room"`
// keeps resolving.
import { guestSlug, guestMeetingLink } from "@/lib/live-links";
// TASK-235: scenes.ts is pure shape (no fs, no env) — StudioRoom.tsx
// already imports it as a client component, so this stays inside the
// client-bundle law the file's docblock states above.
import type { StudioSceneId } from "@/lib/studio/scenes";

export { guestSlug, guestMeetingLink };

/* ── the pure model (exported for the tests — the house pins the model) ── */

export type GoLiveDoorId = "read" | "youtube" | "call" | "cocreate";

/** One door open at a time: opening one closes the others; tapping the
 *  open door closes it. */
export function nextOpenDoor(current: GoLiveDoorId | null, next: GoLiveDoorId): GoLiveDoorId | null {
  return current === next ? null : next;
}

/** TASK-440 (VERIFY-astra one-way V 4.5): the normalized co-create name
 *  `studio` is RESERVED — `guestSlug("studio")` folded into the vdo
 *  namespace IS the standing studio (`<prefix>_studio`), so an unsigned
 *  co-create door built from it would knock on Love's own room. The
 *  builder answers `reserved: true` and NO link; the card says so in
 *  words and offers no unsigned copy action. Other names derive exactly
 *  as before. */
export function cocreateGuestDoor(
  rail: "jitsi" | "vdo",
  name: string,
  meeting: GoLiveMeeting,
): { link: string | null; reserved: boolean } {
  if (guestSlug(name) === "studio") return { link: null, reserved: true };
  return { link: guestMeetingLink(rail, name, meeting), reserved: false };
}

/* ── the feed shapes ───────────────────────────────────────────────────── */

interface DoorFeed {
  ok: boolean;
  state: {
    live: boolean;
    kind?: string;
    room?: string;
    startedAt?: number;
    /** TASK-236: the after-hours door's own state, riding the same flag. */
    afterHours?: { room: string; at: number };
  };
  rooms: DoorRoom[];
  matrixConfigured: boolean;
  vaultConfigured: boolean;
  scene: { active: StudioSceneId; startsAt: string };
}

export interface GoLiveMeeting {
  rail: "jitsi" | "vdo" | "static";
  jitsiDomain: string;
  jitsiPrefix: string;
  vdoRoomPrefix: string;
  vdoHost: string;
  /** TASK-297: the request's own origin (page.tsx's derivation) — the base
   *  every SITE guest url mints from (`/meet/studio/<room>`, T-292 Page B);
   *  the vdo host now appears only inside the iframe src that page's frame
   *  route mints. */
  siteOrigin: string;
}

/* every card: the buttons hug the bottom, stacked, uniform */
const card: React.CSSProperties = { ...glassCard, display: "flex", flexDirection: "column", gap: 10 };
const doorStack: React.CSSProperties = { marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 };
const fieldLabel: React.CSSProperties = {
  display: "block", fontSize: ".62rem", letterSpacing: ".1em", textTransform: "uppercase",
  color: "var(--muted)", marginBottom: 3,
};
const muted: React.CSSProperties = { margin: 0, fontSize: ".78rem", color: "var(--muted)" };

function CopyDoor({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard refused — the field beside the button is selectable */
        }
      }}
    >
      {copied ? "copied ✓" : label}
    </button>
  );
}

export default function GoLiveRoom({
  rooms,
  studioVdo,
  studioDirector,
  studioGuestDoor,
  sessions,
  meeting,
  youtube,
  initialOpen = null,
}: {
  rooms: DoorRoom[];
  studioVdo: { room: string; push: string; guest: string };
  /** TASK-261: the director seat's own door — a SEPARATE derivation from
   *  `studioVdo.push` (the on-camera/publish link), so "on camera" and
   *  "the director's desk" can never be conflated by a caller. TASK-306:
   *  the SITE route (`/a/studio/room/<room>`, page.tsx's derivation via
   *  live-links.ts's directorDeskUrl) — the keyed studio URL no longer
   *  rides this href; the desk route's own server mints it. */
  studioDirector: string;
  /** TASK-440: the standing studio's SIGNED guest door (/a/studio
   *  page.tsx's own derivation, plumbed through StudioHub) — a standing
   *  room opens for a verified invite only, and a client component can
   *  never sign (the secret is server-only), so this card no longer
   *  builds the door itself. */
  studioGuestDoor: string;
  sessions: TodaySession[];
  meeting: GoLiveMeeting;
  youtube: string;
  /** test hook: which door stands open on first render (the page passes none) */
  initialOpen?: GoLiveDoorId | null;
}) {
  const [feed, setFeed] = useState<DoorFeed | null>(null);
  const [open, setOpen] = useState<GoLiveDoorId | null>(initialOpen);
  const [room, setRoom] = useState("");
  const [message, setMessage] = useState("");
  const [letter, setLetter] = useState(false); // DEFAULT OFF — reputation armor
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [sceneBusy, setSceneBusy] = useState(false); // TASK-235: its own busy flag — the scene doors never lock the open/close button
  const [roster, setRoster] = useState<{ slug: string; count: number; names: string[] } | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestRail, setGuestRail] = useState<"jitsi" | "vdo">(meeting.rail === "vdo" ? "vdo" : "jitsi");
  const [afterHoursMinutes, setAfterHoursMinutes] = useState(45);
  const [afterHoursRoomSlug, setAfterHoursRoomSlug] = useState("");
  const [afterHoursBusy, setAfterHoursBusy] = useState(false); // its own busy flag, like sceneBusy — never locks open/close

  const load = useCallback(() => {
    fetch("/api/admin/live", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.ok) return;
        setFeed(d);
        /* the Commons leads the picker, so it leads the default too */
        setRoom((cur) => cur || doorRoomGroups(d.rooms)[0]?.rooms[0]?.slug || "");
        /* TASK-236: the after-hours picker's own default — the first
           TIER-A room (Weekly Intuitive's own room), set ONCE the feed
           answers, never overwritten once the operator picks (same
           cur-wins pattern as `room` above). Never the free Commons —
           the write route 400s it too. */
        const memberRooms = (d.rooms as DoorRoom[]).filter((r) => r.minTier !== "all");
        setAfterHoursRoomSlug(
          (cur) => cur || memberRooms.find((r) => r.minTier === "A")?.slug || memberRooms[0]?.slug || "",
        );
      })
      .catch(() => {});
  }, []);
  useEffect(load, [load]);

  /* the after-hours picker's own rooms, re-derived at render (never the
     free Commons — see the default above) */
  const afterHoursRooms = (feed?.rooms ?? rooms).filter((r) => r.minTier !== "all");

  /* who's here — the bot's own roster read for the live room; a dark
     answer reads as a dash, never an invented count. Keyed by slug so a
     stale read from a closed room never wears the new one's strip. */
  const liveSlug = feed?.state.live ? feed.state.room ?? null : null;
  useEffect(() => {
    if (!liveSlug) return;
    let stop = false;
    fetch(`/api/admin/classroom/roster?room=${encodeURIComponent(liveSlug)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (stop) return;
        setRoster(d?.ok ? { slug: liveSlug, count: d.count ?? 0, names: d.names ?? [] } : null);
      })
      .catch(() => { if (!stop) setRoster(null); });
    return () => { stop = true; };
  }, [liveSlug]);

  async function act(action: "open" | "close") {
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch("/api/admin/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "open" ? { action, room, message: message.trim() || undefined, letter } : { action },
        ),
      });
      const d = await r.json().catch(() => null);
      if (d?.ok) {
        setNote(
          action === "open"
            ? `● open — the word landed in the room${d.letters ? ` · letter queued to ${d.letters.queued ?? 0} of ${d.letters.audience ?? 0}` : ""}`
            : d.closed
              ? `the room rests${d.goodbye?.ok ? " — the goodbye landed" : " — the goodbye did not land; the flag is down"}`
              : "the room was already dark",
        );
        if (action === "open") setMessage("");
      } else {
        setNote(d?.reason ?? `the door said no (${r.status})`);
      }
    } catch {
      setNote("the door could not be reached");
    }
    setBusy(false);
    load();
  }

  // TASK-235: the studio's own two next-doors — same write rail as
  // open/close, a different action; startsInMinutes only rides along for
  // the waiting scene (the "In 20 min" semantics), never for on-camera.
  async function actScene(scene: StudioSceneId, startsInMinutes?: number) {
    setSceneBusy(true);
    setNote(null);
    try {
      const r = await fetch("/api/admin/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          startsInMinutes === undefined ? { action: "scene", scene } : { action: "scene", scene, startsInMinutes },
        ),
      });
      const d = await r.json().catch(() => null);
      if (!d?.ok) setNote(d?.reason ?? `the door said no (${r.status})`);
    } catch {
      setNote("the door could not be reached");
    }
    setSceneBusy(false);
    load();
  }

  // TASK-236: the deeper-dive door — same write rail, ALL rails (unlike
  // actScene's vdo-only "Next" row); `minutes` only rides with the set
  // action, never the clear.
  async function actAfterHours(action: "after-hours" | "after-hours-clear") {
    setAfterHoursBusy(true);
    setNote(null);
    try {
      const r = await fetch("/api/admin/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "after-hours"
            ? { action, room: afterHoursRoomSlug, minutes: afterHoursMinutes }
            : { action },
        ),
      });
      const d = await r.json().catch(() => null);
      if (!d?.ok) setNote(d?.reason ?? `the door said no (${r.status})`);
    } catch {
      setNote("the door could not be reached");
    }
    setAfterHoursBusy(false);
    load();
  }

  const groups = doorRoomGroups(feed?.rooms ?? rooms);
  const liveTitle = liveSlug
    ? (feed?.rooms ?? rooms).find((r) => r.slug === liveSlug)?.title ?? liveSlug
    : null;
  const railsDark = feed ? !feed.matrixConfigured || !feed.vaultConfigured : false;
  const vaultDark = feed ? !feed.vaultConfigured : false; // TASK-236: after-hours never needs the matrix bot
  const { link: guestLink, reserved: guestNameReserved } = cocreateGuestDoor(guestRail, guestName, meeting);
  /* TASK-297: the studio's guest door, ONE derivation for both surfaces
     on the YouTube card — the SITE url, never the studio host (T-292
     DESIGN.md §2 Page B). TASK-440: SIGNED on the server (/a/studio's own
     derivation, the studioGuestDoor prop) — this card no longer builds
     the door client-side. */
  const afterHours = feed?.state.afterHours ?? null;
  const afterHoursRoomTitle = afterHours
    ? afterHoursRooms.find((r) => r.slug === afterHours.room)?.title ?? afterHours.room
    : null;

  const DOORS: { id: GoLiveDoorId; title: string; blurb: string }[] = [
    { id: "read", title: "Read live on the site", blurb: "open a room — the banner lights, the words land in the room" },
    { id: "youtube", title: "YouTube live", blurb: "the studio's VDO links — your camera in, a guest's door" },
    { id: "call", title: "Discovery call · 1:1", blurb: "today's confirmed calls from the booking store — you host" },
    { id: "cocreate", title: "Co-create with a guest", blurb: "a one-off room, the guest link derived from the meeting config" },
  ];

  return (
    <div className="p-2 text-sm" style={{ color: "var(--ink)" }}>
      <p style={{ margin: "0 0 4px", fontSize: ".85rem", color: "var(--muted)" }}>
        one door on Love&apos;s desk, four ways in — opening one closes the others.
      </p>

      {/* ── the strip: the desk's one truth about what is live ────────── */}
      <div style={{ ...glassCard, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 14px", marginTop: 10 }}>
        {!feed && <span style={muted}>reading the flag…</span>}
        {feed && !feed.state.live && (
          <span style={muted}>— not live · the rooms rest; the strip on the member header stays dark</span>
        )}
        {feed?.state.live && (
          <>
            <Chip tone="rose">● LIVE</Chip>
            <b style={{ fontSize: ".9rem", color: "var(--ink-strong)" }}>{liveTitle}</b>
            {feed.state.startedAt && (
              <span style={muted}>since {new Date(feed.state.startedAt * 1000).toUTCString().slice(17, 22)} UTC</span>
            )}
            <span style={muted}>
              who&apos;s here: {roster && roster.slug === liveSlug
                ? `${roster.count} joined${roster.names.length ? ` — ${roster.names.slice(0, 3).join(", ")}${roster.names.length > 3 ? "…" : ""}` : ""}`
                : "—"}
            </span>
            <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => act("close")} disabled={busy}>
                {busy ? "Ending…" : "End the session 🕊️"}
              </button>
            </span>
          </>
        )}
      </div>
      {note && <p style={{ margin: "8px 0 0", fontSize: ".82rem", color: "var(--muted)" }}>{note}</p>}

      {/* ── the four doors ─────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2" style={{ marginTop: 14 }}>
        {DOORS.map((d) => (
          <div key={d.id} style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <b style={{ fontSize: ".92rem", color: "var(--ink-strong)" }}>{d.title}</b>
              {open === d.id ? <Chip tone="green">open</Chip> : <Chip tone="grey">{d.id === "call" ? `${sessions.length} today` : "door"}</Chip>}
            </div>
            <p style={muted}>{d.blurb}</p>

            {open === d.id && d.id === "read" && (
              <>
                {feed?.state.live ? (
                  <>
                    <p style={muted}>
                      ● <b>{liveTitle}</b> is open — the banner is up. The Stage:{" "}
                      <Link href={`/rooms/${liveSlug}`} style={{ color: "var(--gold-deep)" }}>/rooms/{liveSlug}</Link>{" "}
                      — sign in as Love at the door; the room&apos;s own gate knows your key.
                    </p>
                    {meeting.rail === "vdo" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={fieldLabel}>Next</span>
                        <a href={studioDirector} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ alignSelf: "flex-start" }}>
                          Open your director&apos;s desk
                        </a>
                        <p style={muted}>scene switching, mute-all, the room&apos;s own controls — opens in a new tab</p>
                        <a href={studioVdo.push} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost" style={{ alignSelf: "flex-start" }}>
                          Step on camera
                        </a>
                        <p style={muted}>opens your camera in a new tab; the stage watches this seat</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          <button
                            type="button"
                            className={`btn btn-sm ${feed.scene?.active === "starting" ? "btn-on" : "btn-ghost"}`}
                            onClick={() => actScene("starting", 20)}
                            disabled={sceneBusy}
                          >
                            {feed.scene?.active === "starting" ? "Waiting scene ✓" : "Waiting scene"}
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${feed.scene?.active === "solo" ? "btn-on" : "btn-ghost"}`}
                            onClick={() => actScene("solo")}
                            disabled={sceneBusy}
                          >
                            {feed.scene?.active === "solo" ? "On camera ✓" : "On camera"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {groups.map((g) => (
                        <div key={g.label}>
                          <span style={fieldLabel}>{g.label}</span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {g.rooms.map((r) => (
                              <button
                                key={r.slug}
                                type="button"
                                className={`btn btn-sm ${room === r.slug ? "btn-on" : "btn-ghost"}`}
                                onClick={() => setRoom(r.slug)}
                              >
                                {r.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {room && (
                      <p style={muted}>
                        The Stage: <Link href={`/rooms/${room}`} style={{ color: "var(--gold-deep)" }}>/rooms/{room}</Link>{" "}
                        — sign in as Love at the door; the room&apos;s own gate knows your key.
                      </p>
                    )}
                    <input
                      type="text"
                      className="console-field" style={{ ...field, width: "100%", fontSize: ".82rem" }}
                      placeholder="Opening word (optional — blank carries the house words)"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={300}
                    />
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".74rem", color: "var(--muted)" }}>
                      <input type="checkbox" checked={letter} onChange={(e) => setLetter(e.target.checked)} />
                      also queue the class-starting letter (off by default — the mail rail is reputation armor)
                    </label>
                    {railsDark && (
                      <p style={{ ...muted, color: "var(--err)" }}>
                        the rails are dark here (matrix bot token / live vault) — the door opens on the live site
                      </p>
                    )}
                  </>
                )}

                {/* TASK-236: the deeper-dive door — ALL rails, live or dark */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={fieldLabel}>then, in N minutes</span>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: ".82rem", color: "var(--ink)" }}>then, in</span>
                    <input
                      type="number"
                      min={1}
                      max={240}
                      value={afterHoursMinutes}
                      onChange={(e) => setAfterHoursMinutes(Number(e.target.value) || 1)}
                      className="console-field" style={{ ...field, width: 64 }}
                      disabled={!!afterHours}
                    />
                    <span style={{ fontSize: ".82rem", color: "var(--ink)" }}>minutes:</span>
                    <select
                      value={afterHours ? afterHours.room : afterHoursRoomSlug}
                      onChange={(e) => setAfterHoursRoomSlug(e.target.value)}
                      className="console-field" style={field}
                      disabled={!!afterHours || afterHoursRooms.length === 0}
                    >
                      {afterHoursRooms.map((r) => (
                        <option key={r.slug} value={r.slug}>{r.title}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => actAfterHours("after-hours")}
                      disabled={afterHoursBusy || !!afterHours || !afterHoursRoomSlug || vaultDark}
                    >
                      Set
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => actAfterHours("after-hours-clear")}
                      disabled={afterHoursBusy || !afterHours}
                    >
                      Clear
                    </button>
                  </div>
                  {afterHours && (
                    <p style={muted}>
                      then at{" "}
                      {new Date(afterHours.at * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      {" → "}
                      {afterHoursRoomTitle}
                    </p>
                  )}
                </div>
              </>
            )}

            {open === d.id && d.id === "youtube" && (
              <>
                <p style={muted}>
                  the studio&apos;s state comes with the kit — this card carries the links, never an invented
                  camera state. The room derives from the meeting config: <code>{studioVdo.room}</code>
                </p>
                <p style={muted}>
                  the full director&apos;s desk (scenes, names, the overlay URLs):{" "}
                  <Link href="/a/studio" style={{ color: "var(--gold-deep)" }}>/a/studio</Link> · the channel:{" "}
                  <a href={youtube} target="_blank" rel="noreferrer" style={{ color: "var(--gold-deep)" }}>YouTube</a>
                </p>
                <label style={{ display: "block" }}>
                  <span style={fieldLabel}>your camera (push)</span>
                  <input readOnly value={studioVdo.push} onFocus={(e) => e.target.select()} className="console-field" style={{ ...field, width: "100%", fontSize: ".74rem" }} />
                </label>
                <label style={{ display: "block" }}>
                  <span style={fieldLabel}>a guest&apos;s door — opens on the site</span>
                  <input readOnly value={studioGuestDoor} onFocus={(e) => e.target.select()} className="console-field" style={{ ...field, width: "100%", fontSize: ".74rem" }} />
                </label>
              </>
            )}

            {open === d.id && d.id === "call" && (
              <>
                {sessions.length === 0 ? (
                  <p style={muted}>— no confirmed calls today (UTC)</p>
                ) : (
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                    {sessions.map((s) => (
                      <li key={s.bookingId} style={{ fontSize: ".82rem", color: "var(--ink)" }}>
                        <b>{s.startUtc.slice(11, 16)} UTC</b> · {s.title} — {s.customer}
                      </li>
                    ))}
                  </ul>
                )}
                <p style={muted}>you host — your director seat rides the same page as the member&apos;s door.</p>
              </>
            )}

            {open === d.id && d.id === "cocreate" && (
              <>
                <label style={{ display: "block" }}>
                  <span style={fieldLabel}>room name</span>
                  <input
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. reading-with-ada"
                    className="console-field" style={{ ...field, width: "100%" }}
                  />
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={fieldLabel}>rail</span>
                  {(["jitsi", "vdo"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`btn btn-sm ${guestRail === r ? "btn-on" : "btn-ghost"}`}
                      onClick={() => setGuestRail(r)}
                    >
                      {r === "jitsi" ? "Jitsi" : "VDO"}
                    </button>
                  ))}
                  {meeting.rail === guestRail && <Chip tone="lavender">the config&apos;s rail</Chip>}
                </div>
                {guestNameReserved ? (
                  /* TASK-440: the /a uniformity law — ONE state, said once,
                     under the words (kit-text-quiet), and no unsigned copy
                     action beside it (the CopyDoor below rides guestLink,
                     which is null here). */
                  <p className="kit-text-quiet">That name is reserved for Love&apos;s studio.</p>
                ) : guestLink ? (
                  <label style={{ display: "block" }}>
                    <span style={fieldLabel}>the guest link (derived, never stored)</span>
                    <input readOnly value={guestLink} onFocus={(e) => e.target.select()} className="console-field" style={{ ...field, width: "100%", fontSize: ".74rem" }} />
                  </label>
                ) : (
                  <p style={muted}>— type a room name and the guest link derives here</p>
                )}
              </>
            )}

            {/* the doors hug the bottom — stacked, uniform */}
            <div style={doorStack}>
              {d.id === "read" && open === "read" && (
                feed?.state.live ? (
                  <button type="button" className="btn btn-sm" onClick={() => act("close")} disabled={busy}>
                    {busy ? "Closing…" : "Close the room 🕊️"}
                  </button>
                ) : (
                  <button type="button" className="btn btn-sm" onClick={() => act("open")} disabled={busy || !room || railsDark}>
                    {busy ? "Opening…" : "Open the room ●"}
                  </button>
                )
              )}
              {d.id === "youtube" && open === "youtube" && (
                <>
                  <CopyDoor value={studioVdo.push} label="Copy the push link" />
                  {/* TASK-297: the guest link Love hands out is the SITE url
                      (/meet/studio/<the studio room> on the request's own
                      origin) — the same door /a/studio's guest card carries,
                      never the studio host's address (T-292 DESIGN.md §2
                      Page B). The push link above stays a studio URL: that
                      one is HER camera seat, not a link anyone is handed. */}
                  <CopyDoor value={studioGuestDoor} label="Copy the guest link" />
                </>
              )}
              {d.id === "call" && open === "call" &&
                sessions.map((s) => (
                  <Link key={s.bookingId} className="btn btn-sm" href={`/meet/${s.bookingId}`}>
                    Open the room — {s.startUtc.slice(11, 16)} UTC · {s.customer}
                  </Link>
                ))}
              {d.id === "cocreate" && open === "cocreate" && guestLink && (
                <CopyDoor value={guestLink} label="Copy the guest link" />
              )}
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen((cur) => nextOpenDoor(cur, d.id))}>
                {open === d.id ? "Close this door" : "Open this door"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
