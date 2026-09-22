"use client";

import { useEffect, useState } from "react";
import { Chip, field } from "@/components/console/glass";
import type { SiteConfig } from "@/lib/site-config";
import {
  DEFAULT_READING_SCHEDULE,
  READING_MAX_DURATION_MIN,
  validateReadingSchedule,
  type ReadingSchedule,
} from "@/lib/reading-schedule";
import { USA_ZONES } from "@/lib/us-zip-tz";

/* ── TASK-381 (block 968,047+) — the weekly reading, in plain words ──
   Self-contained (own fetch/save through /api/admin/site), the
   AboutVideosCard idiom: GET on mount, PUT its own `reading` patch on
   Save — same single endpoint, nothing else. No public surface: this sets
   the source T-382 (the notice) and T-370 (the sign-up block) will read;
   nothing a visitor sees changes from this card alone.

   RULED D4 — the zone <select> copies SlotPicker.tsx's own Map pattern
   (seed the currently-stored zone ahead of USA_ZONES, so a value outside
   the base list still shows as one extra option rather than being
   silently lost) instead of hand-rolling a fresh list. */

const WEEKDAYS: { value: number; label: string }[] = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

/* the same row/field vocabulary SiteRoom.tsx and AboutVideosCard.tsx both
   already use — copied, not reinvented, so every /a/site/* card still
   reads as one house. */
const row: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
  background: "var(--glass)", border: "1px solid rgba(139,118,196,.22)",
  borderRadius: 12, padding: "10px 14px", marginBottom: 8,
};

export default function ReadingScheduleCard() {
  const [schedule, setSchedule] = useState<ReadingSchedule | null>(null);
  const [savedYet, setSavedYet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/site", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.ok) return;
      const reading = (data.config as SiteConfig).reading;
      setSavedYet(reading !== undefined);
      setSchedule(reading ?? { ...DEFAULT_READING_SCHEDULE }); // unsaved = the default the site itself falls back to
    })();
  }, []);

  function update(patch: Partial<ReadingSchedule>) {
    if (!schedule) return;
    setErr(null);
    setSchedule({ ...schedule, ...patch });
  }

  async function save() {
    if (!schedule) return;
    setErr(null);
    const checked = validateReadingSchedule(schedule);
    if (!checked.ok) {
      setErr(checked.reason);
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/admin/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reading: checked.value }),
      });
      const data = await res.json();
      if (data.ok) {
        setSchedule(data.config.reading ?? { ...DEFAULT_READING_SCHEDULE });
        setSavedYet(true);
        setNote("saved ✓ the site reads this schedule on its next render");
      } else setNote(data.reason ?? "save failed");
    } catch {
      setNote("save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!schedule) return <p style={{ fontSize: ".82rem", color: "var(--muted)" }}>reading the schedule…</p>;

  // RULED D4: the currently-stored zone seeds the Map ahead of USA_ZONES —
  // if it's already one of them the Map simply keeps one entry (no extra
  // option shows); if it isn't, it survives as its own bare-name option.
  const zoneOptions = [...new Map<string, string>([
    [schedule.tz, schedule.tz],
    ...USA_ZONES.map(({ tz, label }) => [tz, label] as [string, string]),
  ])];

  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: ".8rem", color: "var(--muted)", margin: "0 0 10px", maxWidth: 640 }}>
        {savedYet
          ? "This is your saved schedule."
          : "This is the built-in default — save once to make it your own."}
      </p>

      <div style={row}>
        <button
          type="button"
          aria-pressed={schedule.on}
          aria-label={`Show the next reading time on the site — currently ${schedule.on ? "on" : "off"}`}
          onClick={() => update({ on: !schedule.on })}
          className={`btn btn-sm ${schedule.on ? "btn-on" : "btn-ghost"}`}
        >
          {schedule.on ? "ON" : "OFF"}
        </button>
        <div style={{ flex: 1, minWidth: 220 }}>
          <b style={{ fontSize: ".9rem" }}>Show the next reading time on the site</b>
          <span style={{ fontSize: ".78rem", color: "var(--muted)" }}>
            {" "}— {schedule.on ? "visitors see the next time" : 'visitors see a "stay tuned" message instead'}
          </span>
        </div>
        <Chip tone={schedule.on ? "green" : "grey"}>{schedule.on ? "ON — showing" : "OFF — hidden"}</Chip>
      </div>

      <div style={row}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <b style={{ fontSize: ".9rem" }}>Which day</b>
        </div>
        <select
          value={schedule.weekday}
          onChange={(e) => update({ weekday: Number(e.target.value) })}
          className="console-field" style={{ ...field, minWidth: 160 }}
          aria-label="Which day"
        >
          {WEEKDAYS.map((w) => (
            <option key={w.value} value={w.value}>{w.label}</option>
          ))}
        </select>
      </div>

      <div style={row}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <b style={{ fontSize: ".9rem" }}>What time</b>
        </div>
        <input
          type="time"
          value={schedule.time}
          onChange={(e) => update({ time: e.target.value })}
          className="console-field" style={{ ...field, minWidth: 160 }}
          aria-label="What time"
        />
      </div>

      <div style={row}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <b style={{ fontSize: ".9rem" }}>Which time zone</b>
          <div style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: 4 }}>
            Mountain time prints as MDT in summer and MST in winter; the site handles the change.
          </div>
        </div>
        <select
          value={schedule.tz}
          onChange={(e) => update({ tz: e.target.value })}
          className="console-field" style={{ ...field, minWidth: 220 }}
          aria-label="Which time zone"
        >
          {zoneOptions.map(([tz, label]) => (
            <option key={tz} value={tz}>{label}</option>
          ))}
        </select>
      </div>

      <div style={row}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <b style={{ fontSize: ".9rem" }}>How long it runs</b>
          <span style={{ fontSize: ".78rem", color: "var(--muted)" }}> — minutes</span>
        </div>
        <input
          type="number"
          min={1}
          max={READING_MAX_DURATION_MIN}
          step={1}
          value={schedule.durationMin}
          onChange={(e) => update({ durationMin: Number(e.target.value) })}
          className="console-field" style={{ ...field, minWidth: 120 }}
          aria-label="How long it runs, in minutes"
        />
      </div>

      {err && <p style={{ fontSize: ".8rem", color: "var(--err)", margin: "4px 0 0" }}>{err}</p>}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
        <button type="button" className="btn btn-gold btn-sm" disabled={busy} onClick={save}
          style={busy ? { opacity: 0.5 } : undefined}>
          {busy ? "Saving…" : "Save the reading time"}
        </button>
        {note && (
          <span style={{ fontSize: ".8rem", color: note.startsWith("saved") ? "var(--ok)" : "var(--err)" }}>
            {note}
          </span>
        )}
      </div>
    </div>
  );
}
