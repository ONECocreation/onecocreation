"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { glassCard, field, SectionHead } from "@/components/console/glass";

/**
 * THE SEND PANEL (TASK-131, 0018.06.16 a₿): one letter, one page — pick the
 * segment (All, or one door's people — every source seen in the records,
 * with LIVE counts), send yourself a test copy, schedule if the moment is
 * later, and type the exact headcount back before a list send fires. After
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

interface SendRecord {
  sendId: string;
  queued: number;
  sent: number;
  dropped: number;
  segment: string;
  scheduledFor: string;
  createdAtMs: number;
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
      return `Scheduled for ${clockWords(o.scheduledFor, "America/Denver")} Mountain (${clockWords(o.scheduledFor)} your time).`;
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

export default function LetterSendPanel({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const [letter, setLetter] = useState<ApiLetter | null | undefined>(undefined);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [cap, setCap] = useState(100);
  const [segment, setSegment] = useState("all");
  const [testTo, setTestTo] = useState("");
  const [sendAt, setSendAt] = useState("");
  const [typed, setTyped] = useState("");
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
    setTyped("");
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
        // reload with no send in flight to poll.
        if (sendsRes?.ok) setRecentSends(sendsRes.sends ?? []);
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
    const rec: SendRecord = { sendId, queued: d.queued, sent: d.sent, dropped: d.dropped, segment: d.segment, scheduledFor: d.scheduledFor, createdAtMs: d.createdAtMs };
    setListOutcome({ kind: "progress", queued: rec.queued, sent: rec.sent, dropped: rec.dropped });
    setRecentSends((prev) => [rec, ...prev.filter((s) => s.sendId !== sendId)].slice(0, 5));
    if (pollShouldStop(pollStartRef.current, Date.now(), rec)) setActiveSendId(null);
  }

  useEffect(() => {
    if (!activeSendId) return;
    pollStartRef.current = Date.now();
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
  const confirmed = typed.trim() !== "" && Number(typed) === count;

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

  async function sendList() {
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
          confirm: Number(typed),
          at: sendAt ? new Date(sendAt).toISOString() : undefined,
        }),
      }).then((r) => r.json()).catch(() => null);
      if (d?.ok) {
        setListOutcome({ kind: "queued", queued: d.queued, scheduledFor: d.scheduledFor });
        setTyped("");
        if (d.sendId) {
          setRecentSends((prev) => [
            { sendId: d.sendId, queued: d.queued, sent: 0, dropped: 0, segment: d.segment, scheduledFor: d.scheduledFor, createdAtMs: Date.now() },
            ...prev.filter((s) => s.sendId !== d.sendId),
          ].slice(0, 5));
          setActiveSendId(d.sendId); // starts the poll effect above
        }
      } else if (d?.expected !== undefined) {
        setListOutcome({ kind: "err", reason: `the list moved — it is now ${d.expected}; retype the count` });
      } else {
        setListOutcome({ kind: "err", reason: d?.reason ?? "send failed" });
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
        <Link href="/a/letters" style={{ color: "var(--info)", textDecoration: "underline" }}>← back to the letters room</Link>
      </div>
    );
  }

  return (
    <div className="p-6 text-sm" style={{ color: "var(--ink)" }}>
      <Link href="/a/letters" style={{ fontSize: ".75rem", color: "var(--info)", textDecoration: "underline" }}>← the letters room</Link>
      <div className="mt-2" style={glassCard}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <b>{letter.title ?? letter.key}</b>
          <span style={{ fontSize: ".75rem", color: "var(--info)" }}>
            {letter.kind === "composed" ? "composed by Love" : "seeded"} ·{" "}
            {letter.audience === "public" ? "🌍 public (also on /news)" : "✉ the list"}
          </span>
        </div>
        <p className="mt-1" style={{ color: "var(--ink-body)" }}>&ldquo;{subject}&rdquo;</p>
        {/* derive-or-dash: a composed letter has no site page yet (the /news +
            /letters seam is flagged, outside this lane) — no preview door,
            and its emails carry no "view on the site" link */}
        {letter.kind === "seeded" ? (
          <a href={`/letters/${letter.key}`} target="_blank" rel="noreferrer" className="mt-1 inline-block btn btn-ghost btn-sm">
            preview on the site
          </a>
        ) : (
          <p className="mt-1" style={{ fontSize: ".62rem", textTransform: "uppercase", color: "var(--muted)" }}>
            composed letter — its site page arrives with the /news seam (flagged)
          </p>
        )}
        {!hasBody && (
          <p className="mt-2" style={{ fontSize: ".75rem", color: "var(--muted)" }}>
            This letter has no words yet — <Link href="/a/letters" style={{ textDecoration: "underline", color: "var(--info)" }}>write it in the room</Link> before sending.
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
          <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" type="email" className="console-field" style={field} />
          <button onClick={sendTest} disabled={sending || !testTo.includes("@") || !hasBody} className="btn btn-sm">
            {testOutcome.kind === "sending" ? "SENDING…" : "SEND TEST COPY"}
          </button>
        </div>
        {testOutcome.kind !== "idle" && (
          <p aria-live="polite" className={testOutcome.kind === "err" ? "kit-note kit-note-err" : "kit-note"}>{testSendOutcomeLine(testOutcome)}</p>
        )}
      </div>

      <SectionHead label="Send to the list — pick the door" />
      <div style={glassCard}>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
          {segments.map((s) => (
            <li key={s.source}>
              <label className="flex items-center gap-2" style={{ ...field, cursor: "pointer" }}>
                <input type="radio" name="segment" checked={segment === s.source} onChange={() => pickSegment(s.source)} />
                <span className="flex-1">{s.source === "all" ? "All — the whole list" : s.source}</span>
                <span style={{ fontSize: ".75rem", color: "var(--muted)" }}>{s.count} {s.count === 1 ? "person" : "people"}</span>
              </label>
            </li>
          ))}
          {segments.length === 0 && (
            <li style={{ fontSize: ".75rem", color: "var(--muted)" }}>no subscriber vault configured — the list is unreadable here</li>
          )}
        </ul>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} className="console-field" style={field} />
          <span style={{ fontSize: ".62rem", textTransform: "uppercase", color: "var(--muted)" }}>{sendAt ? "scheduled" : "next tick"}</span>
        </div>

        {count > 0 && (
          <div className="mt-3 space-y-2">
            <label className="block" style={{ fontSize: ".75rem", color: "var(--muted)" }}>
              Type <b style={{ color: "var(--gold-deep)" }}>{count}</b> to send to {count} {count === 1 ? "person" : "people"}:
              <input value={typed} onChange={(e) => setTyped(e.target.value)} inputMode="numeric" placeholder={String(count)}
                className="ml-2 console-field" style={{ ...field, width: 96 }} />
            </label>
            <button onClick={sendList} disabled={sending || !confirmed || !hasBody} className="btn btn-sm">
              {listOutcome.kind === "sending" ? "SENDING…" : sendAt ? `SCHEDULE TO ${count} ${count === 1 ? "PERSON" : "PEOPLE"}` : `SEND TO ${count} ${count === 1 ? "PERSON" : "PEOPLE"}`}
            </button>
            {finish && (
              <p style={{ fontSize: ".75rem", color: "var(--muted)" }}>
                ⏳ the hourly cap ({cap}/hour) drips this — done by ≈ {finish.toLocaleString()}
                {sendAt ? " after the scheduled start" : ""}
              </p>
            )}
          </div>
        )}
        {listOutcome.kind !== "idle" && (
          <p aria-live="polite" className={listOutcome.kind === "err" ? "kit-note kit-note-err" : "kit-note"}>{listSendOutcomeLine(listOutcome)}</p>
        )}

        {recentSends.length > 0 && (
          <ul className="kit-sends-list">
            {recentSends.map((s) => (
              <li key={s.sendId} className="kit-note">
                {new Date(s.createdAtMs).toLocaleString()} — {s.segment === "all" ? "all" : s.segment} — Sent to {s.sent}
                {s.dropped > 0 ? ` (${s.dropped} dropped)` : ""} of {s.queued}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
