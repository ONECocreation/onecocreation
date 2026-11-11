"use client";

import { use, useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { glassCard, field, SectionHead } from "@/components/console/glass";
import { DEFAULT_TZ, wallClockToUtc } from "@/lib/booking-time";
import { Button } from "@/components/kit";

/**
 * THE SEND PANEL (TASK-131, 0018.06.16 a₿): one letter, one page — pick the
 * segment (All, or one door's people — every source seen in the records,
 * with LIVE counts), send yourself a test copy, schedule if the moment is
 * later (in Mountain Time), and tick the box that names the headcount
 * before Send now or Schedule fires; a send still waiting can be cancelled
 * or moved (the Admiral's pins, block 975,433). After
 * the send, one delivery line per member. When N outruns the hourly cap the
 * panel says when the drip will finish — the queue's pace, told honestly.
 *
 * T-484 (walk item S7) — TRACE: the Admiral pressed the list send and saw
 * NO confirmation; the queue afterwards held 2 items, not 6. Reading the
 * route + this panel end to end, every ROUTE outcome already produced a
 * `note` string (a 409, a 429 dedupe, the success line) — but the panel
 * only ever recorded it into ONE shared `note` state also used for the
 * TEST button, and rendered it in only ONE place, under the LIST section,
 * `var(--muted)` throughout (success and failure alike — no visual break
 * between "it worked" and "it didn't"). A test click's own outcome landed
 * in that same variable and, if the operator had scrolled the list
 * section out of view (a long segment list, a small screen), a quiet
 * muted line easily reads as nothing at all — the likeliest account of
 * "saw no confirmation" without a captured screenshot of the exact moment.
 * The 2-of-6 count is most consistent with the 409 path actually firing:
 * `segments` (the panel's LIVE counts) is fetched once, at page load;
 * `list.length` at the SEND route is read fresh, at click time — a soul
 * unsubscribing or a stale tab between those two moments would show 6,
 * confirm 6, and have the route refuse with "type the exact count" against
 * the NOW-current 2 (or vice-versa) — a real send never firing, the
 * queue's 2 items being unrelated leftovers, not this click's own send.
 * Building real send-tracking (below) makes this class of doubt structurally
 * impossible: every outcome is now a REPLACED, colored, aria-live line next
 * to its own button, and a real send's own progress is read back from the
 * vault, never inferred from the queue's raw depth.
 */
interface ApiLetter {
  key: string;
  kind: "seeded" | "composed";
  override: { subject: string; body: string; audience?: string } | null;
  default: { subject: string; body: string } | null;
  audience: "public" | "members";
  title: string | null;
}
interface Segment {
  source: string;
  count: number;
}

/** T-482: the two automatic sends this letter can ride — "" means neither. */
type AutoSlot = "" | "reading-confirm" | "reading-dayof";

const AUTO_SLOT_STATE_WORDS: Record<AutoSlot, string> = {
  "": "Not automatic yet.",
  "reading-confirm": "Sent when someone signs up for the reading.",
  "reading-dayof": "Sent reading-day morning at 2 a.m.",
};

/** The drip's honest pace: past the hourly cap the queue spans whole hours.
 *  Module scope so react's render-purity rule reads it as a plain helper. */
function estimateFinish(n: number, cap: number): Date | null {
  return n > cap ? new Date(Date.now() + Math.ceil(n / cap) * 3_600_000) : null;
}

/* ═══════════════════════ T-484 — the real sent state ═══════════════════
 * One `SendRecord` (mail-queue.ts's own shape, read back through the send
 * route's GET) per list send: queued at publish time, sent/dropped live
 * as `tick()` drains the queue. The panel polls it, never the raw queue. */

export interface SendRecord {
  sendId: string;
  queued: number;
  sent: number;
  dropped: number;
  segment: string;
  scheduledFor: string;
  createdAtMs: number;
  /** Love pressed Cancel on it (absent on records written before Cancel existed). */
  cancelled?: boolean;
}

/* ═══════════════ the schedule reads in Mountain Time (the Admiral's pin) ═══════
 * The time field used to be read in the BROWSER's own zone: the Admiral,
 * an hour west, typed 11:11 and the letter was queued for 12:11 Mountain.
 * Whatever is typed is now Mountain Time, the site's own clock (DEFAULT_TZ),
 * and the field says so. Pure helpers, pinned in tests. */

/** "2026-11-11T11:11" from the time field = that wall clock in Mountain Time. */
export function mountainInputToIso(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  return wallClockToUtc(+m[1], +m[2], +m[3], +m[4], +m[5], DEFAULT_TZ).toISOString();
}

/** The reverse: an instant as the time field's own "YYYY-MM-DDTHH:MM" in Mountain Time. */
export function isoToMountainInput(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DEFAULT_TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** "Wednesday, November 11 at 11:11 AM Mountain Time" */
export function mountainWords(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-US", { timeZone: DEFAULT_TZ, weekday: "long", month: "long", day: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: DEFAULT_TZ, hour: "numeric", minute: "2-digit", timeZoneName: "longGeneric" }).format(d);
  return `${day} at ${time}`;
}

/** Cancel and Change time are offered only while nothing has gone out (mail-queue.ts's own rule). */
export function sendIsChangeable(s: Pick<SendRecord, "sent" | "dropped" | "cancelled">): boolean {
  return !s.cancelled && s.sent + s.dropped === 0;
}

/** One row of the recent sends list, in words. */
export function sendRowWords(s: SendRecord): string {
  const who = `${s.queued} ${s.queued === 1 ? "person" : "people"}`;
  const door = s.segment === "all" ? "everyone" : s.segment;
  if (s.cancelled) return `Cancelled · ${door} · ${who}${s.sent > 0 ? ` · ${s.sent} sent before it stopped` : ""}`;
  if (s.sent + s.dropped === 0) {
    return s.scheduledFor === "next tick"
      ? `Going out within 10 minutes · ${door} · ${who}`
      : `Waiting for ${mountainWords(s.scheduledFor)} · ${door} · ${who}`;
  }
  return `Sent to ${s.sent}${s.dropped > 0 ? ` (${s.dropped} dropped)` : ""} of ${s.queued} · ${door}`;
}

/** "5:55 AM" — `iso`'s own clock in `timeZone` (undefined = the viewer's
 *  own, whatever the browser/runtime is set to). A pure read of `Intl`,
 *  never a live timer. */
function clockWords(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export type ListSendOutcome =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "err"; reason: string }
  | { kind: "queued"; queued: number; scheduledFor: string }
  | { kind: "progress"; queued: number; sent: number; dropped: number };

/** The ONE line the list-send control shows for every outcome (the /a
 *  uniformity law: one state, said once). "next tick" reads as "goes out
 *  within 10 minutes" — the VPS crontab's own cadence (no "send now" drain
 *  lives in this panel); a real `at` schedule reads in Mountain AND the
 *  viewer's own clock, since the two are rarely the same soul's zone. */
export function listSendOutcomeLine(o: ListSendOutcome): string {
  switch (o.kind) {
    case "idle":
      return "";
    case "sending":
      return "Sending…";
    case "err":
      return o.reason;
    case "queued": {
      const who = o.queued === 1 ? "person" : "people";
      if (o.scheduledFor === "next tick") return `Queued for ${o.queued} ${who}. Goes out within 10 minutes.`;
      return `Scheduled for ${mountainWords(o.scheduledFor)} (${clockWords(o.scheduledFor)} your time).`;
    }
    case "progress": {
      const who = o.queued === 1 ? "person" : "people";
      if (o.sent + o.dropped >= o.queued) return `Sent to all ${o.queued} ${who}.`;
      return `Sent to ${o.sent} of ${o.queued}.`;
    }
  }
}

/** The poll's own stop rule — done (every queued copy resolved, sent or
 *  dropped) or 30 minutes have passed since the send, whichever comes
 *  first. A pure function of the numbers; the interval that calls it is
 *  the only "live timer" in this file. */
export function pollShouldStop(startedAtMs: number, nowMs: number, rec: { sent: number; dropped: number; queued: number }): boolean {
  if (rec.sent + rec.dropped >= rec.queued) return true;
  return nowMs - startedAtMs >= 30 * 60_000;
}

/** T-484 (review round, item 3) — after a reload, `recentSends` (newest
 *  first, exactly how `?key=` hands them back) may hold a send that was
 *  still draining when the tab closed; with no poll running its line
 *  would freeze forever. The newest one that has NOT resolved
 *  (`sent+dropped<queued`) and is NOT yet past the poll's own 30-minute
 *  stop rule (`pollShouldStop`, the SAME rule a live poll obeys, never a
 *  second one) is the one worth re-arming; `null` when every send is
 *  either done or too old to still be worth watching. */
export function sendToReArm(sends: SendRecord[], nowMs: number): SendRecord | null {
  return sends.find((s) => s.sent + s.dropped < s.queued && !pollShouldStop(s.createdAtMs, nowMs, s)) ?? null;
}

export type TestSendOutcome = { kind: "idle" } | { kind: "sending" } | { kind: "ok"; to: string } | { kind: "err"; reason: string };

/** The test button's own line, right beside it — never shared with the
 *  list send's line below (the original miss: one `note` variable served
 *  both controls, so a test click's own confirmation could land far from
 *  the button that caused it). */
export function testSendOutcomeLine(o: TestSendOutcome): string {
  switch (o.kind) {
    case "idle":
      return "";
    case "sending":
      return "Sending…";
    case "ok":
      return `Test copy queued for ${o.to}.`;
    case "err":
      return o.reason;
  }
}

const POLL_EVERY_MS = 15_000;

/** a field that sits beside a small button: no vertical padding, kit-field-sm sets the shared height */
const fieldSm: CSSProperties = { ...field, padding: "0 12px" };

export default function LetterSendPanel({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const [letter, setLetter] = useState<ApiLetter | null | undefined>(undefined);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [cap, setCap] = useState(100);
  const [segment, setSegment] = useState("all");
  const [testTo, setTestTo] = useState("");
  const [sendAt, setSendAt] = useState("");
  const [sendAtPast, setSendAtPast] = useState(false);
  const [checked, setChecked] = useState(false);
  // Change time / Cancel on a send still waiting: which row is open, and its own line
  const [rowEdit, setRowEdit] = useState<{ sendId: string; mode: "time" | "cancel"; value: string } | null>(null);
  const [rowNote, setRowNote] = useState<{ sendId: string; text: string; err: boolean } | null>(null);
  const [testOutcome, setTestOutcome] = useState<TestSendOutcome>({ kind: "idle" });
  const [listOutcome, setListOutcome] = useState<ListSendOutcome>({ kind: "idle" });
  const [recentSends, setRecentSends] = useState<SendRecord[]>([]);
  const [activeSendId, setActiveSendId] = useState<string | null>(null);
  const pollStartRef = useRef<number>(0);

  // T-482: the "Sends automatically" row — which slot (if any) THIS letter
  // currently holds, and the in-flight guard for saving a change to it.
  const [autoSlot, setAutoSlot] = useState<AutoSlot>("");
  const [savingSlot, setSavingSlot] = useState(false);
  const [slotNote, setSlotNote] = useState("");

  /* TASK-214: "the receipt sent 3× on 3 clicks" — the panel had no in-flight
   * guard. A ref (not state) is the guard itself: state updates are async
   * and a second click can fire before React re-renders with `disabled`,
   * but a ref reads/writes synchronously in the same tick, so the SECOND of
   * two rapid clicks sees the flag already up and returns before any fetch
   * fires. `sending` (state) drives the visible disabled attribute — belt
   * and suspenders, same shape as the send route's own onceWithin() guard
   * (mail.ts) on the wire. ONE guard for both buttons (test and list) — a
   * test copy and a real send were never meant to race each other either. */
  const sendingRef = useRef(false);
  const [sending, setSending] = useState(false);

  // the estimate updates from event handlers / the fetch callback (react
  // purity: never Date.now() in render, never setState in an effect body) —
  // past the cap the queue spans whole hours and the panel says when
  const [finish, setFinish] = useState<Date | null>(null);
  function updateEstimate(n: number, capVal: number) {
    setFinish(estimateFinish(n, capVal));
  }
  function pickSegment(source: string, segs: Segment[] = segments, capVal: number = cap) {
    setSegment(source);
    setChecked(false);
    updateEstimate(segs.find((s) => s.source === source)?.count ?? 0, capVal);
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/letters").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/letters/slots").then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/admin/letters/send?key=${encodeURIComponent(key)}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([d, s, sendsRes]) => {
        if (!d?.ok) {
          setLetter(null);
          return;
        }
        const segs: Segment[] = d.segments ?? [];
        const capVal: number = d.mailHourlyCap ?? 100;
        setLetter((d.letters ?? []).find((l: ApiLetter) => l.key === key) ?? null);
        setSegments(segs);
        setCap(capVal);
        updateEstimate(segs.find((seg) => seg.source === "all")?.count ?? 0, capVal);
        // s.slots is the EFFECTIVE key per slot (the hardcoded default
        // applied when no slot was ever set) — this letter's row shows
        // itself selected whenever ITS key is the effective holder,
        // default-riding or explicit alike.
        const slots: { "reading-confirm"?: string; "reading-dayof"?: string } = s?.ok ? (s.slots ?? {}) : {};
        setAutoSlot(slots["reading-confirm"] === key ? "reading-confirm" : slots["reading-dayof"] === key ? "reading-dayof" : "");
        // T-484: the last few sends for THIS letter — visible after a
        // reload. The NEWEST one that isn't done yet (sent+dropped<queued)
        // AND is still under 30 minutes old re-arms the poll (item 3, the
        // review round) — otherwise a send still draining when the tab
        // reloads shows a frozen line that never updates again.
        const sends: SendRecord[] = sendsRes?.ok ? (sendsRes.sends ?? []) : [];
        setRecentSends(sends);
        const unfinished = sendToReArm(sends, Date.now());
        if (unfinished) {
          pollStartRef.current = unfinished.createdAtMs;
          setListOutcome({ kind: "progress", queued: unfinished.queued, sent: unfinished.sent, dropped: unfinished.dropped });
          setActiveSendId(unfinished.sendId);
        }
      })
      .catch(() => setLetter(null));
  }, [key]);

  /** T-484: one send's own tally, read back — merges into `recentSends`
   *  (so the history list stays live while a send is in flight, with no
   *  second fetch) and stops the interval once `pollShouldStop()` says so. */
  async function pollSendStatus(sendId: string) {
    const d = await fetch(`/api/admin/letters/send?sendId=${encodeURIComponent(sendId)}`)
      .then((r) => r.json())
      .catch(() => null);
    if (!d?.ok) return; // a transient fetch hiccup — try again next tick, never clear the line
    const rec: SendRecord = { sendId, queued: d.queued, sent: d.sent, dropped: d.dropped, segment: d.segment, scheduledFor: d.scheduledFor, createdAtMs: d.createdAtMs, cancelled: !!d.cancelled };
    setListOutcome({ kind: "progress", queued: rec.queued, sent: rec.sent, dropped: rec.dropped });
    setRecentSends((prev) => [rec, ...prev.filter((s) => s.sendId !== sendId)].slice(0, 5));
    if (pollShouldStop(pollStartRef.current, Date.now(), rec)) setActiveSendId(null);
  }

  useEffect(() => {
    if (!activeSendId) return;
    // pollStartRef is set by the CALLER (a fresh send, or the reload's own
    // re-arm above) to the send's real createdAtMs, never Date.now() here —
    // the 30-minute stop rule is anchored to the send's own age, immune to
    // a reload restarting the clock.
    const id = setInterval(() => {
      pollSendStatus(activeSendId);
    }, POLL_EVERY_MS);
    return () => clearInterval(id);
  }, [activeSendId]);

  /** T-482: move this letter onto (or off) an automatic-send slot. An
   *  optimistic set, reverted on a rejection — the same shape as every
   *  other one-control-per-row save on this page. */
  async function changeAutoSlot(next: AutoSlot) {
    const prev = autoSlot;
    setAutoSlot(next);
    setSavingSlot(true);
    setSlotNote("");
    try {
      const d = await fetch("/api/admin/letters/slots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, slot: next }),
      }).then((r) => r.json()).catch(() => null);
      if (!d?.ok) {
        setAutoSlot(prev);
        setSlotNote(d?.reason ?? "could not save");
      }
    } finally {
      setSavingSlot(false);
    }
  }

  const subject = letter?.override?.subject ?? letter?.default?.subject ?? letter?.title ?? "";
  const hasBody = !!(letter?.override?.body ?? letter?.default?.body)?.trim();
  const count = segments.find((s) => s.source === segment)?.count ?? 0;
  const confirmed = checked && count > 0;
  const sendAtIso = sendAt ? mountainInputToIso(sendAt) : null;

  function pickTime(value: string) {
    setSendAt(value);
    const iso = value ? mountainInputToIso(value) : null;
    setSendAtPast(!!iso && Date.parse(iso) <= Date.now());
  }

  async function sendTest() {
    if (sendingRef.current) return; // one click in flight at a time
    sendingRef.current = true;
    setSending(true);
    setTestOutcome({ kind: "sending" });
    try {
      const d = await fetch("/api/admin/letters/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, testTo }),
      }).then((r) => r.json()).catch(() => null);
      setTestOutcome(d?.ok ? { kind: "ok", to: testTo } : { kind: "err", reason: d?.reason ?? "test send failed" });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  async function sendList(mode: "now" | "schedule") {
    if (sendingRef.current) return; // one click in flight at a time
    sendingRef.current = true;
    setSending(true);
    setListOutcome({ kind: "sending" });
    try {
      const d = await fetch("/api/admin/letters/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          source: segment,
          confirm: confirmed ? count : undefined,
          at: mode === "schedule" && sendAtIso ? sendAtIso : undefined,
        }),
      }).then((r) => r.json()).catch(() => null);
      if (d?.ok) {
        setListOutcome({ kind: "queued", queued: d.queued, scheduledFor: d.scheduledFor });
        setChecked(false);
        if (d.sendId) {
          const createdAtMs = Date.now();
          setRecentSends((prev) => [
            { sendId: d.sendId, queued: d.queued, sent: 0, dropped: 0, segment: d.segment, scheduledFor: d.scheduledFor, createdAtMs },
            ...prev.filter((s) => s.sendId !== d.sendId),
          ].slice(0, 5));
          pollStartRef.current = createdAtMs; // the 30-minute stop rule's own anchor
          setActiveSendId(d.sendId); // starts the poll effect above
        }
      } else if (d?.expected !== undefined) {
        setListOutcome({ kind: "err", reason: `The list changed. It has ${d.expected} people now. Check the box again to send.` });
        setChecked(false);
      } else {
        setListOutcome({ kind: "err", reason: d?.reason ?? "send failed" });
      }
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  /** Cancel or Change time on a send still waiting to go out. */
  async function changeSend(sendId: string, action: "cancel" | "reschedule", value?: string) {
    const at = action === "reschedule" && value ? mountainInputToIso(value) : null;
    if (action === "reschedule" && !at) {
      setRowNote({ sendId, text: "Pick a day and a time.", err: true });
      return;
    }
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    try {
      const d = await fetch("/api/admin/letters/send", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendId, action, at: at ?? undefined }),
      }).then((r) => r.json()).catch(() => null);
      if (!d?.ok) {
        setRowNote({ sendId, text: d?.reason ?? "That did not save. Try again.", err: true });
        return;
      }
      const rec: SendRecord = { sendId, queued: d.queued, sent: d.sent, dropped: d.dropped, segment: d.segment, scheduledFor: d.scheduledFor, createdAtMs: d.createdAtMs, cancelled: !!d.cancelled };
      setRecentSends((prev) => prev.map((s) => (s.sendId === sendId ? rec : s)));
      setRowEdit(null);
      setRowNote({ sendId, text: action === "cancel" ? "Cancelled. Nobody on the list gets it." : `Moved to ${mountainWords(rec.scheduledFor)}.`, err: false });
      if (activeSendId === sendId) {
        if (action === "cancel") {
          setActiveSendId(null);
          setListOutcome({ kind: "idle" });
        } else {
          setListOutcome({ kind: "queued", queued: rec.queued, scheduledFor: rec.scheduledFor });
        }
      }
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  if (letter === undefined) return <div className="p-6 text-sm" style={{ color: "var(--muted)" }}>loading…</div>;
  if (letter === null) {
    return (
      <div className="p-6 text-sm" style={{ color: "var(--ink)" }}>
        <p style={{ color: "var(--ink-body)" }}>Unknown letter “{key}”.</p>
        <Link href="/a/letters" style={{ color: "var(--info)", textDecoration: "underline" }}>Back to the letters room</Link>
      </div>
    );
  }

  return (
    <div className="p-6 text-sm" style={{ color: "var(--ink)" }}>
      <Link href="/a/letters" style={{ fontSize: ".75rem", color: "var(--info)", textDecoration: "underline" }}>Back to the letters room</Link>
      <div className="mt-2" style={glassCard}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <b>{letter.title ?? letter.key}</b>
          <span style={{ fontSize: ".75rem", color: "var(--info)" }}>
            {letter.kind === "composed" ? "composed by Love" : "seeded"} ·{" "}
            {letter.audience === "public" ? "public (also on /news)" : "the list"}
          </span>
        </div>
        <p className="mt-1" style={{ color: "var(--ink-body)" }}>&ldquo;{subject}&rdquo;</p>
        {/* derive-or-dash: a composed letter has no site page yet (the /news +
            /letters seam is flagged, outside this lane) — no preview door,
            and its emails carry no "view on the site" link */}
        {letter.kind === "seeded" ? (
          <a href={`/letters/${letter.key}`} target="_blank" rel="noreferrer" className="mt-1 inline-block kit-btn kit-btn-second kit-btn-sm">
            preview on the site
          </a>
        ) : (
          <p className="mt-1" style={{ fontSize: ".62rem", textTransform: "uppercase", color: "var(--muted)" }}>
            composed letter: its site page arrives with the /news seam (flagged)
          </p>
        )}
        {!hasBody && (
          <p className="mt-2" style={{ fontSize: ".75rem", color: "var(--muted)" }}>
            This letter has no words yet. <Link href="/a/letters" style={{ textDecoration: "underline", color: "var(--info)" }}>write it in the room</Link> before sending.
          </p>
        )}
        {/* T-482: only a letter Love composes may ride an automatic send
            (review BLOCKER — a seeded letter's {{placeholders}} would go
            out raw) — the row shows only on a composed letter's own page.
            ONE state per row, said once, under the row's words; ONE
            control per row, on the same right edge in every state — the
            /a uniformity law, `.kit-rows`' own grid (Stage1Card's idiom).
            A save error REPLACES the state line, never adds a second one. */}
        {letter.kind === "composed" && (
          <ul className="kit-rows mt-2">
            <li data-row="auto-slot">
              <span>{slotNote || AUTO_SLOT_STATE_WORDS[autoSlot]}</span>
              <span className="kit-rows-end">
                <select value={autoSlot} onChange={(e) => changeAutoSlot(e.target.value as AutoSlot)} disabled={savingSlot} className="kit-field-input">
                  <option value="">Not automatic</option>
                  <option value="reading-confirm">When someone signs up for the reading</option>
                  <option value="reading-dayof">Reading-day morning (2 a.m.)</option>
                </select>
              </span>
            </li>
          </ul>
        )}
      </div>

      <SectionHead label="Send me a test" />
      <div style={glassCard}>
        <div className="flex flex-wrap items-center gap-2">
          <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" type="email" className="console-field kit-field-sm" style={fieldSm} />
          <Button sm variant="second" onClick={sendTest} disabled={sending || !testTo.includes("@") || !hasBody}>
            {testOutcome.kind === "sending" ? "Sending…" : "Send me a test copy"}
          </Button>
        </div>
        {testOutcome.kind !== "idle" && (
          <p aria-live="polite" className={testOutcome.kind === "err" ? "kit-note kit-note-err" : testOutcome.kind === "ok" ? "kit-note kit-note-ok" : "kit-note"}>{testSendOutcomeLine(testOutcome)}</p>
        )}
      </div>

      <SectionHead label="Send to the list" />
      <div style={glassCard}>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
          {segments.map((s) => (
            <li key={s.source}>
              <label className="flex items-center gap-2" style={{ ...field, cursor: "pointer" }}>
                <input type="radio" name="segment" checked={segment === s.source} onChange={() => pickSegment(s.source)} />
                <span className="flex-1">{s.source === "all" ? "All: the whole list" : s.source}</span>
                <span style={{ fontSize: ".75rem", color: "var(--muted)" }}>{s.count} {s.count === 1 ? "person" : "people"}</span>
              </label>
            </li>
          ))}
          {segments.length === 0 && (
            <li style={{ fontSize: ".75rem", color: "var(--muted)" }}>no subscriber vault configured. The list is unreadable here</li>
          )}
        </ul>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input type="datetime-local" value={sendAt} onChange={(e) => pickTime(e.target.value)} aria-label="Send time, Mountain Time" className="console-field kit-field-sm" style={fieldSm} />
          <span style={{ fontSize: ".75rem", color: "var(--muted)" }}>Mountain Time</span>
        </div>
        {sendAtIso && (
          <p className={sendAtPast ? "kit-note kit-note-err" : "kit-note"}>
            {sendAtPast ? "That time has passed. Pick a later one, or send it now." : `Schedule sends it ${mountainWords(sendAtIso)}.`}
          </p>
        )}

        {count > 0 && (
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2" style={{ ...field, cursor: "pointer" }}>
              <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
              <span>I checked the list. This goes to <b>{count} {count === 1 ? "person" : "people"}</b>.</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Button sm onClick={() => sendList("now")} disabled={sending || !confirmed || !hasBody}>
                {listOutcome.kind === "sending" ? "Sending…" : "Send now"}
              </Button>
              <Button sm onClick={() => sendList("schedule")} disabled={sending || !confirmed || !hasBody || !sendAtIso || sendAtPast}>
                Schedule
              </Button>
            </div>
            <p className="kit-note">Send now goes out within 10 minutes. Schedule waits for the time above.</p>
            {finish && (
              <p style={{ fontSize: ".75rem", color: "var(--muted)" }}>
                The hourly cap ({cap} an hour) spreads this out: done by about {finish.toLocaleString()}
                {sendAt ? " after the scheduled start" : ""}
              </p>
            )}
          </div>
        )}
        {listOutcome.kind !== "idle" && (
          <p aria-live="polite" className={
            listOutcome.kind === "err" ? "kit-note kit-note-err" : listOutcome.kind === "queued" || listOutcome.kind === "progress" ? "kit-note kit-note-ok" : "kit-note"
          }>{listSendOutcomeLine(listOutcome)}</p>
        )}

        {recentSends.length > 0 && (
          <ul className="kit-sends-list">
            {recentSends.map((s) => (
              <li key={s.sendId} className="kit-note">
                <span>{sendRowWords(s)}</span>
                {sendIsChangeable(s) && rowEdit?.sendId !== s.sendId && (
                  <span className="ml-2 inline-flex flex-wrap gap-2">
                    <Button sm variant="second" onClick={() => { setRowNote(null); setRowEdit({ sendId: s.sendId, mode: "time", value: s.scheduledFor === "next tick" ? "" : isoToMountainInput(s.scheduledFor) }); }} disabled={sending}>Change time</Button>
                    <Button sm variant="second" onClick={() => { setRowNote(null); setRowEdit({ sendId: s.sendId, mode: "cancel", value: "" }); }} disabled={sending}>Cancel send</Button>
                  </span>
                )}
                {rowEdit?.sendId === s.sendId && rowEdit.mode === "time" && (
                  <span className="mt-2 flex flex-wrap items-center gap-2">
                    <input type="datetime-local" value={rowEdit.value} onChange={(e) => setRowEdit({ ...rowEdit, value: e.target.value })} aria-label="New send time, Mountain Time" className="console-field kit-field-sm" style={fieldSm} />
                    <span style={{ fontSize: ".75rem", color: "var(--muted)" }}>Mountain Time</span>
                    <Button sm onClick={() => changeSend(s.sendId, "reschedule", rowEdit.value)} disabled={sending || !rowEdit.value}>Save time</Button>
                    <Button sm variant="second" onClick={() => setRowEdit(null)} disabled={sending}>Keep it</Button>
                  </span>
                )}
                {rowEdit?.sendId === s.sendId && rowEdit.mode === "cancel" && (
                  <span className="mt-2 flex flex-wrap items-center gap-2">
                    <span>Cancel this send? Nobody on the list gets it. There is no going back.</span>
                    <Button sm onClick={() => changeSend(s.sendId, "cancel")} disabled={sending}>Yes, cancel it</Button>
                    <Button sm variant="second" onClick={() => setRowEdit(null)} disabled={sending}>Keep it</Button>
                  </span>
                )}
                {rowNote?.sendId === s.sendId && (
                  <span aria-live="polite" className={rowNote.err ? "kit-note kit-note-err" : "kit-note kit-note-ok"} style={{ display: "block" }}>{rowNote.text}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
