# WORK-CLAIM — TASK-156 (commons colors + the free reading path + the first sign-in welcome)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.17 a₿ · block 966,019
BRANCH: `feat/task-156-commons-colors-free-reading`
WORKTREE: `~/dev/worktrees/task-156`
BASE: main tip `005ae79` (T-157 seam merged).
ROOM: From Love's meeting — on /classes Heart Field Commons: "classes &
community" goes PINK, the words "Heart Field Commons" go TEAL; the free
reading area: "click → they log in → a link takes them to the reading
area"; "if they login they get the newsletter, and a welcome, free
meditation". The Read with Love door (the wild-card on home's Three Doors
and /support) stops being an email form that posts the room link by
letter and becomes a door: click → the sign-in card with
`?next=/rooms/weekly-reading` carried through → after sign-in the member
lands IN the reading room (the Stage is already the site-wide default
vantage, TASK-149). FIRST email sign-in only (a SET NX marker in the
vault, idempotent — never on repeat sign-ins): subscribe with source
`welcome`, queue the `welcome` letter (new seeded registry key, plain
honest placeholder Love edits in /a/letters), and the free meditation
("Unzip Into the New You" — the house's one free item; no store catalog
entry is marked free, so the grant rides the existing lead-magnet letter
that delivers the mp3 — derive-or-dash honored: the item exists, no grant
rail does).
Does NOT touch `.env.local`, :3000/:4100 (the operator's live processes),
the live site, the main checkout, any other lane's worktree, or any
deployment. Dev server on :3145 only, killed by recorded PID.
CONCURRENCY: lane T-150 is restructuring the rooms shelf rendered on
src/app/classes/page.tsx — this lane's edits there are STRICTLY the two
color token swaps; flagged in SUMMARY ## Seams.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge
to main, never push, never archive. Never `git stash`. ENGLISH-PIN. No new
dependencies. BFT dating in comments. Love design laws: no serif faces,
contrast ≥ 4.5:1, no color-only meaning. Derive-or-dash — never a fake
link, number or name.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/app/classes/page.tsx` — the two color token swaps ONLY
- `src/components/ReadWithLove.tsx` — the free-reading door (email form
  retires; the card becomes the door into sign-in with `?next=`, or
  straight into the room when already signed in)
- `src/components/LoginPanel.tsx` — the sign-in card: `?next=` carried
  through the key and claim success walks
- `src/components/EmailDoor.tsx` — the email door's success walk honors
  `?next=` (validated, same-origin paths only)
- `src/lib/next-path.ts` (new) — the `next` validator, pinned by test
- `src/app/api/auth/email/verify/route.ts` — the sign-in success hook:
  source `welcome`, FIRST-sign-in gifts behind the NX marker
- `src/lib/email-auth.ts` — MINIMAL FORCED EDIT (the spec's OWNS names
  `src/lib/session*`; the house's sign-in lib is this file): the
  `claimFirstSignIn` SET NX marker the hook's "first only, idempotent"
  law needs. Declared in SUMMARY.
- `src/lib/lead-magnet.ts` — MINIMAL FORCED EDIT (the welcome letters'
  one home): `enqueueWelcomeLetter` beside `enqueueDayTwoWelcome`.
  Declared in SUMMARY.
- `src/lib/letters.ts` — the `welcome` seeded registry key + default
  audience + placeholder default copy
- `tests/free-reading-path.test.ts` (new) — the vitest pins
- `src/app/rooms/[slug]/page.tsx` — OWNED for the post-login redirect
  target only; expected UNTOUCHED (Stage is already the default vantage)

Brief: `~/dev/kimi/inbox/TASK-156-oc-commons-colors-and-free-reading-path.md`
(cut 0018.06.17 a₿)
Gates: `npx vitest run` (grows with tests/free-reading-path.test.ts, all
green) · ALL `node scripts/*.test.mjs` (calendar 70, cartridge 183,
square-payments 36 hold) · `npm run lint` = 0 · `npx tsc --noEmit` ·
`npx next build` · shots both themes × 1440/390: commons colors; the path
in three (door → sign-in card → room) (own dev server :3145, stopped by
PID after; harness borrowed from ~/dev/kimi/outbox/task-148/shots/,
lives in the outbox, not the repo; puppeteer borrowed by require-path,
NEVER a dependency) → `~/dev/kimi/outbox/task-156/shots/` · SUMMARY.md in
`~/dev/kimi/outbox/task-156/`, ending LANE-DONE + full sha.
Questions → Number One.
