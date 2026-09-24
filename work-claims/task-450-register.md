# TASK-450 register

Base: cae2548d5fb6d5431e61194094c1c104861007e6
Code/pins revision: 96cb0e4b26cdcd3612061f90be7ac50db219d043 (this register rides the final commit on top)
Builder: Ms. Kimi's crew
Block: 968,370 (0018.07.05 a₿)
Brief: /home/pac/dev/kimi/inbox/TASK-450-oc-heart-field-story-time.md
Governing note: K124 §T-450 + the Admiral's ruling 2 (block 968,357)

## What was built

src/components/rooms/StageView.tsx (the only edited source file):
- ONE new poll, gated `slug !== READING_ROOM_SLUG → return` (the same guard the Stage2Door mount wears): `/api/stage1`, 20 s, `cache: "no-store"`, ClassroomView.tsx's /api/live idiom verbatim (alive flag; a missed/failed poll keeps the last-known display state; never throws). State: `storyOpen` — DISPLAY-ONLY, initial closed, fail-closed by construction. The poll never mounts anything.
- The click authorizes: `storyTime()` does a FRESH uncached `/api/stage1` fetch at the instant of the click and mounts only through the IMPORTED `stage1WatchTarget` (ReadingStage.tsx — zero edits to that file; the one-decision law). A null target mounts nothing. The wire's `jitsiDomain` is stored beside `storyRoom` from the SAME answer — the pair never splits.
- The stage swap: the video region's conditional gains the middle branch `storyRoom ? <div className="kit-stage-media"><JitsiViewer domain room onEnded onFailed /></div>` — an EXISTING class (the viewer is position:absolute and needs a positioned 16:9 parent; no new CSS, no inline style). `onEnded` (the viewer's hangup AND the host ending) clears the stage — the hangup IS the way back; Jitsi's own toolbar (fullscreen + hangup) is the whole control surface, no page buttons. `onFailed` clears the stage and sets the one-line honest note ("The reading's picture couldn't load here — try again."), rendered where the pill stood, cleared on the next successful mount.
- Chat off in that stage state only: `const chatOff = chatHidden || storyRoom !== null;` consumed at the grid modifier and the chat region gate ONLY. The operator's saved switch and ClassroomView are untouched; every other state renders exactly as today.
- The pill renders beside the Stage2Door mount under `slug === READING_ROOM_SLUG && storyOpen && !live && !stage2Room && !storyRoom` — the room's own live show and a joined Stage 2 outrank the pill (named decision E).

src/components/rooms/StoryTimePill.tsx (NEW — see Deviations):
- The pill's button element: `<button type="button" className="btn btn-gold" onClick={onWatch}>● Story time</button>` — RoomVideoSlot's "● Join Live Session" idiom (btn btn-gold), no inline style, no new CSS class. Pure presentation; the click's fresh authorization lives in StageView's `storyTime`, handed down as `onWatch`.

tests/heart-field-story-time.test.ts (NEW, 21 tests): the poll's shape and display-only law; the click's fresh authorization through the imported `stage1WatchTarget` (and that StageView never touches `body.room`/`d.room` itself); the pill's conditions, classes, copy, no-style and precedence; `chatOff` at both consumption spots plus both chatHidden static-render shapes re-asserted; the swap branch's JitsiViewer wiring, no-page-button law, the way back, the stage2Room branch's byte-identity, and the Guest ruling (no name prop, no `readingViewerName`).

## Deviations

1. **The pill's `<button>` element lives in a NEW leaf component, `src/components/rooms/StoryTimePill.tsx`, not inline in StageView as the brief's Build 2 sketched.** Reason: `tests/operator-census.test.ts` ratchets StageView's `buttonFamilies` at 1, and the census write mode NEVER raises a count ("fewer, never more"; `CENSUS_WRITE=1` min-merges). Any second `<button>` element in StageView — of any class family — fails the census with no sanctioned write. A new file enters at the new-file allowance (`NEW_FILE_BUTTON_FAMILY_ALLOWANCE = 25`, T-419 decision A), the house's own path for exactly this. Every behavioral requirement is unchanged: same guard, same idiom (`btn btn-gold`, no inline style), same click authorization (the handler stays in StageView). The brief's OWNS named StageView as the pill's home; this adds one new source file to the lane's footprint and is flagged for Number One's ruling at pickup. StageView's design-drift ceiling still holds at 3/2/0 and the census stays green unmodified.
2. **The honest note also renders on the click's fetch failure** (the brief assigned it to JitsiViewer's `onFailed` only). A dead network at click time is the same honest word, and nothing mounts. No new surface: the note is one `<p className="kit-text-quiet">` under the same slug guard, `!storyRoom`.

