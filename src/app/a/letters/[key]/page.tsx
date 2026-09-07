"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

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
    setNote("");
    const d = await fetch("/api/admin/letters/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, testTo }),
    }).then((r) => r.json()).catch(() => null);
    setNote(d?.ok ? `test copy queued for ${testTo}` : (d?.reason ?? "test send failed"));
  }

  async function sendList() {
    setNote("");
    setDeliveries([]);
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
  }

  if (letter === undefined) return <div className="p-2 text-sm text-neutral-400">loading…</div>;
  if (letter === null) {
    return (
      <div className="p-2 text-sm">
        <p className="text-neutral-300">Unknown letter “{key}”.</p>
        <Link href="/a/letters" className="text-yellow-400 underline">← back to the letters room</Link>
      </div>
    );
  }

  return (
    <div className="p-2 text-sm">
      <Link href="/a/letters" className="text-xs text-yellow-400 underline">← the letters room</Link>
      <div className="mt-2 border border-neutral-700 p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <b>{letter.title ?? letter.key}</b>
          <span className="text-xs text-cyan-300">
            {letter.kind === "composed" ? "composed by Love" : "seeded"} ·{" "}
            {letter.audience === "public" ? "🌍 public (also on /news)" : "✉ the list"}
          </span>
        </div>
        <p className="mt-1 text-neutral-300">&ldquo;{subject}&rdquo;</p>
        {/* derive-or-dash: a composed letter has no site page yet (the /news +
            /letters seam is flagged, outside this lane) — no preview door,
            and its emails carry no "view on the site" link */}
        {letter.kind === "seeded" ? (
          <a href={`/letters/${letter.key}`} target="_blank" rel="noreferrer"
            className="mt-1 inline-block border border-neutral-600 px-2 py-0.5 text-[10px] uppercase text-yellow-400">
            preview on the site
          </a>
        ) : (
          <p className="mt-1 text-[10px] uppercase text-neutral-500">
            composed letter — its site page arrives with the /news seam (flagged)
          </p>
        )}
        {!hasBody && (
          <p className="mt-2 text-xs text-neutral-400">
            This letter has no words yet — <Link href="/a/letters" className="underline text-yellow-400">write it in the room</Link> before sending.
          </p>
        )}
      </div>

      <div className="mt-3 border border-neutral-700 p-3">
        <b className="text-xs uppercase text-neutral-400">Send me a test</b>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" type="email"
            className="border border-neutral-700 bg-black px-2 py-2 text-base sm:text-sm" />
          <button onClick={sendTest} disabled={!testTo.includes("@") || !hasBody}
            className="min-h-11 touch-manipulation border border-neutral-500 px-4 py-1 text-xs disabled:opacity-40">
            SEND TEST COPY
          </button>
        </div>
      </div>

      <div className="mt-3 border border-neutral-700 p-3">
        <b className="text-xs uppercase text-neutral-400">Send to the list — pick the door</b>
        <ul className="mt-2 space-y-1">
          {segments.map((s) => (
            <li key={s.source}>
              <label className="flex items-center gap-2 border border-neutral-700 px-2 py-2">
                <input type="radio" name="segment" checked={segment === s.source} onChange={() => pickSegment(s.source)} />
                <span className="flex-1">{s.source === "all" ? "All — the whole list" : s.source}</span>
                <span className="text-xs text-neutral-400">{s.count} {s.count === 1 ? "person" : "people"}</span>
              </label>
            </li>
          ))}
          {segments.length === 0 && (
            <li className="text-xs text-neutral-500">no subscriber vault configured — the list is unreadable here</li>
          )}
        </ul>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)}
            className="border border-neutral-700 bg-black px-2 py-2 text-base sm:text-sm" />
          <span className="text-[10px] uppercase text-neutral-500">{sendAt ? "scheduled" : "next tick"}</span>
        </div>

        {count > 0 && (
          <div className="mt-3 space-y-2">
            <label className="block text-xs text-neutral-400">
              Type <b className="text-yellow-400">{count}</b> to send to {count} {count === 1 ? "person" : "people"}:
              <input value={typed} onChange={(e) => setTyped(e.target.value)} inputMode="numeric" placeholder={String(count)}
                className="ml-2 w-24 border border-neutral-700 bg-black px-2 py-2 text-base sm:text-sm" />
            </label>
            <button onClick={sendList} disabled={!confirmed || !hasBody}
              className="min-h-11 touch-manipulation border border-yellow-500 px-4 py-1 text-xs font-bold text-yellow-400 disabled:opacity-40">
              {sendAt ? `SCHEDULE TO ${count} ${count === 1 ? "PERSON" : "PEOPLE"}` : `SEND TO ${count} ${count === 1 ? "PERSON" : "PEOPLE"}`}
            </button>
            {finish && (
              <p className="text-xs text-neutral-400">
                ⏳ the hourly cap ({cap}/hour) drips this — done by ≈ {finish.toLocaleString()}
                {sendAt ? " after the scheduled start" : ""}
              </p>
            )}
          </div>
        )}
        {note && <p className="mt-2 text-xs text-neutral-400">{note}</p>}

        {deliveries.length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-neutral-800 pt-2">
            {deliveries.map((d) => (
              <li key={d.to} className="text-xs text-neutral-300">
                ✉ {d.to} — {d.when === "next tick" ? "next tick" : `scheduled ${new Date(d.when).toLocaleString()}`} · remembered in their mailbox
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
