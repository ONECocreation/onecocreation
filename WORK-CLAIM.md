# WORK-CLAIM — TASK-150 (/classes: one button per membership package, not two)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.17 a₿ · block 966,019
BRANCH: `feat/task-150-one-button-per-package`
WORKTREE: `~/dev/worktrees/task-150`
BASE: main tip `005ae79` (T-157 seam follow-through merged).
ROOM: From Love's meeting (picture: troubleshooting/onecocreation/calendar
view 1.png) — under THE ROOMS each package paints two cards (Observer ×2,
Evening Star ×2, plus the two "yours" of Weekly Intuitive). Love: one
button per package; the calendar view has "too many buttons on the
bottom". The shelf groups rooms by the tier that opens them — one card per
package (Commons = open to all; Weekly Intuitive = Clair Senses + Daily
Tune-up; Observer = Chronicles + Observers' Circle; Evening Star = Quantum
Healing + Inner Sanctum). The card names the package, lists its rooms as
small lines, and carries ONE door: ENTER (member holds the tier) or SEE
<PACKAGE> (not). Under a class calendar (The Circle vantage) the shelf
shows only that class's package rooms plus the Commons.
Does NOT touch `.env.local`, :3000/:4100 (the operator's live processes),
the live site, the main checkout, any other lane's worktree (T-156 is
simultaneously making COLOR-ONLY edits to `src/app/classes/page.tsx` —
this lane does not edit that file at all), or any deployment. Dev server
on :3142 only, killed by recorded PID.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge
to main, never push, never archive. Never `git stash`. ENGLISH-PIN. No new
dependencies. BFT dating in comments. Love design laws: no serif faces
(house tokens only), contrast ≥ 4.5:1, no color-only meaning.
Derive-or-dash — never a fake link, number or name.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/lib/matrix-rooms.ts` — ADD-ONLY: a package-grouping helper (the one
  allowed exception to read-only)
- `src/components/rooms/RoomsShelf.tsx` — the /classes shelf: one card per
  package, rooms as small lines, one door
- `src/components/rooms/CircleView.tsx` — the room-cards grid under the
  class calendar: only that class's package + the Commons, package cards
- `src/components/rooms/PackageRoomsCard.tsx` (new) — the shared package
  card so both shelves keep one door-shape
- `tests/rooms-shelf.test.ts` (new) — the vitest pins

Brief: `~/dev/kimi/inbox/TASK-150-oc-classes-one-button-per-package.md`
(cut 0018.06.17 a₿)
Gates: `npx vitest run` (grows with the new pins) · ALL
`node scripts/*.test.mjs` (calendar 70, cartridge 183, square-payments 36
hold) · `npm run lint` = 0 · `npx tsc --noEmit` · `npx next build` · shots
both themes × 1440/390: /classes shelf before/after (own dev server :3142,
stopped by recorded listener PID after; harness borrowed per the task-148
outbox idiom, lives in the outbox, not the repo; puppeteer borrowed by
require-path, NEVER a dependency) → `~/dev/kimi/outbox/task-150/shots/` ·
SUMMARY.md in `~/dev/kimi/outbox/task-150/`, ending LANE-DONE + full sha.
Questions → Number One.
