import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SlotPicker from "@/components/booking/SlotPicker";
import { getService } from "@/lib/booking";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}): Promise<Metadata> {
  const { serviceId } = await params;
  const service = await getService(serviceId);
  return {
    title: service ? `${service.title} — book a time` : "Book a time",
    description: service?.blurb ?? "Pick a time and pay in bitcoin.",
  };
}

function priceLabel(service: NonNullable<Awaited<ReturnType<typeof getService>>>): string {
  if (service.pricingMode === "pwyc") return "give what you can";
  const { sats, fiat } = service.price;
  const bits: string[] = [];
  if (sats != null) bits.push(`${sats.toLocaleString("en-US")} sats`);
  if (fiat) bits.push(`~${(fiat.amount / 100).toFixed(2)} ${fiat.currency}`);
  return bits.join(" · ") || "price on request";
}

export default async function BookPage({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  const service = await getService(serviceId);
  if (!service || service.status !== "live") notFound();

  return (
    <main>
      <SiteHeader />
      <section>
        <div className="wrap" style={{ maxWidth: 820 }}>
          <div className="center">
            <p className="kicker">
              <Link href="/book" style={{ color: "inherit" }}>Sessions</Link>
            </p>
            <h1 className="sec-h">{service.title}</h1>
            {service.blurb && (
              <p className="lead" style={{ marginBottom: 8 }}>{service.blurb}</p>
            )}
            <p className="price" style={{ fontSize: "1.2rem", margin: "0 0 4px" }}>{priceLabel(service)}</p>
            <p style={{ fontSize: ".82rem", color: "var(--muted)", margin: 0 }}>{service.durationMin} minutes</p>
            {service.meetingRail.kind === "inPerson" && (
              <p style={{ marginTop: 12, fontSize: ".88rem", color: "var(--muted)", maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
                This is an in-person session — Love&apos;s mobile studio travels; checkout asks your
                city, state, and zip so the visit can find you.
              </p>
            )}

          </div>

          <SlotPicker serviceId={service.id} inPerson={service.meetingRail.kind === "inPerson"} />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
