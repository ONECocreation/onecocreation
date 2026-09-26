# TASK-487 claim

Builder: Claude Opus 5.5, sub-agent for Number One
Block: 968,624+ (reading day, ongoing)
Branch: feat/task-487
Worktree: /home/pac/dev/worktrees/task-487
Base: origin/main 62264bd (PR #111, T-486's blocker fix, merged)

GOAL: the Admiral's ruling (option C, block 968,624). Love runs two
devices — her phone has the admin page open (the room controls), her
iPad is in the Jitsi host call. Her flow per room: open the room; join
as host on the iPad with camera OFF and mic ON (guests see her book
picture, hear her audio); when ready, press a THIRD site button, "Show
my camera" — the picture drops for every guest at once. THE SITE
SWITCH replaces the Jitsi-event guess (TASK-479's `onHostVideo`/
`hostVideoReducer` read) as the authority for the /reading waiting
picture.

Mid-task label correction from the Admiral: the "open, camera shown"
row/page control reads **Pause my camera** (never "Show my picture").
Pressing it puts the waiting picture back for every guest while her mic
keeps playing (a short-break control); afterward the row/page reads
exactly like "open, hidden" again ("Show my camera", "Open. Guests see
your picture and hear your mic.").

BUILD: a `cameraShownAtMs: number | null` flag on all four doors'
lifecycle state (housewarming/stage2/qa via the shared
`door-lifecycle.ts` factory; stage1 hand-kept in its own file) — null =
hidden, a timestamp = shown; resets to null on every fresh mint
(prepare, or the closed→publish convenience path) and on close.
`show-camera`/`hide-camera` operator PUT actions, valid only while
published (409 otherwise). Member routes add `camera: "shown" |
"hidden"` to their envelope, ONLY alongside a genuine (non-null) room
string. The two guest components (`ReadingStage.tsx`, the free/paid
door pair via `ReadingStageDoor.tsx`) stop reading JitsiRoom's
`onHostVideo` signal for the cover (that reducer's CODE stays in
`JitsiRoom.tsx`, unused by these two mounts now) and read the polled
`camera` field instead, defaulting to `false`/hidden (fail CLOSED — the
picture stays on any doubt, a read failure included) — poll cadence
speeds up to ~5s once the room/door is open (was 20s always), still
exactly one poll loop per file. `RoomsCard.tsx`'s rows and the phone
`GoRoom.tsx` page each gain a third control (the camera toggle) beside
Open/Close and "Join as host" (renamed from "Join on camera"
everywhere); state lines collapse to exactly three ("Closed.", "Open.
Guests see your picture and hear your mic.", "Live. Guests see your
camera."), shared between both files via `rooms-config.ts`'s new
`doorStateWords`. `kit.css`'s `.kit-rooms-card` row layout goes
unconditional (controls on their own line under the words, right-
aligned, at every width — was scoped to a narrow `@media` only, which
let three controls squeeze the title at desktop widths).

## OWNS

- `work-claims/task-487.md` — this file. Committed alone.
- `src/lib/door-lifecycle.ts` — EDIT: `DoorState`/`IDLE_DOOR` gain
  `cameraShownAtMs`; `prepare()`/`publish()`'s closed-mint path reset it
  to null; new `showCamera()`/`hideCamera()` on the `DoorLifecycle`
  interface (409-shaped `null` refusal outside `published`, idempotent).
- `src/lib/housewarming-door.ts` / `src/lib/qa-door.ts` / `src/lib/stage2.ts`
  — EDIT: each door's own `*State` interface + `IDLE` gain
  `cameraShownAtMs`; new exported `show<Door>Camera()`/`hide<Door>Camera()`
  wrapping the factory's `showCamera()`/`hideCamera()`.
- `src/lib/stage1.ts` — EDIT: hand-kept (never migrated to the factory,
  same as T-475's own ruling) — `Stage1State`/`IDLE` gain
  `cameraShownAtMs`; `prepareStage1()` resets it to null on a fresh mint;
  new `showStage1Camera()`/`hideStage1Camera()`, hand-written to mirror
  the factory's own logic.
- `src/app/api/admin/housewarming-door/route.ts` / `.../admin/qa-door/route.ts`
  / `.../admin/stage2/route.ts` / `.../admin/stage1/route.ts` — EDIT:
  `stateResponse()` adds `camera: "shown"|"hidden"` (always, closed
  included); PUT gains `show-camera`/`hide-camera` actions, 409 on a
  `null` refusal.
- `src/app/api/housewarming-door/route.ts` / `.../qa-door/route.ts` /
  `.../stage2/route.ts` / `.../stage1/route.ts` — EDIT: the member
  envelope adds `camera` ONLY in the branch that also hands back a real
  (non-null) room string.
- `src/app/a/site/reading/rooms-config.ts` — EDIT: `DoorRowState` gains
  `camera: "shown"|"hidden"` (required); `DoorBusy` gains `"show-camera"
  |"hide-camera"`; new exported `doorStateWords(phase, cameraOn)`, the
  one shared source for the three state lines.
- `src/app/a/site/reading/RoomsCard.tsx` — EDIT: `DoorRow` gains a third
  control (the camera toggle, kit-btn-main "Show my camera" / kit-btn-
  second "Pause my camera"); "Join on camera" renamed "Join as host"
  everywhere; `STATE_WORDS` retired in favor of `rooms-config.ts`'s
  `doorStateWords`; new exported `showCameraDoor`/`hideCameraDoor`
  (same `putAction` shape as `openDoor`/`closeDoor`); the four door
  actions (open/close/show-camera/hide-camera) now share one
  `runDoorAction` helper wrapping `runExclusive` once, not once per
  action.
- `src/app/a/site/reading/go/useDoorRoom.ts` — EDIT: new
  `showCamera()`/`hideCamera()` alongside `open()`/`close()`, sharing the
  SAME lock via a new `runAction` helper; the mount-only fetch becomes a
  10s interval + a window-`focus` listener (Love keeps this page open on
  her phone all day) — still one `refresh()` call site, never a second
  fetch path.
- `src/app/a/site/reading/go/[door]/GoRoom.tsx` — EDIT: the open state
  gains the camera-toggle button between "Join as host" and "Close this
  room"; status words move to `rooms-config.ts`'s shared
  `doorStateWords`.
- `src/components/reading/ReadingStage.tsx` — EDIT: `ReadingStageBodyProps`'s
  `hostVideoOn`/`onHostVideo` retired, replaced by `cameraShown?: boolean`
  (default `false`, fail closed); `onHostVideo` no longer passed to the
  `<JitsiRoom>` mount (commented); the `/api/stage1` poll gains a
  `camera` field read and an adaptive 5s/20s cadence (recursive
  `setTimeout`, still one poll loop); `rejoin()` simplified (no more
  host-video-state reset — nothing stale to clear now that `cameraShown`
  rides the door's own polled truth).
- `src/components/reading/ReadingStageDoor.tsx` — EDIT: the same shape —
  `Wire` gains `camera`, `ReadingStageDoorBodyProps`'s `hostVideoOn`/
  `onHostVideo` retired for `cameraShown?: boolean`, the poll gains the
  same adaptive cadence, `onRejoin` simplified.
- `src/app/kit.css` — EDIT: `.kit-rooms-card .kit-rows>li`'s single-
  column stacking and `.kit-rooms-card .kit-rows-end`'s `justify-self:
  end` move OUT of the narrow `max-width:768px` media query and become
  unconditional (three controls squeeze the title at desktop widths
  too); a few comment updates ("Join on camera" → "Join as host").
- `tests/housewarming-door-state.test.ts` / `tests/qa-door-state.test.ts`
  / `tests/stage2-state.test.ts` / `tests/stage1-state.test.ts` — EDIT:
  `IDLE`/fixture literals gain `cameraShownAtMs: null`; new describe
  blocks for `show<Door>Camera`/`hide<Door>Camera` (409-refusal outside
  published, stamps/clears, idempotent, resets on a fresh mint).
- `tests/admin-housewarming-door-route.test.ts` / `tests/admin-qa-door-route.test.ts`
  / `tests/admin-stage1-route.test.ts` — EDIT: the happy-path `toEqual`
  gains `camera: "hidden"`.
- `tests/stage1-route.test.ts` — EDIT: a second, wider allowlist
  (`ALLOWLIST_WITH_CAMERA`) for the one branch (published + signed in)
  that now also carries `camera`.
- `tests/stage2-route.test.ts` / `tests/stage2-paid-door.test.ts` —
  EDIT: the `decision:"open"` `toEqual` fixtures gain `camera: "hidden"`.
- `tests/rooms-card.test.ts` — EDIT (deliberately re-trued, not
  weakened): fixtures/`bodyProps` gain `camera`/`onShowCamera`/
  `onHideCamera`; "two controls" pins become "three controls"; new
  closed/open-hidden/open-shown describe blocks with the exact new
  labels/lines (including "Pause my camera"); wiring pins updated for
  the shared `runDoorAction` helper; a new kit.css layout pin (the
  unconditional stacking rule).
- `tests/reading-go-door.test.ts` — EDIT: `openDoor`/`closeDoor`/
  `fetchDoorState` fixtures gain `camera`; new `showCameraDoor`/
  `hideCameraDoor` direct-call tests; `useDoorRoom.ts` wiring pins
  updated for the shared `runAction` helper and the 10s/focus refresh;
  `GoRoomBody` render tests re-trued for the three-action open state and
  the exact new labels/lines.
- `tests/reading-stage-cover-479.test.ts` — EDIT (deliberately re-trued):
  every `hostVideoOn` fixture/assertion becomes `cameraShown`; the old
  "unset = fail OPEN" pin becomes "unset = fail CLOSED"; new checks that
  `onHostVideo` is no longer wired from either mount while
  `JitsiRoom.tsx`'s own reducer code stays intact; the old "rejoin resets
  hostVideoOn" pin becomes "rejoin has nothing left to reset".
- `tests/reading-stage-door-473.test.ts` / `tests/reading-stage.test.ts`
  / `tests/reading-love-cover-456.test.ts` — EDIT (deliberately
  re-trued): the "room arrived → cover gone" cases now pass an explicit
  `cameraShown: true` / `camera: "shown"` (the state that actually means
  "Love pressed Show my camera"); a new companion case pins the DEFAULT
  (camera still hidden) — the cover now correctly stays up over the
  mounted, still-listening room.
- `tests/reading-look.test.ts` — EDIT: M2's blanket "no camera/microphone
  word" source scan now also strips block comments and the three exact
  code tokens this lane's own state plumbing needs
  (`cameraShown`/`setCameraShown`, the `Stage1Wire` interface's
  `camera?:` field, the poll handlers' `d.camera` reads) — never a
  blanket word-strip, so a real un-approved rendered mention still
  fails this test.

## READ-ONLY

Everything else, in particular: `JitsiRoom.tsx` (its `hostVideoReducer`/
`onHostVideo` plumbing stays exactly as T-479 left it — this lane only
stops passing `onHostVideo` from the two /reading mounts, never touches
the component itself), `stage2-access.ts`, `qa-entitlement.ts`,
`member-tier.ts`, `reading-day-doors.ts`, every other `/a` room, every
other door/lifecycle caller not named above.

Gates: `~/dev/shortcuts/oc-gate.sh` (must print GATES GREEN) · a real
`npx next build` + `npx next start`, curl `/reading`, `/a/site/reading`,
`/a/site/reading/go/housewarming` for 200s.
