# WORK-CLAIM — TASK-122 (angel-number slots in the VISITOR's timezone)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.16 a₿ · block 965887
BRANCH: `feat/task-122-angel-times-visitor-tz`
WORKTREE: `~/dev/worktrees/task-122`
BASE: main tip `642d488` (local main may run ahead of origin — the house merges locally, this lane never pushes)
ROOM: THE FIVE SACRED TIMES (10:10 · 11:11 · 12:12 · 2:22 · 3:33) materialize on the ARTIST's clock and the surface renders them in the visitor's zone — a New York visitor sees 13:11. Love: the visitor SEES 11:11; her own calendar receives whatever that is on her clock. `slotsFor` gains a `viewerTz` opt (visitor wall-clock materialization, artist availability window still gates, old artist-clock path stays the default so existing callers/tests pass until switched); SlotPicker passes its detected/switchable zone into the slot fetch and shows both clocks on a slot; the other pickers are audited to the same default-to-browser + same generator; Love's Desk marks take the artist zone from the booking's own `artistTz` (one source) and render the visitor's zone on each booking mark when the feed carries it. Does NOT touch `.env*`, package.json / lockfile, :3000/:4100, or any deployment. The API routes that re-run `slotsFor` for validation (`/api/bookings/slots`, `/api/bookings/checkout`, `/api/bookings/[id]/change`, `/api/cart`, `/api/gift/redeem`) and the desk feed (`/api/admin/calendar`, desk `types.ts`) are OUTSIDE this lane's OWNS — they stay untouched; the exact switch edits are flagged to the operator in the SUMMARY.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge to main, never push. ENGLISH-PIN. BFT dating in comments. Love design laws: no serif faces, contrast ≥ 4.5:1, no color-only meaning. Module law: no cross-app imports.

Files this lane touches (OWNS per the brief):
- `WORK-CLAIM.md` (this claim)
- `src/lib/booking-time.ts` — `slotsFor` viewerTz path
- `tests/booking-time.test.ts` (new) — NY visitor, March DST edge, window gating, legacy default
- `src/components/booking/SlotPicker.tsx` — viewerTz into the fetch, both clocks on a slot
- `src/components/store/CartTimePicker.tsx` — same default-to-browser + same generator
- `src/components/console/desk/marks.ts` — artistTz one source, visitor zone on the mark
- `src/app/book/**`, `src/app/retreats/page.tsx` — audit only unless a picker lives there

Brief: `~/dev/kimi/inbox/TASK-122-oc-angel-times-visitor-tz.md` (cut 0018.06.16 a₿)
Gates: `npx vitest run` 17/17+ · `node scripts/calendar-view.test.mjs && node scripts/cartridge-identity.test.mjs && node scripts/square-payments.test.mjs` · `npm run lint` = 0 · `npx tsc --noEmit` · `npx next build` · shots of every changed surface in dark + dawn (own dev server on :3122, stopped by PID after) → `~/dev/kimi/outbox/task-122/shots/` · SUMMARY in `~/dev/kimi/outbox/task-122/`
Questions → Number One.
