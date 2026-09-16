"use client";

/**
 * THE DIRECTOR'S DESK (TASK-191, 0018.06.18 a₿ · block 966119; the
 * "Starts at"/"After-hours line" fields and the full scenes' "show in the
 * studio" doors added TASK-244) — the client half of /a/studio. Everything
 * here is typed or copied by the operator: the scene chips (grouped "On
 * camera" / "Full screen"), the host's own lower third, the guest roster
 * (name + specialty — the overlay's duo/phone thirds read the FIRST
 * guest), the show title, the countdown target and the after-hours line,
 * the per-scene overlay URLs to paste into OBS, the full scenes' extra
 * VDO.Ninja "&website" source URL, and the VDO push/guest links the page
 * derived from the meeting config. One save button writes the whole stage
 * doc through the room's server action. The cameras' live state is Phase 2
 * — it comes with the studio kit, and the page says so up front.
 *
 * The Admiral's law holds on every card: the buttons hug the bottom,
 * stacked and uniform.
 */

import { useCallback, useState, useSyncExternalStore } from "react";
import { Chip, SectionHead, field, glassCard } from "@/components/console/glass";
import { STUDIO_SCENES, type StudioSceneId } from "@/lib/studio/scenes";
import { GUEST_LIMIT, type StudioDoc } from "@/lib/studio/doc";
import { saveStudio } from "@/app/a/studio/actions";

/* datetime-local speaks LOCAL wall-clock words with no timezone — the
   doc stores an instant (ISO), so the field's value is a round-trip
   translation, never the stored string itself. */
function isoToLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToIso(v: string): string {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

const fieldLabel: React.CSSProperties = {
  display: "block", fontSize: ".62rem", letterSpacing: ".1em", textTransform: "uppercase",
  color: "var(--muted)", marginBottom: 3,
};

/* every action card: the buttons hug the bottom, stacked, uniform */
const card: React.CSSProperties = { ...glassCard, display: "flex", flexDirection: "column", gap: 10 };
const doorStack: React.CSSProperties = { marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 };

function CopyDoor({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <input readOnly value={value} onFocus={(e) => e.target.select()} style={{ ...field, width: "100%", fontSize: ".78rem" }} />
      <button
        type="button"
        className="btn btn-sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {
            /* the field above is selectable — the manual way always works */
          }
        }}
      >
        {copied ? "copied ✓" : label}
      </button>
    </div>
  );
}

/** TASK-300: an OPEN anchor's own copy-to-clipboard sibling — the ghost
 *  secondary beside the primary OPEN button. Same clipboard logic as
 *  CopyDoor above, without the visible read-only input field (OPEN
 *  replaces the need to read the raw URL by eye). */
function CopyGhost({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-sm btn-ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* the OPEN button beside this one always works */
        }
      }}
    >
      {copied ? "copied ✓" : label}
    </button>
  );
}

/* TASK-300 (Love call #4 item 1): "For the director's desk" open/closed,
   remembered in localStorage — the Site-room accordion idiom PagesPanel's
   Archive group uses (T-230): closed is the honest default (this IS the
   clutter Love asked to have out from under her links), useSyncExternalStore
   keeps the server paint and the remembered state from forking hydration,
   and same-tab writes ring the accordion's own change bell. */
const DESK_LS_KEY = "oc-studio-desk-section-open";
const DESK_LS_EVENT = "oc-studio-desk-section-open-change";

function readDeskOpen(): boolean {
  try {
    return window.localStorage.getItem(DESK_LS_KEY) === "1";
  } catch {
    return false; /* storage can be denied — closed is the honest default */
  }
}

function useDeskOpen(): [boolean, () => void] {
  const open = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      window.addEventListener(DESK_LS_EVENT, onChange);
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(DESK_LS_EVENT, onChange);
      };
    },
    readDeskOpen,
    () => false,
  );
  const toggle = useCallback(() => {
    try {
      window.localStorage.setItem(DESK_LS_KEY, readDeskOpen() ? "0" : "1");
    } catch {
      /* storage denied — nothing to remember; the section stays closed */
    }
    window.dispatchEvent(new Event(DESK_LS_EVENT));
  }, []);
  return [open, toggle];
}

