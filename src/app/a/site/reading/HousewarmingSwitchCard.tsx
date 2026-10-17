"use client";

import PartSwitchCard from "./PartSwitchCard";

/**
 * THE HOUSEWARMING SWITCH (TASK-499, block 969,306+) - one weekly operator
 * flip, persisted as DATA (`housewarming` on the site-config doc, absent
 * means ON). When OFF, the public /reading hides Part 1 everywhere a
 * visitor can meet it and the top countdown counts to the reading's own
 * time instead of 12:12.
 *
 * T-614 round 2: the logic (GET /api/admin/site on mount, an immediate
 * PUT of `{ housewarming }` on tap, read back the SAVED config, a real
 * ref against the double tap) now lives in PartSwitchCard.tsx, shared by
 * the three week switches; this is the Housewarming's own row, drawn by
 * the same SwitchRow as the "Show the next reading time" row above it.
 */
export default function HousewarmingSwitchCard() {
  return (
    <PartSwitchCard
      switchKey="housewarming"
      label="Housewarming this week"
      onWords="this week starts with the Housewarming at 12:12"
      offWords="no Housewarming this week; the day starts at the Reading"
      onNote="saved - the week starts with the 12:12 Housewarming on the reading page's next render"
      offNote="saved - no Housewarming this week; the reading page starts at the Reading on its next render"
    />
  );
}
