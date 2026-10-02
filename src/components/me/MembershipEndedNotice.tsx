"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Card from "@/components/kit/Card";

/**
 * T-539: a member whose paid 30-day term has run out sees it plainly on
 * /me, with the way back. Renders nothing while loading, on any failure,
 * or when they hold a live tier (the API answers `ended: null`).
 */
export function endedDateLabel(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "America/Los_Angeles" });
}

export default function MembershipEndedNotice() {
  const [ended, setEnded] = useState<{ name: string; endedAtMs: number } | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/member/membership-ended", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (live && j?.ended) setEnded(j.ended); })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  if (!ended) return null;
  return (
    <Card role="status" style={{ marginBottom: 16 }}>
      <p className="kit-body" style={{ margin: 0 }}>
        Your {ended.name} membership ended on {endedDateLabel(ended.endedAtMs)}.{" "}
        <Link href="/memberships">Renew</Link>
      </p>
    </Card>
  );
}
