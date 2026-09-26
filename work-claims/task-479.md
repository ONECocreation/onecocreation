# TASK-479 claim

Builder: sonnet sub-agent for Number One
Block: 968,624+ (Love's live reading, ongoing)
Branch: feat/task-479
Worktree: /home/pac/dev/worktrees/task-479
Base: feat/task-477 d2ece24 (PR #100, not yet merged; adds `jitsiEmbedOptions()`
and the `guestView` prop to `src/components/booking/JitsiRoom.tsx`)

GOAL: THE ADMIRAL APPROVED the mockup and its wording ("good on the calls.
let's build it.") — on the /reading top screen, when a room is live and
mounted, the book cover (`/images/reading-love-cover.jpg`) stays OVER the
running Jitsi iframe until Love's camera is on. Her mic audio plays
underneath the whole time; the room never unmounts for this.

Read first (both cited in full in the code's own comments):
`~/dev/briefings/walk-968624/t479/FEASIBILITY.md` (the source-cited research)
and `~/dev/briefings/walk-968624/t479/mockup.html` (the approved look).

## OWNS

- `work-claims/task-479.md` — this file. Committed alone.
- `src/components/booking/JitsiRoom.tsx` — EDIT: a pure `hostVideoReducer`
  (+ `HostVideoState`, `HostVideoEvent`, `initialHostVideoState`,
  `hostEventParticipantId`, `HOST_VIDEO_SAFETY_TIMEOUT_MS`), and an opt-in
  `onHostVideo?: (on: boolean) => void` prop wired to five External API
  listeners (`videoConferenceJoined`, `participantJoined`,
  `participantLeft`, `participantRoleChanged`, `participantMuted`) plus a
  20s safety timeout, all gated behind `if (onHostVideo)` — every other
  caller (every mount except /reading's) pays nothing and is unaffected.
  FAIL OPEN throughout (FEASIBILITY.md §6): `videoOn` starts `true` and
  only ever turns `false` on an explicit muted-video signal from the
  identified host (moderator, not the local participant).
- `src/components/reading/ReadingStage.tsx` — EDIT: `ReadingStageBodyProps`
  gains optional `hostVideoOn`/`onHostVideo` (default `hostVideoOn = true`,
  so every existing caller/test renders byte-identical); the `showRoom`
  branch gains ONE overlay (`coverUp = showRoom && !hostVideoOn`): the
  `.kit-stage-media` picks up `kit-stage-waiting kit-stage-waiting--cover`
  when the cover is up, a `.kit-stage-cover` picture layer renders inside
  it alongside the still-mounted `JitsiRoom`, and a slim controls line
  ("Love is here. Her camera comes on in a moment." / "No sound? Tap the
  screen.") renders below. The default export owns `hostVideoOn` state
  (reset to `true` on every fresh `room`) and passes `onHostVideo`.
- `src/components/reading/ReadingStageDoor.tsx` — EDIT: the identical
  pattern, one overlay branch, for Parts 3/4's shared door.
- `src/app/kit.css` — EDIT: ONE new rule, `.kit-stage-cover` (tokens only,
  `position:absolute;inset:0;pointer-events:none`, plus its `>img` fill
  rule) — no `.kit-btn` opt-in sub-rule (unused: this lane ships no button
  inside the cover, see the sound-path note below).
- `tests/host-video-reducer-479.test.ts` — NEW: `hostVideoReducer` pinned
  hard (moderator mutes -> cover, unmutes -> video; unknown/just-joined/
  just-identified-as-moderator -> video; host leaves -> video, safe; a
  non-moderator's events ignored, both before AND after a host is known;
  the moderator being demoted -> video; the 20s safety timeout: a no-op
  when video was already showing, and forces video on an unconfirmed
  cover state even when constructed directly, but NEVER overrides a real,
  confirmed mute signal; `id` vs `participantId` payload keys) plus source
  pins on `JitsiRoom.tsx`'s wiring (listeners present, gated behind
  `if (onHostVideo)`, timeout cleared on unmount).
- `tests/reading-look.test.ts` — EDIT (named add): M2's blanket "no camera
  or microphone words anywhere /reading renders from" law is re-trued to
  scrub out exactly one Admiral-approved sentence
  ("Love is here. Her camera comes on in a moment.") before the check —
  any OTHER, un-approved camera/microphone mention in those files still
  fails this test.
- `tests/reading-stage-cover-479.test.ts` — NEW: the cover markup rendered
  pure (`renderToStaticMarkup`) for both `ReadingStageBody` and
  `ReadingStageDoorBody` — cover present with `hostVideoOn: false` and a
  live room, absent when `true` or unset (byte-identical to before this
  lane), absent when the room itself isn't showing, no fake button, and
  the copy laws (no em dash, no arrows, no emoji).

## Sound path chosen (FEASIBILITY.md §4)

NOT a fake "Tap for sound" button. Detecting a blocked cross-origin
autoplay isn't reliably possible from this page (no postMessage reports a
remote audio autoplay failure — `audioAvailabilityChanged`/
`audioMuteStatusChanged` are LOCAL only), and a real button would
intercept the very tap that's supposed to reach the iframe (the browser's
own autoplay-with-sound heuristic only lifts on a gesture landing INSIDE
the iframe's own document). Built instead: one honest, permanent,
click-through line under the cover text, "No sound? Tap the screen." —
true whether or not sound is actually blocked (never a false "Sound is
on" claim on a state this page can't observe). The line itself sits in
the normal (non-overlapping) controls strip below the media box, same as
the mockup's own markup; the actual click-through mechanism is
`.kit-stage-cover`'s own `pointer-events:none` on the picture layer that
DOES sit over the iframe, letting a tap anywhere on the picture reach the
real Jitsi document underneath.

## READ-ONLY

Everything else. In particular: `ReadingStagePart3.tsx`/`ReadingStagePart4.tsx`
(thin callers of `ReadingStageDoor`, untouched), `JitsiViewer.tsx` (the
retired one-way embed, never touched), the server's `live-config.js`, and
T-481's own territory (splitting the free room into two doors, touching
`ReadingStage*`/`RoomsCard`) — this lane's edits to `ReadingStage.tsx` and
`ReadingStageDoor.tsx` are kept to one minimal, well-contained overlay
branch each so that lane's rebase stays easy.
