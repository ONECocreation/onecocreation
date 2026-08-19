import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { readConfig } from "@/lib/booking";
import StackedHero from "@/components/StackedHero";
import { listLiveRetreats, refreshRetreatSoldOut } from "@/lib/retreats";

export const metadata: Metadata = {
  title: "Retreats — One Cocreation",
  description: "A journey, not an appointment — blocks of days with Love, sold by the seat, paid in bitcoin.",
};

export const dynamic = "force-dynamic";

function prettySpan(start: string, end: string): string {
  const f = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const year = start.slice(0, 4);
  return `${f(start)} – ${f(end)}, ${year}`;
}

export default async function RetreatsPage() {
  const retreats = await listLiveRetreats(await readConfig());
  // keep the seat items' sold-out truth fresh while we're here
  await Promise.all(retreats.map((r) => refreshRetreatSoldOut(r).catch(() => {})));

  return (
    <main>
      <SiteHeader />
      <section>
        <div className="wrap center">
          <StackedHero kicker="A Journey, Not an Appointment" lines={[{ t: "RETREATS" }, { t: "& EXCURSIONS", tone: "sub" }]} />
          <p className="lead" style={{ marginBottom: retreats.length ? 40 : 0 }}>
            Blocks of days at a place, held together — sold by the seat, paid in bitcoin,
            straight to the artist.
          </p>
          {retreats.length === 0 && (
            <p style={{ color: "var(--muted)" }}>
              No retreats on the horizon just now — the next one will be announced in{" "}
              <Link href="/news" style={{ color: "var(--gold-deep)" }}>the letters</Link> ✨
            </p>
          )}
          <div className="grid grid-2" style={{ textAlign: "left" }}>
            {retreats.map((r) => (
              <div className="card reveal" key={r.id}>
                <div className="thumb" style={{ display: "grid", placeItems: "center", fontSize: "3rem",
                  background: "linear-gradient(135deg,rgba(78,160,175,.35),rgba(139,118,196,.35))" }}>
                  🏜️
                </div>
                <div className="body">
                  <h3 style={{ fontWeight: 400, fontSize: "1.25rem" }}>{r.title}</h3>
                  <p style={{ color: "var(--muted)", fontSize: ".9rem", margin: ".2em 0" }}>
                    {prettySpan(r.startDate, r.endDate)} · {r.location}
                  </p>
                  <p style={{ fontSize: ".9rem", color: "var(--ink-body)", margin: ".4em 0 .8em" }}>{r.blurb}</p>
                  <div className="price" style={{ fontSize: "1.25rem" }}>
                    {r.priceSats.toLocaleString("en-US")} sats
                    <small style={{ marginLeft: 8 }}>
                      {r.depositSats != null && `· ${r.depositSats.toLocaleString("en-US")} holds a seat`}
                    </small>
                  </div>
                  <p style={{ fontSize: ".82rem", fontWeight: 700, margin: "6px 0 14px",
                    color: r.seatsLeft > 0 ? "var(--teal-deep)" : "var(--rose)" }}>
                    {r.seatsLeft > 0 ? `${r.seatsLeft} of ${r.seats} seats left` : "all seats taken"}
                  </p>
                  <div className="push">
                    <Link className="btn btn-sm" href={`/retreats/${r.id}`}>
                      {r.seatsLeft > 0 ? "See the days" : "See the days (waitlist by letter)"}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
