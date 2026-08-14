import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import OrderStatus from "@/components/store/OrderStatus";

export const metadata: Metadata = { title: "Your order — One Cocreation" };
export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main>
      <SiteHeader />
      <section>
        <div className="wrap center" style={{ maxWidth: 680 }}>
          <p className="kicker">
            <Link href="/store" style={{ color: "inherit" }}>← The Store</Link>
          </p>
          <h1 className="sec-h">Your Order</h1>
          <OrderStatus orderId={id} />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
