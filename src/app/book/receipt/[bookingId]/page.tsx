import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
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
    <main>
      <SiteHeader />
      <section>
        <div className="wrap" style={{ maxWidth: 640 }}>
          <BookingReceipt bookingId={bookingId} />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
