"use client";

import { useState } from "react";
import { field } from "@/components/console/glass";

/**
 * TASK-304 (0018.06.26 a₿) — "Send to user": pick ONE community member (the
 * People room's own list, email-space souls only — a key member has no
 * address to mail), confirm, and POST /api/admin/studio/invite. One member,
 * one letter, every time — no typed-count ritual (that's the list-send law;
 * this is never a list). Lives inside StudioRoom's links card and speaks
 * its own language: the same `field`, `btn btn-sm`, and quiet muted lines.
 */

interface Person {
  member: string;
  kind: "email" | "key";
}

const rowButton: React.CSSProperties = {
  display: "block", width: "100%", minHeight: 44, textAlign: "left",
  padding: "8px 12px", fontSize: ".82rem", fontFamily: "inherit",
  color: "var(--ink-strong)", background: "none",
  border: "1px solid var(--glass-edge)", borderRadius: 10, cursor: "pointer",
};

export default function SendToUserChooser({ roomTitle }: { roomTitle?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<Person[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; line: string } | null>(null);

  async function load() {
    setOpen(true);
    setNote(null);
    if (people !== null) return;
    try {
      const r = await fetch("/api/admin/people", { cache: "no-store" });
      const d = r.ok ? await r.json() : null;
      setPeople(d?.ok ? d.people : []);
    } catch {
      setPeople([]);
    }
  }

  /* email-space souls only — a "key" member has no address to mail (the
     /a/people substring idiom, narrowed to the mailable kind) */
  const shown = (people ?? []).filter(
    (p) => p.kind === "email" && p.member.toLowerCase().includes(q.toLowerCase()),
  );

  async function send() {
    if (!picked || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch("/api/admin/studio/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: picked, roomTitle }),
      });
      const d = await r.json().catch(() => null);
      if (d?.ok) {
        setNote({ ok: true, line: `sent — the guest door is on its way to ${picked}${d.warning ? ` · ${d.warning}` : ""}` });
        setPicked(null);
      } else {
        setNote({ ok: false, line: d?.reason ?? `the send came back ${r.status} — nothing was mailed` });
      }
    } catch {
      setNote({ ok: false, line: "the request never reached the site — nothing was mailed" });
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <div style={{ marginTop: 10 }}>
        <p style={{ margin: "0 0 6px", fontSize: ".78rem", color: "var(--muted)" }}>
          Send this guest door to a member
        </p>
        <button id="send-to-user-open" type="button" className="btn btn-sm btn-ghost" onClick={load}>
          Send to user
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ margin: 0, fontSize: ".78rem", color: "var(--muted)" }}>
        Send this guest door to a member — one letter, just them
      </p>
      {note && (
        <p style={{ margin: 0, fontSize: ".78rem", color: note.ok ? "var(--ok, #7fb98f)" : "var(--bad, #d98a8a)" }}>
          {note.line}
        </p>
      )}
      {picked ? (
        <>
          <p style={{ margin: 0, fontSize: ".82rem", color: "var(--ink-strong)" }}>
            the guest door ({roomTitle ?? "the studio"}) goes to <b>{picked}</b> — one letter, just them
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button type="button" className="btn btn-sm" disabled={busy} onClick={send}>
              {busy ? "sending…" : "Send the letter"}
            </button>
            <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => setPicked(null)}>
              choose someone else
            </button>
          </div>
        </>
      ) : (
        <>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="search members by email…"
            aria-label="search members by email"
            className="console-field" style={{ ...field, width: "100%", fontSize: ".82rem" }}
          />
          <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {people === null ? (
              <p style={{ margin: 0, fontSize: ".78rem", color: "var(--muted)" }}>reading the field…</p>
            ) : shown.length === 0 ? (
              <p style={{ margin: 0, fontSize: ".78rem", color: "var(--muted)" }}>
                no email members match — letters travel by email
              </p>
            ) : (
              shown.slice(0, 12).map((p) => (
                <button key={p.member} type="button" style={rowButton} onClick={() => { setPicked(p.member); setNote(null); }}>
                  {p.member}
                </button>
              ))
            )}
          </div>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setOpen(false); setQ(""); setNote(null); }}>
            not now
          </button>
        </>
      )}
    </div>
  );
}
