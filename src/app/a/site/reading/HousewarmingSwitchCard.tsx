"use client";

import { useEffect, useRef, useState } from "react";
import { Chip, SectionHead } from "@/components/console/glass";
import Card from "@/components/kit/Card";
import type { SiteConfig } from "@/lib/site-config";

/**
 * THE HOUSEWARMING SWITCH (TASK-499, block 969,306+; K126 AMENDMENT 1
 * item 9, the Admiral: "Move the countdown off the housewarming") — one
 * weekly operator flip, persisted as DATA (`housewarming` on the
 * site-config doc, absent means ON), never a code flip. When OFF, the
 * public /reading hides Part 1 (the Housewarming) everywhere a visitor
 * can meet it and the top countdown counts to the reading's own time
 * instead of 12:12; when ON (or never touched) every pixel is today's.
 *
 * Idioms, copied not reinvented: the fetch/PUT shape is
 * ReadingScheduleCard.tsx's own (GET /api/admin/site on mount, PUT a
 * `housewarming` patch to the same endpoint); the ACTION discipline is
 * RoomsCard.tsx's — the flip is IMMEDIATE on tap (tap, PUT, read back the
 * SAVED config, note in words), never a draft-then-Save, and a real ref
 * guards the double-tap race (T-486's lesson). The row wears the /a
 * uniformity law: one state line under the words (busy or the note
 * REPLACES it, never adds), the ON/OFF button plus the state Chip on the
 * same right edge. Zero new style objects, zero literal colors — kit and
 * console classes only (the design-drift and operator-census ratchets
 * count them).
 *
 * Mount: the room's gate page (`./page.tsx`) mounts this card directly
 * below `<SiteReadingRoom />`, behind the same operator gate — never
 * inside SiteReadingRoom.tsx (task-446's stale live claim owns that
 * file; the brief's decision 3).
 */
export default function HousewarmingSwitchCard() {
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  /* the double-tap race guard (RoomsCard's T-486 fix): `busy` state alone
     is batched, so two taps before the next render would both PUT — a
     real ref refuses the second tap before it starts. */
  const busyRef = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/site", { cache: "no-store" });
        const data = res.ok ? await res.json() : null;
        if (!alive || !data?.ok) return;
        /* absent means ON — the exact read every consumer makes */
        setOn((data.config as SiteConfig).housewarming !== false);
      } catch {
        /* no switch read, no flip offered — `on` stays null */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function flip() {
    if (on === null || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/admin/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ housewarming: !on }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        /* read back the SAVED config, never the hoped-for value */
        const saved = (data.config as SiteConfig).housewarming !== false;
        setOn(saved);
        setNote(
          saved
            ? "saved - the week starts with the 12:12 Housewarming on the reading page's next render"
            : "saved - no Housewarming this week; the reading page starts at the Reading on its next render",
        );
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

  return (
    <div className="p-6">
      <SectionHead label="Housewarming this week" />
      {on === null ? (
        <p className="kit-text-quiet">reading the switch…</p>
      ) : (
        <Card>
          <ul className="kit-rows">
            <li>
              <span>
                <b>Housewarming this week</b>
                <em>
                  {busy
                    ? "saving the switch…"
                    : (note ??
                      (on
                        ? "this week starts with the Housewarming at 12:12"
                        : "no Housewarming this week; the day starts at the Reading"))}
                </em>
              </span>
              <span className="kit-rows-end">
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={`Housewarming this week - currently ${on ? "on" : "off"}`}
                  disabled={busy}
                  onClick={flip}
                  className={`btn btn-sm ${on ? "btn-on" : "btn-ghost"}`}
                >
                  {on ? "ON" : "OFF"}
                </button>
                <Chip tone={on ? "green" : "grey"}>{on ? "ON · showing" : "OFF · hidden"}</Chip>
              </span>
            </li>
          </ul>
        </Card>
      )}
    </div>
  );
}
