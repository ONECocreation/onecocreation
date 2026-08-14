"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Sheet from "@/components/Sheet";

/**
 * THE WEEK, SHADED (wireframe v2): green wash = open working hours,
 * lavender = booked, grey hatch = the artist's EXTERNAL calendar says busy
 * (iCal sync), bare = outside hours. Every chip answers WHO · WHAT · state;
 * ⚑ marks a settled session awaiting mark-fulfilled.
 *
 * MONTH view (Admiral, 0018.05.14): the same feed over 42 days — a calm
 * 6×7 grid, day numbers + session count + busy dots; a tapped day drops
 * you into its week.
 *
 * Working hours / days off / external calendar are POPUPS here — the
 * artist never leaves the calendar to shape it.
 */
interface Rule { weekday: number; start: string; end: string }
interface Chip {
  bookingId: string; orderId?: string; title: string; customer: string;
  customerEmail?: string; meetingUrl?: string; notes?: string;
  startUtc: string; state: string; needsFulfil: boolean;
}
interface Busy { startMs: number; endMs: number }
interface Override { id: string; date: string; kind: "blocked" | "extra"; start?: string; end?: string; note?: string }
interface Feed {
  rules: Rule[];
  overrides?: Override[];
  bookings: Chip[];
  busy?: Busy[];
  ical?: { connected: boolean; skippedRecurring: number; fetchedAtMs: number; error: string | null };
}

interface RuleDoc { id: string; weekday: number; start: string; end: string; serviceIds: string[] }
interface OverrideDoc { id: string; date: string; kind: "blocked" | "extra"; start?: string; end?: string; note?: string }

