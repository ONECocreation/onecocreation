# WORK-CLAIM — TASK-160 (routes follow their switches — NotOpenYet — + Love's Desk roster shows who is online)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.17 a₿ · block 966,055
BRANCH: `feat/task-160-route-gates-roster`
WORKTREE: `~/dev/worktrees/task-160`
BASE: main tip `31a5a10` (T-156 merge).
ROOM: Cut from the T-137 + T-149 reviews. (A) Routes behind feature
switches were never gated at the page level — the nav hides them but a
direct URL still renders. With `community` AND `classes` OFF, /classes
renders the shared `NotOpenYet` panel (T-137) inside the site chrome; same
for /book vs `sessions`; /store vs `store` is said done — verify and pin.
/meditation carries NO feature switch by design (T-129 kept the free
meditation reachable either way; T-137's Community header always-on
invariant depends on it; the welcome-trio gift and the one real popup both
point at it) — flag-and-stop with evidence, no gate. (B) Love's Desk
`RosterPanel.tsx` lists JOINED souls with no online filter — reuse T-149's
exported `soulsOnline`/`isOnline`/`handleOf` so the roster shows who is
here NOW, display names, and an honest "— nobody here yet".
CONCURRENCY: lane T-159 is simultaneously adding a Puck-first publish read
to `src/app/classes/page.tsx` and `src/app/book/page.tsx`. The contract:
early-return ORDER is (1) switch gate → NotOpenYet (THIS lane, at the very
top), (2) Puck-first read → Render (theirs), (3) hand-built fallback. The
gate branch stays minimal and clearly delimited at the top; no surrounding
restructure.
Does NOT touch `.env.local`, :3000/:4100 (the operator's live processes),
the live site/vault, the main checkout, any other lane's worktree (T-159
included), or any deployment. Dev server on :3147 only, killed by recorded
listener PID (`ss -tlnp`).
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge
to main, never push, never archive. Never `git stash` (shared across
worktrees). ENGLISH-PIN. No new dependencies. BFT dating in comments. Love
design laws: no serif faces (house tokens only), contrast ≥ 4.5:1, no
color-only meaning. Derive-or-dash — never a fake link, number or name.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/app/classes/page.tsx` — GATE BRANCH ONLY, at the very top: both
  `community` and `classes` OFF → NotOpenYet inside the site chrome
- `src/app/book/page.tsx` — GATE BRANCH ONLY, at the very top: `sessions`
  OFF → NotOpenYet (before the data reads, per the T-159 order contract)
- `src/components/console/desk/RosterPanel.tsx` — online-only roster via
  T-149's `soulsOnline`, display names, "— nobody here yet"
- `tests/route-gates.test.ts` (new) — the vitest pins (both halves)
- FORCED EDITS (OWNS exit 2, one-line justifications in SUMMARY.md):
  `src/lib/matrix.ts` (`roomRoster` gains an additive, capped presence
  batch on the bot's own token — the desk's only presence path; the
  panel's filter is dead code without it) and
  `src/app/api/admin/classroom/roster/route.ts` (pass the joined/presence
  maps through in single-room mode).

Brief: `~/dev/kimi/inbox/TASK-160-oc-route-gates-and-roster-online.md`
(cut 0018.06.17 a₿)
Gates: `npx vitest run` (grows with the new pins) · ALL
`node scripts/*.test.mjs` (calendar 70, cartridge 183, square-payments 36
hold) · `npm run lint` = 0 · `npx tsc --noEmit` · `npx next build` · shots:
/classes with both switches OFF (fixture) both themes, the roster
before/after (own dev server :3147, stopped by recorded listener PID
after; harness borrowed per the task-148 outbox idiom — shoot.cjs +
run-shots.sh, puppeteer by require-path, NEVER a dependency) →
`~/dev/kimi/outbox/task-160/shots/` · SUMMARY.md in
`~/dev/kimi/outbox/task-160/`, ending LANE-DONE + full sha.
Questions → Number One.
