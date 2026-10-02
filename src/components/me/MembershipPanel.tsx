"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "@/components/kit/Card";
import Button from "@/components/kit/Button";
import MembershipEndedNotice from "./MembershipEndedNotice";
import { cancelCall, getSubscription, undoCancelCall, upgradeCall, type CallOut } from "@/lib/subscription-client";
import { cancelConfirmWords, errorWords, panelFacts, subscriptionOwnsNotice, upgradeLine, dollarsOf, type SubView } from "@/lib/subscription-ui";

/** The monthly price of each tier in dollars (display only; the server decides every charge). */
const NEXT_PRICE: Record<string, number> = { A: 33, B: 55, C: 111 };

/** Which pending two-step confirm is open, if any. */
type Confirm = null | { kind: "cancel" } | { kind: "upgrade"; tier: "A" | "B" | "C" };

/**
 * T-541b: "Your membership" on /me. While a subscription is live or ending
 * it owns the membership story (tier, the ONE state line, cancel / keep,
 * upgrade); the T-539 "membership ended" notice steps aside then. With the
 * switch OFF (the route answers 404) or no subscription at all, the notice
 * is exactly what it was.
 */
export default function MembershipSection() {
  const [sub, setSub] = useState<SubView | null | undefined>(undefined);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    getSubscription(fetch).then((r) => { if (live) setSub("subscription" in r ? r.subscription : null); });
    return () => { live = false; };
  }, []);

  const run = useCallback(async (go: () => Promise<CallOut>, okText: string) => {
    setBusy(true);
    setMsg(null);
    const res = await go();
    setBusy(false);
    setConfirm(null);
    if (res?.ok) { setSub(res.subscription ?? null); setMsg({ ok: true, text: okText }); }
    else setMsg({ ok: false, text: errorWords(res) });
  }, []);

  if (!sub || !subscriptionOwnsNotice(sub)) return <MembershipEndedNotice />;
  const facts = panelFacts(sub);
  if (!facts) return <MembershipEndedNotice />;
  const endsMs = sub.canceledAtMs ?? sub.chargedThroughMs ?? sub.expiresAtMs;

  return (
    <Card style={{ marginBottom: 16 }} aria-label="Your membership">
      <h2 className="kit-h2">Your membership</h2>
      <ul className="kit-rows kit-rows-stackable">
        <li>
          <div>
            <b>{facts.title}</b>
            <em>{facts.stateLine}</em>
          </div>
          <div className="kit-rows-end kit-rows-pair">
            {facts.canCancel && confirm?.kind !== "cancel" && (
              <Button sm variant="second" disabled={busy} onClick={() => { setMsg(null); setConfirm({ kind: "cancel" }); }}>Cancel membership</Button>
            )}
            {facts.canUndo && (
              <Button sm disabled={busy} onClick={() => run(() => undoCancelCall(fetch), "Your membership will keep renewing.")}>Keep my membership</Button>
            )}
          </div>
        </li>
        {confirm?.kind === "cancel" && (
          <li role="alertdialog" aria-label="Confirm cancel">
            <div>
              <b>Cancel your membership?</b>
              <em>{cancelConfirmWords(endsMs)}</em>
            </div>
            <div className="kit-rows-end kit-rows-pair">
              <Button sm disabled={busy} onClick={() => setConfirm(null)}>Keep my membership</Button>
              <Button sm variant="second" disabled={busy} onClick={() => run(() => cancelCall(fetch), "Your membership is set to end. You keep access until then.")}>Yes, cancel it</Button>
            </div>
          </li>
        )}
        {facts.canUpgrade && sub.upgrades.map((u) => {
          const open = confirm?.kind === "upgrade" && confirm.tier === u.tier;
          return (
            <li key={u.tier}>
              <div>
                <b>{u.name}</b>
                <em>{open ? `Charge ${dollarsOf(u.differenceCents)} to your card on file now?` : upgradeLine(u, NEXT_PRICE[u.tier] ?? 0)}</em>
              </div>
              <div className="kit-rows-end kit-rows-pair">
                {open ? (
                  <>
                    <Button sm variant="second" disabled={busy} onClick={() => setConfirm(null)}>Not now</Button>
                    <Button sm disabled={busy} onClick={() => run(() => upgradeCall(fetch, u.tier), `You are now ${u.name}. Your new price starts with your next payment.`)}>{busy ? "Upgrading..." : "Yes, upgrade"}</Button>
                  </>
                ) : (
                  <Button sm variant="second" disabled={busy} onClick={() => { setMsg(null); setConfirm({ kind: "upgrade", tier: u.tier }); }}>Upgrade</Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {facts.note && <p className="kit-note" style={{ marginTop: 12 }}>{facts.note}</p>}
      {msg && <p className={`kit-note ${msg.ok ? "kit-note-ok" : "kit-note-err"}`} role={msg.ok ? "status" : "alert"} style={{ marginTop: 8 }}>{msg.text}</p>}
    </Card>
  );
}
