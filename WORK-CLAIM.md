# WORK-CLAIM — TASK-131 (compose a letter and send it to the list — all, or one door's people)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.16 a₿ (block 965,946)
BRANCH: `feat/task-131-letters-by-source`
WORKTREE: `~/dev/worktrees/task-131`
BASE: main tip `7154228` (merge T-125; 41/41 vitest baseline on this main).
ROOM: Love writes a NEW letter in the Letters room (beyond the seeded six —
`createLetter({ key, title, audience })`, stored in the same override vault,
`EDITABLE_LETTERS` stays the seeded set) and sends it to the whole list OR to
one door's segment. `listSubscribers({ source? })` filters by the record's
`source`; the send panel on `/a/letters/<key>` shows every segment with LIVE
counts derived from the records (never a hardcoded list), a "Send me a test"
(`testTo`), a "Send to N people" button that demands the count typed back,
the existing schedule `at`, per-member delivery lines via the existing
`recordDelivery`, and the estimated finish when N outruns MAIL_HOURLY_CAP.
Every list mail keeps its per-recipient unsubscribe URL + List-Unsubscribe
headers; an opt-out that lands while a letter waits in the queue kills that
copy at send time (a `subscribed` guard in mail-queue — the spec's "guard if
needed" clause). Segment counts are READ FROM THE RECORDS — no per-source
index, no backfill debt, one source of truth (choice recorded in SUMMARY.md).
Does NOT touch `.env*`, :3000/:4100 (the operator's live processes), the main
checkout, or any deployment. Dev server on :3131 only (a dev-only mock KV on
:4131 for the shots), both killed by recorded PID.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge
to main, never push. ENGLISH-PIN. No new dependencies. BFT dating in
comments. Love design laws: no serif faces, contrast ≥ 4.5:1, no color-only
meaning. Module law: no cross-app imports. Derive-or-dash: a composed letter
gets NO "view on the site" link and NO preview door until the /letters/[key]
+ /news seam (outside OWNS — flagged in SUMMARY.md, not edited) lists
composed letters; never a link that 404s.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/lib/letters.ts` — composed-letter registry beside the seeded set
- `src/lib/subscribers.ts` — `listSubscribers({ source? })` + derived segment counts
- `src/lib/mail-queue.ts` — the `subscribed` send-time guard ONLY
- `src/app/api/admin/letters/route.ts` — GET (seeded + composed + segments) · POST create · PUT widened
- `src/app/api/admin/letters/send/route.ts` — segment send + typed-count confirm + recipients
- `src/app/a/letters/page.tsx` — the room lists composed letters, "New letter" makes one
- `src/app/a/letters/[key]/page.tsx` (new) — the send panel
- `tests/letters-send.test.ts` (new) — the vitest pins

Brief: `~/dev/kimi/inbox/TASK-131-oc-letters-by-source.md` (cut 0018.06.16 a₿)
Gates: `npx vitest run` ≥ 41 and grown · `node scripts/calendar-view.test.mjs &&
node scripts/cartridge-identity.test.mjs && node scripts/square-payments.test.mjs`
· `npm run lint` = 0 · `npx tsc --noEmit` · `npx next build` · shots of the
letters room + the send panel (dev data, labelled) in dark + dawn →
`~/dev/kimi/outbox/task-131/shots/` · SUMMARY.md in `~/dev/kimi/outbox/task-131/`
Questions → Number One.
