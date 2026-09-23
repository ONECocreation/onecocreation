# work-claims/task-439.md — task-439 (ONE Cocreation: Stage 2 opens for paid members only, closes itself at midnight Mountain)

Lane: builder K117 (Ms. Kimi's dispatch), under Number One's gate. Base = onecocreation main
**e1840cd8a85dcc2e948ea054747e4ce79a8f4665** (`git rev-parse HEAD` on this worktree matched
this sha exactly before any commit — the branch was cut at the tip). Branch
`feat/task-439-stage2-paid-door`. Worktree `~/dev/worktrees/task-439`, `npm ci` already done.
Lane ports **4806–4809**. Brief: `~/dev/kimi/inbox/TASK-439-oc-stage2-paid-door.md` (read
whole, Amendment 1 of block 968,222 included; tail re-read before the first edit and again
before the gate run, per house law). Claimed at block **968,222** (house beacon, fresh read).

**What this lane builds.** Stage 2 (the after-reading Jitsi) stops issuing its room to every
signed-in member and starts issuing it to tier A and above only (the Admiral's ruling 1,
block 968,218 — "any paid package", Weekly Intuitive the base). One decision point,
`src/lib/stage2-access.ts` (`STAGE2_MIN_TIER = "A"`, the only place the minimum is written),
reusing `roomGate` — never re-implemented. The gate sits in `src/app/api/stage2/route.ts`
BEFORE the Jitsi reachability probe and any room disclosure: a free member's answer carries
`decision: "package"`, no `room` key, no `reachable` key, and the probe never fires. Status
200 for every decision (a polled status read, not an entry attempt — house precedent reserves
401 for the operator console; recorded in REGISTER, security critic finding 9).
`tierForSubject` is called inside a `try`; a throw returns 503 `membership check failed`,
no room, no probe (finding 7).

**The midnight close (ruling 4).** `Stage2State` gains `publishedAtMs`; a new pure
`stage2Expired(state, nowMs)` compares America/Denver CALENDAR dates (`zonedDateParts` +
`DEFAULT_TZ` from `booking-time.ts`, no second zone literal). `getStage2State(nowMs =
Date.now())` fails closed to IDLE on an expired state, so after Denver midnight every reader
sees `closed` and the next `prepareStage2()`/`publishStage2()` mints a FRESH room — a Friday
room can never be re-used on Saturday (finding 3, closed in code, in `getStage2State`, not
in the routes). Routes never take `nowMs` from a request.

**Amendment 1 (block 968,222), folded.** `stage2PackageDoor()` is async and also returns
`week: { itemId, price } | null` — present only when the tier-A page's `oneTime.itemId` is a
LIVE store item with a fiat price (`dollars()` of the store's own number, sale-aware; a throw
from `getItem` yields `week: null` and the door still stands). The door's package state then
carries a second kit button, **"Try one week — $price"**, repeating `AddTierButton`'s ten-line
fetch on kit buttons (never importing it — it renders legacy gold). One-condition fix on
`packages/[slug]/page.tsx:202`: the "or $11 — one week" line shows only when the pill can
(`page.oneTime && oneTimeLive`).

**The two watch items (K117, proven by test, not assertion).**
1. Expired stored `prepared` doc + `prepareStage2()` ⇒ a NEW room, different from the stored
   one (stage2-state.test.ts, red against the old code first).
2. A free member's `/api/stage2` answer carries no `room` key AND the fake fetch counts ZERO
   HEAD requests (stage2-paid-door.test.ts) — "room is null" is not accepted as proof.

**Reviews.** Slop AND security reviews gate the hand-back (the lane changes who gets a room).
The security review answers findings 2, 3, 6, 7, 8, 9 in one line each. REGISTER.md rides in
the outbox with the 200-not-403 reasoning and the lane's honest friction.

**Honestly not in this lane (per the brief).** The forwarded-Jitsi-link risk is accepted
(ruling 2, said in the PR); "paid" = tier ≥ A including operator-comped grants — the data has
no paid-vs-comp field (finding 8, said in the PR); mounting this door on `/reading` is T-438;
the week item's `digital → package` + `hidden → live` fix is the Admiral's data step in
`/a/store`, not code.
