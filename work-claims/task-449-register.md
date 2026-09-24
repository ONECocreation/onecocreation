# TASK-449 register

Base: cae2548d5fb6d5431e61194094c1c104861007e6
Code/pins revision: 9fb7a6632ea7268be84cf14fb9a1e0da59d1a563
Builder: Ms. Kimi's crew
Block: 968369 (register)

## AMENDMENT 1 conformance

Every visible "encore" became "the Playground" (capital P) with the ONE
exception the amendment names: the banner's h2 stays "Want an encore?".
Route is /reading/playground only — no /reading/encore page and no
redirect (it never shipped). Sign-in return is
?next=%2Freading%2Fplayground. Stage 2 internals keep their names
(/api/stage2, src/lib/stage2-access.ts, STAGE2_MIN_TIER, Stage2Door,
Stage2Details, .kit-stage2-card); the branch name and the brief filename
stay. Metadata title carries "The Playground with Love". The menu line
reads "The Playground · open now".

## Deviations (each an OWNS widening or a brief-vs-code mismatch, named)

1. src/components/booking/JitsiRoom.tsx (brief: read-only). Added one
   optional prop `onEnded?: () => void`, fired from the two existing
   farewell listeners (readyToClose / videoConferenceLeft) and added to
   the effect deps. The brief's anchor "JitsiRoom's onEnded" does not
   exist at base — Stage2Door.tsx:41-42 documents the gap. K124's
   mandated "left while still open" state needs the signal and no other
   honest source exists. Additive only: every existing consumer
   (BookingRoom, Stage2Door) is byte-identical in behaviour; tests
   pin that neither consumer passes onEnded.

2. Stage2Details.tsx gained a NEW named export `Stage2Rows` (the rows
   without the card header). The Playground page's compose() draws the
   rows directly under each gate card's own heading; passing the full
   card per the brief's Build-3 wiring would double the headers. The
   default export keeps its header and renders `<StageRows/>` internally,
   so its byte-shape is preserved; no page consumes the default export
   after the /reading retirement (named here for the record).

3. tests/reading-look.test.ts (brief never named it). Four pins at base
   referenced the retired wiring: the /reading page's Stage2Details
   import/stage2Details prop, the in-file week-pass derivation
   (getItem("weekly-one-week")/dollars), and the unlinked Stage2Details
   rows. Rewritten honestly to pin the new wiring: `@/lib/week-pass` +
   `deriveWeekPass()` on the page, no Stage2Details import on the page,
   rows rendered as `<b><a href="/packages/{slug}">{name}</a></b>` and
   the week line ending "the Playground included.". No unrelated pin
   touched.

4. DESIGN_DRIFT_WRITE=1 deliberately NOT run. The two new files pass
   under the built-in new-file allowance (0/0/0 styleBlocks/colours/fonts
   in both). Running WRITE=1 would ratchet unrelated ceilings down; the
   design-drift test passes as-is in the full suite (223 files green).

5. Decision B ships as the lean: ONE phone media rule
   `.kit-stage-media--playground { aspect-ratio: 3/4 }` under 640px, no
   desktop rule — the stage-media default already matches the mock at
   desktop widths.

## Wrong anchors in the brief (with corrections)

- "JitsiRoom's onEnded" — no such prop at cae2548. Corrected by the
  additive prop above (deviation 1).
- Build 3's island wiring `stage2Details={<Stage2Details .../>}` —
  replaced by `stage2Rows={<Stage2Rows weekPass={weekPass}/>}` for mock
  fidelity (deviation 2).
- The brief's test list omitted tests/reading-look.test.ts, whose pins
  the retirement breaks. First full gate run caught it red (4 tests);
  pins updated (deviation 3).

## Rule-9 discharge

`grep -n "input\|<form\|kit-field"` over
src/components/reading/playground/PlaygroundIsland.tsx,
src/app/reading/playground/page.tsx,
src/components/reading/ReadingStage.tsx and
src/components/door/DoorButton.tsx exits 1 — no field exists anywhere in
the lane, so no field+button row exists in any of the five states.
scripts/oc-row-align.cjs is therefore conditionally discharged for this
lane; not run.

## Named decisions honoured

D: deriveWeekPass moved verbatim into src/lib/week-pass.ts; /reading's
page imports it; the local copy is gone. F: JitsiViewer.tsx untouched —
readingViewerName lives in src/lib/session-read.ts (ported verbatim from
179fce8 with its one-line docblock) and is consumed only by the
Playground island. G: the banner has no idle motion and no click effect.

## What changed (vs cae2548)

- src/app/reading/playground/page.tsx (NEW): server shell —
  SiteHeader/PaletteVars/CosmicSky sky band mirroring /reading;
  dynamic="force-dynamic"; band derived server-side from getStage2State()
  + tierForSubject (try/catch → null) + tierSatisfies(visitorTier,
  STAGE2_MIN_TIER); explainer "What happens in the Playground"; host row
  with "Back to the reading".
