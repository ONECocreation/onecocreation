"use client";

import { useEffect, useRef, useState } from "react";
import SwitchRow from "./SwitchRow";
import type { SiteConfig } from "@/lib/site-config";

/**
 * THE BOOK TALK AND Q&A SWITCHES (TASK-614, the Admiral: "this weekend we
 * are not going to be doing the book talk or the q&a. would like the
 * ability to turn off those items in the /a/site/reading"). One shared
 * card, mounted twice by `./page.tsx` (`bookTalk` for Part 3, `qa` for
 * Part 4; round 2 adds `housewarming`), in the exact pattern of HousewarmingSwitchCard.tsx (TASK-499):
 * persisted as DATA on the site-config doc, ABSENT MEANS ON, the flip is
 * IMMEDIATE on tap (PUT, read back the SAVED config, note in words), a
 * real ref guards the double-tap race, one state line under the words.
 * The button is the kit Button (no raw `.btn`), kit and console classes
 * only.
 *
 * TASK-631 (block 971,896, the Admiral: "the switches that are at the
 * top for house warming should also show hide the available rooms for
 * love to open at the bottom of the same page"): the optional `onValue`
 * callback announces the SAVED value (the first server read, and each
 * flip read back from the PUT's saved config) so `SiteReadingRoom.tsx`
 * can hide or show the matching row of The rooms card. Nothing about
 * the card's own look or flow changes.
 */
export type PartSwitchKey = "housewarming" | "bookTalk" | "qa" | "replaysAutoSend";

export default function PartSwitchCard({
  switchKey,
  label,
  onWords,
  offWords,
  onNote,
  offNote,
  onValue,
}: {
  switchKey: PartSwitchKey;
  /** the card's heading and the row's bold words, e.g. "Book Talk this week" */
  label: string;
  /** the state line while ON / OFF (also the aria-label's subject) */
  onWords: string;
  offWords: string;
  /** the note after a saved flip to ON / OFF */
  onNote: string;
  offNote: string;
  /** TASK-631: announces the SAVED value (the first read, and every
   *  saved flip), never the optimistic tap */
  onValue?: (key: PartSwitchKey, on: boolean) => void;
}) {
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  /* the double-tap race guard (RoomsCard's T-486 fix): a real ref refuses
     the second tap before it starts. */
  const busyRef = useRef(false);
  /* TASK-631: the latest announce callback, read through a ref so the
     one mount read never re-runs when the parent re-renders. */
  const onValueRef = useRef(onValue);
  useEffect(() => {
    onValueRef.current = onValue;
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/site", { cache: "no-store" });
        const data = res.ok ? await res.json() : null;
        if (!alive || !data?.ok) return;
        /* absent means ON — the exact read every consumer makes */
        const read = (data.config as SiteConfig)[switchKey] !== false;
        setOn(read);
        onValueRef.current?.(switchKey, read);
      } catch {
        /* no switch read, no flip offered — `on` stays null */
      }
    })();
    return () => {
      alive = false;
    };
  }, [switchKey]);

  async function flip() {
    if (on === null || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/admin/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [switchKey]: !on }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        /* read back the SAVED config, never the hoped-for value */
        const saved = (data.config as SiteConfig)[switchKey] !== false;
        setOn(saved);
        onValueRef.current?.(switchKey, saved);
        setNote(saved ? onNote : offNote);
      } else {
        setNote(data?.reason ?? "save failed");
      }
    } catch {
      setNote("save failed");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  if (on === null) return <p className="kit-text-quiet">reading the {label} switch…</p>;
  return (
    <SwitchRow
      on={on}
      label={label}
      quiet={busy ? "saving the switch…" : (note ?? (on ? onWords : offWords))}
      ariaLabel={`${label} - currently ${on ? "on" : "off"}`}
      disabled={busy}
      onFlip={flip}
    />
  );
}
