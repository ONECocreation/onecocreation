"use client";

import { useEffect, useState } from "react";
import RetreatsDesk from "@/components/console/RetreatsDesk";
import { Chip, SectionHead, field } from "@/components/console/glass";
import type { Service, AvailabilityRule, DateOverride, BookingConfig } from "@/lib/booking";

/**
 * /a/booking — the artist describes their week (spec: docs/booking-flow.md,
 * step 1), wearing the console's glass grammar (Admiral, 0018.05.15 — the
 * last wireframe room repainted). Session-gated only: saying what you offer
 * and when you work is cosmetic-tier under the /a/store stakes model. Money
 * and refunds take a per-action signature, and they arrive with step 3.
 *
 * The "block this slot" button lives here too — it is the manual answer to
 * the Google-iCal lag (spec §6): our own config is the source of truth, and
 * Google can only ever be an advisory overlay that removes time.
 */

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const fieldLabel: React.CSSProperties = {
  display: "block", fontSize: ".62rem", letterSpacing: ".1em", textTransform: "uppercase",
  color: "var(--muted)", marginBottom: 3,
};

const glassRow: React.CSSProperties = {
  background: "var(--glass)", border: "1px solid rgba(139,118,196,.22)",
  borderRadius: 12, padding: "10px 14px", marginBottom: 8,
};