- src/components/reading/playground/PlaygroundIsland.tsx (NEW): client
  island; /api/stage2 no-store poll at 20 s (paused while joinedRoom);
  join handler does a FRESH fetch and joins only on
  fresh.decision === "open" && fresh.reachable && fresh.room; viewer
  name snapshotted once at the accepted click. States: closed (M19e),
  signin (M19a), package (M19b, ruling-3 buttons), open (M19c: waiting
  art, Live chip, ONE kit-btn-main "Join Love", quiet camera/mic line),
  open+unreachable, left-while-open, and the in-call frame
  (kit-stage-media--playground + JitsiRoom, Jitsi's own toolbar, no page
  buttons — ruling 4). Try-one-week rides Stage2Door's /api/cart shape
  verbatim.
- src/lib/week-pass.ts (NEW): the deriveWeekPass extraction.
- src/lib/session-read.ts: readingViewerName appended.
- src/components/booking/JitsiRoom.tsx: the optional onEnded prop only.
- src/components/reading/Stage2Details.tsx: tier names now Link through
  TIER_PAGES (derive-or-dash); week row links the tier-A page; the
  Stage2Rows named export; amendment words ("What opens the Playground",
  "the Playground included.").
- src/components/reading/ReadingStage.tsx: the stage2Room single-embed
  branch, the showStage2Card card, joinStage2/leaveStage2, the
  Stage2Door/JitsiRoom imports, the stage2Details prop, and the
  branch-dead frameRef/pollNow are removed; added the playgroundOpen
  state, its own 20 s /api/stage2 poll, and the open-only banner card
  (kicker "Stage 2 · the Playground", h2 "Want an encore?", the amended
  body, one kit-btn-main kit-btn-sm "Go to the Playground" →
  /reading/playground). Every K122 behaviour byte-identical.
- src/app/reading/page.tsx: Stage2Details import + stage2Details prop
  removed; deriveWeekPass imported from @/lib/week-pass; getItem/dollars
  imports dropped.
- src/app/kit.css: ONE `.kit-rows b a` rule (inherit + underline offset);
  ONE phone media rule for .kit-stage-media--playground.
- src/components/door/DoorButton.tsx: menuRowStyle hoisted module-level
  (the S2-pinned #ECE3C9 rides it; styleBlocks 9→8, colours 6 unchanged);
  a menu-open-only 20 s /api/stage2 poll; "The Playground · open now"
  menuitem rendered only while the Playground is open.
- tests/reading-playground.test.ts (NEW); tests/reading-stage.test.ts
  (replaced-branch pins rewritten to pin the banner; every other pin
  byte-identical); tests/reading-look.test.ts (deviation 3).

## Gates

- Baseline at cut: vitest 222 files / 2773 tests passed; scripts 5/5 zero
  failed.
- Red confirmed before the build (the two lane files failing).
- Final: oc-gate.sh — vitest 223 files / 2801 tests passed; scripts 5/5
  zero failed; eslint 0; tsc 0; next build ok; GATES GREEN.
- After the pickup hardening below: oc-gate.sh re-run — vitest 223 files /
  2801 tests passed; scripts 5/5 zero failed; eslint 0; tsc 0; build ok;
  GATES GREEN (block 968,369).

## Pickup hardening (the security seat's optional finding 2, taken)

`PolledState`/`toPolled` in PlaygroundIsland.tsx no longer carry `room` at
all — the field is removed, not nulled — so the display state structurally
cannot hold a room; the join path already rode only the click's fresh
answer (`fresh.room` → `joinedRoom`), which is unchanged. Stage2Door.tsx's
own PolledState keeps its room (read-only file, its join reads the polled
state by design). The `room={` count pin at
tests/reading-playground.test.ts:135 keeps its expectation of 1 (the
in-call mount is still the only one); the twelve `wire:` fixture literals
were re-trued to the narrower shape, never deleted.

## Shots (hand-back)

All at 1440 + 390, dark + dawn, on the lane's ports 4850-4853, under
/home/pac/dev/kimi/outbox/task-449/shots/:

- closed/ — harness, no seeds: /reading closed phase with NO banner;
  /reading/playground's closed card (M19e).
- banner-signin/ — harness, stage2 published: /reading closed phase WITH
  the banner; /reading/playground's signed-out state (M19a).
- banner-full/ — harness, stage2 published, --full-page: the whole banner
  card in frame ("Want an encore?" kept per AMENDMENT 1).
- package/ — harness, the real fixture member cookie (free): M19b with
  the derived Observer main button. The quiet "Try one week" button is
  honestly ABSENT here: the fixture store:catalog is empty, so
  stage2PackageDoor()'s week is null and the button correctly hides.
- stubbed/ — the two states the ONE harness cannot produce without a real
  connection to the meet host (watching-phase banner; in-call), shot by
  outbox/task-449/shots-stubbed.sh + shots-stubbed.cjs (outbox-only, never
  the repo): every meet-host request is intercepted and answered with a
  stub window.JitsiMeetExternalAPI that renders a placeholder and never
  opens a socket; __jitsiStub.fire("videoConferenceLeft") drives the
  left-while-open state. The fixture member is made paid by two
  fixture-only artifacts that die with the run: a temp
  data/onecocreation-registry.json entry (registry's file driver) and a
  KV tier-A grant — both removed by the trap; the worktree is clean after.
  The /api/stage2 route's own reachability probe did HEAD the real
  meet.onecocreation.com once per entitled poll — that is the route's
  production behaviour, not the browser's, and no Jitsi script or call
  ever loaded.
- Watching note: stage 1 waits for the "Watch Love live" tap, so the
  watching banner shot never needed the stub for stage 1 itself; the
  interception was armed regardless.
