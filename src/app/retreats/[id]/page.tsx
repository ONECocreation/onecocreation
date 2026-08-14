import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ReserveSeat from "@/components/ReserveSeat";
import { readConfig } from "@/lib/booking";
import {
  refreshRetreatSoldOut,
  retreatDepositItemId,
  retreatItemId,
  seatsTaken,
} from "@/lib/retreats";

export const dynamic = "force-dynamic";

function prettySpan(start: string, end: string): string {
  const f = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
  return `${f(start)} – ${f(end)}, ${start.slice(0, 4)}`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const r = (await readConfig()).retreats?.find((x) => x.id === id);
  return { title: r ? `${r.title} — One Cocreation` : "Retreat — One Cocreation" };
}

export default async function RetreatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const config = await readConfig();
  const r = config.retreats?.find((x) => x.id === id && x.status === "live");
  if (!r) notFound();

  const seatsLeft = Math.max(0, r.seats - (await seatsTaken(r.id)));
  await refreshRetreatSoldOut({ ...r, seatsLeft }).catch(() => {});
  const days = Math.round(
    (Date.parse(`${r.endDate}T00:00:00Z`) - Date.parse(`${r.startDate}T00:00:00Z`)) / 86_400_000,
  ) + 1;

  return (
    <main>
      <SiteHeader />
      <section style={{ paddingBottom: 30 }}>
        <div className="wrap center" style={{ maxWidth: 760 }}>
          <p className="kicker">A Journey, Not an Appointment</p>
          <h1 className="sec-h">{r.title}</h1>
          <p style={{ fontSize: "1.05rem", color: "var(--ink-body)", margin: "0 0 4px" }}>
            {prettySpan(r.startDate, r.endDate)} · {days} days · {r.location}
          </p>
          <p style={{ fontSize: ".92rem", fontWeight: 700, margin: "0 0 22px",
            color: seatsLeft > 0 ? "#2e6b77" : "var(--rose)" }}>
            {seatsLeft > 0 ? `${seatsLeft} of ${r.seats} seats left` : "all seats are taken"}
          </p>
          <p className="lead" style={{ whiteSpace: "pre-line", marginBottom: 30 }}>{r.blurb}</p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            {seatsLeft > 0 ? (
              <>
                {r.depositSats != null && (
                  <ReserveSeat
                    itemId={retreatDepositItemId(r.id)}
                    label={`Reserve a seat — ${r.depositSats.toLocaleString("en-US")} sats holds it`}
                  />
                )}
                <ReserveSeat
                  itemId={retreatItemId(r.id)}
                  label={
                    r.depositSats != null
                      ? `Pay in full — ${r.priceSats.toLocaleString("en-US")} sats`
                      : `Reserve a seat — ${r.priceSats.toLocaleString("en-US")} sats`
                  }
                />
              </>
            ) : (
              <Link className="btn btn-ghost" href="/contact">Ask about the waitlist ✉</Link>
            )}
            <Link className="btn btn-ghost" href="/contact">Ask Love a question</Link>
          </div>

          {r.depositSats != null && seatsLeft > 0 && (
            <p style={{ fontSize: ".8rem", color: "var(--muted)", marginTop: 16 }}>
              a deposit holds your seat — the remaining{" "}
              {(r.priceSats - r.depositSats).toLocaleString("en-US")} sats settles by letter before the days begin.
            </p>
          )}
        </div>
      </section>
      <section style={{ paddingTop: 0 }}>
        <div className="wrap center" style={{ display: "flex", gap: 22, flexWrap: "wrap",
          justifyContent: "center", fontSize: ".9rem", color: "var(--muted)" }}>
          <span>🗓️ {days} days held together</span>
          <span>📍 exact address shared after booking</span>
          <span>⚡ pay in sats · straight to the artist</span>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
