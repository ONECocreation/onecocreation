import type { Metadata } from "next";
import { headers } from "next/headers";
import OperatorGate from "@/components/OperatorGate";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";
import TestJoinRoom from "./TestJoinRoom";

/**
 * /a/money/test-join - the operator test door for monthly memberships
 * (T-555). The same gate-wrapper shape every /a/site room wears: a SERVER
 * page that reads the cookie and renders the OperatorGate when there is no
 * operator, the room body (TestJoinRoom.tsx) behind it.
 */

export const metadata: Metadata = {
  title: "Test join · admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function TestJoinPage() {
  const cookie = (await headers()).get("cookie");
  const operator = operatorFromCookieHeader(cookie);
  if (!operator) {
    return <OperatorGate configured={operatorsConfigured()} />;
  }
  return <TestJoinRoom />;
}
