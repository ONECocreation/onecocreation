import type { Metadata } from "next";
import Link from "next/link";
import ArcadeHeader from "@/components/ArcadeHeader";
import EarthFooter from "@/components/EarthFooter";
import { listServices } from "@/lib/booking";

export const metadata: Metadata = {
  title: "Sessions — book a time",
  description: "Pick a time, pay in bitcoin, straight to the host.",
};

export const dynamic = "force-dynamic";

export default async function BookIndexPage() {
  const services = await listServices();

  return (
    <main className="min-h-screen bg-void text-white">
      <ArcadeHeader />
      <section className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold tracking-widest">SESSIONS</h1>
        <p className="mt-1 text-sm text-cyan-300">
          pick a time · paid in bitcoin, straight to the host
        </p>

        {services.length === 0 ? (
          /* honest empty state, same law as the shelf */
          <p className="mt-10 text-sm text-neutral-400">No sessions open yet.</p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {services.map((s) => (
              <li key={s.id} className="border border-neutral-800 p-4 hover:border-cyan-700">
                <Link href={`/book/${s.id}`} className="block">
                  <h2 className="text-sm font-semibold tracking-wide text-neutral-100">{s.title}</h2>
                  {s.blurb && <p className="mt-1 text-xs text-neutral-400">{s.blurb}</p>}
                  <p className="mt-3 text-xs text-neutral-500">{s.durationMin} minutes</p>
                  <p className="mt-1 text-xs text-amber-300">
                    {s.pricingMode === "pwyc"
                      ? "give what you can"
                      : s.price.sats != null
                        ? `${s.price.sats.toLocaleString("en-US")} sats`
                        : s.price.fiat
                          ? `${(s.price.fiat.amount / 100).toFixed(2)} ${s.price.fiat.currency}`
                          : "price on request"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <EarthFooter />
    </main>
  );
}
