# WORK-CLAIM — TASK-133 (a member's chat message must carry the MEMBER's identity — operator posted, "Love" showed)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.17 a₿ (block 965,952)
BRANCH: `feat/task-133-matrix-identity`
WORKTREE: `~/dev/worktrees/task-133`
BASE: main tip `29e69c6` (T-129 follow-through; T-132's zoom copy sweep runs
in parallel on other files — no collision expected).
ROOM: The Admiral signed in as adminpacman, posted in the Heart Field, and
the room said "Love". Root cause (code-traced, evidence in SUMMARY): the
login route derives the mxid from the fren handle, so handle `adminpacman`
lands on localpart `adminpacman` — THE BOT SEAT's own account
(matrix.ts:64) — and RoomView's TEACHERS set (RoomView.tsx:33) prints any
sender in {adminpacman, love, onecocreation} as "Love ✦" (line 244). One
human = one mxid: the member whose handle collides with the bot seat (and
every operator) gets their OWN derived mxid (npub-derived localpart when
the registry knows the key, else a derived — never the bot's, never the
artist's); Love's account serves Love alone; the bot account stays the bot.
On first login the homeserver display name is set from the member's handle
(PUT …/profile/{mxid}/displayname) ONLY when unset — a name the member set
themselves is never overwritten. RoomView shows the sender's homeserver
display name (fallback localpart) — the TEACHERS guess-label leaves.
Rooms/invites unchanged: roomsForMember by tier still applies and operators
are still invited to every room their tier opens.
Does NOT touch `.env.local`, :3000/:4100 (the operator's live processes),
the live homeserver (stub homeserver only for tests/shots), the main
checkout, or any deployment. Dev server on :3133 only (stub homeserver on
:4133), both killed by recorded PID.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge
to main, never push. ENGLISH-PIN. No new dependencies. BFT dating in
comments. Love design laws: no serif faces, contrast ≥ 4.5:1, no color-only
meaning. Module law: no cross-app imports. Derive-or-dash — never a fake
link, number or name.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/app/api/matrix/login/route.ts` — identity resolution + display-name set-once
- `src/lib/matrix.ts` — `mxidForSubject` + a display-name helper
- `src/lib/fren-auth.ts` — ONLY if the subject resolver itself must move
  (the session/subject resolver the login route reads; flagged in SUMMARY
  if touched beyond that)
- `src/components/rooms/RoomView.tsx` — the sender label ONLY
- `tests/matrix-identity.test.ts` (new) — the vitest pins

Brief: `~/dev/kimi/inbox/TASK-133-oc-matrix-identity.md` (cut 0018.06.16 a₿)
Gates: `npx vitest run` ≥ 41 + the new pins · `node scripts/calendar-view.test.mjs &&
node scripts/cartridge-identity.test.mjs && node scripts/square-payments.test.mjs`
· `npm run lint` = 0 · `npx tsc --noEmit` · `npx next build` · shots: two
sessions in the same room, each message labelled with its own sender, dark +
dawn (own dev server :3133, stub homeserver :4133, stopped by PID after;
harness borrowed from scratch/task-125, lives in the outbox, not the repo)
→ `~/dev/kimi/outbox/task-133/shots/` · SUMMARY.md in
`~/dev/kimi/outbox/task-133/`
Questions → Number One.
