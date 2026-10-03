"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/kit";
import JoinWithCard from "@/components/store/JoinWithCard";
import useMemberSession from "@/hooks/useMemberSession";

/**
 * /a/money/test-join body (T-555). Lets an operator join with a real card
 * while the public switch is off (the one operator door is in
 * src/lib/subscription-route.ts). Kit classes only: no per-page CSS, no
 * inline styles. Facts come from the operator-only plans route.
 */

interface PlanPhase { priceCents: number | null }
interface PlanListing { name: string; variations: { id: string; name: string; phases: PlanPhase[] }[] }
interface PlansReply {
  ok: boolean;
  environment: string | null;
  enabled: boolean;
  map: { tiers?: Record<string, Record<string, string | undefined> | undefined> };
  plans: PlanListing[];
}
type Read = { state: "loading" } | { state: "failed" } | { state: "ok"; data: PlansReply };

export interface MappedPlan { name: string; cents: number | null }

/** The Square plan behind Weekly Intuitive's regular price, or null when the slot is empty or unknown. */
export function mappedPlan(data: PlansReply): MappedPlan | null {
  const id = data.map?.tiers?.A?.standard;
  if (!id) return null;
  for (const p of data.plans ?? []) {
    const v = p.variations.find((x) => x.id === id);
    if (!v) continue;
    const priced = v.phases.filter((ph) => ph.priceCents != null);
    const last = priced.length ? priced[priced.length - 1].priceCents : null;
    return { name: p.name, cents: last };
  }
  return null;
}

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function TestJoinRoom() {
  const { member, checked } = useMemberSession();
  const [read, setRead] = useState<Read>({ state: "loading" });

  useEffect(() => {
    let live = true;
    fetch("/api/admin/store/subscription-plans", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: PlansReply | null) => {
        if (live) setRead(d?.ok ? { state: "ok", data: d } : { state: "failed" });
      })
      .catch(() => {
        if (live) setRead({ state: "failed" });
      });
    return () => {
      live = false;
    };
  }, []);

  const data = read.state === "ok" ? read.data : null;
  const plan = data ? mappedPlan(data) : null;

  let memberships = "Reading...";
  let square = "Reading...";
  let planRow: React.ReactNode = "Reading...";
  if (read.state === "failed") {
    memberships = square = planRow = "Could not read the plans. Try again.";
  } else if (data) {
    memberships = data.enabled ? "On for everyone" : "Off for members";
    square = !data.environment
      ? "Square is not set up."
      : data.environment === "production"
        ? "Production mode. Real money."
        : "Sandbox mode. No real money.";
    planRow = plan ? (
      `${plan.name}: ${plan.cents != null ? `${dollars(plan.cents)} a month` : "price not listed"}`
    ) : (
      <>
        Not set. Pick one on the <Link href="/a/money" className="underline">Money desk</Link>.
      </>
    );
  }

  const joining = !checked ? (
    "Reading..."
  ) : member ? (
    member.handle
  ) : (
    <>
      Not signed in as a member. <Link href="/login?next=/a/money/test-join" className="underline">Sign in</Link>
    </>
  );

  return (
    <div className="kit-stack">
      <h2 className="kit-h2">Test a monthly membership</h2>
      <p className="kit-note">
        This page is for operators. It lets you join with a real card before monthly memberships are switched on
        for everyone. Members cannot open it. This test uses the Weekly Intuitive slot.
      </p>
      <Card>
        <ul className="kit-rows">
          <li>
            <span>
              <b>Monthly memberships</b>
              <em>{memberships}</em>
            </span>
          </li>
          <li>
            <span>
              <b>Square</b>
              <em>{square}</em>
            </span>
          </li>
          <li>
            <span>
              <b>Weekly Intuitive plan</b>
              <em>{planRow}</em>
            </span>
          </li>
          <li>
            <span>
              <b>Joining as</b>
              <em>{joining}</em>
            </span>
          </li>
        </ul>
      </Card>
      {plan && plan.cents != null && member ? (
        <JoinWithCard tier="A" tierName="Weekly Intuitive" priceUsd={plan.cents / 100} slug="weekly-intuitive" />
      ) : null}
      <Card>
        <h3 className="kit-h2">After the test</h3>
        <ol className="kit-note list-decimal pl-5">
          <li>Check your membership on <Link href="/me" className="underline">My field</Link>.</li>
          <li>Refund the payment in Square.</li>
          <li>Point Weekly Intuitive back at its real plan on the <Link href="/a/money" className="underline">Money desk</Link>.</li>
        </ol>
      </Card>
    </div>
  );
}
