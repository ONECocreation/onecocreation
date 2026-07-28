import type { Metadata } from "next";
import ArcadeHeader from "@/components/ArcadeHeader";
import EarthFooter from "@/components/EarthFooter";
import BookingReceipt from "@/components/booking/BookingReceipt";

export const metadata: Metadata = {
  title: "Your booking",
  description: "Your session details.",
};

export const dynamic = "force-dynamic";

/**
 * The receipt (spec step 3's landing; the .ics + calendar legs land in step
 * 4). The booking id in the URL is the capability — no session required, so
 * a gift recipient or someone on another device can still reach it.
 */
export default async function ReceiptPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return (
    <main className="min-h-screen bg-void text-white">
      <ArcadeHeader />
      <section className="mx-auto max-w-xl px-4 py-10">
        <BookingReceipt bookingId={bookingId} />
      </section>
      <EarthFooter />
    </main>
  );
}
