"use client";

import { useEffect, useState } from "react";
import type { Service, AvailabilityRule, DateOverride, BookingConfig } from "@/lib/booking";

/**
 * /a/booking — the artist describes their week (spec: docs/booking-flow.md,
 * step 1). Services on the left, weekly rules and date exceptions on the
 * right. Session-gated only: saying what you offer and when you work is
 * cosmetic-tier under the /a/store stakes model. Money and refunds take a
 * per-action signature, and they arrive with step 3.
 *
 * The "block this slot" button lives here too — it is the manual answer to
 * the Google-iCal lag (spec §6): our own config is the source of truth, and
 * Google can only ever be an advisory overlay that removes time.
 */

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const blankService = (tz: string): Service => ({
  id: "",
  schemaVersion: 1,
  title: "",
  blurb: "",
  durationMin: 60,
  bufferMin: 15,
  price: { sats: undefined, fiat: undefined },
  pricingMode: "fixed",
  minLeadHours: 24,
  maxAdvanceDays: 60,
  meetingRail: { kind: "static", url: "" },
  artistTz: tz,
  status: "hidden",
});

export default function BookingRoom() {
  const [config, setConfig] = useState<BookingConfig | null>(null);
  const [defaultTz, setDefaultTz] = useState("UTC");
  const [draft, setDraft] = useState<Service | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/booking");
      if (res.status === 401) return setDenied(true);
      const data = await res.json();
      if (data.ok) {
        setConfig(data);
        setDefaultTz(data.defaultTz);
      }
    })();
  }, []);

  async function save(kind: "service" | "rule" | "override", value: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/booking", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, value }),
      });
      const data = await res.json();
      if (!data.ok) setError(data.reason ?? "save failed");
      else {
        setConfig(data);
        if (kind === "service") setDraft(null);
      }
    } catch {
      setError("save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(kind: string, id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/booking?kind=${kind}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) setConfig(data);
      else setError(data.reason ?? "delete failed");
    } finally {
      setBusy(false);
    }
  }

  if (denied) return <p className="p-6 text-sm text-amber-300">◌ operator session required.</p>;
  if (!config) return <p className="p-6 text-sm text-neutral-400">Loading the calendar…</p>;

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-lg font-bold tracking-widest text-cyan-300">THE CALENDAR</h1>
      <p className="mt-1 text-xs text-neutral-400">
        what you offer, and when you work. Times are your wall clock — visitors see their own.
      </p>
      {error && <p className="mt-3 border border-amber-700 px-3 py-2 text-xs text-amber-300">◌ {error}</p>}

      {/* ── services ─────────────────────────────────────────────────── */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide">SESSIONS</h2>
          <button
            type="button"
            onClick={() => setDraft(blankService(defaultTz))}
            className="border border-cyan-700 px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-900/30"
          >
            + new
          </button>
        </div>

        {config.services.length === 0 && !draft && (
          <p className="mt-3 text-xs text-neutral-500">No sessions yet.</p>
        )}

        <ul className="mt-3 space-y-2">
          {config.services.map((s) => (
            <li key={s.id} className="border border-neutral-800 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm text-neutral-100">{s.title}</span>
                <span className="text-xs text-neutral-500">
                  {s.durationMin}min +{s.bufferMin} · {s.pricingMode === "pwyc" ? "give what you can" : "fixed"} ·{" "}
                  <span className={s.status === "live" ? "text-cyan-300" : "text-neutral-500"}>{s.status}</span>
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDraft(s)}
                  className="border border-neutral-700 px-2 py-0.5 text-xs hover:border-cyan-600"
                >
                  edit
                </button>
                <button
                  type="button"
                  onClick={() => remove("service", s.id)}
                  className="border border-neutral-800 px-2 py-0.5 text-xs text-neutral-500 hover:border-amber-700 hover:text-amber-300"
                >
                  delete
                </button>
              </div>
            </li>
          ))}
        </ul>

        {draft && (
          <div className="mt-4 border border-cyan-900 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="title">
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="timezone (yours)">
                <input
                  value={draft.artistTz}
                  onChange={(e) => setDraft({ ...draft, artistTz: e.target.value })}
                  className={inputCls}
                  placeholder="America/Los_Angeles"
                />
              </Field>
              <Field label="blurb" wide>
                <input
                  value={draft.blurb}
                  onChange={(e) => setDraft({ ...draft, blurb: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="duration (min)">
                <input
                  type="number"
                  value={draft.durationMin}
                  onChange={(e) => setDraft({ ...draft, durationMin: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="buffer after (min)">
                <input
                  type="number"
                  value={draft.bufferMin}
                  onChange={(e) => setDraft({ ...draft, bufferMin: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="min lead (hours)">
                <input
                  type="number"
                  value={draft.minLeadHours}
                  onChange={(e) => setDraft({ ...draft, minLeadHours: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="book up to (days ahead)">
                <input
                  type="number"
                  value={draft.maxAdvanceDays}
                  onChange={(e) => setDraft({ ...draft, maxAdvanceDays: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="pricing">
                <select
                  value={draft.pricingMode}
                  onChange={(e) => setDraft({ ...draft, pricingMode: e.target.value as Service["pricingMode"] })}
                  className={inputCls}
                >
                  <option value="fixed">fixed</option>
                  <option value="pwyc">give what you can</option>
                </select>
              </Field>
              <Field label="price (sats)">
                <input
                  type="number"
                  value={draft.price.sats ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      price: { ...draft.price, sats: e.target.value ? Number(e.target.value) : undefined },
                    })
                  }
                  className={inputCls}
                  disabled={draft.pricingMode === "pwyc"}
                />
              </Field>
              <Field label="meeting link (static rail)" wide>
                <input
                  value={draft.meetingRail.kind === "static" ? draft.meetingRail.url : ""}
                  onChange={(e) => setDraft({ ...draft, meetingRail: { kind: "static", url: e.target.value } })}
                  className={inputCls}
                  placeholder="https://zoom.us/j/…"
                />
              </Field>
              <Field label="status">
                <select
                  value={draft.status}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value as Service["status"] })}
                  className={inputCls}
                >
                  <option value="hidden">hidden</option>
                  <option value="live">live</option>
                </select>
              </Field>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => save("service", draft)}
                className="border border-cyan-600 px-3 py-1 text-xs text-cyan-300 hover:bg-cyan-900/30 disabled:opacity-50"
              >
                save
              </button>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="border border-neutral-700 px-3 py-1 text-xs text-neutral-400"
              >
                cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── weekly rules ─────────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-wide">YOUR WEEK</h2>
        <p className="mt-1 text-xs text-neutral-500">
          recurring windows in your wall clock — 9:00 stays 9:00 across daylight saving
        </p>
        <ul className="mt-3 space-y-1">
          {config.rules.map((r) => (
            <li key={r.id} className="flex items-center justify-between border border-neutral-800 px-3 py-2 text-xs">
              <span>
                <strong className="text-neutral-200">{WEEKDAYS[r.weekday]}</strong> {r.start}–{r.end}
                <span className="ml-2 text-neutral-500">
                  {r.serviceIds.length === 0 ? "all sessions" : r.serviceIds.join(", ")}
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove("rule", r.id)}
                className="text-neutral-500 hover:text-amber-300"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
        <RuleAdder onAdd={(r) => save("rule", r)} busy={busy} services={config.services} />
      </section>

      {/* ── date overrides ───────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-wide">EXCEPTIONS</h2>
        <p className="mt-1 text-xs text-neutral-500">
          block a day or an hour you filled elsewhere · add a one-off window
        </p>
        <ul className="mt-3 space-y-1">
          {config.overrides.map((o) => (
            <li key={o.id} className="flex items-center justify-between border border-neutral-800 px-3 py-2 text-xs">
              <span>
                <strong className={o.kind === "blocked" ? "text-amber-300" : "text-cyan-300"}>{o.kind}</strong>{" "}
                {o.date} {o.start && o.end ? `${o.start}–${o.end}` : "(all day)"}
              </span>
              <button
                type="button"
                onClick={() => remove("override", o.id)}
                className="text-neutral-500 hover:text-amber-300"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
        <OverrideAdder onAdd={(o) => save("override", o)} busy={busy} />
      </section>
    </div>
  );
}

const inputCls = "w-full border border-neutral-700 bg-transparent px-2 py-1 text-sm text-neutral-100";

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block text-xs text-neutral-400 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function RuleAdder({
  onAdd,
  busy,
  services,
}: {
  onAdd: (r: AvailabilityRule) => void;
  busy: boolean;
  services: Service[];
}) {
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [serviceId, setServiceId] = useState("");

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className={`${inputCls} w-auto`}>
        {WEEKDAYS.map((d, i) => (
          <option key={d} value={i}>
            {d}
          </option>
        ))}
      </select>
      <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={`${inputCls} w-auto`} />
      <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={`${inputCls} w-auto`} />
      <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={`${inputCls} w-auto`}>
        <option value="">all sessions</option>
        {services.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          onAdd({ id: "", weekday: weekday as AvailabilityRule["weekday"], start, end, serviceIds: serviceId ? [serviceId] : [] })
        }
        className="border border-cyan-700 px-3 py-1 text-xs text-cyan-300 hover:bg-cyan-900/30 disabled:opacity-50"
      >
        add window
      </button>
    </div>
  );
}

function OverrideAdder({ onAdd, busy }: { onAdd: (o: DateOverride) => void; busy: boolean }) {
  const [date, setDate] = useState("");
  const [kind, setKind] = useState<DateOverride["kind"]>("blocked");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputCls} w-auto`} />
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as DateOverride["kind"])}
        className={`${inputCls} w-auto`}
      >
        <option value="blocked">blocked</option>
        <option value="extra">extra window</option>
      </select>
      <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={`${inputCls} w-auto`} />
      <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={`${inputCls} w-auto`} />
      <button
        type="button"
        disabled={busy || !date}
        onClick={() => onAdd({ id: "", date, kind, start: start || undefined, end: end || undefined })}
        className="border border-cyan-700 px-3 py-1 text-xs text-cyan-300 hover:bg-cyan-900/30 disabled:opacity-50"
      >
        add exception
      </button>
    </div>
  );
}
