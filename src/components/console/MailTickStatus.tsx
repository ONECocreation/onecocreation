"use client";
import { useEffect, useState } from "react";
import { deliveryCopy, deliveryTime } from "@/lib/letter-delivery-copy";
export default function MailTickStatus() {
  const [line, setLine] = useState("Checking the last mail run…");
  useEffect(() => {
    let alive = true;
    async function refresh() {
      try {
        const res = await fetch("/api/mail/test");
        const d = await res.json();
        if (!res.ok || !d.ok) throw new Error();
        if (alive) setLine(d.lastTickAtMs ? `Last completed mail run: ${deliveryTime(new Date(d.lastTickAtMs).toISOString())}.${Date.now() - d.lastTickAtMs > 20 * 60_000 ? " More than 20 minutes ago. Check the sender." : ""}` : deliveryCopy.tickMissing);
      } catch { if (alive) setLine("Last mail run unavailable."); }
    }
    void refresh();
    const timer = setInterval(refresh, 60_000);
    return () => { alive = false; clearInterval(timer); };
  }, []);
  return <p className="kit-note" role="status">{line}</p>;
}
