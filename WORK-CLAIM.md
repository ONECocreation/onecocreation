# WORK-CLAIM — TASK-125 (angel times: light up the visitor-zone slots end to end — the API seam T-122 could not own)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.16 a₿ (block 965,941)
BRANCH: `feat/task-125-angel-times-api-seam`
WORKTREE: `~/dev/worktrees/task-125`
BASE: main tip `016fe0b` (includes the merged T-122)
ROOM: T-122 made `slotsFor` take `viewerTz` and the SlotPicker/CartTimePicker already send it —
but every booking route still calls the legacy artist-clock path, so a New York visitor's board
shows 12:10 / 1:11 / 2:12 / 4:22 / 5:33 PM instead of 10:10 / 11:11 / 12:12 / 2:22 / 3:33.
Love (Sept 1, 01:36): "it's the customer's perception." This lane wires `viewerTz` through the
booking API end to end: every owned route reads it (query for GET slots, body for POSTs),
validates with the same `isValidTz` guard, and passes it to `slotsFor(...)` / slot validation,
so a chosen instant is accepted iff it is a sacred minute in the VISITOR's zone within the
artist's window. Missing/invalid tz → legacy artist-clock path, byte-for-byte unchanged.
`visitorTz` is persisted on the booking record at checkout/change/redeem, and `artistTz` +
`visitorTz` join the admin calendar feed + `desk/types.ts` so Love's Desk marks (marks.ts
already reads them) can say "booked at 11:11 America/New_York". Does NOT touch `.env*`,
:3000/:4100 (operator's live processes), the main checkout, or any deployment.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge to main, never push.
ENGLISH-PIN. No new dependencies.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/app/api/bookings/slots/route.ts` (viewerTz query → slotsFor)
- `src/app/api/bookings/checkout/route.ts` (viewerTz body → validation + persist)
- `src/app/api/bookings/[id]/change/route.ts` (viewerTz body → validation + persist on move)
- `src/app/api/cart/route.ts` (viewerTz body → session-line slot validation)
- `src/app/api/gift/redeem/route.ts` (viewerTz body → validation + persist)
- `src/app/api/admin/calendar/route.ts` (feed carries artistTz + visitorTz)
- `src/components/console/desk/types.ts` (BookingChip gains artistTz + visitorTz)
- `src/lib/booking-orders.ts` (the booking record type/store: `visitorTz` on BookingRecord,
  moveBooking re-stamps it on reschedule)
- `tests/booking-api.test.ts` (new — request-level vitest)

Known seam NOT owned (flagged, not edited): `src/app/api/cart/checkout/route.ts` +
`src/lib/cart.ts` — a session line held via the basket becomes a booking there; carrying
`visitorTz` on the cart line into that booking needs CartLine + that route, both outside OWNS.

Brief: `~/dev/kimi/inbox/TASK-125-oc-angel-times-api-seam.md` (cut 0018.06.16 a₿)
Gates: `npx vitest run` ≥23 (23 on main + the new request-level specs) ·
`node scripts/calendar-view.test.mjs && node scripts/cartridge-identity.test.mjs &&
node scripts/square-payments.test.mjs` · `npm run lint` = 0 · `npx tsc --noEmit` ·
`npx next build` · shots: /book as a New York visitor showing 11:11 AM (both clocks) and
Love's Desk mark for that booking, dark + dawn themes (dev server on :3125 only, killed by
recorded PID) → `~/dev/kimi/outbox/task-125/shots/` · SUMMARY.md in `~/dev/kimi/outbox/task-125/`
Questions → Number One.
