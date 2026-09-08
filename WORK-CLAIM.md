# WORK-CLAIM — TASK-137 (the menu Love can shape — Community header, store-linked sections follow the store switch, per-rail meeting fields, a nav editor)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.17 a₿ · block 966,016
BRANCH: `feat/task-137-nav-editor-kimi`
WORKTREE: `~/dev/worktrees/task-137-kimi`
BASE: main tip `2facbac` (T-134/135/136/138/145/146/147/148 all merged —
the wave this spec says to run after has landed).
TAKEOVER: this lane is taken over from the home (sonnet) crew, whose
attempt stalled mid-build. Their partial work sits UNCOMMITTED in
`~/dev/worktrees/task-137` (branch feat/task-137-nav-and-switches, claim
aa5d937, base 1b828d0) — read as reference, ported/rewritten here onto the
current main, credited in SUMMARY.md. That worktree is their claim and is
NOT touched by this lane (no modify, no commit, no clean).
ROOM: The Admiral — "Community header, under that News, Letters and the
Free meditation (they show under Support today). If I turn the store off
the guided affirmations should be gone too. The /a/site meeting fields
don't change per rail. We are missing the ability to configure the
navigation: rename, choose what pages sit under each header. The user
shouldn't need an AI to set this up — this is our gift to the people."
Plus Love's meeting (RESUME NOTE): under the Store header, two buttons —
Meditations and Memberships; Store OFF still hides the whole header.
Does NOT touch `.env.local`, the operator's live processes (:3000/:4100),
the live site, the vault, the main checkout, `~/dev/worktrees/task-137`
(the home lane's preserved claim), or any deployment. Dev server on :3141
only, killed by recorded PID.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. If main
moves while I work, `git merge main` before final gates. Never merge to
main, never push, never archive. ENGLISH-PIN. No new dependencies. BFT
dating in comments. Love design laws: no serif faces (house tokens only),
contrast ≥ 4.5:1, no color-only meaning. Derive-or-dash — never a fake
link, number or name. Module law.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/lib/site-config.ts` — ADD `nav` + per-rail meeting fields
  (`meeting.vdoRoomPrefix`, `meeting.staticUrl`), sanitize + defaults
- `src/components/NavMenu.tsx` — Community becomes a header (News & letters
  when news ON, Free meditation always, 11:11 Live with Love always,
  Classes & rooms when classes ON; rooms pages follow the community
  switch), Support keeps only Support, Store header gains the Meditations +
  Memberships buttons (Love's meeting), `buildMenu(config)` = nav config
  else default, then the switch filter; PAGE_CATALOG for the page picker
- `src/components/console/NavEditor.tsx` (NEW) — the "Menu" section inside
  /a/site: rename inline, up/down reorder (no drag lib), page picker of
  real routes, remove, nest one level, "hidden by the <name> switch"
  grey-out, Reset to default
- `src/components/NotOpenYet.tsx` (NEW, per spec §2 "build the shared
  NotOpenYet panel here") — the quiet panel for an OFF route
- `src/components/sections.tsx` — Affirmations() ONLY: gated on
  `features.store`
- `src/app/store/page.tsx` — the OFF-state quiet panel ONLY (T-148's card
  rewiring is not touched)
- `src/app/a/site/page.tsx` — per-rail meeting fields (jitsi domain + note,
  vdo room prefix + note, static standing-link URL with allowStaticLinks
  folded in) + the Menu section
- `src/app/api/admin/site/route.ts` — carries the nav/meeting patch through
  (pass-through; change lives in site-config.ts if any)
- `src/app/a/booking/page.tsx` — new-service rail defaults read the
  per-rail fields
- `src/app/meet/[bookingId]/page.tsx` — the static rail falls back to the
  site-wide standing link
- `tests/nav-config.test.ts` (new) — the vitest pins
- `tests/site-config.test.ts` — MINIMAL-FORCED-EDIT (OWNS exit 2): two
  assertions pin the OLD "meditation/news fall under Support" shape this
  task was cut to remove; updating them is load-bearing for the lane's own
  vitest gate. One line of justification rides the edit.

Brief: `~/dev/kimi/inbox/TASK-137-oc-nav-and-switches-2.md` (cut
0018.06.16 a₿, RESUME NOTE 0018.06.17 a₿)
Gates: `npx vitest run` (main baseline 138 + this lane's pins → grows) ·
ALL `node scripts/*.test.mjs` (calendar 70, cartridge 183,
square-payments 36 hold) · `npm run lint` = 0 · `npx tsc --noEmit` ·
`npx next build` · shots both themes × 1440/390: /a/site Menu editor
(default + after rename+nest), the resulting public nav, the meeting
fields per rail (own dev server :3141, stopped by PID after; harness
borrowed per the task-148 outbox examples, lives in the outbox, not the
repo; puppeteer borrowed by require-path, NEVER a dependency)
→ `~/dev/kimi/outbox/task-137/shots/` · SUMMARY.md in
`~/dev/kimi/outbox/task-137/`, ending LANE-DONE + full sha.
Questions → Number One.
