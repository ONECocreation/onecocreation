"use client";

import { useEffect, useRef, useState } from "react";
import { Chip } from "@/components/console/glass";
import Button from "@/components/kit/Button";
import type { SiteConfig } from "@/lib/site-config";
import { validateReadingDatedEvents, type ReadingDatedEvent } from "@/lib/reading-schedule";
import { wallClockToUtc } from "@/lib/booking-time";

/**
 * THE DATED EVENTS CARD (TASK-616, K176, Love's mail #86): "Add more dates
 * to the 'coming up' and add these events to the Calendar on the site."
 * This is her side of it: one row per one-off date under the Weekly
 * reading card's T-614 switch rows, in the same row style (kit-switch-row:
 * bold words, quiet line, controls on the right), then one form to add or
 * edit a date. Persisted as `readingEvents` on the site-config doc
 * (site-config.ts), whole-list replace on every add/edit/remove - the
 * replays card's own idiom: PUT, read back the SAVED config, note in
 * words, a real ref guards the double-tap race. Every failure reads as
 * the list it last knew, never an invented date.
 *
 * The same list is what /reading's "Coming up" card, the member calendar,
 * and Love's Desk all read - one save, every surface agrees.
 *
 * CLASSES ONLY (the design-drift law for a NEW file): kit-switch-row for
 * the rows, the kit field grammar for the inputs, the console Chip for
 * status - zero style attributes, zero colour literals.
 */

const EMPTY_FORM = { date: "", time: "", title: "", note: "", actionLabel: "", actionHref: "" };

/** "Saturday, October 24, 2026" in the schedule's own zone - the noon
    anchor, so a zone ahead of UTC never reads the day before. */
function dayLabel(date: string, tz: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const ms = wallClockToUtc(y, m, d, 12, 0, tz).getTime();
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(new Date(ms));
}

/** "1:11 PM Mountain Time" - the schedule's own zone names itself (Mountain Time), the
    exact wallClockToUtc derivation the public "Coming up" card makes, so
    her desk row and the site never word a clock differently. */
function clockLabel(date: string, time: string, tz: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const ms = wallClockToUtc(y, m, d, hh, mm, tz).getTime();
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "longGeneric",
  }).format(new Date(ms));
}

function sortEvents(list: ReadingDatedEvent[]): ReadingDatedEvent[] {
  return [...list].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time ?? "99") < (b.time ?? "99") ? -1 : 1,
  );
}

