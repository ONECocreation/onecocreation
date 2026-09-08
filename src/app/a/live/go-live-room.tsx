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
 *  3. Discovery call · 1:1 — today's confirmed bookings from the booking
 *     store (live.ts's confirmedToday, server-derived), one button each →
 *     /meet/<id> — Love hosts (the operator's director seat rides the same
 *     page).
 *  4. Co-create with a guest — a room name field, rail chips Jitsi | VDO
 *     from the meeting config, the guest link derived (never stored) and
 *     copy-able.
 *
 * The Admiral's law holds on every card: the buttons hug the bottom,
 * stacked, uniform.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Chip, field, glassCard } from "@/components/console/glass";
import { doorRoomGroups, type DoorRoom } from "@/components/console/LiveDoorCard";
import type { TodaySession } from "@/lib/live";

/* ── the pure model (exported for the tests — the house pins the model) ── */

export type GoLiveDoorId = "read" | "youtube" | "call" | "cocreate";

/** One door open at a time: opening one closes the others; tapping the
 *  open door closes it. */
export function nextOpenDoor(current: GoLiveDoorId | null, next: GoLiveDoorId): GoLiveDoorId | null {
  return current === next ? null : next;
}

/** The guest-typed room name, slugged for either rail — never stored,
 *  derived fresh on every keystroke. */
export function guestSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

/** The co-create guest link, derived from the meeting config: the Jitsi
 *  rail namespaces by the site's own space (live.ts's liveRoomPrefix, one
 *  derivation — a bare name would collide on the shared host); the VDO
 *  rail rooms by the config's prefix, the same shape as T-191's studio.
 *  A blank name is no link at all (derive-or-dash). */
export function guestMeetingLink(
  rail: "jitsi" | "vdo",
  name: string,
  cfg: { jitsiDomain: string; jitsiPrefix: string; vdoRoomPrefix: string },
): string | null {
  const slug = guestSlug(name);
  if (!slug) return null;
  if (rail === "vdo") return `https://vdo.ninja/?room=${encodeURIComponent(`${cfg.vdoRoomPrefix}-${slug}`)}`;
  return `https://${cfg.jitsiDomain}/${cfg.jitsiPrefix}${slug}`;
}

/* ── the feed shapes ───────────────────────────────────────────────────── */

interface DoorFeed {
  ok: boolean;
  state: { live: boolean; kind?: string; room?: string; startedAt?: number };
  rooms: DoorRoom[];
  matrixConfigured: boolean;
  vaultConfigured: boolean;
}

export interface GoLiveMeeting {
  rail: "jitsi" | "vdo" | "static";
  jitsiDomain: string;
  jitsiPrefix: string;
  vdoRoomPrefix: string;
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
  sessions,
  meeting,
  youtube,
  initialOpen = null,
}: {
  rooms: DoorRoom[];
  studioVdo: { room: string; push: string; guest: string };
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
  const [roster, setRoster] = useState<{ slug: string; count: number; names: string[] } | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestRail, setGuestRail] = useState<"jitsi" | "vdo">(meeting.rail === "vdo" ? "vdo" : "jitsi");

  const load = useCallback(() => {
    fetch("/api/admin/live", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.ok) return;
        setFeed(d);
        /* the Commons leads the picker, so it leads the default too */
        setRoom((cur) => cur || doorRoomGroups(d.rooms)[0]?.rooms[0]?.slug || "");
      })
      .catch(() => {});
  }, []);
  useEffect(load, [load]);

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

  const groups = doorRoomGroups(feed?.rooms ?? rooms);
  const liveTitle = liveSlug
    ? (feed?.rooms ?? rooms).find((r) => r.slug === liveSlug)?.title ?? liveSlug
    : null;
  const railsDark = feed ? !feed.matrixConfigured || !feed.vaultConfigured : false;
  const guestLink = guestMeetingLink(guestRail, guestName, meeting);

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
                  <p style={muted}>
                    ● <b>{liveTitle}</b> is open — the banner is up. The Stage:{" "}
                    <Link href={`/rooms/${liveSlug}`} style={{ color: "var(--gold-deep)" }}>/rooms/{liveSlug}</Link>{" "}
                    — sign in as Love at the door; the room&apos;s own gate knows your key.
                  </p>
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
                      style={{ ...field, width: "100%", fontSize: ".82rem" }}
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
                  <input readOnly value={studioVdo.push} onFocus={(e) => e.target.select()} style={{ ...field, width: "100%", fontSize: ".74rem" }} />
                </label>
                <label style={{ display: "block" }}>
                  <span style={fieldLabel}>a guest&apos;s door</span>
                  <input readOnly value={studioVdo.guest} onFocus={(e) => e.target.select()} style={{ ...field, width: "100%", fontSize: ".74rem" }} />
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
                    style={{ ...field, width: "100%" }}
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
                {guestLink ? (
                  <label style={{ display: "block" }}>
                    <span style={fieldLabel}>the guest link (derived, never stored)</span>
                    <input readOnly value={guestLink} onFocus={(e) => e.target.select()} style={{ ...field, width: "100%", fontSize: ".74rem" }} />
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
                  <CopyDoor value={studioVdo.guest} label="Copy the guest link" />
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
