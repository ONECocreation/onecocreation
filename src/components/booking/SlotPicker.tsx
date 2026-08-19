"use client";

import { useEffect, useMemo, useState } from "react";
import { payInModal } from "@/lib/btcpay-modal";
import { USA_ZONES, zipToTz } from "@/lib/us-zip-tz";

/**
 * The slot picker — step 2, and the whole timezone law made visible.
 *
 * ⏰ Every slot arrives as a UTC instant. This component renders it in the
 * VISITOR's zone (detected, and switchable), and ALWAYS shows the artist's
 * zone beside the chosen time. A customer who shows up an hour late is a
 * refund and a bad feeling; the second label costs one line and prevents it.
 */

interface Slot {
  startUtc: string;
  endUtc: string;
  serviceId: string;
}

interface ServiceView {
  id: string;
  title: string;
  durationMin: number;
  artistTz: string;
  pricingMode: "fixed" | "pwyc";
}

/* THE ₿FT LANE IS RETIRED (fleet ruling 0018.05.26 a₿ — dashes over
   estimates, estimate rungs DELETED not gated). Every slot here is a
   FUTURE instant; its block height can only ever be estimated, so the
   lane could offer nothing but `~` guesses. It returns only if a
   chain-anchored way to vouch future slots ever exists. */

function fmtTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function fmtDayHeading(iso: string, tz: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

/** Group key = the calendar day AS THE VIEWER'S ZONE sees it, not UTC's. */
function dayKey(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** THE MONTH CALENDAR — the traditional picker (Admiral, 0018.05.17):
 *  Sun-first grid, open days tappable with their count, the rest resting. */
function MonthCalendar({
  days,
  chosenDay,
  onPick,
}: {
  days: [string, { startUtc: string }[]][];
  chosenDay: string | null;
  onPick: (key: string) => void;
}) {
  const counts = new Map(days.map(([k, s]) => [k, s.length]));
  const months = [...new Set(days.map(([k]) => k.slice(0, 7)))].sort();
  const [cursor, setCursor] = useState(months[0]);
  const month = months.includes(cursor) || !months.length ? cursor : months[0];

  const [y, m] = month.split("-").map(Number);
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const monthName = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, {
    month: "long", year: "numeric", timeZone: "UTC",
  });
  const at = months.indexOf(month);

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  /* .btn-round with the calendar's glass face (cartridge walk step 5) —
     the class carries the circle; these carry the daylight */
  const navBtn: React.CSSProperties = {
    "--size": "34px", background: "var(--glass)", borderColor: "rgba(180,134,43,.45)",
    color: "var(--gold-deep, #b4862b)", fontSize: "1rem", lineHeight: 1,
  } as React.CSSProperties;

  return (
    <div
      style={{
        borderRadius: 20,
        border: "1px solid var(--glass-edge)",
        background: "var(--glass)",
        backdropFilter: "blur(8px)",
        boxShadow: "0 24px 60px -30px rgba(120,100,160,.55)",
        padding: "18px 18px 14px",
        maxWidth: 360,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button type="button" className="btn-round" onClick={() => at > 0 && setCursor(months[at - 1])} disabled={at <= 0}
          style={{ ...navBtn, opacity: at <= 0 ? 0.3 : 1 }} aria-label="previous month">‹</button>
        <span style={{ fontFamily: "var(--font-h3, sans-serif)", fontSize: "1.15rem", color: "var(--ink-strong)" }}>{monthName}</span>
        <button type="button" className="btn-round" onClick={() => at < months.length - 1 && setCursor(months[at + 1])} disabled={at >= months.length - 1}
          style={{ ...navBtn, opacity: at >= months.length - 1 ? 0.3 : 1 }} aria-label="next month">›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, textAlign: "center" }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i} style={{ fontSize: ".62rem", letterSpacing: ".12em", color: "var(--muted, #897f97)", padding: "2px 0" }}>{d}</span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={`b${i}`} />;
          const key = `${month}-${String(d).padStart(2, "0")}`;
          const open = counts.get(key);
          const active = chosenDay === key;
          return open ? (
            /* .chip-select shaped into the calendar's circle — the class
               carries the gold on/off state via aria-pressed */
            <button
              key={key}
              type="button"
              className="chip-select"
              onClick={() => onPick(key)}
              aria-pressed={active}
              title={`${open} open ${open === 1 ? "time" : "times"}`}
              style={{
                position: "relative", height: 40, borderRadius: "50%", padding: 0,
                fontSize: ".92rem", transition: "transform .12s ease",
              }}
            >
              {d}
              <span style={{
                position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)",
                width: 5, height: 5, borderRadius: "50%",
                /* S2: gold law — the dot's dark gold is decorative, held for a ruling */
                background: active ? "#3a2a06" : "var(--gold-deep, #b4862b)",
              }} />
            </button>
          ) : (
            <span key={key} style={{ height: 40, display: "grid", placeItems: "center", fontSize: ".9rem", color: "rgba(154,143,174,.6)" }}>{d}</span>
          );
        })}
      </div>
      <p style={{ margin: "10px 2px 0", fontSize: ".68rem", color: "var(--muted, #897f97)" }}>
        golden-dot days have open times — tap one
      </p>
    </div>
  );
}

