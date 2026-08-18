import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SlotPicker from "@/components/booking/SlotPicker";
import { getVoucher } from "@/lib/gift-vouchers";
import { getService } from "@/lib/booking";

export const metadata: Metadata = { title: "A gift for you — One Cocreation" };
export const dynamic = "force-dynamic";

/**
 * /gift/<voucherId> — the recipient's door (Admiral, 0018.05.17): the gift
 * already paid; here they choose their OWN time from Love's live calendar.
 * The voucher id is the capability, same law as the receipt.
 */
export default async function GiftPage({ params }: { params: Promise<{ voucherId: string }> }) {
  const { voucherId } = await params;
  const voucher = await getVoucher(voucherId);
  if (!voucher) notFound();

  const service = await getService(voucher.serviceId);

  return (
    <main className="mgmt-ground">
      <SiteHeader />
      <section className="mgmt-wrap mgmt-body" style={{ maxWidth: 780 }}>
        <header className="mgmt-head">
          <p className="mgmt-eyebrow">A gift for you 🕊️</p>
          <h1 className="mgmt-title">{voucher.serviceTitle}</h1>
          <p className="mgmt-blurb">
            {voucher.redeemedAtMs
              ? "This gift is booked — the details live on your receipt."
              : "Someone who loves you covered this session. The time is yours to choose."}
          </p>
        </header>
        {voucher.redeemedAtMs ? (
          <Link className="btn" href={`/book/receipt/${voucher.bookingId}`}>
            See my booking
          </Link>
        ) : !service || service.status !== "live" ? (
          <p style={{ color: "var(--muted)" }}>
            This session isn&apos;t on the calendar right now — write to Love via the{" "}
            <Link href="/support" style={{ color: "var(--gold-deep)" }}>support page</Link> and she&apos;ll make it right.
          </p>
        ) : (
          <SlotPicker
            serviceId={voucher.serviceId}
            inPerson={service.meetingRail.kind === "inPerson"}
            voucherId={voucher.id}
          />
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
