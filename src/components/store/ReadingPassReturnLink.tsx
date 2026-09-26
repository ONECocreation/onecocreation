/**
 * THE READING DAY'S OWN PASS RETURN (TASK-473, block 968,624; fix round,
 * same block, item 5 — extracted so this can be tested by RENDERING it,
 * not by pinning `OrderStatus.tsx`'s own source text). NARROWED per the
 * brief's own words: "do a 'Back to the reading' link on the order page
 * when the order contains weekly-one-week or the Q&A pass" — a fixed,
 * same-origin path, never built from any request/query/order field (no
 * open-redirect surface exists here). Design-drift ratchet (tests/
 * design-drift.ceilings.json): no new inline style, the same centered
 * inline-block `.kit-btn` pattern the order page already uses.
 */
export default function ReadingPassReturnLink({
  settledFine,
  boughtReadingPass,
}: {
  settledFine: boolean;
  boughtReadingPass: boolean;
}) {
  if (!settledFine || !boughtReadingPass) return null;
  return (
    <p>
      <a href="/reading#stage" className="kit-btn kit-btn-main kit-btn-sm">
        Back to the reading
      </a>
    </p>
  );
}