export default function StudioRoom({
  initial,
  overlayUrls,
  overlayReady,
  vdo,
  director,
  showInStudioUrls,
  showTitleFallback,
  roomTitle,
  roomKeyed,
  guestDoor,
}: {
  initial: StudioDoc;
  overlayUrls: Record<StudioSceneId, string | null>;
  overlayReady: boolean;
  vdo: { room: string; push: string; guest: string };
  /** TASK-261: the director seat's own link (`studioDirectorLink`), a
   *  SEPARATE derivation from `vdo.push` — see go-live-room.tsx's same
   *  prop for the full reasoning. */
  director: string;
  /** TASK-244: null for the on-camera scenes and for a full scene with no minted overlay URL yet */
  showInStudioUrls: Record<StudioSceneId, string | null>;
  showTitleFallback: string;
  /** TASK-300: the room's plain human name (brand/rooms.json on the
   *  fork, TASK-262) — page.tsx carries it, this component only titles
   *  the links card with it. Optional (falls back to the generic "the
   *  studio") so an older render call with no opinion on the name still
   *  type-checks — derive-or-dash, never invent a specific name here. */
  roomTitle?: string;
  /** TASK-305: whether the links above carry `&password=<key>` — words
   *  only, NEVER the key itself (the door links already carry it; this
   *  line just says the room is locked). `undefined`/`false` reads as the
   *  honest unkeyed state (no SEAT_SECRET configured), never a guess. */
  roomKeyed?: boolean;
  /** TASK-297: the guest door Love hands out — the SITE url
   *  (`/meet/studio/<room>` on the request's own origin, page.tsx's
   *  derivation via live-links.ts's meetStudioUrl), never the studio
   *  host's address (T-292 DESIGN.md §2 Page B). Keyless by posture: the
   *  key rides only inside the iframe src that page's own frame route
   *  mints. Required — the one true door, never re-derived here. */
  guestDoor: string;
}) {
  const [doc, setDoc] = useState<StudioDoc>(initial);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deskOpen, toggleDesk] = useDeskOpen();

  const setGuest = (i: number, patch: Partial<{ name: string; specialty: string }>) =>
    setDoc({ ...doc, guests: doc.guests.map((g, j) => (j === i ? { ...g, ...patch } : g)) });

  async function save(next: StudioDoc) {
    setBusy(true);
    setNote(null);
    setError(null);
    try {
      const res = await saveStudio(next);
      if (res.ok) {
        setDoc(res.doc);
        setNote("saved ✓");
      } else {
        setError(res.reason);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-2 text-sm" style={{ color: "var(--ink)" }}>
      {/* ── TASK-300 (Love call #4 items 1-2): the links card, FIRST on
          the page — was "VDO links" at the bottom (T-261); moved up,
          nothing removed. Each row keeps its heading, blurb, and Copy
          button; OPEN (new tab) is the new primary door. ─────────────── */}
      <SectionHead label={`${roomTitle ?? "the studio"} — ${vdo.room}`} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={card}>
          <b style={{ fontSize: ".92rem", color: "var(--ink-strong)" }}>your director&apos;s desk</b>
          <p style={{ margin: 0, fontSize: ".76rem", color: "var(--muted)" }}>
            scene switching, mute-all, the room&apos;s own controls — {vdo.room}
          </p>
          <div style={doorStack}>
            <a href={director} target="_blank" rel="noopener" className="btn btn-sm">
              Open your director&apos;s desk
            </a>
            <CopyGhost value={director} label="Copy the director link" />
          </div>
        </div>
        <div style={card}>
          <b style={{ fontSize: ".92rem", color: "var(--ink-strong)" }}>on camera</b>
          <p style={{ margin: 0, fontSize: ".76rem", color: "var(--muted)" }}>
            step onto camera yourself — {vdo.room}
          </p>
          <div style={doorStack}>
            <a href={vdo.push} target="_blank" rel="noopener" className="btn btn-sm">
              Step on camera
            </a>
            <CopyGhost value={vdo.push} label="Copy the push link" />
          </div>
        </div>
        <div style={card}>
          <b style={{ fontSize: ".92rem", color: "var(--ink-strong)" }}>a guest&apos;s door</b>
          <p style={{ margin: 0, fontSize: ".76rem", color: "var(--muted)" }}>
            camera and mic off until they choose — you can unmute from the desk — opens on the site, {vdo.room}
          </p>
          <div style={doorStack}>
            <a href={guestDoor} target="_blank" rel="noopener" className="btn btn-sm">
              Guest door
            </a>
            <CopyGhost value={guestDoor} label="Copy the guest link" />
          </div>
        </div>
      </div>
      {/* TASK-305: words only, never the key itself — the doors above
          already carry it. Honest either way: derive-or-dash. */}
      <p style={{ margin: "8px 0 0", fontSize: ".76rem", color: "var(--muted)" }}>
        {roomKeyed ? "Room key: on · rotates with the seat secret" : "room unkeyed — SEAT_SECRET unset"}
      </p>
      <p style={{ margin: "10px 0 0", fontSize: ".78rem", color: "var(--muted)" }}>
        Send this guest door to a member
      </p>
      <div style={{ marginTop: 6 }}>
        <button type="button" className="btn btn-sm btn-ghost" disabled aria-disabled="true">
          Send to user — coming with T-304
        </button>
      </div>

      {/* ── TASK-300: everything else — guest-panel setup, timers, the
          scene/overlay URL list — collapses under one section until
          T-292 moves it to the director view (Love call #4 item 1).
          Same accordion idiom as PagesPanel's Archive group (T-230):
          closed by default, remembered per-browser in localStorage.
          Nothing below was deleted or renamed — only regrouped. ─────── */}
      <div style={{ marginTop: 16, borderTop: "2px solid rgba(139,118,196,.35)", paddingTop: 10 }}>
        <button
          type="button"
          onClick={toggleDesk}
          aria-expanded={deskOpen}
          title={deskOpen ? "fold this away" : "guest-panel setup, timers, the scene/overlay URL list — moving to the director view"}
          style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "2px 0",
            marginBottom: deskOpen ? 10 : 0, background: "none", border: "none", cursor: "pointer",
            textAlign: "left", fontSize: ".78rem", fontWeight: 700, letterSpacing: ".04em",
            color: "var(--muted)" }}
        >
          <span aria-hidden>{deskOpen ? "▾" : "▸"}</span>
          For the director&apos;s desk (moving to the director view)
        </button>
        {deskOpen && (
          <>
            <p style={{ margin: "0 0 4px", fontSize: ".85rem", color: "var(--muted)" }}>
              the broadcast studio&apos;s desk — pick the scene, type the names, paste the overlay URL into OBS.
            </p>
            <p style={{ margin: "0 0 4px", fontSize: ".78rem", color: "var(--muted)" }}>
              the cameras&apos; live state comes with the studio kit — this room is the scenes, the names, and the links.
            </p>
            {error && (
              <p style={{ margin: "10px 0 0", padding: "8px 14px", borderRadius: 10, fontSize: ".82rem",
                color: "var(--err)", background: "rgba(197,110,139,.04)", border: "1px solid rgba(197,110,139,.4)" }}>
                ◌ {error}
              </p>
            )}
            {note && (
              <p style={{ margin: "10px 0 0", fontSize: ".82rem", color: "var(--ok)" }}>{note}</p>
            )}

            {/* ── the scene picker — six chips, grouped ──────────────── */}
            <SectionHead label="Scene" />
            {(
        [
          { kind: "overlay" as const, heading: "On camera" },
          { kind: "full" as const, heading: "Full screen" },
        ]
      ).map((group) => (
        <div key={group.kind} style={{ marginBottom: 10 }}>
          <span style={{ display: "block", fontSize: ".64rem", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>
            {group.heading}
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {STUDIO_SCENES.filter((s) => s.kind === group.kind).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setDoc({ ...doc, activeScene: s.id })}
                className={`btn btn-sm ${doc.activeScene === s.id ? "btn-on" : "btn-ghost"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      <p style={{ margin: "0 0 4px", fontSize: ".78rem", color: "var(--muted)" }}>
        {STUDIO_SCENES.find((s) => s.id === doc.activeScene)?.blurb}
      </p>

      {/* ── the stage: host + show title ─────────────────────────────── */}
      <SectionHead label="The stage" />
      <div style={card}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span style={fieldLabel}>your name (the host)</span>
            <input
              value={doc.host.name}
              onChange={(e) => setDoc({ ...doc, host: { ...doc.host, name: e.target.value } })}
              style={{ ...field, width: "100%" }}
            />
          </label>
          <label className="block">
            <span style={fieldLabel}>your line under it</span>
            <input
              value={doc.host.specialty}
              onChange={(e) => setDoc({ ...doc, host: { ...doc.host, specialty: e.target.value } })}
              placeholder="what you do, in two or three words"
              style={{ ...field, width: "100%" }}
            />
          </label>
          <label className="block sm:col-span-2">
            <span style={fieldLabel}>show title</span>
            <input
              value={doc.showTitle}
              onChange={(e) => setDoc({ ...doc, showTitle: e.target.value })}
              placeholder={showTitleFallback}
              style={{ ...field, width: "100%" }}
            />
          </label>
        </div>
        <div style={doorStack}>
          <button type="button" disabled={busy} onClick={() => save(doc)} className="btn btn-sm">
            {busy ? "Saving…" : "Save the stage"}
          </button>
        </div>
      </div>

      {/* ── TASK-244: the full scenes' own two inputs ────────────────── */}
      <SectionHead label="The full scenes" />
      <div style={card}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span style={fieldLabel}>starts at</span>
            <input
              type="datetime-local"
              value={isoToLocalInput(doc.startsAt)}
              onChange={(e) => setDoc({ ...doc, startsAt: localInputToIso(e.target.value) })}
              style={{ ...field, width: "100%" }}
            />
          </label>
          <label className="block">
            <span style={fieldLabel}>after-hours line</span>
            <input
              value={doc.afterHoursLine}
              onChange={(e) => setDoc({ ...doc, afterHoursLine: e.target.value })}
              placeholder="left blank = the thank-you scene omits the line"
              style={{ ...field, width: "100%" }}
            />
          </label>
        </div>
        <p style={{ margin: 0, fontSize: ".76rem", color: "var(--muted)" }}>
          left blank, &ldquo;starting soon&rdquo; shows the words alone — no clock, ever.
        </p>
        <div style={doorStack}>
          <button
            type="button"
            onClick={() => setDoc({ ...doc, startsAt: new Date(Date.now() + 20 * 60_000).toISOString() })}
            className="btn btn-ghost btn-sm"
          >
            In 20 min
          </button>
          <button type="button" disabled={busy} onClick={() => save(doc)} className="btn btn-sm">
            {busy ? "Saving…" : "Save the full scenes"}
          </button>
        </div>
      </div>

      {/* ── the guest roster ─────────────────────────────────────────── */}
      <SectionHead label="Guest roster" />
      <p style={{ margin: "0 0 10px", fontSize: ".78rem", color: "var(--muted)" }}>
        name + specialty each — the side-by-side and phone scenes lower-third the FIRST guest
      </p>
      {doc.guests.length === 0 && (
        <p style={{ fontSize: ".82rem", color: "var(--muted)" }}>
          No guests yet — add one and the duo and phone scenes have their second name.
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {doc.guests.map((g, i) => (
          <div key={i} style={card}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span style={fieldLabel}>guest {i + 1} — name</span>
                <input value={g.name} onChange={(e) => setGuest(i, { name: e.target.value })} style={{ ...field, width: "100%" }} />
              </label>
              <label className="block">
                <span style={fieldLabel}>specialty</span>
                <input
                  value={g.specialty}
                  onChange={(e) => setGuest(i, { specialty: e.target.value })}
                  placeholder="what they carry, in two or three words"
                  style={{ ...field, width: "100%" }}
                />
              </label>
            </div>
            <div style={doorStack}>
              <button
                type="button"
                onClick={() => setDoc({ ...doc, guests: doc.guests.filter((_, j) => j !== i) })}
                className="btn btn-ghost btn-sm"
              >
                Remove this guest
              </button>
            </div>
          </div>
        ))}
        {doc.guests.length < GUEST_LIMIT && (
          <div style={card}>
            <div style={doorStack}>
              <button
                type="button"
                onClick={() => setDoc({ ...doc, guests: [...doc.guests, { name: "", specialty: "" }] })}
                className="btn btn-sm"
              >
                + Add a guest
              </button>
              <button type="button" disabled={busy} onClick={() => save(doc)} className="btn btn-sm">
                {busy ? "Saving…" : "Save the roster"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── the overlay URLs ─────────────────────────────────────────── */}
      <SectionHead label="Overlay URLs" />
      {!overlayReady && (
        <p style={{ fontSize: ".82rem", color: "var(--err)" }}>
          the overlay is closed on this deployment — the operator seat secret (SEAT_SECRET) is unset,
          so no signed URL can be minted.
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {STUDIO_SCENES.map((s) => (
          <div key={s.id} style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <b style={{ fontSize: ".92rem", color: "var(--ink-strong)" }}>{s.label}</b>
              {doc.activeScene === s.id ? <Chip tone="green">picked</Chip> : <Chip tone="grey">{s.id}</Chip>}
            </div>
            {overlayUrls[s.id] && (
              <div style={doorStack}>
                <CopyDoor value={overlayUrls[s.id]!} label={`Copy the ${s.id} overlay URL`} />
                {s.kind === "full" && showInStudioUrls[s.id] && (
                  <CopyDoor value={showInStudioUrls[s.id]!} label={`Show ${s.id} in the studio`} />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <p style={{ margin: "10px 0 0", fontSize: ".78rem", color: "var(--muted)" }}>
        paste one into OBS as a browser source, 1920×1080 — the on-camera scenes are transparent, the
        full-screen scenes are opaque; &ldquo;Show … in the studio&rdquo; pushes a full scene straight into the VDO
        room instead, via its own &amp;website source.
      </p>
          </>
        )}
      </div>
    </div>
  );
}
