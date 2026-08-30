"use client";

import { useEffect, useState } from "react";
import { Chip } from "@/components/console/glass";

/**
 * CARD RAIL — SQUARE (the Admiral's walk, replacing the dead "soon" chip:
 * "i'm in the money jars money rails... the square button says soon...
 * i have square. can we build that one in."). squareAdapter already ships
 * a working PaymentAdapter (src/lib/payments.ts) — this card is the admin
 * desk's honest read of it: configured or not, the exact env vars to set
 * when it isn't, and once it is, whether Pac's own Square location
 * reports bitcoin acceptance (payments.ts's squareBitcoinEnabled()).
 *
 * Unlike Stripe's key drawer below, Square's five env vars are deploy-time
 * config (Vercel project → Settings → Environment Variables) — nothing is
 * pasted through this browser, so there's no vault form here, only status.
 */

interface SquareBitcoinStatus {
  checked: boolean;
  enabled: boolean | null;
  reason: string;
}

interface SquareStatus {
  ok: boolean;
  configured: boolean;
  squareBitcoin: SquareBitcoinStatus | null;
}

const ENV_VARS = [
  "SQUARE_ACCESS_TOKEN",
  "SQUARE_LOCATION_ID",
  "SQUARE_ENVIRONMENT",
  "SQUARE_WEBHOOK_SIGNATURE_KEY",
  "SQUARE_WEBHOOK_URL",
];

export default function SquareRailCard() {
  const [data, setData] = useState<SquareStatus | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function refresh(force = false) {
    fetch(`/api/admin/store/square${force ? "?refresh=1" : ""}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => (d?.ok ? setData(d) : setReason(d?.reason ?? "unreachable")))
      .catch(() => setReason("unreachable"));
  }
  useEffect(() => refresh(), []);

  async function recheck() {
    setBusy(true);
    refresh(true);
    setBusy(false);
  }

  return (
    <div style={{ background: "var(--glass)", border: "1px solid rgba(255,255,255,.9)", borderRadius: 18,
      padding: "14px 16px", marginTop: 12, boxShadow: "0 18px 44px -28px rgba(120,100,160,.45)", maxWidth: 640 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <b style={{ fontSize: ".95rem" }}>Card rail — Square</b>
        {data?.configured
          ? <Chip tone="green">live — hosted checkout</Chip>
          : <Chip tone="grey">not connected</Chip>}
      </div>

      {reason ? (
        <p style={{ fontSize: ".82rem", color: "var(--warn)" }}>the desk didn&apos;t answer: {reason}</p>
      ) : !data ? null : !data.configured ? (
        <>
          <p style={{ margin: "6px 0 8px", fontSize: ".78rem", color: "var(--muted)" }}>
            Square charges cards through its own hosted checkout page — this site never touches a
            card number, and no bitcoin↔fiat rate is ever invented (sats-only items simply aren&apos;t
            card-purchasable). Set these on the deploy (Vercel project → Settings → Environment
            Variables), then redeploy — the button lights up on its own:
          </p>
          <ul style={{ margin: "0 0 4px", paddingLeft: 20, fontSize: ".8rem", fontFamily: "monospace" }}>
            {ENV_VARS.map((v) => (
              <li key={v} style={{ margin: "2px 0" }}>{v}</li>
            ))}
          </ul>
          <p style={{ margin: "8px 0 0", fontSize: ".76rem", color: "var(--muted)" }}>
            the full walk (sandbox app, webhook subscription, test cards): docs/payments-square.md
          </p>
        </>
      ) : (
        <>
          <p style={{ margin: "6px 0 8px", fontSize: ".78rem", color: "var(--muted)" }}>
            Connected. A fiat-priced item now offers &ldquo;pay by card&rdquo; at checkout, hosted
            entirely on Square&apos;s own page — try it from the shelf.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <b style={{ fontSize: ".82rem" }}>Bitcoin on this Square location</b>
            {data.squareBitcoin?.enabled === true && <Chip tone="green">enabled</Chip>}
            {data.squareBitcoin?.enabled === false && <Chip tone="grey">not enabled</Chip>}
            {data.squareBitcoin?.enabled == null && <Chip tone="lavender">unverified</Chip>}
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={recheck}>Recheck</button>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: ".76rem", color: "var(--muted)" }}>
            {data.squareBitcoin?.reason ?? "checking…"}
          </p>
        </>
      )}
    </div>
  );
}
