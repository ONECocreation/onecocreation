# TASK-486 claim

Builder: sonnet sub-agent for Number One
Block: 968,624+ (reading day, ongoing)
Branch: feat/task-486
Worktree: /home/pac/dev/worktrees/task-486
Base: origin/main 8333fe6 (PR #109, T-485's second-moderator cover fix, merged)

GOAL: Love hosts from her iPad/phone and wants links IN AN EMAIL that
take her straight to each room with one tap. Today she must go to
`/a/site/reading`, press Open on a `RoomsCard` row (a PUT to
`/api/admin/<door>`, publish falling back to prepare-then-publish),
then press Join on camera on a room name that changes every time — no
static Jitsi link can ride in an email.

FIX: one page per door, `/a/site/reading/go/[door]`, door ∈
housewarming | stage1 | stage2 | qa. Operator-gated exactly like every
other `/a` room, safe to prefetch (a GET never mutates), ONE button
("Open and join") when closed that runs `RoomsCard.tsx`'s own shared
open logic then sends the SAME TAB to the Jitsi host URL
(`window.location.assign`, never `window.open` — iOS Safari blocks a
popup opened after an `await`); "Join on camera" + "Close this room"
when already open. `RoomsCard.tsx`'s own `DOORS` config and its
publish-then-prepare-fallback open/close chain are REUSED (exported and
called directly), never copied. `/a/site/reading` itself gains a quiet
"Room link" under each row's state line, to its own go page.

## OWNS

- `work-claims/task-486.md` — this file. Committed alone.
- `src/app/a/site/reading/RoomsCard.tsx` — EDIT: `DOORS` moves here
  (exported, was a local const on `SiteReadingRoom.tsx`); the GET read
  and the publish-then-prepare-fallback open/close chain are pulled out
  of the component's own callbacks into exported pure functions
  (`fetchDoorState`, `openDoor`, `closeDoor`) plus a `jitsiRoomUrl`
  helper — every literal call site (`putAction(door.adminPath,
  "publish")` etc.) is unmoved text, only re-homed, so no existing
  behavior changes. `DoorRow` gains a third `<li>` child: a quiet "Room
  link" to `/a/site/reading/go/<door id>`, outside both the words span
  and the `kit-rows-end` two-control cluster.
- `src/app/a/site/reading/SiteReadingRoom.tsx` — EDIT: imports `DOORS`
  from `./RoomsCard` instead of a local copy.
- `src/app/a/site/reading/go/useDoorRoom.ts` — NEW: the single-door hook
  `/go/[door]` uses, built on `RoomsCard.tsx`'s exported
  `fetchDoorState`/`openDoor`/`closeDoor` — never a second copy of the
  fallback chain.
- `src/app/a/site/reading/go/[door]/page.tsx` — NEW: the server gate
  wrapper (same shape as every other `/a` room and as `/a/studio/room/
  [room]/page.tsx`'s nested-dynamic-route precedent). Checks the `door`
  param against `DOORS` first (404 on unknown), then the operator
  cookie (signed out → `OperatorGate` with a `next` back to this exact
  address, hardened through `safeNextPath`, T-442). No fetch of its
  own — SSR only reads a cookie and renders a child.
- `src/app/a/site/reading/go/[door]/GoRoom.tsx` — NEW: `GoRoomBody`
  (pure presentation, every state) + `GoRoom` (default, the hook
  wiring and the open-then-`window.location.assign` click handler).
- `src/components/OperatorGate.tsx` — EDIT: optional `next?: string |
  null` prop, hardened through `safeNextPath` again here
  (belt-and-braces), threaded into the email door's `/login` link only
  — the key-sign paths already return to the current page on their own
  (`window.location.reload()`). Every existing caller (20+ pages) is
  unaffected — the prop defaults to `null`, same href as before.
- `src/app/kit.css` — EDIT: two small scoped rules, `.kit-rooms-card
  .kit-row-link` (the quiet Room link's size/color/spacing) and
  `.kit-go-room-actions` (the go page's own full-width button column) —
  no inline style objects, no per-page CSS.
- `scripts/console-matrix.routes.json` — EDIT (OWNS widened in its own
  commit before touching it): the T-416 HAND-DECLARED `/a` route policy
  — `console-matrix.test.mjs` (the gate's own `scripts/*.test.mjs` loop)
  fails closed on any page under `src/app/a` with no policy row. One row
  added, `{ "route": "/a/site/reading/go/[door]", "siteChrome":
  "render", "signedOut": "gate" }`, plus a one-line `_doc` note that this
  dynamic pattern has no `DYNAMIC_SUBS` fixture substitution yet (an
  unsubstituted pattern row emits DASH cells under T-418's own browser
  walker, documented, never a guess — this lane never touches
  `console-matrix.cjs` itself).
- `tests/rooms-card.test.ts` — EDIT (OWNS widened before touching it,
  same commit as this claim): the new Room link is a row's THIRD `<li>`
  child, so "the same two controls" test's own `controlsIn` helper is
  rescoped to just the `kit-rows-end` span it always meant; a new
  describe block pins the Room link's own href per door.
- `tests/reading-go-door.test.ts` — NEW: the shared open/close functions
  called directly with a mocked fetch (the publish-then-prepare
  fallback, proven unmoved), `GoRoomBody` rendered for every phase (no
  jsdom, this repo runs none), and the route (unknown door 404s, the
  operator gate both ways, GET-only render fetches nothing at all).

## REVIEW FIX (on top of the four commits above, same OWNS, no new files)

THE DOUBLE-TAP RACE: `useDoorRoom.ts`'s `open()`/`close()` were only
guarded by React `busy` state, which is batched — two taps land before
the next render and both slip past `disabled`, both reach `openDoor`,
which can prepare TWO DIFFERENT ROOMS; Love then gets sent to whichever
one lost the race. The same gap sat in `RoomsCard.tsx`'s own row
callbacks.

FIX: `RoomsCard.tsx` gains a shared `runExclusive(lock, fn)` helper (a
plain `{ current: boolean }` in-flight lock — `null` immediately on a
second concurrent call, always released in `finally`) plus a
`recordLock(store, key)` view for a Record-backed ref. `useDoorRoom.ts`
wraps `open`/`close` through it with one `useRef(false)` shared by
both (one door, one lock). `RoomsCard`'s own `open`/`close` wrap through
it too, via a single `useRef<Record<string, boolean>>({})` +
`recordLock` (one lock PER DOOR — two different rows never block each
other, but open+close on the SAME row do). New test:
`tests/reading-go-door.test.ts`'s "TWO CONCURRENT open() CALLS PRODUCE A
SINGLE openDoor CALL" — real `runExclusive` + real `openDoor`, a
deliberately-unresolved mocked `fetch`, proves the second concurrent
call never reaches the network before asserting the count.

## READ-ONLY

Everything else. In particular: `Stage1Card.tsx`/`Stage2Card.tsx` (not
imported by this lane, untouched), every OTHER `OperatorGate` caller
(20+ pages) — the new `next` prop is additive and optional, and
`tests/a-site-rooms-wear-the-gate.test.ts`'s own five-page list is not
widened (this route is a nested dynamic sub-route under `/a/site/
reading`, not one of those five top-level Site rooms).