/** "PDT", "GMT+1" — the short label a human recognizes. */
function zoneLabel(tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date());
  return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
}

export default function SlotPicker({
  serviceId,
  inPerson = false,
  voucherId,
  rescheduleBookingId,
}: {
  serviceId: string;
  inPerson?: boolean;
  /** gift-redeem mode: the session is already paid — booking goes through
   *  /api/gift/redeem and every payment control stays hidden */
  voucherId?: string;
  /** reschedule mode: moving an EXISTING booking — no payment, no fields,
   *  just the new time through /api/bookings/<id>/change */
  rescheduleBookingId?: string;
}) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [service, setService] = useState<ServiceView | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // checkout
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  /* WHAT'S THE CALL FOR (Admiral, 0018.05.15) — discovery calls carry an
     intent: the fixed doors, anything on the shelf, or their own words */
  const [intent, setIntent] = useState("");
  const [shelfTitles, setShelfTitles] = useState<string[]>([]);
  const isDiscovery = /discovery/i.test(serviceId);
  useEffect(() => {
    if (!isDiscovery) return;
    fetch("/api/store/catalog")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { items?: { title: string }[] } | null) =>
        setShelfTitles((d?.items ?? []).map((i) => i.title)))
      .catch(() => {});
  }, [isDiscovery]);
  const noteOut = intent ? `Calling about: ${intent}${note.trim() ? `\n${note}` : ""}` : note;
  const [amountSats, setAmountSats] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  // the cuts chooser saves the studio's destination — checkout meets it filled
  const savedLoc = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("oc-inperson-loc") ?? "{}") as { city?: string; state?: string; zip?: string };
    } catch { return {}; }
  })();
  const [city, setCity] = useState(savedLoc.city ?? "");
  const [stateReg, setStateReg] = useState(savedLoc.state ?? "");
  const [zip, setZip] = useState(savedLoc.zip ?? "");
  const [rail, setRail] = useState<"lightning" | "onchain">("lightning");
  const [busy, setBusy] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  // The visitor's own zone, detected — and switchable, because travellers and
  // people booking on someone else's behalf both exist.
  const detected = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const [viewerTz, setViewerTzState] = useState(detected);
  // a stale "BFT" from anywhere (saved state, a hand-rolled link) lands on
  // the detected zone instead — the lane itself is retired, see above
  const setViewerTz = (tz: string) => setViewerTzState(tz === "BFT" ? detected : tz);
  const [zipForTz, setZipForTz] = useState("");
  // less is more (Admiral): pick a DAY first, then that day's times
  const [chosenDay, setChosenDay] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/api/bookings/slots?service=${encodeURIComponent(serviceId)}`);
        const data = await res.json();
        if (!live) return;
        if (!data.ok) {
          setError(data.reason ?? "could not load times");
        } else {
          setSlots(data.slots ?? []);
          setService(data.service ?? null);
        }
      } catch {
        if (live) setError("could not load times");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [serviceId]);

  const days = useMemo(() => {
    const grouped = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = dayKey(s.startUtc, viewerTz);
      const list = grouped.get(key);
      if (list) list.push(s);
      else grouped.set(key, [s]);
    }
    return [...grouped.entries()];
  }, [slots, viewerTz]);

  const artistTz = service?.artistTz ?? "UTC";
  const zonesDiffer = artistTz !== viewerTz;

  async function book() {
    if (!chosen) return;
    setBusy(true);
    setBookError(null);
    if (rescheduleBookingId) {
      try {
        const res = await fetch(`/api/bookings/${rescheduleBookingId}/change`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reschedule", startUtc: chosen }),
        });
        const data = await res.json();
        if (!data.ok) {
          setBookError(data.reason ?? "could not move the session");
          return;
        }
        window.location.reload();
      } catch {
        setBookError("could not reach the ship");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (voucherId) {
      // the gift path — no money, just the claim
      try {
        const res = await fetch("/api/gift/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            voucherId,
            startUtc: chosen,
            customer: inPerson ? { name, email, note: noteOut, city, state: stateReg, zip } : { name, email, note: noteOut },
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          setBookError(data.reason ?? "could not book that time");
          if (res.status === 409) {
            const again = await fetch(`/api/bookings/slots?service=${encodeURIComponent(serviceId)}`);
            const fresh = await again.json();
            if (fresh.ok) { setSlots(fresh.slots ?? []); setChosen(null); }
          }
          return;
        }
        window.location.href = data.receiptUrl ?? "/";
      } catch {
        setBookError("could not reach the ship");
      } finally {
        setBusy(false);
      }
      return;
    }
    try {
      const res = await fetch("/api/bookings/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          startUtc: chosen,
          rail,
          amountSats: service?.pricingMode === "pwyc" ? Number(amountSats) : undefined,
          discountCode: discountCode.trim() || undefined,
          customer: inPerson
            ? { name, email, note: noteOut, city, state: stateReg, zip }
            : { name, email, note: noteOut },
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setBookError(data.reason ?? "could not book that time");
        // 409 = someone else took it while this page was open; refresh the board
        if (res.status === 409) {
          const again = await fetch(`/api/bookings/slots?service=${encodeURIComponent(serviceId)}`);
          const fresh = await again.json();
          if (fresh.ok) {
            setSlots(fresh.slots ?? []);
            setChosen(null);
          }
        }
        return;
      }
      // the invoice opens OVER the calendar; the receipt follows the sats
      if (!data.payUrl) {
        window.location.href = `/book/receipt/${data.bookingId}`;
        return;
      }
      const opened = await payInModal(data.payUrl, {
        onPaid: () => window.location.assign(`/book/receipt/${data.bookingId}`),
        onClose: () => window.location.assign(`/book/receipt/${data.bookingId}`),
      });
      if (!opened) window.location.href = data.payUrl;
    } catch {
      setBookError("could not reach the ship");
    } finally {
      setBusy(false);
    }
  }

  async function addToBasket() {
    if (!chosen) return;
    setBusy(true);
    setBookError(null);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, startUtc: chosen }),
      });
      const data = await res.json();
      if (!data.ok) {
        setBookError(data.reason ?? "could not hold that time");
        if (res.status === 409) {
          const again = await fetch(`/api/bookings/slots?service=${encodeURIComponent(serviceId)}`);
          const fresh = await again.json();
          if (fresh.ok) {
            setSlots(fresh.slots ?? []);
            setChosen(null);
          }
        }
        return;
      }
      window.dispatchEvent(new Event("oc-cart-changed"));
      window.location.assign("/cart");
    } catch {
      setBookError("could not reach the ship");
    } finally {
      setBusy(false);
    }
  }

  const glassField: React.CSSProperties = {
    border: "1px solid rgba(139,118,196,.45)", borderRadius: 10, padding: "6px 10px",
    background: "rgba(255,255,255,.92)", fontSize: ".8rem", color: "var(--field-ink, #4a4458)", fontFamily: "inherit",
  };

  if (loading) return <p style={{ marginTop: 32, fontSize: ".9rem", color: "var(--muted, #897f97)", textAlign: "center" }}>Finding open times…</p>;
  if (error) return <p style={{ marginTop: 32, fontSize: ".9rem", color: "var(--err, #E7899E)", textAlign: "center" }}>◌ {error}</p>;

  return (
    <div className="mt-8">
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 4 }}>
        <p style={{ margin: 0, fontSize: ".7rem", letterSpacing: ".18em", textTransform: "uppercase",
          fontWeight: 700, color: "var(--rose, #c56e8b)" }}>Pick a day</p>
        <label style={{ fontSize: ".76rem", color: "var(--muted, #897f97)" }}>
          times shown in{" "}
          <select
            value={viewerTz}
            onChange={(e) => setViewerTz(e.target.value)}
            style={glassField}
          >
            {[...new Map<string, string>([
              [detected, `where you are — ${detected}`],
              [artistTz, `the host's clock — ${artistTz}`],
              ...USA_ZONES.map(({ tz, label }) => [tz, label] as [string, string]),
              ["UTC", "UTC"],
            ])].map(([tz, label]) => (
              <option key={tz} value={tz}>{label}</option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: ".76rem", color: "var(--muted, #897f97)" }}>
          or zip{" "}
          <input
            value={zipForTz}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 5);
              setZipForTz(v);
              if (v.length >= 3) {
                const tz = zipToTz(v);
                if (tz) setViewerTz(tz);
              }
            }}
            inputMode="numeric"
            placeholder="80301"
            style={{ ...glassField, width: 70 }}
          />
        </label>
      </div>

      {days.length === 0 ? (
        <p style={{ marginTop: 24, fontSize: ".9rem", color: "var(--muted, #897f97)", textAlign: "center" }}>
          No open times in this window yet.
        </p>
      ) : (
        <div
          className="mt-4"
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "repeat(auto-fit, minmax(min(340px,100%), 1fr))",
            alignItems: "start",
          }}
        >
          {/* step 1 — a TRADITIONAL month calendar (Admiral, 0018.05.17) */}
          <MonthCalendar
            days={days}
            chosenDay={chosenDay}
            onPick={(key) => { setChosenDay(chosenDay === key ? null : key); setChosen(null); }}
          />

          {/* step 2 — the day's times in their own glass panel beside the
              calendar (the booking-split, uicookies 07) */}
          <div
            style={{
              borderRadius: 20,
              border: "1px solid var(--glass-edge)",
              background: "var(--glass)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 24px 60px -30px rgba(120,100,160,.55)",
              padding: "18px 20px",
              minHeight: 120,
            }}
          >
            {(() => {
              const day = days.find(([k]) => k === chosenDay);
              if (!day) {
                return (
                  <p style={{ color: "var(--muted, #897f97)", fontSize: ".88rem", margin: 0 }}>
                    ✨ pick a golden-dot day and its open times appear here
                  </p>
                );
              }
              const [, daySlots] = day;
              return (
                <div>
                  <h3 style={{ fontFamily: "var(--font-h3, sans-serif)", fontWeight: 400, fontSize: "1.1rem", color: "var(--ink-strong)", margin: "0 0 12px" }}>
                    {fmtDayHeading(daySlots[0].startUtc, viewerTz)}
                  </h3>
                  <ul className="chip-grid">
                    {daySlots.map((s) => {
                      const isChosen = chosen === s.startUtc;
                      return (
                        <li key={s.startUtc}>
                          <button
                            type="button"
                            className="chip-select"
                            onClick={() => setChosen(s.startUtc)}
                            aria-pressed={isChosen}
                          >
                            {fmtTime(s.startUtc, viewerTz)}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {chosen && (
        <div
          style={{
            margin: "24px auto 0", maxWidth: 480, textAlign: "center",
            borderRadius: 20, border: "1px solid var(--glass-edge)",
            background: "var(--glass)", backdropFilter: "blur(8px)",
            boxShadow: "0 24px 60px -30px rgba(120,100,160,.55)", padding: "22px 22px 20px",
          }}
        >
          <p style={{ margin: 0, fontFamily: "var(--serif, sans-serif)", fontSize: "1.1rem", color: "var(--ink-strong)" }}>
            {fmtDayHeading(chosen, viewerTz)} · <b style={{ color: "var(--gold-deep, #b4862b)" }}>{fmtTime(chosen, viewerTz)}</b>
          </p>
          <p style={{ margin: "2px 0 0", fontSize: ".78rem", color: "var(--muted, #897f97)" }}>
            your time ({zoneLabel(viewerTz)})
            {/* THE TIMEZONE LAW — the artist's clock, always said out loud */}
            {zonesDiffer && <> · {fmtTime(chosen, artistTz)} for the host ({zoneLabel(artistTz)})</>}
            {" · "}{service?.durationMin} minutes
          </p>

          <div style={{ display: "grid", gap: 10, marginTop: 16, textAlign: "left" }}>
            {!rescheduleBookingId && <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="your name"
              style={{ ...glassField, padding: "9px 12px", fontSize: ".9rem", width: "100%", boxSizing: "border-box" }}
            />}
            {!rescheduleBookingId && <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email (for your confirmation)"
              type="email"
              style={{ ...glassField, padding: "9px 12px", fontSize: ".9rem", width: "100%", boxSizing: "border-box" }}
            />}
            {!rescheduleBookingId && inPerson && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="city"
                  style={{ ...glassField, padding: "9px 12px", fontSize: ".9rem", flex: 2, minWidth: 120 }} />
                <input value={stateReg} onChange={(e) => setStateReg(e.target.value)} placeholder="state"
                  style={{ ...glassField, padding: "9px 12px", fontSize: ".9rem", flex: 1, minWidth: 70 }} />
                <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="zip"
                  style={{ ...glassField, padding: "9px 12px", fontSize: ".9rem", flex: 1, minWidth: 80 }} />
              </div>
            )}
            {!(voucherId || rescheduleBookingId) && <input
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              placeholder="discount code (optional)"
              style={{ ...glassField, padding: "9px 12px", fontSize: ".9rem", width: "100%", boxSizing: "border-box", textTransform: "uppercase" }}
            />}
            {!rescheduleBookingId && isDiscovery && (
              <label style={{ fontSize: ".72rem", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted, #897f97)" }}>
                <span style={{ display: "block", marginBottom: 3 }}>what shall we explore together?</span>
                <select
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  style={{ ...glassField, padding: "9px 12px", fontSize: ".9rem", width: "100%", boxSizing: "border-box" }}
                >
                  <option value="">choose, or just come as you are…</option>
                  <option value="A conscious conversation">A conscious conversation 💬</option>
                  <option value="A silent haircut — ConsciousCuts">A silent haircut — ConsciousCuts ✂️</option>
                  <option value="A retreat">A retreat 🏜️</option>
                  {shelfTitles.length > 0 && (
                    <optgroup label="— from the shelves —">
                      {shelfTitles.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </optgroup>
                  )}
                  <option value="Something else">Something else — I'll say below ✨</option>
                </select>
              </label>
            )}
            {!rescheduleBookingId && <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isDiscovery ? "anything else you\u2019d like to share (optional)" : "anything the host should know (optional)"}
              rows={2}
              style={{ ...glassField, padding: "9px 12px", fontSize: ".9rem", width: "100%", boxSizing: "border-box", resize: "vertical" }}
            />}

            {/* pwyc: the customer names the price, and it buys the same session */}
            {!(voucherId || rescheduleBookingId) && service?.pricingMode === "pwyc" && (
              <label style={{ fontSize: ".72rem", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted, #897f97)" }}>
                <span style={{ display: "block", marginBottom: 3 }}>what you can give (sats)</span>
                <input
                  value={amountSats}
                  onChange={(e) => setAmountSats(e.target.value)}
                  inputMode="numeric"
                  placeholder="21000"
                  style={{ ...glassField, padding: "9px 12px", fontSize: ".9rem", width: "100%", boxSizing: "border-box" }}
                />
              </label>
            )}

            {!(voucherId || rescheduleBookingId) && <label style={{ fontSize: ".72rem", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted, #897f97)" }}>
              <span style={{ display: "block", marginBottom: 3 }}>paying by</span>
              <select
                value={rail}
                onChange={(e) => setRail(e.target.value as "lightning" | "onchain")}
                style={{ ...glassField, padding: "9px 12px", fontSize: ".9rem", width: "100%", boxSizing: "border-box" }}
              >
                <option value="lightning">lightning — settles in seconds</option>
                <option value="onchain">on-chain — holds your time for 90 minutes</option>
              </select>
            </label>}
          </div>

          {/* the honest wait, said BEFORE they commit, never after */}
          {!(voucherId || rescheduleBookingId) && rail === "onchain" && (
            <p style={{ margin: "12px 0 0", fontSize: ".78rem", color: "#7a5a12" }}>
              on-chain payments take 10–60 minutes to confirm. Your time is held the whole while.
            </p>
          )}

          {bookError && <p style={{ margin: "12px 0 0", fontSize: ".8rem", color: "var(--err, #E7899E)" }}>◌ {bookError}</p>}

          {/* the doors — bottom center, evenly spaced (the Admiral's law) */}
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            <button type="button" disabled={busy} onClick={book} className="btn btn-gold btn-sm">
              {busy
                ? rescheduleBookingId ? "Moving your session…" : voucherId ? "Booking your gift…" : "Holding your time…"
                : rescheduleBookingId ? "Move my session here" : voucherId ? "Claim my gift 🕊️" : "Book this time ⚡"}
            </button>
            {/* v1.5: the basket door — the slot is HELD (72h) the moment it
                lands, so browsing on doesn't lose the time */}
            {!(voucherId || rescheduleBookingId) && (
              <button type="button" disabled={busy} onClick={addToBasket} className="btn btn-ghost btn-sm">
                {busy ? "…" : "Add to basket 🧺"}
              </button>
            )}
          </div>
          <p style={{ margin: "12px 0 0", fontSize: ".74rem", color: "var(--muted, #897f97)" }}>
            {rescheduleBookingId
              ? "same session, new moment — nothing owed"
              : voucherId
                ? "already paid, with love — nothing owed"
                : "the basket holds this time 72h · paid straight to the host"}
          </p>
        </div>
      )}
    </div>
  );
}
