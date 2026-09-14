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

/** The drip's honest pace: past the hourly cap the queue spans whole hours.
 *  Module scope so react's render-purity rule reads it as a plain helper. */
function estimateFinish(n: number, cap: number): Date | null {
  return n > cap ? new Date(Date.now() + Math.ceil(n / cap) * 3_600_000) : null;
}

export default function LetterSendPanel({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const [letter, setLetter] = useState<ApiLetter | null | undefined>(undefined);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [cap, setCap] = useState(100);
  const [segment, setSegment] = useState("all");
  const [testTo, setTestTo] = useState("");
  const [sendAt, setSendAt] = useState("");
  const [typed, setTyped] = useState("");
  const [note, setNote] = useState("");
  const [deliveries, setDeliveries] = useState<{ to: string; when: string }[]>([]);

  /* TASK-214: "the receipt sent 3× on 3 clicks" — the panel had no in-flight
   * guard. A ref (not state) is the guard itself: state updates are async
   * and a second click can fire before React re-renders with `disabled`,
   * but a ref reads/writes synchronously in the same tick, so the SECOND of
   * two rapid clicks sees the flag already up and returns before any fetch
   * fires. `sending` (state) drives the visible disabled attribute — belt
   * and suspenders, same shape as the send route's own onceWithin() guard
   * (mail.ts) on the wire. */
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
    fetch("/api/admin/letters")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.ok) return;
        const segs: Segment[] = d.segments ?? [];
        const capVal: number = d.mailHourlyCap ?? 100;
        setLetter((d.letters ?? []).find((l: ApiLetter) => l.key === key) ?? null);
        setSegments(segs);
        setCap(capVal);
        updateEstimate(segs.find((s) => s.source === "all")?.count ?? 0, capVal);
      })
      .catch(() => setLetter(null));
  }, [key]);

  const subject = letter?.override?.subject ?? letter?.default?.subject ?? letter?.title ?? "";
  const hasBody = !!(letter?.override?.body ?? letter?.default?.body)?.trim();
  const count = segments.find((s) => s.source === segment)?.count ?? 0;
  const confirmed = typed.trim() !== "" && Number(typed) === count;

  async function sendTest() {
    if (sendingRef.current) return; // one click in flight at a time
    sendingRef.current = true;
    setSending(true);
    setNote("");
    try {
      const d = await fetch("/api/admin/letters/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, testTo }),
      }).then((r) => r.json()).catch(() => null);
      setNote(d?.ok ? `test copy queued for ${testTo}` : (d?.reason ?? "test send failed"));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  async function sendList() {
    if (sendingRef.current) return; // one click in flight at a time
    sendingRef.current = true;
    setSending(true);
    setNote("");
    setDeliveries([]);
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
        setNote(
          `queued to ${d.queued} souls (${d.segment}) · ${d.scheduledFor === "next tick" ? "goes out on the next tick" : `scheduled for ${new Date(d.scheduledFor).toLocaleString()}`}` +
            (d.estimatedFinish ? ` · the drip finishes ≈ ${new Date(d.estimatedFinish).toLocaleString()}` : ""),
        );
        setDeliveries((d.recipients ?? []).map((to: string) => ({ to, when: d.scheduledFor })));
        setTyped("");
      } else if (d?.expected !== undefined) {
        setNote(`the list moved — it is now ${d.expected}; retype the count`);
      } else {
        setNote(d?.reason ?? "send failed");
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
      </div>

      <SectionHead label="Send me a test" />
      <div style={glassCard}>
        <div className="flex flex-wrap items-center gap-2">
          <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" type="email" style={field} />
          <button onClick={sendTest} disabled={sending || !testTo.includes("@") || !hasBody} className="btn btn-sm">
            {sending ? "SENDING…" : "SEND TEST COPY"}
          </button>
        </div>
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
          <input type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} style={field} />
          <span style={{ fontSize: ".62rem", textTransform: "uppercase", color: "var(--muted)" }}>{sendAt ? "scheduled" : "next tick"}</span>
        </div>

        {count > 0 && (
          <div className="mt-3 space-y-2">
            <label className="block" style={{ fontSize: ".75rem", color: "var(--muted)" }}>
              Type <b style={{ color: "var(--gold-deep)" }}>{count}</b> to send to {count} {count === 1 ? "person" : "people"}:
              <input value={typed} onChange={(e) => setTyped(e.target.value)} inputMode="numeric" placeholder={String(count)}
                className="ml-2" style={{ ...field, width: 96 }} />
            </label>
            <button onClick={sendList} disabled={sending || !confirmed || !hasBody} className="btn btn-sm">
              {sending ? "SENDING…" : sendAt ? `SCHEDULE TO ${count} ${count === 1 ? "PERSON" : "PEOPLE"}` : `SEND TO ${count} ${count === 1 ? "PERSON" : "PEOPLE"}`}
            </button>
            {finish && (
              <p style={{ fontSize: ".75rem", color: "var(--muted)" }}>
                ⏳ the hourly cap ({cap}/hour) drips this — done by ≈ {finish.toLocaleString()}
                {sendAt ? " after the scheduled start" : ""}
              </p>
            )}
          </div>
        )}
        {note && <p className="mt-2" style={{ fontSize: ".75rem", color: "var(--muted)" }}>{note}</p>}

        {deliveries.length > 0 && (
          <ul className="mt-3" style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 4,
            borderTop: "1px solid rgba(139,118,196,.18)", paddingTop: 8 }}>
            {deliveries.map((d) => (
              <li key={d.to} style={{ fontSize: ".75rem", color: "var(--ink-body)" }}>
                ✉ {d.to} — {d.when === "next tick" ? "next tick" : `scheduled ${new Date(d.when).toLocaleString()}`} · remembered in their mailbox
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