const DAY = 24 * 3600 * 1000;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Monday on or before this moment, local midnight. */
function mondayOf(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

export default function AdminWeekGrid() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [weekStart, setWeekStart] = useState(() => mondayOf(Date.now()));
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  });
  const [view, setView] = useState<"agenda" | "week" | "month">("agenda");

  /* ── the popups ── */
  const [modal, setModal] = useState<null | "hours" | "dayoff" | "ical">(null);
  /* the session-detail popup (Admiral, 0018.05.18): everything reachable
     from the calendar itself — no page hops */
  const [detail, setDetail] = useState<Chip | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");

  function openDetail(c: Chip) {
    setNotesDraft(c.notes ?? "");
    setDetail(c);
  }

  /** Notes save doubles as the session's close-out: a settled order marks
      fulfilled server-side — mark-fulfilled stays physical-goods-only. */
  async function saveNotes() {
    if (!detail) return;
    setDetailBusy(true);
    const res = await fetch("/api/admin/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: detail.bookingId, notes: notesDraft, closeOut: true }),
    }).then((r) => r.json()).catch(() => null);
    setDetailBusy(false);
    if (res?.ok) {
      setDetail(null);
      loadFeed();
    }
  }
  const [cfg, setCfg] = useState<{ rules: RuleDoc[]; overrides: OverrideDoc[]; icalUrl?: string } | null>(null);
  const [busyUi, setBusyUi] = useState(false);
  const [err, setErr] = useState("");
  // working-hours form — today's weekday pre-checked
  const [days, setDays] = useState<boolean[]>(() => WEEKDAYS.map((_, i) => i === new Date().getDay()));
  const [hStart, setHStart] = useState("09:00");
  const [hEnd, setHEnd] = useState("17:00");
  // day-off form — today by default, whole day unless times are given
  const [offDate, setOffDate] = useState(todayYmd);
  const [offStart, setOffStart] = useState("");
  const [offEnd, setOffEnd] = useState("");
  const [offNote, setOffNote] = useState("");
  // external calendar form
  const [icalInput, setIcalInput] = useState("");

  // month grid runs Monday-before-the-1st for 42 days; agenda looks 42 days
  // ahead from TODAY and shows the next handful of sessions; week runs its Monday
  const todayStart = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  const gridStart = view === "month" ? mondayOf(monthAnchor) : view === "agenda" ? todayStart : weekStart;
  const gridDays = view === "week" ? 7 : 42;

  const loadFeed = useCallback(() => {
    fetch(`/api/admin/calendar?start=${new Date(gridStart).toISOString()}&days=${gridDays}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.ok && setFeed(d))
      .catch(() => {});
  }, [gridStart, gridDays]);

  useEffect(loadFeed, [loadFeed]);

  const loadCfg = useCallback(() => {
    fetch("/api/admin/booking")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.ok && setCfg({ rules: d.rules ?? [], overrides: d.overrides ?? [], icalUrl: d.icalUrl }))
      .catch(() => {});
  }, []);

  function openModal(which: "hours" | "dayoff" | "ical") {
    setErr("");
    setModal(which);
    loadCfg();
  }

  async function putBooking(kind: "rule" | "override" | "ical", value: unknown): Promise<string> {
    const res = await fetch("/api/admin/booking", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, value }),
    }).then((r) => r.json()).catch(() => null);
    return res?.ok ? "" : (res?.reason ?? "save failed");
  }

  async function saveHours() {
    const picked = WEEKDAYS.map((_, i) => i).filter((i) => days[i]);
    if (!picked.length) { setErr("pick at least one day"); return; }
    setBusyUi(true); setErr("");
    for (const weekday of picked) {
      const reason = await putBooking("rule", { id: "", weekday, start: hStart, end: hEnd, serviceIds: [] });
      if (reason) { setErr(reason); setBusyUi(false); return; }
    }
    setBusyUi(false);
    loadCfg();
    loadFeed();
  }

  async function saveDayOff() {
    setBusyUi(true); setErr("");
    const value = {
      id: "", date: offDate, kind: "blocked" as const,
      ...(offStart && offEnd ? { start: offStart, end: offEnd } : {}),
      ...(offNote.trim() ? { note: offNote.trim() } : {}),
    };
    const reason = await putBooking("override", value);
    setBusyUi(false);
    if (reason) { setErr(reason); return; }
    setOffNote("");
    loadCfg();
    loadFeed();
  }

  async function saveIcal(url: string) {
    setBusyUi(true); setErr("");
    const reason = await putBooking("ical", { url });
    setBusyUi(false);
    if (reason) { setErr(reason); return; }
    setIcalInput("");
    loadCfg();
    loadFeed();
  }

  async function remove(kind: "rule" | "override", id: string) {
    setBusyUi(true);
    await fetch(`/api/admin/booking?kind=${kind}&id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
    setBusyUi(false);
    loadCfg();
    loadFeed();
  }

  const days7 = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(weekStart + i * DAY)),
    [weekStart],
  );
  // the week grid's hour rows hug the working span (rules ∪ sessions) —
  // no more 7a–7p wall of empty cells (week-calendar1.png)
  const weekHours = useMemo(() => {
    let lo = 24, hi = 0;
    for (const r of feed?.rules ?? []) {
      lo = Math.min(lo, parseInt(r.start, 10));
      const [eh, em] = r.end.split(":").map((n) => parseInt(n, 10));
      hi = Math.max(hi, eh + (em > 0 ? 1 : 0));
    }
    for (const b of feed?.bookings ?? []) {
      const h = new Date(b.startUtc).getHours();
      lo = Math.min(lo, h);
      hi = Math.max(hi, h + 1);
    }
    if (lo >= hi) { lo = 9; hi = 17; }
    return Array.from({ length: hi - lo }, (_, i) => lo + i);
  }, [feed]);
  const monthCells = useMemo(
    () => Array.from({ length: 42 }, (_, i) => new Date(mondayOf(monthAnchor) + i * DAY)),
    [monthAnchor],
  );

  function openAt(day: Date, hour: number): boolean {
    if (!feed) return false;
    const wd = day.getDay();
    return feed.rules.some((r) => {
      if (r.weekday !== wd) return false;
      const s = parseInt(r.start.split(":")[0], 10);
      const e = parseInt(r.end.split(":")[0], 10);
      return hour >= s && hour < e;
    });
  }

  function busyAt(day: Date, hour: number): boolean {
    if (!feed?.busy?.length) return false;
    const a = new Date(day); a.setHours(hour, 0, 0, 0);
    const b = a.getTime() + 3600_000;
    return feed.busy.some((w) => a.getTime() < w.endMs && b > w.startMs);
  }

  const ymdOfD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  function workingDay(day: Date): boolean {
    return (feed?.rules ?? []).some((r) => r.weekday === day.getDay());
  }
  function dayOff(day: Date): Override | null {
    return (feed?.overrides ?? []).find((o) => o.kind === "blocked" && o.date === ymdOfD(day)) ?? null;
  }

  function busyOnDay(day: Date): boolean {
    if (!feed?.busy?.length) return false;
    const a = new Date(day); a.setHours(0, 0, 0, 0);
    const b = a.getTime() + DAY;
    return feed.busy.some((w) => a.getTime() < w.endMs && b > w.startMs);
  }

  function chipsAt(day: Date, hour: number): Chip[] {
    if (!feed) return [];
    return feed.bookings.filter((b) => {
      const t = new Date(b.startUtc);
      return (
        t.getFullYear() === day.getFullYear() &&
        t.getMonth() === day.getMonth() &&
        t.getDate() === day.getDate() &&
        t.getHours() === hour
      );
    });
  }

  function chipsOnDay(day: Date): Chip[] {
    if (!feed) return [];
    return feed.bookings.filter((b) => {
      const t = new Date(b.startUtc);
      return (
        t.getFullYear() === day.getFullYear() &&
        t.getMonth() === day.getMonth() &&
        t.getDate() === day.getDate()
      );
    });
  }

  function step(dir: -1 | 1) {
    if (view === "month") {
      const d = new Date(monthAnchor);
      setMonthAnchor(new Date(d.getFullYear(), d.getMonth() + dir, 1).getTime());
    } else {
      setWeekStart((w) => w + dir * 7 * DAY);
    }
  }

  const cell: React.CSSProperties = { border: "1px solid rgba(139,118,196,.22)", padding: 2, height: 26, verticalAlign: "top" };
  /* the popups ride the one <Sheet> primitive now (cartridge walk step 6,
     Admiral's walk, 0018.05.15) — the verbatim overlay/sheet copy is gone */
  const field: React.CSSProperties = {
    border: "1px solid rgba(139,118,196,.45)", borderRadius: 8, padding: "6px 9px",
    background: "#fff", fontSize: ".9rem",
  };
  const BUSY_WASH = "repeating-linear-gradient(45deg, rgba(120,116,130,.16), rgba(120,116,130,.16) 5px, transparent 5px, transparent 10px)";

  const monthLabel = new Date(monthAnchor).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const todayKey = todayYmd();
  const ymdOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <button className={`btn btn-sm ${view === "agenda" ? "btn-gold" : "btn-ghost"}`} onClick={() => setView("agenda")}>Agenda</button>
        <button className={`btn btn-sm ${view === "week" ? "btn-gold" : "btn-ghost"}`} onClick={() => setView("week")}>Week</button>
        <button className={`btn btn-sm ${view === "month" ? "btn-gold" : "btn-ghost"}`} onClick={() => setView("month")}>Month</button>
      </div>
      {/* the period's own wayfinding — arrows WITH the calendar, not the tabs
          (the Admiral's markup, month-calendar1) */}
      {view !== "agenda" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, margin: "4px 0 12px" }}>
          <button onClick={() => step(-1)} aria-label="previous" className="btn-round"
            style={{ "--size": "34px", background: "var(--glass)", borderColor: "rgba(180,134,43,.45)", color: "var(--gold-deep)", fontSize: "1rem" } as React.CSSProperties}>‹</button>
          <span style={{ fontFamily: "var(--font-h3)", fontSize: "1.15rem", color: "var(--ink-strong)", minWidth: 150, textAlign: "center" }}>
            {view === "month"
              ? monthLabel
              : `${days7[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${days7[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
          </span>
          <button onClick={() => step(1)} aria-label="next" className="btn-round"
            style={{ "--size": "34px", background: "var(--glass)", borderColor: "rgba(180,134,43,.45)", color: "var(--gold-deep)", fontSize: "1rem" } as React.CSSProperties}>›</button>
        </div>
      )}

      {view === "agenda" && (() => {
        // the next handful of sessions, wherever they land in the next six
        // weeks — agenda and "event list" were the same idea twice (Admiral)
        const upcoming = (feed?.bookings ?? [])
          .filter((b) => Date.parse(b.startUtc) >= todayStart)
          .sort((a, b) => (a.startUtc < b.startUtc ? -1 : 1));
        const shown = upcoming.slice(0, 10);
        const byDay = new Map<string, Chip[]>();
        for (const b of shown) {
          const d = new Date(b.startUtc);
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          byDay.set(k, [...(byDay.get(k) ?? []), b]);
        }
        return (
          <div>
            {shown.length === 0 && <p style={{ color: "var(--muted)", fontSize: ".9rem" }}>nothing on the books for the next six weeks ✨</p>}
            {[...byDay.entries()].map(([k, chips]) => {
              const d = new Date(chips[0].startUtc);
              const isToday = k === todayKey;
              return (
                <div key={k} style={{ display: "flex", gap: 18, marginBottom: 18 }}>
                  {/* the date rail */}
                  <div style={{ width: 54, flex: "none", textAlign: "center" }}>
                    <div style={{ fontSize: ".62rem", letterSpacing: ".12em", textTransform: "uppercase",
                      color: isToday ? "var(--gold-deep, #b4862b)" : "var(--muted)" }}>
                      {isToday ? "today" : d.toLocaleDateString(undefined, { weekday: "short" })}
                    </div>
                    <div style={{ fontFamily: "var(--serif, sans-serif)", fontSize: "1.9rem", lineHeight: 1.1,
                      color: isToday ? "var(--gold-deep, #b4862b)" : "var(--ink-strong)" }}>
                      {d.getDate()}
                    </div>
                  </div>
                  {/* the entries */}
                  <div style={{ flex: 1, borderLeft: "2px solid rgba(139,118,196,.3)", paddingLeft: 16, minWidth: 0 }}>
                    {chips.map((c) => (
                      <button key={c.bookingId} onClick={() => openDetail(c)}
                        style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                          padding: "8px 12px", marginBottom: 6, borderRadius: 12,
                          background: "var(--glass)", border: "1px solid rgba(139,118,196,.25)",
                          fontSize: ".85rem", color: "inherit", fontFamily: "inherit" }}>
                        <b style={{ color: "var(--gold-deep, #b4862b)" }}>
                          {new Date(c.startUtc).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        </b>{" "}
                        <b>{c.title}</b> — {c.customer}
                        <span style={{ color: "var(--muted)", fontSize: ".75rem" }}> · {c.state}</span>
                        {c.needsFulfil && <b> ⚑</b>}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {upcoming.length > shown.length && (
              <p style={{ color: "var(--muted)", fontSize: ".78rem", marginTop: 4 }}>
                the next {shown.length} of {upcoming.length} coming up — the month view holds the rest
              </p>
            )}
          </div>
        );
      })()}

      {view === "week" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: ".72rem" }}>
            <thead>
              <tr>
                <th style={{ ...cell, height: "auto", background: "var(--glass)" }}></th>
                {days7.map((d) => (
                  <th key={d.getTime()} style={{ ...cell, height: "auto", background: "var(--glass)" }}>
                    {d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekHours.map((h) => (
                <tr key={h}>
                  <td style={{ ...cell, width: 42, color: "var(--muted)" }}>{h % 12 || 12}{h < 12 ? "a" : "p"}</td>
                  {days7.map((d) => {
                    const chips = chipsAt(d, h);
                    const open = openAt(d, h);
                    const busy = busyAt(d, h);
                    return (
                      <td
                        key={d.getTime()}
                        style={{
                          ...cell,
                          background: chips.length
                            ? "rgba(139,118,196,.22)"
                            : busy
                              ? BUSY_WASH
                              : open
                                ? "rgba(78,138,95,.13)"
                                : "transparent",
                        }}
                      >
                        {chips.map((c) => (
                          <button
                            key={c.bookingId}
                            onClick={() => openDetail(c)}
                            style={{
                              display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                              border: "1.5px solid var(--lavender)", borderRadius: 6,
                              padding: "1px 5px", background: "var(--glass)", marginBottom: 2,
                              overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                              maxWidth: 130, fontSize: ".68rem",
                              fontWeight: c.needsFulfil ? 700 : 400, fontFamily: "inherit", color: "inherit",
                            }}
                            title={`${c.title} — ${c.customer} (${c.state})`}
                          >
                            {new Date(c.startUtc).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}{" "}
                            {c.title}{c.needsFulfil ? " ⚑" : ""}
                          </button>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: 6 }}>
            <span style={{ background: "rgba(78,138,95,.13)", padding: "1px 8px", marginRight: 8 }}>open hours</span>
            <span style={{ background: "rgba(139,118,196,.22)", padding: "1px 8px", marginRight: 8 }}>booked</span>
            <span style={{ background: BUSY_WASH, padding: "1px 8px", marginRight: 8 }}>your other calendar</span>
            ⚑ = paid, awaiting mark-fulfilled
          </p>
        </div>
      )}

      {view === "month" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 4, width: "100%", tableLayout: "fixed", fontSize: ".72rem" }}>
            <thead>
              <tr>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
                  <th key={w} style={{ padding: "4px 0", fontSize: ".64rem", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>{w}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }, (_, row) => (
                <tr key={row}>
                  {monthCells.slice(row * 7, row * 7 + 7).map((d) => {
                    const inMonth = d.getMonth() === new Date(monthAnchor).getMonth();
                    const chips = chipsOnDay(d);
                    const off = dayOff(d);
                    const retreatDay = off?.note?.startsWith("Retreat") ?? false;
                    const works = workingDay(d);
                    const isToday = ymdOf(d) === todayKey;
                    return (
                      <td
                        key={d.getTime()}
                        onClick={() => { setWeekStart(mondayOf(d.getTime())); setView("week"); }}
                        style={{
                          height: 74,
                          verticalAlign: "top",
                          padding: 6,
                          borderRadius: 12,
                          cursor: "pointer",
                          opacity: inMonth ? 1 : 0.35,
                          border: isToday ? "2px solid var(--gold-deep)" : "1px solid rgba(139,118,196,.22)",
                          background: retreatDay
                            ? "rgba(78,160,175,.22)"
                            : off
                              ? "repeating-linear-gradient(45deg, rgba(197,110,139,.12), rgba(197,110,139,.12) 5px, rgba(255,255,255,.5) 5px, rgba(255,255,255,.5) 10px)"
                              : busyOnDay(d)
                                ? BUSY_WASH
                                : works
                                  ? "rgba(78,138,95,.10)"
                                  : "rgba(255,255,255,.4)",
                        }}
                        title={off ? `${retreatDay ? "" : "day off"}${off.note ? `${retreatDay ? "" : " — "}${off.note}` : ""}` : works ? "working day — tap for the week" : "resting day"}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{ fontWeight: isToday ? 700 : 500, fontSize: ".82rem", color: isToday ? "var(--gold-deep)" : "var(--ink-strong)" }}>{d.getDate()}</span>
                          {off && (
                            <span style={{ fontSize: ".56rem", textTransform: "uppercase", fontWeight: 700,
                              color: retreatDay ? "#2e6b77" : "var(--err)" }}>
                              {retreatDay ? "retreat" : "off"}
                            </span>
                          )}
                        </div>
                        {chips.slice(0, 2).map((c) => (
                          <button
                            key={c.bookingId}
                            onClick={(e) => { e.stopPropagation(); openDetail(c); }}
                            style={{
                              display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                              borderRadius: 6, padding: "1px 6px", marginTop: 3,
                              background: "rgba(139,118,196,.22)", border: "1px solid rgba(139,118,196,.4)",
                              overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                              fontSize: ".64rem", color: "var(--ink-strong)", fontWeight: c.needsFulfil ? 700 : 400,
                              fontFamily: "inherit",
                            }}
                            title={`${c.title} — ${c.customer} (${c.state})`}
                          >
                            {new Date(c.startUtc).toLocaleTimeString(undefined, { hour: "numeric" })} {c.title}{c.needsFulfil ? " ⚑" : ""}
                          </button>
                        ))}
                        {chips.length > 2 && (
                          <div style={{ color: "var(--muted)", fontSize: ".6rem", marginTop: 2 }}>+{chips.length - 2} more</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: ".7rem", color: "var(--muted)", marginTop: 8 }}>
            <span style={{ background: "rgba(78,138,95,.10)", padding: "1px 8px", marginRight: 8, borderRadius: 4 }}>working day</span>
            <span style={{ background: "repeating-linear-gradient(45deg, rgba(197,110,139,.12), rgba(197,110,139,.12) 5px, rgba(255,255,255,.5) 5px, rgba(255,255,255,.5) 10px)", padding: "1px 8px", marginRight: 8, borderRadius: 4 }}>day off</span>
            <span style={{ background: "rgba(78,160,175,.22)", padding: "1px 8px", marginRight: 8, borderRadius: 4 }}>retreat</span>
            <span style={{ background: "rgba(139,118,196,.22)", padding: "1px 8px", marginRight: 8, borderRadius: 4 }}>session</span>
            tap a day for its week · tap a session for its receipt
          </p>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => openModal("hours")}>Working hours</button>
        <button className="btn btn-ghost btn-sm" onClick={() => openModal("dayoff")}>Days off</button>
        <button className="btn btn-ghost btn-sm" onClick={() => openModal("ical")}>
          Sync external calendar{feed?.ical?.connected ? " ✓" : ""}
        </button>
      </div>

      {detail && (
        <Sheet open onClose={() => setDetail(null)}>
            <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.25rem", marginBottom: 4 }}>
              {detail.title}
            </h3>
            <p style={{ fontSize: ".92rem", margin: "0 0 4px" }}>
              {new Date(detail.startUtc).toLocaleString(undefined, {
                weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
              })}
            </p>
            <p style={{ color: "var(--muted)", fontSize: ".85rem", margin: "0 0 6px" }}>
              with <b>{detail.customer}</b> · {detail.state}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              {detail.meetingUrl && (
                <a className="btn btn-gold btn-sm" href={detail.meetingUrl} target="_blank" rel="noreferrer">
                  Join the meeting →
                </a>
              )}
              {detail.customerEmail && (
                <a
                  className="btn btn-ghost btn-sm"
                  href={`mailto:${detail.customerEmail}?subject=${encodeURIComponent(`About your ${detail.title}`)}&body=${encodeURIComponent(
                    `Hi ${detail.customer},\n\nAbout our session on ${new Date(detail.startUtc).toLocaleString(undefined, {
                      weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
                    })} —\n\nIf you need to move or cancel it, your receipt page can do both:\n${typeof window !== "undefined" ? window.location.origin : ""}/book/receipt/${detail.bookingId}\n\nWith love,\nLove`
                  )}`}
                >
                  Message {detail.customer.split(" ")[0]} ✉
                </a>
              )}
              <Link className="btn btn-ghost btn-sm" href={`/book/receipt/${detail.bookingId}`}>
                Open receipt →
              </Link>
            </div>
            {/* the session's own notebook — discovery-call impressions, what
                was taught, what to remember. Only Love ever sees these. */}
            <p style={{ fontSize: ".62rem", letterSpacing: ".1em", textTransform: "uppercase",
              color: "var(--muted)", margin: "16px 0 4px" }}>
              Session notes — only you see these
            </p>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder={/discovery/i.test(detail.title)
                ? "who are they, what drew them here, where to next…"
                : "how it went, what to remember for next time…"}
              style={{ ...field, width: "100%", minHeight: 84, resize: "vertical" }}
            />
            {detail.needsFulfil && (
              <p style={{ fontSize: ".76rem", color: "var(--warn)", margin: "6px 0 0" }}>
                ⚑ paid — saving notes closes this session out in the books
              </p>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <button className="btn btn-gold btn-sm" onClick={saveNotes} disabled={detailBusy}>
                {detailBusy ? "Saving…" : detail.needsFulfil ? "Save notes & close out ✓" : "Save notes"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetail(null)}>Close</button>
            </div>
        </Sheet>
      )}

      {modal === "hours" && (
        <Sheet open onClose={() => setModal(null)}>
            <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.25rem", marginBottom: 4 }}>Working hours</h3>
            <p style={{ fontSize: ".82rem", color: "var(--muted)", marginBottom: 14 }}>
              Pick the days and the window — these hours shade green and open for booking.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {WEEKDAYS.map((name, i) => (
                <label
                  key={name}
                  style={{
                    ...field, cursor: "pointer", userSelect: "none",
                    background: days[i] ? "rgba(78,138,95,.16)" : "#fff",
                    borderColor: days[i] ? "rgba(78,138,95,.6)" : "rgba(139,118,196,.45)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={days[i]}
                    onChange={() => setDays((d) => d.map((v, j) => (j === i ? !v : v)))}
                    style={{ marginRight: 6 }}
                  />
                  {name.slice(0, 3)}
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
              <label style={{ fontSize: ".85rem" }}>from <input type="time" value={hStart} onChange={(e) => setHStart(e.target.value)} style={field} /></label>
              <label style={{ fontSize: ".85rem" }}>to <input type="time" value={hEnd} onChange={(e) => setHEnd(e.target.value)} style={field} /></label>
            </div>
            {err && <p style={{ color: "var(--err)", fontSize: ".82rem", marginBottom: 10 }}>{err}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-gold btn-sm" onClick={saveHours} disabled={busyUi}>{busyUi ? "Saving…" : "Add hours"}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>Close</button>
            </div>

            <h4 style={{ fontSize: ".85rem", marginTop: 18, marginBottom: 6 }}>Current hours</h4>
            <ul style={{ listStyle: "none", padding: 0, fontSize: ".82rem" }}>
              {cfg?.rules.length ? (
                cfg.rules
                  .slice()
                  .sort((a, b) => a.weekday - b.weekday || (a.start < b.start ? -1 : 1))
                  .map((r) => (
                    <li key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid rgba(139,118,196,.2)" }}>
                      <span style={{ flex: 1 }}>
                        {WEEKDAYS[r.weekday]} {r.start}–{r.end}
                        {r.serviceIds.length > 0 && <span style={{ color: "var(--muted)" }}> · {r.serviceIds.join(", ")}</span>}
                      </span>
                      <button className="btn btn-ghost btn-sm" onClick={() => remove("rule", r.id)} disabled={busyUi} title="remove">✕</button>
                    </li>
                  ))
              ) : (
                <li style={{ color: "var(--muted)" }}>{cfg ? "none yet — the calendar is closed" : "loading…"}</li>
              )}
            </ul>
        </Sheet>
      )}

      {modal === "dayoff" && (
        <Sheet open onClose={() => setModal(null)}>
            <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.25rem", marginBottom: 4 }}>Days off</h3>
            <p style={{ fontSize: ".82rem", color: "var(--muted)", marginBottom: 14 }}>
              Block a date — the whole day, or just a window if you set times. Slots there vanish for everyone.
            </p>
            <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
              <label style={{ fontSize: ".85rem" }}>date <input type="date" value={offDate} onChange={(e) => setOffDate(e.target.value)} style={field} /></label>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ fontSize: ".85rem" }}>from <input type="time" value={offStart} onChange={(e) => setOffStart(e.target.value)} style={field} /></label>
                <label style={{ fontSize: ".85rem" }}>to <input type="time" value={offEnd} onChange={(e) => setOffEnd(e.target.value)} style={field} /></label>
                <span style={{ fontSize: ".75rem", color: "var(--muted)" }}>leave empty = all day</span>
              </div>
              <input
                type="text" placeholder="note (only you see it)" value={offNote}
                onChange={(e) => setOffNote(e.target.value)} style={field}
              />
            </div>
            {err && <p style={{ color: "var(--err)", fontSize: ".82rem", marginBottom: 10 }}>{err}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-gold btn-sm" onClick={saveDayOff} disabled={busyUi}>{busyUi ? "Saving…" : "Block it"}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>Close</button>
            </div>

            <h4 style={{ fontSize: ".85rem", marginTop: 18, marginBottom: 6 }}>Upcoming exceptions</h4>
            <ul style={{ listStyle: "none", padding: 0, fontSize: ".82rem" }}>
              {cfg?.overrides.length ? (
                cfg.overrides
                  .slice()
                  .sort((a, b) => (a.date < b.date ? -1 : 1))
                  .map((o) => (
                    <li key={o.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid rgba(139,118,196,.2)" }}>
                      <span style={{ flex: 1 }}>
                        {o.date} · {o.kind === "blocked" ? (o.start ? `off ${o.start}–${o.end}` : "day off") : `extra ${o.start}–${o.end}`}
                        {o.note && <span style={{ color: "var(--muted)" }}> · {o.note}</span>}
                      </span>
                      <button className="btn btn-ghost btn-sm" onClick={() => remove("override", o.id)} disabled={busyUi} title="remove">✕</button>
                    </li>
                  ))
              ) : (
                <li style={{ color: "var(--muted)" }}>{cfg ? "none — every scheduled day stands" : "loading…"}</li>
              )}
            </ul>
        </Sheet>
      )}

      {modal === "ical" && (
        <Sheet open onClose={() => setModal(null)}>
            <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.25rem", marginBottom: 4 }}>Sync external calendar</h3>
            <p style={{ fontSize: ".82rem", color: "var(--muted)", marginBottom: 14 }}>
              Paste your calendar&apos;s <b>secret iCal address</b> (Google Calendar → Settings →
              &quot;Secret address in iCal format&quot;). Its events become busy time — those slots
              simply vanish from the public board. Refreshes about every 10 minutes.
            </p>
            {cfg?.icalUrl ? (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: ".85rem", wordBreak: "break-all" }}>
                  connected: <span style={{ color: "var(--gold-deep)" }}>{cfg.icalUrl.slice(0, 60)}…</span>
                </p>
                {feed?.ical && (
                  <p style={{ fontSize: ".78rem", color: "var(--muted)", marginTop: 4 }}>
                    {feed.ical.error
                      ? `⚠ last read failed: ${feed.ical.error}`
                      : feed.ical.fetchedAtMs
                        ? `last read ${new Date(feed.ical.fetchedAtMs).toLocaleTimeString()} · ${feed.busy?.length ?? 0} busy windows in view`
                        : "reading…"}
                    {feed.ical.skippedRecurring > 0 &&
                      ` · ${feed.ical.skippedRecurring} complex repeating events skipped (monthly repeats etc.) — mirror those as Days off`}
                  </p>
                )}
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => saveIcal("")} disabled={busyUi}>
                  Disconnect
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                <input
                  type="url" placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
                  value={icalInput} onChange={(e) => setIcalInput(e.target.value)} style={field}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-gold btn-sm" onClick={() => saveIcal(icalInput)} disabled={busyUi || !icalInput.trim()}>
                    {busyUi ? "Connecting…" : "Connect"}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>Close</button>
                </div>
              </div>
            )}
            {err && <p style={{ color: "var(--err)", fontSize: ".82rem" }}>{err}</p>}
            <p style={{ fontSize: ".75rem", color: "var(--muted)", marginTop: 8 }}>
              The secret address is read-only and stays on the server — never shown to visitors.
            </p>
        </Sheet>
      )}
    </div>
  );
}
