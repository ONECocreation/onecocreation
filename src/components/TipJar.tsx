"use client";

import { useState } from "react";
import Link from "next/link";
import { JAR_ITEMS } from "@/lib/jars";
import { dollars } from "@/lib/money-words";
import type { DollarGift } from "@/lib/gift-panel";

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
 * field" and "Gifts of Gratitude" sections.
 *
 * TASK-411 (block 968,170 a₿): the jars ride the basket. /api/tip and its
 * invoice modal are retired; the gift is ONE basket line carrying a
 * pay-what-you-can offer, settled by the standard checkout (a gift line is
 * sats-only by the basket's own offer law — honestly refused to cards).
 * The jar key → shelf item id map lives once in @/lib/jars.
 *
 * TASK-646 (block 976,007 · Pay It Forward step 1, card 15) — TWO ROWS, ONE
 * LAYOUT. The gate is the caller's (giftPanel(), @/lib/gift-panel): `only`
 * is the jars the SATS row may give to (bitcoin live, jar item live) and
 * `dollarGifts` is the DOLLAR row's buttons (card live, gift item live with
 * a dollar price). The dollar row gives to Gifts of Gratitude, so it shows
 * while that jar is the one picked. Each dollar button is a normal shelf
 * item placed in the basket at its own price, so the charging code is not
 * changed; its amount is read from the item, never typed here. No box for
 * your own dollar amount in this step (that is step 2).
 *
 * THE ROW (his pin on pif-row-dawn-390: "these sizes look bad. i'm not a
 * fan of the uneven button sizes. and itmes are not centered"): three
 * amount buttons in one row, one width each; the own-amount box (sats
 * only) and Give each the full width of that row; the whole row centred.
 * Every rule rides house.css's `give-` section; this file carries no
 * inline look.
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

/** The basket's answer, shared by both rows. */
async function toBasket(itemId: string, offerSats?: number): Promise<string | null> {
  const add = await fetch("/api/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId, qty: 1 }),
  });
  const added = (await add.json().catch(() => ({ ok: false }))) as { ok: boolean; reason?: string };
  if (!added.ok) return added.reason ?? "Something went sideways — please try again.";
  if (offerSats != null) {
    const offer = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, offerSats }),
    });
    const offered = (await offer.json().catch(() => ({ ok: false }))) as { ok: boolean; reason?: string };
    if (!offered.ok) return offered.reason ?? "Something went sideways — please try again.";
  }
  window.dispatchEvent(new Event("oc-cart-changed"));
  return null;
}

export default function TipJar({
  only,
  dollarGifts = [],
}: {
  only?: readonly JarKey[];
  dollarGifts?: readonly DollarGift[];
}) {
  const satsKeys: readonly JarKey[] = only ?? JARS.map((j) => j.key);
  /* the jars a fren can pick: every sats jar, plus Gifts of Gratitude when
     the dollar row has a button to give with */
  const jars = JARS.filter(
    (j) => satsKeys.includes(j.key) || (j.key === "payforward" && dollarGifts.length > 0),
  );
  const [jar, setJar] = useState<JarKey>(jars[0]?.key ?? "payforward");
  const [sats, setSats] = useState<number>(11_111);
  const [custom, setCustom] = useState("");
  const [gift, setGift] = useState<string>(dollarGifts[Math.min(1, dollarGifts.length - 1)]?.id ?? "");
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [note, setNote] = useState("");

  const amount = custom ? Math.floor(Number(custom)) : sats;
  const showSats = satsKeys.includes(jar);
  const showDollars = jar === "payforward" && dollarGifts.length > 0;
  const chosenGift = dollarGifts.find((g) => g.id === gift) ?? dollarGifts[0];

  async function run(itemId: string, offerSats?: number) {
    if (state === "busy") return;
    setState("busy");
    setNote("");
    try {
      const failed = await toBasket(itemId, offerSats);
      setState(failed ? "error" : "idle");
      setNote(failed ?? "in the basket 🧺");
    } catch {
      setState("error");
      setNote("Something went sideways — please try again.");
    }
  }

  function giveSats() {
    if (!amount || amount < 111) {
      setState("error");
      setNote("offers start at 111 sats");
      return;
    }
    void run(JAR_ITEMS[jar], amount);
  }

  if (jars.length === 0) return null;

  return (
    <div className="give">
      {jars.length > 1 && (
        <div className="give-jars">
          {jars.map((j) => (
            <button
              key={j.key}
              type="button"
              onClick={() => setJar(j.key)}
              className={jar === j.key ? "give-jar is-on" : "give-jar"}
              aria-pressed={jar === j.key}
            >
              <span className="give-jar-title">{j.title}</span>
              <span className="give-jar-blurb">{j.blurb}</span>
            </button>
          ))}
        </div>
      )}
      {jars.length === 1 && (
        <div className="give-jars">
          <div className="give-jar is-on">
            <span className="give-jar-title">{jars[0].title}</span>
            <span className="give-jar-blurb">{jars[0].blurb}</span>
          </div>
        </div>
      )}

      <div className="give-rows">
        {showSats && (
          <div className="give-row" role="group" aria-label="Give in sats">
            {showDollars && <p className="give-row-unit">In sats</p>}
            <div className="give-row-amounts">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setSats(p);
                    setCustom("");
                  }}
                  aria-pressed={!custom && sats === p}
                  className={!custom && sats === p ? "btn btn-gold btn-sm" : "btn btn-ghost btn-sm"}
                >
                  {p.toLocaleString("en-US")}
                </button>
              ))}
            </div>
            <input
              className="give-row-own"
              inputMode="numeric"
              placeholder="custom sats"
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ""))}
              aria-label="Custom amount in sats"
            />
            <button className="btn btn-gold btn-sm give-row-give" type="button" onClick={giveSats} disabled={state === "busy" || !amount}>
              {state === "busy" ? "Placing it in the basket…" : `Give ${amount ? amount.toLocaleString("en-US") : "—"} sats`}
            </button>
          </div>
        )}

        {showDollars && chosenGift && (
          <div className="give-row" role="group" aria-label="Give in dollars, by card">
            {showSats && <p className="give-row-unit">In dollars, by card</p>}
            <div className="give-row-amounts">
              {dollarGifts.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGift(g.id)}
                  aria-pressed={g.id === chosenGift.id}
                  className={g.id === chosenGift.id ? "btn btn-gold btn-sm" : "btn btn-ghost btn-sm"}
                >
                  {dollars(g.amount, g.currency)}
                </button>
              ))}
            </div>
            <button
              className="btn btn-gold btn-sm give-row-give"
              type="button"
              onClick={() => void run(chosenGift.id)}
              disabled={state === "busy"}
            >
              {state === "busy" ? "Placing it in the basket…" : `Give ${dollars(chosenGift.amount, chosenGift.currency)}`}
            </button>
          </div>
        )}
      </div>

      {note && (
        <p className="give-note">
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
