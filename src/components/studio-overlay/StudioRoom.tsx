"use client";

/**
 * THE DIRECTOR'S DESK (TASK-191, 0018.06.18 a₿ · block 966119) — the
 * client half of /a/studio. Everything here is typed or copied by the
 * operator: the scene chips, the host's own lower third, the guest roster
 * (name + specialty — the overlay's duo/phone thirds read the FIRST
 * guest), the show title, the per-scene overlay URLs to paste into OBS,
 * and the VDO push/guest links the page derived from the meeting config.
 * One save button writes the whole stage doc through the room's server
 * action. The cameras' live state is Phase 2 — it comes with the studio
 * kit, and the page says so up front.
 *
 * The Admiral's law holds on every card: the buttons hug the bottom,
 * stacked and uniform.
 */

import { useState } from "react";
import { Chip, SectionHead, field, glassCard } from "@/components/console/glass";
import { STUDIO_SCENES, type StudioSceneId } from "@/lib/studio/scenes";
import { GUEST_LIMIT, type StudioDoc } from "@/lib/studio/doc";
import { saveStudio } from "@/app/a/studio/actions";

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

export default function StudioRoom({
  initial,
  overlayUrls,
  overlayReady,
  vdo,
  showTitleFallback,
}: {
  initial: StudioDoc;
  overlayUrls: Record<StudioSceneId, string | null>;
  overlayReady: boolean;
  vdo: { room: string; push: string; guest: string };
  showTitleFallback: string;
}) {
  const [doc, setDoc] = useState<StudioDoc>(initial);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      {/* ── the scene picker ─────────────────────────────────────────── */}
      <SectionHead label="Scene" />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {STUDIO_SCENES.map((s) => (
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
              </div>
            )}
          </div>
        ))}
      </div>
      <p style={{ margin: "10px 0 0", fontSize: ".78rem", color: "var(--muted)" }}>
        paste one into OBS as a browser source, 1920×1080 — the page is transparent, the URL is the key.
      </p>

      {/* ── the VDO links ────────────────────────────────────────────── */}
      <SectionHead label="VDO links" />
      <p style={{ margin: "0 0 10px", fontSize: ".78rem", color: "var(--muted)" }}>
        the room name derives from the meeting config&apos;s prefix — <code>{vdo.room}</code>
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={card}>
          <b style={{ fontSize: ".92rem", color: "var(--ink-strong)" }}>your camera (push)</b>
          <div style={doorStack}>
            <CopyDoor value={vdo.push} label="Copy the push link" />
          </div>
        </div>
        <div style={card}>
          <b style={{ fontSize: ".92rem", color: "var(--ink-strong)" }}>a guest&apos;s door</b>
          <div style={doorStack}>
            <CopyDoor value={vdo.guest} label="Copy the guest link" />
          </div>
        </div>
      </div>
    </div>
  );
}
