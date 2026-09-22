"use client";

import { useState } from "react";
import Link from "next/link";
import { JAR_ITEMS } from "@/lib/jars";

/**
 * Three jars, one gesture (the Admiral's design): tip Love, tip the house,
 * or pay a session forward for someone who can't. Presets are angel numbers;
 * custom keeps it open. Give posts the jar's shelf item to the basket and
 * sets the chosen amount as a pay-what-you-can offer (the basket route's own
 * floor: 111 sats); checkout is the basket's own — bitcoin on-chain, a
 * normal order whose receipt names the jar by its item title.
 *
 * TASK-134 (0018.06.17 a₿): the payforward jar is renamed GIFTS OF
 * GRATITUDE everywhere (the KEY stays `payforward` — ledger continuity),
 * and an optional `only` prop lets /support split the jars into "Tip the
 * field" and "Gifts of Gratitude" sections. The switch gate (features.jars
 * AND the live bitcoin rail) is jarsOpen() in @/lib/payments — the server
 * pages ask it before rendering this at all.
 *
 * TASK-411 (block 968,170 a₿): the jars ride the basket. /api/tip and its
 * invoice modal are retired; the gift is ONE basket line carrying a
 * pay-what-you-can offer, settled by the standard checkout (a gift line is
 * sats-only by the basket's own offer law — honestly refused to cards).
 * The jar key → shelf item id map lives once in @/lib/jars (AMENDMENT 1's
 * derived ids — the store desk derives the id from the title); the server
 * faces re-check those items are live before mounting a jar at all.
 */
export const JARS = [
  {
    key: "love",
    title: "Tip Love",
    blurb: "A direct thank-you to Love for the work and the field she holds.",
  },
  {
    key: "onecocreation",
    title: "Tip One Cocreation",
    blurb: "Keeps the lights on — the site, the rails, the rooms.",
  },
  {
    key: "payforward",
    title: "Gifts of Gratitude",
    blurb: "Fund a session or membership for someone who can't right now.",
  },
] as const;

export type JarKey = (typeof JARS)[number]["key"];

const PRESETS = [2_100, 11_111, 111_111];

export default function TipJar({ only }: { only?: readonly JarKey[] }) {
  const jars = only ? JARS.filter((j) => only.includes(j.key)) : JARS;
  const [jar, setJar] = useState<JarKey>(jars[0].key);
  const [sats, setSats] = useState<number>(11_111);
  const [custom, setCustom] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [note, setNote] = useState("");

  const amount = custom ? Math.floor(Number(custom)) : sats;

  async function give() {
    if (state === "busy") return;
    if (!amount || amount < 111) {
      setState("error");
      setNote("offers start at 111 sats");
      return;
    }
    setState("busy");
    setNote("");
    try {
      const itemId = JAR_ITEMS[jar];
      const add = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, qty: 1 }),
      });
      const added = (await add.json().catch(() => ({ ok: false }))) as { ok: boolean; reason?: string };
      if (!added.ok) {
        setState("error");
        setNote(added.reason ?? "Something went sideways — please try again.");
        return;
      }
      const offer = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, offerSats: amount }),
      });
      const offered = (await offer.json().catch(() => ({ ok: false }))) as { ok: boolean; reason?: string };
      if (!offered.ok) {
        setState("error");
        setNote(offered.reason ?? "Something went sideways — please try again.");
        return;
      }
      window.dispatchEvent(new Event("oc-cart-changed"));
      setState("idle");
      setNote("in the basket 🧺");
    } catch {
      setState("error");
      setNote("Something went sideways — please try again.");
    }
  }

  return (
    <div style={{ marginTop: 26 }}>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        {jars.map((j) => (
          <button
            key={j.key}
            type="button"
            onClick={() => setJar(j.key)}
            style={{
              textAlign: "left",
              padding: "16px 18px",
              borderRadius: 18,
              cursor: "pointer",
              background: jar === j.key ? "rgba(217,178,78,.18)" : "var(--ghost-bg)",
              border: jar === j.key ? "1.5px solid var(--gold-deep)" : "1.5px solid rgba(180,134,43,.3)",
            }}
          >
            <div style={{ fontFamily: "var(--font-h3)", fontSize: "1.06rem", color: "var(--ink-strong)" }}>{j.title}</div>
            <div style={{ fontSize: ".85rem", color: "var(--muted)", marginTop: 4 }}>{j.blurb}</div>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 18 }}>
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setSats(p);
              setCustom("");
            }}
            className={!custom && sats === p ? "btn btn-gold btn-sm" : "btn btn-ghost btn-sm"}
          >
            {p.toLocaleString()} sats
          </button>
        ))}
        <input
          inputMode="numeric"
          placeholder="custom sats"
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ""))}
          aria-label="Custom amount in sats"
          style={{
            width: 130,
            padding: "9px 14px",
            borderRadius: 999,
            border: "1.5px solid rgba(180,134,43,.65)",
            background: "rgba(255,255,255,.92)",
            color: "var(--field-ink)",
            fontSize: ".9rem",
          }}
        />
        <button className="btn btn-gold" type="button" onClick={give} disabled={state === "busy" || !amount}>
          {state === "busy" ? "Placing it in the basket…" : `Give ${amount ? amount.toLocaleString() : "—"} sats`}
        </button>
      </div>
      {note && (
        <p style={{ color: "var(--muted)", fontSize: ".85rem", marginTop: 10 }}>
          {note}
          {state !== "error" && (
            <>
              {" — "}
              <Link href="/cart">open the basket</Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