## Rule 9 (K123) — the conditional discharge HOLDS

No field+button row exists in this lane: no input, form, or field in any touched component (StageView gains a poll, a pill mount, a swap branch and a note line; StoryTimePill is one lone button; the new test file is source pins and static renders). `oc-row-align.cjs --submit-fail` was therefore NOT run — there is no row to measure. If a later amendment adds a field+button row to this lane, the probe runs before hand-back.

## Security review (the brief's REQUIRED read)

- **No new disclosure.** `/api/stage1` already answers the published reading's room + domain to ANY caller (pre-existing, T-438; the reading is free). The lane adds no endpoint and no key; the pill lives INSIDE the member-gated room (`/rooms/heart-field` requires a member session), and the mount path is the same public wire /reading already uses, authorized by the same `stage1WatchTarget` the /reading Watch click uses. A visitor the room's gate refused never sees the pill by construction.
- **Fail-closed click path.** The poll is display-only (verified: the poll block contains no `setStoryRoom`); the click's fresh answer is the only mount path; a null target (closed, prepared, failed read, room-less body) mounts nothing; the route itself fails closed to the CLOSED body on any config read failure.
- **Viewer locks intact.** JitsiViewer is byte-untouched (T-448's keys — `useHostPageLocalStorage`, `disabledNotifications`, `disableInitialGUM`, both muted starts, prejoin off, chat/self-view/shortcuts/reactions/polls off, toolbar = fullscreen + hangup). The lane hands it no name prop (Guest — the one-way design; no session read in the room).
- **No new egress.** One same-origin 20 s poll, gated to one slug; one same-origin fetch per click. Tests and shots stub the Jitsi script in the page — no walk ever connects to meet.onecocreation.com.
- **No widening.** No change to who may join anything; `/api/**` untouched; the Stage 2 tier check stays in `/api/stage2`.

Findings: none outstanding.

## Slop review (the house checklist)

- One poll, named, no second timer beyond it; the poll law's letter kept (display-only) and its click authorization separate.
- No new CSS classes or files; no inline `style={{` added; no colour literals; StageView drift 3/2/0 holds; the census baseline is untouched (the pill's button enters as a new file at the ruled allowance).
- The Stage 2 door, its words, and its branch: byte-identical (ruling 2), pinned by the new suite.
- The byte-identical law: every room but the Heart Field renders exactly as today (the poll effect early-returns, the pill and the branch sit under the slug guard); the Heart Field with Stage 1 closed renders byte-identical too (initial closed state, fail-closed poll).
- Rule 9 discharge recorded above.

## Gates (actual output)

`~/dev/shortcuts/oc-gate.sh /home/pac/dev/worktrees/task-450`:

```
census: 1119 objects, baseline 1119 · families: 180/12/5/8/61/0 · fonts: 47 token/32 literal
 Test Files  223 passed (223)
      Tests  2794 passed (2794)
scripts/calendar-view.test.mjs: 70 passed, 0 failed
scripts/cartridge-identity.test.mjs: 179 passed, 0 failed
scripts/console-matrix.test.mjs: 14 passed, 0 failed
scripts/fixture-kv.test.mjs: 45 passed, 0 failed
scripts/square-payments.test.mjs: 58 passed, 0 failed
eslint 0
tsc 0
build ok
GATES GREEN
```

Baseline at cut (on cae2548, before any lane commit): 222 files / 2773 tests, all green. Final: 223 files / 2794 tests, all green — the suite grew by the lane's own 21 pins, no existing assertion changed.

## Seams smelled, not fixed (named, not widened)

- The pill's poll, Stage2Door's poll and ClassroomView's poll are three 20 s fetches on one page — same cadence, same no-store discipline; a shared room-poll hub is a future lane (the brief's own seam note).
- Stage2Door's words still say "Stage 2" (AMENDMENT 1's not-this-lane list).
- JitsiRoom's "Leave Stage 2" reset still wears the legacy `btn btn-ghost btn-sm` family (the room surface predates the kit; not this lane).

## Verification

Red tests committed before the build (98c5f7d — 18 failing on the bare tree), then green. Shots at 1440 and 390, both themes, the Jitsi script stubbed in the page (never a real meet-host connection), under `/home/pac/dev/kimi/outbox/task-450/shots/` — the pill, the playing stage (chat gone, video full-width), the way back, and the pill-off room with the Stage 2 package door still standing. Live Jitsi authority and the Admiral's preview hand test remain his; the local stub does not claim them.

Final HEAD: this register's own commit — reported in the hand-back message.
