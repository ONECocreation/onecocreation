"use client";

import Card from "@/components/kit/Card";
import QuestionsPanel from "@/components/qa/QuestionsPanel";

/**
 * The Q&A questions room — its OWN room at /a/letters/questions (his round-2
 * mark: "this should not be on the reading page — it belongs under Letters
 * as its own sub-item"; round 3 lists it under Studio, menu placement ONLY,
 * the T-545 precedent). A thin shell over the shared QuestionsPanel (round-3
 * item 1: the SAME list also opens on the host's Q&A go-door page while she
 * is live — one component, two surfaces, no drift).
 *
 * The /a uniformity law kept: one state per row, said once — the row's
 * place (open list vs the answered area) IS the one state voice, so the
 * words line carries only who and when, and the count line says the totals
 * once. The calm console dialect: Card + ul.kit-rows + kit-rows-end, no
 * shimmer; Sheet for the popup (Escape and scrim tap close it).
 */
export default function QuestionsRoom() {
  return (
    <Card>
      <QuestionsPanel />
    </Card>
  );
}
