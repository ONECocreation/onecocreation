import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArcadeHeader from "@/components/ArcadeHeader";
import EarthFooter from "@/components/EarthFooter";
import SlotPicker from "@/components/booking/SlotPicker";
import { getService } from "@/lib/booking";
import { liveAdapter } from "@/lib/payments";

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

  const rail = liveAdapter();

  return (
    <main className="min-h-screen bg-void text-white">
      <ArcadeHeader />
      <section className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-xs uppercase tracking-widest text-neutral-500">
          <Link href="/book" className="hover:text-cyan-300">
            sessions
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-widest">{service.title.toUpperCase()}</h1>
        {service.blurb && <p className="mt-2 text-sm text-neutral-300">{service.blurb}</p>}
        <p className="mt-3 text-sm text-amber-300">{priceLabel(service)}</p>

        {!rail && (
          <p className="mt-4 border border-cyan-800 px-3 py-2 text-xs text-cyan-300">
            ◌ payment rail not connected — times are browsable until this ship links its BTCPay
          </p>
        )}

        <SlotPicker serviceId={service.id} />
      </section>
      <EarthFooter />
    </main>
  );
}
