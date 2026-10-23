"use client";

import { useCallback, useEffect, useState } from "react";
import Sheet from "@/components/Sheet";

/**
 * THE ONE QUESTIONS LIST (TASK-603 phase 2, K182), shared by both surfaces
 * the round-3 marks name: the questions room (/a/letters/questions, inside
 * its Card) and the host's stage panel on the Q&A go door (inside a
 * right-side Sheet). Same rows, same Read and respond window, same
 * archive-on-send — one component, so the two surfaces can never drift.
 *
 * Rows ride GET /api/admin/qa-questions (operator-gated): this month whole,
 * earlier months' still-open rows carried over, naming their month. "Read
 * and respond" opens the respond window (To line, the question quoted, a
 * reply box, Send); Send mails the reply and ticks the row answered in one
 * motion (PUT action "reply"), and the row waits in the hidden Answered
 * area behind the show/hide line. Rows with no email left get the same
 * window minus the reply box and a "Mark answered" button (PUT action
 * "mark-answered") — nothing is mailed. Month names are derived from the
 * month key at render, never typed.
 *
 * The answered list wears kitx-qa-answered, whose kit.css rule centres the
 * rows' contents at phone width (his round-3 mark on
 * 08-qa-answered-r2-night-390: "i feel like these should be centered when
 * in the mobile view"); desktop stays as drawn.
 *
 * `respondZ`: on the room page the respond window is the only sheet
 * (z "sheet"); over the stage's side panel it must ride the popup rung
 * of Sheet's z-ladder so it lands above the panel it was opened from.
 */

interface ApiQuestion {
  id: string;
  words: string;
  who: string;
  email: string | null;
  atMs: number;
  monthKey: string;
  carried: boolean;
  answeredAtMs: number | null;
}

const monthName = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long" });
};

/** "today" / "yesterday" / "N days ago" under a week, else "Oct 3" — the
 *  drawing's own words; carried rows name their month and day instead. */
function whenWords(q: ApiQuestion): string {
  if (q.carried) {
    return `${monthName(q.monthKey)} ${new Date(q.atMs).getDate()}`;
  }
  const days = Math.floor((Date.now() - q.atMs) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(q.atMs).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function QuestionsPanel({ respondZ = "sheet" }: { respondZ?: "sheet" | "popup" }) {
  const [rows, setRows] = useState<ApiQuestion[] | null>(null);
  const [thisMonthKey, setThisMonthKey] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [respondTo, setRespondTo] = useState<ApiQuestion | null>(null);
  const [showAnswered, setShowAnswered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/qa-questions", { cache: "no-store" });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean; reason?: string; thisMonthKey?: string; rows?: ApiQuestion[];
      } | null;
      if (res.ok && body?.ok) {
        setRows(body.rows ?? []);
        setThisMonthKey(body.thisMonthKey ?? null);
        setLoadErr(null);
      } else {
        setLoadErr(body?.reason ?? "the questions list didn't answer - refresh to try again");
      }
    } catch {
      setLoadErr("the questions list didn't answer - refresh to try again");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openRows = (rows ?? []).filter((r) => r.answeredAtMs === null);
  const answeredRows = (rows ?? []).filter((r) => r.answeredAtMs !== null);

  /** The PUT behind both doors; on ok the row moves to the answered area. */
  async function answer(id: string, reply: string | null) {
    if (busy) return;
    setBusy(true);
    setSendErr(null);
    try {
      const res = await fetch("/api/admin/qa-questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reply === null ? { action: "mark-answered", id } : { action: "reply", id, reply }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; reason?: string } | null;
      if (res.ok && body?.ok) {
        setRows((prev) => (prev ?? []).map((r) => (r.id === id ? { ...r, answeredAtMs: Date.now() } : r)));
        setRespondTo(null);
      } else {
        setSendErr(body?.reason ?? "the send didn't answer - nothing changed");
      }
    } catch {
      setSendErr("the send didn't answer - nothing changed");
    } finally {
      setBusy(false);
    }
  }

  if (loadErr) {
    return (
      <p className="kit-note" role="alert">
        {loadErr}
      </p>
    );
  }
  if (rows === null) {
    return <p className="kit-note">reading this month's questions…</p>;
  }

  return (
    <>
      {openRows.length === 0 && <p className="kit-text-quiet">No open questions - the month is clear.</p>}
      <ul className="kit-rows kitx-qa-rows">
        {openRows.map((q) => (
          <li key={q.id} data-row={q.id}>
            <span>
              <b>{q.words}</b>
              <em>
                {q.who} · {whenWords(q)}
                {q.carried ? " · carried over" : ""}
              </em>
            </span>
            <span className="kit-rows-end">
              <button
                type="button"
                className="kit-btn kit-btn-main kit-btn-sm"
                onClick={() => {
                  setSendErr(null);
                  setRespondTo(q);
                }}
              >
                Read and respond
              </button>
            </span>
          </li>
        ))}
      </ul>
      <p className="kit-note kitx-qa-count">
        {openRows.length} open · {answeredRows.length} answered · carried-over rows name their month
        {thisMonthKey ? `; this is ${monthName(thisMonthKey)}` : ""}
      </p>
      {answeredRows.length > 0 && (
        <>
          <p className="kit-note kitx-qa-show">
            <button
              type="button"
              onClick={() => setShowAnswered((v) => !v)}
              className="kitx-qa-toggle"
              aria-expanded={showAnswered}
            >
              {showAnswered ? "Hide answered" : `Show answered (${answeredRows.length})`}
            </button>
          </p>
          {showAnswered && (
            <ul className="kit-rows kitx-qa-answered">
              {answeredRows.map((q) => (
                <li key={q.id} data-row={q.id}>
                  <span>
                    <b>{q.words}</b>
                    <em>
                      {q.who} · {whenWords(q)}
                    </em>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Sheet open={respondTo !== null} onClose={() => !busy && setRespondTo(null)} z={respondZ}>
        {respondTo && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const reply = new FormData(e.currentTarget).get("reply");
              answer(respondTo.id, respondTo.email ? String(reply ?? "").trim() : null);
            }}
          >
            <p className="kicker">The Intuitive Q&amp;A</p>
            <h2 className="kit-h2" style={{ marginTop: 4 }}>
              {respondTo.email ? "Read and respond" : "Mark answered"}
            </h2>
            <p className="kit-note" style={{ marginTop: 8 }}>
              {respondTo.email ? `To: ${respondTo.who} <${respondTo.email}>` : `${respondTo.who} · no email was left`}
            </p>
            <blockquote className="kitx-qa-quote">{respondTo.words}</blockquote>
            {respondTo.email && (
              <div className="kit-field">
                <label className="kit-field-label" htmlFor="qa-reply">
                  Your reply
                </label>
                <textarea className="kit-field-input" id="qa-reply" name="reply" rows={6} required />
              </div>
            )}
            {sendErr && (
              <p className="kit-note kitx-qa-send-err" role="alert">
                {sendErr}
              </p>
            )}
            <div className="kitx-qa-actions">
              <button
                type="button"
                className="kit-btn kit-btn-ghost kit-btn-sm"
                disabled={busy}
                onClick={() => setRespondTo(null)}
              >
                Not yet
              </button>
              <button type="submit" className="kit-btn kit-btn-main kit-btn-sm" disabled={busy}>
                {busy ? "Sending…" : respondTo.email ? "Send reply" : "Mark answered"}
              </button>
            </div>
          </form>
        )}
      </Sheet>
    </>
  );
}