const textBtn = (color: string): React.CSSProperties => ({
  background: "none", border: 0, cursor: "pointer", fontFamily: "inherit", padding: "6px 4px",
  fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color,
});

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

  if (denied)
    return (
      <p className="p-6 text-sm" style={{ color: "var(--muted)" }}>
        operator session required — <a href="/a" style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>sign in at the door</a>
      </p>
    );
  if (!config) return <p className="p-6 text-sm" style={{ color: "var(--muted)" }}>reading the calendar…</p>;

  const editorPanel = draft && (
  <div style={{ marginTop: 12, background: "var(--glass)", border: "1px solid rgba(139,118,196,.25)",
    borderRadius: 14, padding: "14px 16px" }}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="title">
        <input
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          style={{ ...field, width: "100%" }}
        />
      </Field>
      <Field label="timezone (yours)">
        <input
          value={draft.artistTz}
          onChange={(e) => setDraft({ ...draft, artistTz: e.target.value })}
          style={{ ...field, width: "100%" }}
          placeholder="America/Los_Angeles"
        />
      </Field>
      <Field label="blurb" wide>
        <input
          value={draft.blurb}
          onChange={(e) => setDraft({ ...draft, blurb: e.target.value })}
          style={{ ...field, width: "100%" }}
        />
      </Field>
      <Field label="duration (min)">
        <input
          type="number"
          value={draft.durationMin}
          onChange={(e) => setDraft({ ...draft, durationMin: Number(e.target.value) })}
          style={{ ...field, width: "100%" }}
        />
      </Field>
      <Field label="buffer after (min)">
        <input
          type="number"
          value={draft.bufferMin}
          onChange={(e) => setDraft({ ...draft, bufferMin: Number(e.target.value) })}
          style={{ ...field, width: "100%" }}
        />
      </Field>
      <Field label="min lead (hours)">
        <input
          type="number"
          value={draft.minLeadHours}
          onChange={(e) => setDraft({ ...draft, minLeadHours: Number(e.target.value) })}
          style={{ ...field, width: "100%" }}
        />
      </Field>
      <Field label="book up to (days ahead)">
        <input
          type="number"
          value={draft.maxAdvanceDays}
          onChange={(e) => setDraft({ ...draft, maxAdvanceDays: Number(e.target.value) })}
          style={{ ...field, width: "100%" }}
        />
      </Field>
      <Field label="pricing">
        <select
          value={draft.pricingMode}
          onChange={(e) => setDraft({ ...draft, pricingMode: e.target.value as Service["pricingMode"] })}
          style={{ ...field, width: "100%" }}
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
          style={{ ...field, width: "100%", opacity: draft.pricingMode === "pwyc" ? 0.5 : 1 }}
          disabled={draft.pricingMode === "pwyc"}
        />
      </Field>
      {/* the meeting rail, quick-select (Admiral's ask): a knob, never
          hardcoded — link / jitsi / matrix / the RV studio in person */}
      <Field label="how you meet" wide>
        <div className="flex flex-wrap gap-2">
          {([
            ["static", "Zoom / any link"],
            ["jitsi", "Jitsi"],
            ["matrix", "Matrix room"],
            ["inPerson", "In person — the studio"],
          ] as const).map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  meetingRail:
                    kind === "static" ? { kind, url: draft.meetingRail.kind === "static" ? draft.meetingRail.url : "" }
                    : kind === "jitsi" ? { kind, domain: draft.meetingRail.kind === "jitsi" ? draft.meetingRail.domain : "meet.jit.si" }
                    : kind === "matrix" ? { kind, roomId: draft.meetingRail.kind === "matrix" ? draft.meetingRail.roomId : "" }
                    : { kind,
                        address: draft.meetingRail.kind === "inPerson" ? draft.meetingRail.address : "",
                        geo: draft.meetingRail.kind === "inPerson" ? draft.meetingRail.geo : "" },
                })
              }
              className={`btn btn-sm ${draft.meetingRail.kind === kind ? "btn-gold" : "btn-ghost"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>
      {draft.meetingRail.kind === "static" && (
        <Field label="meeting link" wide>
          <input
            value={draft.meetingRail.url}
            onChange={(e) => setDraft({ ...draft, meetingRail: { kind: "static", url: e.target.value } })}
            style={{ ...field, width: "100%" }}
            placeholder="https://zoom.us/j/…"
          />
        </Field>
      )}
      {draft.meetingRail.kind === "jitsi" && (
        <Field label="jitsi domain" wide>
          <input
            value={draft.meetingRail.domain}
            onChange={(e) => setDraft({ ...draft, meetingRail: { kind: "jitsi", domain: e.target.value } })}
            style={{ ...field, width: "100%" }}
            placeholder="meet.jit.si"
          />
        </Field>
      )}
      {draft.meetingRail.kind === "matrix" && (
        <Field label="matrix room id" wide>
          <input
            value={draft.meetingRail.roomId}
            onChange={(e) => setDraft({ ...draft, meetingRail: { kind: "matrix", roomId: e.target.value } })}
            style={{ ...field, width: "100%" }}
            placeholder="!room:onecocreation.com"
          />
        </Field>
      )}
      {draft.meetingRail.kind === "inPerson" && (
        <>
          <Field label="studio address (members copy this from their calendar)" wide>
            <input
              value={draft.meetingRail.address ?? ""}
              onChange={(e) => setDraft({ ...draft, meetingRail: { ...draft.meetingRail, kind: "inPerson", address: e.target.value } })}
              style={{ ...field, width: "100%" }}
              placeholder="where the RV parks — street, city, state"
            />
          </Field>
          <Field label="geotag / map link (optional)" wide>
            <input
              value={draft.meetingRail.geo ?? ""}
              onChange={(e) => setDraft({ ...draft, meetingRail: { ...draft.meetingRail, kind: "inPerson", geo: e.target.value } })}
              style={{ ...field, width: "100%" }}
              placeholder="https://maps.app.goo.gl/… or geo:39.7,-104.9"
            />
          </Field>
        </>
      )}
      <Field label="status">
        <select
          value={draft.status}
          onChange={(e) => setDraft({ ...draft, status: e.target.value as Service["status"] })}
          style={{ ...field, width: "100%" }}
        >
          <option value="hidden">○ hidden</option>
          <option value="live">● live</option>
        </select>
      </Field>
    </div>
    <div className="mt-3 flex gap-2">
      <button type="button" disabled={busy} onClick={() => save("service", draft)} className="btn btn-gold btn-sm">
        {busy ? "Saving…" : "Save"}
      </button>
      <button type="button" onClick={() => setDraft(null)} className="btn btn-ghost btn-sm">
        Cancel
      </button>
    </div>
  </div>
  );


  return (
    <div className="p-2 text-sm" style={{ color: "var(--ink)" }}>
      <p style={{ margin: "0 0 4px", fontSize: ".85rem", color: "var(--muted)" }}>
        what you offer, and when you work — times are your wall clock, visitors see their own.
      </p>
      {error && (
        <p style={{ margin: "10px 0 0", padding: "8px 14px", borderRadius: 10, fontSize: ".82rem",
          color: "var(--err)", background: "rgba(197,110,139,.1)", border: "1px solid rgba(197,110,139,.4)" }}>
          ◌ {error}
        </p>
      )}

      {/* ── services ─────────────────────────────────────────────────── */}
      <SectionHead label="Sessions" />
      <div style={{ margin: "0 0 10px" }}>
        <button type="button" onClick={() => setDraft(blankService(defaultTz))} className="btn btn-gold btn-sm">
          + New session
        </button>
      </div>

      {config.services.length === 0 && !draft && (
        <p style={{ fontSize: ".82rem", color: "var(--muted)" }}>
          No sessions yet — <b>working windows alone don&apos;t show on the booking page.</b>{" "}
          Hit <b>+ New session</b> (name, length, price), set it LIVE, and it appears at /book
          inside the windows you&apos;ve set.
        </p>
      )}

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {config.services.map((s) => (
          <li key={s.id} style={glassRow}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
              <b style={{ fontSize: ".92rem", color: "var(--ink-strong)" }}>{s.title}</b>
              <span style={{ fontSize: ".76rem", color: "var(--muted)" }}>
                {s.durationMin}min +{s.bufferMin} · {s.pricingMode === "pwyc" ? "give what you can" : "fixed"}
              </span>
              {s.status === "live" ? <Chip tone="green">live</Chip> : <Chip tone="grey">hidden</Chip>}
              <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                <button type="button" onClick={() => setDraft(s)} style={textBtn("var(--gold-deep)")}>
                  edit
                </button>
                <button type="button" onClick={() => remove("service", s.id)} style={textBtn("var(--err)")}>
                  delete
                </button>
              </span>
            </div>
            {/* the editor opens RIGHT HERE, under its own service (Admiral,
                0018.05.18) — never a hunt to the bottom of the page */}
            {draft?.id === s.id && editorPanel}
          </li>
        ))}
      </ul>

      {draft && !config.services.some((x) => x.id === draft.id) && editorPanel}

      {/* ── weekly rules ─────────────────────────────────────────────── */}
      <SectionHead label="Your Week" />
      <p style={{ margin: "0 0 10px", fontSize: ".78rem", color: "var(--muted)" }}>
        recurring windows in your wall clock — 9:00 stays 9:00 across daylight saving
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {config.rules.map((r) => (
          <li key={r.id} style={{ ...glassRow, display: "flex", alignItems: "center", gap: 10, fontSize: ".85rem" }}>
            <span style={{ flex: 1 }}>
              <b>{WEEKDAYS[r.weekday]}</b> {r.start}–{r.end}
              <span style={{ marginLeft: 8, color: "var(--muted)", fontSize: ".78rem" }}>
                {r.serviceIds.length === 0 ? "all sessions" : r.serviceIds.join(", ")}
              </span>
            </span>
            <button type="button" onClick={() => remove("rule", r.id)} style={textBtn("var(--err)")}>
              remove
            </button>
          </li>
        ))}
      </ul>
      <RuleAdder onAdd={(r) => save("rule", r)} busy={busy} services={config.services} />

      {/* ── date overrides ───────────────────────────────────────────── */}
      <SectionHead label="Exceptions" />
      <p style={{ margin: "0 0 10px", fontSize: ".78rem", color: "var(--muted)" }}>
        block a day or an hour you filled elsewhere · add a one-off window
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {config.overrides.map((o) => {
          const retreat = o.id.startsWith("retreat-");
          return (
            <li key={o.id} style={{ ...glassRow, display: "flex", alignItems: "center", gap: 10, fontSize: ".85rem" }}>
              <span style={{ flex: 1 }}>
                {retreat ? (
                  <Chip tone="teal">retreat</Chip>
                ) : o.kind === "blocked" ? (
                  <Chip tone="rose">blocked</Chip>
                ) : (
                  <Chip tone="green">extra</Chip>
                )}{" "}
                {o.date} {o.start && o.end ? `${o.start}–${o.end}` : "(all day)"}
                {o.note && <span style={{ marginLeft: 8, color: "var(--muted)", fontSize: ".78rem" }}>{o.note}</span>}
              </span>
              {!retreat && (
                <button type="button" onClick={() => remove("override", o.id)} style={textBtn("var(--err)")}>
                  remove
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <OverrideAdder onAdd={(o) => save("override", o)} busy={busy} />

      {/* ── retreats & excursions ────────────────────────────────────── */}
      <div className="mt-4">
        <RetreatsDesk />
      </div>
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span style={fieldLabel}>{label}</span>
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
    <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} style={field}>
        {WEEKDAYS.map((d, i) => (
          <option key={d} value={i}>
            {d}
          </option>
        ))}
      </select>
      <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={field} />
      <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={field} />
      <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} style={field}>
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
        className="btn btn-gold btn-sm"
      >
        + Add window
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
    <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={field} />
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as DateOverride["kind"])}
        style={field}
      >
        <option value="blocked">blocked</option>
        <option value="extra">extra window</option>
      </select>
      <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={field} />
      <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={field} />
      <button
        type="button"
        disabled={busy || !date}
        onClick={() => onAdd({ id: "", date, kind, start: start || undefined, end: end || undefined })}
        className="btn btn-gold btn-sm"
      >
        + Add exception
      </button>
    </div>
  );
}
