import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CosmicSky from "@/components/CosmicSky";
import ServiceCard from "@/components/ServiceCard";
import { listServices } from "@/lib/booking";
import { listItems } from "@/lib/store";
import { cartridge } from "@/brand/cartridge";

export const metadata: Metadata = {
  title: "Sessions — book a time",
  description: "Pick a session, choose a real open time — you're held.",
};

export const dynamic = "force-dynamic";

/** real photography per session — the same faces as the services shelf */
const IMG: [RegExp, string][] = [
  [/discovery/i, cartridge.hero.loveSidelook],
  [/soul/i, cartridge.hero.moon],
  [/women|female/i, cartridge.portraits.cuts.women],
  [/men|male/i, cartridge.portraits.cuts.men],
  [/wax/i, cartridge.portraits.cuts.wax],
];
const imgFor = (id: string) => IMG.find(([re]) => re.test(id))?.[1] ?? cartridge.hero.nebula;

/**
 * /book — the same living 2×2 the services shelf wears (Admiral,
 * 0018.05.15): photo cards on the night, big serif names, one gold door.
 */
export default async function BookIndexPage() {
  const services = await listServices();
  const shelfIds = new Set((await listItems()).map((i) => i.id));

  return (
    <main>
      <SiteHeader />
      {/* ══ the hero — night sky settling into the page ══ */}
      <section className="keep-dark sky-veil" style={{ padding: 0, position: "relative", overflow: "hidden" }}>
        <CosmicSky />
        <div className="wrap center reveal" style={{ position: "relative", zIndex: 2, padding: "64px 22px 56px" }}>
          <p className="kicker" style={{ color: "var(--rose)" }}>One-on-One with Love</p>
          <h1 className="stack-hero">
            <span className="sh-ink" style={{ color: "var(--ink-strong)" }}>BOOK</span>
            <span className="sh-teal" style={{ color: "var(--teal-bright)" }}>A SESSION</span>
          </h1>
          <div className="constellation" aria-hidden style={{ color: "var(--ink-strong)" }}>{cartridge.constellation}</div>
          <p style={{ fontFamily: "var(--serif)", color: "var(--ink-body)", fontSize: "1.05rem",
            maxWidth: 460, margin: "18px auto 0" }}>
            {/* S2: gold law — decorative gold, held for a ruling */}
            Pick a session, choose a real open time — <b style={{ color: "#EBCB77" }}>you&apos;re held.</b>
          </p>
        </div>
      </section>

      {/* ══ the sessions — the living 2×2 ══ */}
      <section style={{ padding: "56px 0 70px" }}>
        <div className="wrap" style={{ maxWidth: 880 }}>
          {services.length === 0 ? (
            <p className="center" style={{ color: "var(--muted)" }}>No sessions open yet — check back soon ✨</p>
          ) : (
            <div className="grid grid-2">
              {services.map((s, i) => (
                <ServiceCard
                  key={s.id}
                  delay={(i % 2) * 0.12}
                  svc={{
                    id: s.id,
                    title: s.title,
                    blurb: s.blurb ?? "",
                    durationMin: s.durationMin,
                    usd: s.price.fiat ? Math.round(s.price.fiat.amount / 100) : undefined,
                    sats: s.price.sats,
                    pwyc: s.pricingMode === "pwyc",
                    inStore: shelfIds.has(s.id),
                    img: imgFor(s.id),
                  }}
                />
              ))}
            </div>
          )}
          <p className="center reveal" style={{ marginTop: 34, fontSize: ".88rem", color: "var(--muted)" }}>
            not sure where to begin?{" "}
            <Link href="/book/discovery-call" style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>
              the discovery call — credited toward your first session
            </Link>{" "}
            is the gentlest door 🕊️
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
