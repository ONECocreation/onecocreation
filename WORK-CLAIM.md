# WORK-CLAIM — TASK-162 (the Community door — what it needs before it opens, and the flip)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.17 a₿ · block 966,080
BRANCH: `feat/task-162-community-door`
WORKTREE: `~/dev/worktrees/task-162`
BASE: main tip `c861319` (T-161 seam 1 landed — the /a/site page carries the
Videos on About card; this lane's card sits in the same neighbourhood).
ROOM: `features.community` is OFF (H58) and nobody can say from the site
what is still missing before Love flips the switch. BUILD: (1) NEW
`src/lib/community-readiness.ts` — five probes, each live-or-dash, never
invented, GET only, no secrets echoed: the Matrix homeserver answers
(`/_matrix/client/versions`) · the house's Matrix identity on Love's
homeserver resolves (whoami on the bot seat — the T-133 identity) · ≥1
room in `rooms` is live (resolves on the homeserver's directory) · the
meeting rail domain answers · the first-sign-in welcome letter (T-156)
exists. Rows {name, state: ok|missing|unknown, words}. (2) A "Community
door" card on /a/site beside the switches: the rows in plain words + the
community switch itself with the rule "flip when every row is ok" AS WORDS
— never a hard block, her call. (3) Switch-ON verification: with a fixture
doc the Commons page renders the real rooms list, no NotOpenYet, and a
room the homeserver says doesn't exist wears "opens soon" on its card
(derive-or-dash: an unanswered probe says nothing, never invents).
The header Community link (T-137 invariant) and the T-160 gate stay.
Does NOT touch `.env.local`, the operator's live processes/ports, the
live site/vault, the live homeserver (GET probes only — no Matrix writes),
the main checkout, the concurrent task-167 worktree (a/money Cards card —
disjoint files), or any deployment. Dev server on :3158 only, killed by
recorded listener PID (`ss -tlnp`).
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates with BFT
stamps. Never merge to main, never push, never archive. Never `git stash`
(shared across worktrees). ENGLISH-PIN. No new dependencies. BFT dating in
comments. Love design laws: no serif faces (house tokens only), contrast
≥ 4.5:1, no color-only meaning. Derive-or-dash — never a fake link, number
or name.

Files this lane touches (the spec's OWNS list, plus the forced additions
flagged below):
- `WORK-CLAIM.md` (this claim)
- `src/lib/community-readiness.ts` (NEW) — the five probes
- `src/components/console/CommunityDoorCard.tsx` (NEW) — the card
- `src/app/a/site/page.tsx` — ONE card dropped beside the switches
- `tests/community-readiness.test.ts` (NEW) — the vitest pins
- FORCED ADDITIONS (OWNS exit 2, one-line justifications in SUMMARY.md):
  NEW `src/app/api/admin/community-readiness/route.ts` (the card is a
  client component — the probes are server-side; without an operator-gated
  GET door the card's rows could only be invented) and, for the spec's
  part (3) "a non-live room's card says opens soon",
  `src/app/api/matrix/rooms/route.ts` (the feed gains a per-room live
  marker from the homeserver's directory answers) +
  `src/components/rooms/PackageRoomsCard.tsx` (a room the server says is
  NOT there wears "— opens soon"; an unanswered probe adds nothing).
  `src/app/classes/page.tsx` is NOT touched unless the ON path itself
  proves broken (the T-160 gate already opens on either switch).
  SPEC DISCREPANCY flagged in SUMMARY.md: the brief's "(the /a/site meet
  probe already exists — reuse it)" — no meet probe exists anywhere in the
  tree (searched); the meeting-domain probe is written fresh here on the
  mempool-status idiom (operator-gated, honest fetch, bounded timeout).

Brief: `~/dev/kimi/inbox/TASK-162-oc-community-door-readiness.md`
(cut 0018.06.17 a₿ · block 966073)
Gates: `npx vitest run` (base 304 at c861319, must grow — the readiness
rows from fixture probes: all-ok / one-missing / unreachable→unknown, the
card's words) · `npm run lint` = 0/0 · `npx tsc --noEmit` ·
`npx next build` · `node scripts/*.test.mjs` (calendar 70, cartridge 183,
square-payments 36) · shots: the card with rows in three states
(fixtures), /classes with the switch ON, both themes, 1440 + 390 (harness
per the task-148 outbox idiom — shoot.cjs + run-shots.sh, puppeteer by
require-path, never a dependency) → `~/dev/kimi/outbox/task-162/shots/` ·
SUMMARY.md in `~/dev/kimi/outbox/task-162/`, ending LANE-DONE + full sha.
Questions → Number One.
