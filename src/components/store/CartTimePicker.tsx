"use client";

import { useEffect, useState } from "react";
import Sheet from "@/components/Sheet";

/**
 * TIME BEFORE MONEY (the Admiral's word, 0018.05.15): a session in the
 * basket picks its slot HERE, before any invoice exists. Choosing holds the
 * time (72h, the cart's own hold rail) and the plain line becomes a held
 * session line. Compact on purpose — the full month calendar lives on
 * /book/[id]; the basket just needs day → mirror time → held.
 */

interface Slot { startUtc: string; endUtc: string }

export default function CartTimePicker({
  serviceId, title, onDone,
}: { serviceId: string; title: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!open || slots !== null) return;
    fetch(`/api/bookings/slots?service=${encodeURIComponent(serviceId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { slots?: Slot[] } | null) => setSlots(d?.slots ?? []))
      .catch(() => setSlots([]));
  }, [open, slots, serviceId]);

  const dayKey = (iso: string) =>
    new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" })
      .format(new Date(iso));
  const dayLabel = (iso: string) =>
    new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" })
      .format(new Date(iso));
  const timeLabel = (iso: string) =>
    new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" })
      .format(new Date(iso));

  const days = new Map<string, Slot[]>();
  for (const s of slots ?? []) {
    const k = dayKey(s.startUtc);
    days.set(k, [...(days.get(k) ?? []), s]);
  }
  const dayEntries = [...days.entries()];
  const chosen = day ?? dayEntries[0]?.[0] ?? null;

  async function pick(startUtc: string) {
    setBusy(true);
    setNote(null);
    // hold the time FIRST, then retire the timeless line — never the reverse
    const held = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId, startUtc }),
    }).then((r) => r.json()).catch(() => null);
    if (!held?.ok) {
      setNote(held?.reason ?? "that time slipped away — pick another");
      setSlots(null); // refetch the board
      setBusy(false);
      return;
    }
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: serviceId, remove: true }),
    }).catch(() => {});
    window.dispatchEvent(new Event("oc-cart-changed"));
    setBusy(false);
    setOpen(false);
    onDone();
  }

  return (
    <>
      <button className="btn btn-gold btn-sm" onClick={() => setOpen(true)}>
        ⏰ choose your time
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} z="popup"
        scrimStyle={{ backdropFilter: "blur(4px)" }}
        sheetStyle={{ borderRadius: 22, padding: "22px 22px 24px", textAlign: "center" }}>
        <h3 style={{ fontFamily: "var(--font-h3, sans-serif)", fontWeight: 400, fontSize: "1.25rem",
          color: "var(--ink-strong)", margin: "0 0 4px" }}>{title}</h3>
        <p style={{ margin: "0 0 14px", fontSize: ".78rem", color: "var(--muted)" }}>
          pick your moment — it&apos;s held for you while you check out
        </p>
        {slots === null ? (
          <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>finding open times…</p>
        ) : dayEntries.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>no open times right now — check back soon ✨</p>
        ) : (
          <>
            <ul className="chip-grid" style={{ "--chip-min": "128px", marginBottom: 12 } as React.CSSProperties}>
              {dayEntries.slice(0, 12).map(([k, list]) => (
                <li key={k}>
                  <button type="button" className="chip-select" aria-pressed={k === chosen}
                    onClick={() => setDay(k)}>
                    {dayLabel(list[0].startUtc)}
                  </button>
                </li>
              ))}
            </ul>
            <ul className="chip-grid">
              {(days.get(chosen ?? "") ?? []).map((s) => (
                <li key={s.startUtc}>
                  <button type="button" className="chip-select" disabled={busy}
                    onClick={() => pick(s.startUtc)}>
                    {timeLabel(s.startUtc)}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {note && <p style={{ margin: "12px 0 0", fontSize: ".8rem", color: "var(--err, #E7899E)" }}>{note}</p>}
      </Sheet>
    </>
  );
}
