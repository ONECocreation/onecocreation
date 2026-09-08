# WORK-CLAIM — TASK-149 (the classroom opens on the STAGE — Stage first + default, chat under the video, "who's here" = online only)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.17 a₿ · block 966,016
BRANCH: `feat/task-149-classroom-stage-first`
WORKTREE: `~/dev/worktrees/task-149`
BASE: main tip `2facbac` (T-148 store-card flips merged; T-146's live Jitsi
stage embed and T-133's Matrix identity work are in the base and are built
on, not rebuilt).
ROOM: From Love's meeting — the classroom should open on the STAGE (first
tab + default vantage, for class rooms AND the reading room), WHO'S HERE
should show online users only as aligned display-name chips (raw mxids
"look like trash"), and there should be a chat box under the video. Stage
rides the already-wired T-146 live embed (jitsiDomain/liveRoom props), the
chat is the room's EXISTING Matrix chat (what SanctuaryView renders —
RoomView — never a second chat), and presence is honest: online or
last-seen ≤ 5 min, display names never mxids (a keyed member with no
display name shows the handle), derive-or-dash "— nobody here yet".
Does NOT touch `.env.local`, :3000/:4100 (the operator's live processes),
the live site/vault, the main checkout, `~/dev/worktrees/task-137` or
`~/dev/worktrees/task-137-kimi` (other lanes' live claims), or any
deployment. Dev server on :3140 only, killed by recorded PID.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge
to main, never push, never archive. ENGLISH-PIN. No new dependencies. BFT
dating in comments. Love design laws: no serif faces (house tokens only),
contrast ≥ 4.5:1, no color-only meaning. Derive-or-dash — never a fake
link, number or name.

OWNS (spec):
- `src/components/rooms/ClassroomView.tsx` — vantage order + default wiring
- `src/components/rooms/StageView.tsx` — Stage layout: live embed on top,
  the room's chat directly under, who's-here right rail / below on 390
- `src/components/rooms/vantage.ts` — default vantage = Stage
- `src/components/rooms/RoomPresence.tsx` — online-only + display names +
  the T-133 duplicate-key fix
- `src/components/rooms/StageChat.tsx` (NEW) — REUSES the room's existing
  Matrix chat component (RoomView), never a second chat
- `tests/classroom-stage.test.ts` (new) — the vitest pins

Brief: `~/dev/kimi/inbox/TASK-149-oc-classroom-stage-first.md` (cut
0018.06.17 a₿)
Gates: `npx vitest run` (main baseline 138 → grows) · ALL
`node scripts/*.test.mjs` (calendar 70, cartridge 183, square-payments 36
hold) · `npm run lint` = 0 · `npx tsc --noEmit` · `npx next build` · shots
both themes × 1440/390: Stage vantage lit + dark stage, People chips
before/after (own dev server :3140, stopped by PID after; harness borrowed
per the task-148 outbox examples, lives in the outbox, not the repo;
puppeteer borrowed by require-path, NEVER a dependency)
→ `~/dev/kimi/outbox/task-149/shots/` · SUMMARY.md in
`~/dev/kimi/outbox/task-149/`, ending LANE-DONE + full sha.
Questions → Number One.