export default function DatedEventsCard() {
  const [events, setEvents] = useState<ReadingDatedEvent[] | null>(null);
  const [tz, setTz] = useState("America/Denver");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/site", { cache: "no-store" });
        const data = res.ok ? await res.json() : null;
        if (!alive || !data?.ok) return;
        const config = data.config as SiteConfig;
        setEvents(sortEvents(config.readingEvents ?? []));
        if (config.reading?.tz) setTz(config.reading.tz);
      } catch {
        /* no list read, no edit offered - events stays null */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function saveList(next: ReadingDatedEvent[], okWords: string) {
    if (busyRef.current) return;
    const checked = validateReadingDatedEvents(next);
    if (!checked.ok) {
      setErr(checked.reason);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setNote(null);
    setErr(null);
    try {
      const res = await fetch("/api/admin/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readingEvents: checked.value }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        /* read back the SAVED config, never the hoped-for list */
        setEvents(sortEvents((data.config as SiteConfig).readingEvents ?? []));
        setNote(okWords);
        setForm(EMPTY_FORM);
        setEditIndex(null);
      } else {
        setNote(data?.reason ?? "save failed");
      }
    } catch {
      setNote("save failed");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function submit() {
    if (!events) return;
    const action =
      form.actionLabel.trim() || form.actionHref.trim()
        ? { label: form.actionLabel.trim(), href: form.actionHref.trim() }
        : undefined;
    const entry: ReadingDatedEvent = {
      date: form.date,
      ...(form.time ? { time: form.time } : {}),
      title: form.title.trim(),
      ...(form.note.trim() ? { note: form.note.trim() } : {}),
      ...(action ? { action } : {}),
    };
    const next = [...events];
    if (editIndex !== null) next.splice(editIndex, 1, entry);
    else next.push(entry);
    saveList(sortEvents(next), editIndex !== null ? "saved - the date is updated on the site's next render" : "saved - the date joins Coming up on the site's next render");
  }

  function startEdit(i: number) {
    if (!events) return;
    const e = events[i];
    setErr(null);
    setNote(null);
    setEditIndex(i);
    setForm({
      date: e.date,
      time: e.time ?? "",
      title: e.title,
      note: e.note ?? "",
      actionLabel: e.action?.label ?? "",
      actionHref: e.action?.href ?? "",
    });
  }

  function removeAt(i: number) {
    if (!events) return;
    const next = events.filter((_, j) => j !== i);
    saveList(next, "saved - the date is off Coming up on the site's next render");
  }

  if (events === null) return <p className="kit-text-quiet">reading the dated events…</p>;

  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const canSave = !busy && !!form.date && !!form.title.trim();

  return (
    <div className="kit-dated-events">
      <p className="kit-text-quiet">
        One-off dates for the Coming up card on the reading page and the calendars: a reading on a
        different weekday, a travel week&apos;s single event, a full day of parts. The weekly schedule
        above keeps its own rhythm; these ride beside it.
      </p>

      {events.length === 0 && (
        <p className="kit-text-quiet">No one-off dates yet. Add the first one below.</p>
      )}

      {events.map((e, i) => {
        const past = e.date < todayKey;
        return (
          <div className="kit-switch-row" key={`${e.date}-${e.time ?? "day"}-${e.title}-${i}`}>
            <div className="kit-switch-row-text">
              <b>{`${dayLabel(e.date, tz)}${e.time ? ` · ${clockLabel(e.date, e.time, tz)}` : ""} - ${e.title}`}</b>
              <span>{e.note ? ` - ${e.note}` : " - no note"}</span>
              {e.action && <span>{` · button: ${e.action.label} (${e.action.href})`}</span>}
            </div>
            <Chip tone={past ? "grey" : "green"}>{past ? "PAST" : "COMING UP"}</Chip>
            <Button sm variant="main" className="btn-ghost" disabled={busy} onClick={() => startEdit(i)} aria-label={`Edit ${e.title} on ${e.date}`}>
              Edit
            </Button>
            <Button sm variant="main" className="btn-ghost" disabled={busy} onClick={() => removeAt(i)} aria-label={`Remove ${e.title} on ${e.date}`}>
              Remove
            </Button>
          </div>
        );
      })}

      <p className="kit-text-quiet">
        {editIndex !== null ? "Edit the date, then save it." : "Add a date. Leave the clock empty for a whole-day note (no time shown)."}
      </p>
      <div className="kit-switch-row">
        <div className="kit-switch-row-text">
          <b>Which date</b>
        </div>
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="kit-field-input console-field"
          aria-label="Which date"
        />
      </div>
      <div className="kit-switch-row">
        <div className="kit-switch-row-text">
          <b>What time</b>
          <span> - the schedule&apos;s own zone (Mountain prints as Mountain Time all year). Empty = a whole-day note.</span>
        </div>
        <input
          type="time"
          value={form.time}
          onChange={(e) => setForm({ ...form, time: e.target.value })}
          className="kit-field-input console-field"
          aria-label="What time"
        />
      </div>
      <div className="kit-switch-row">
        <div className="kit-switch-row-text">
          <b>What it is</b>
        </div>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="kit-field-input console-field"
          placeholder="Read with Love"
          aria-label="What it is"
        />
      </div>
      <div className="kit-switch-row">
        <div className="kit-switch-row-text">
          <b>A quiet line under it</b>
          <span> - optional</span>
        </div>
        <input
          type="text"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          className="kit-field-input console-field"
          placeholder="Only one event this week, due to travel."
          aria-label="A quiet line under it"
        />
      </div>
      <div className="kit-switch-row">
        <div className="kit-switch-row-text">
          <b>A button</b>
          <span> - optional; the link must be a page on this site (start with /)</span>
        </div>
        <input
          type="text"
          value={form.actionLabel}
          onChange={(e) => setForm({ ...form, actionLabel: e.target.value })}
          className="kit-field-input console-field"
          placeholder="Submit your questions here"
          aria-label="The button's words"
        />
        <input
          type="text"
          value={form.actionHref}
          onChange={(e) => setForm({ ...form, actionHref: e.target.value })}
          className="kit-field-input console-field"
          placeholder="/contact"
          aria-label="The button's link"
        />
      </div>

      {err && <p className="kit-field-error">{err}</p>}

      <div className="kit-btn-row">
        <button
          type="button"
          className="btn btn-gold btn-sm"
          disabled={!canSave}
          onClick={submit}
        >
          {busy ? "Saving…" : editIndex !== null ? "Save the change" : "Add the date"}
        </button>
        {editIndex !== null && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy}
            onClick={() => {
              setEditIndex(null);
              setForm(EMPTY_FORM);
              setErr(null);
            }}
          >
            Cancel
          </button>
        )}
        {note && (
          <span className={note.startsWith("saved") ? "kit-text-quiet" : "kit-field-error"}>
            {note}
          </span>
        )}
      </div>
    </div>
  );
}
