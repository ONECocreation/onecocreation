# WORK-CLAIM - T-639 - ONE Cocreation: the live-room mini player (BUILD)

CLAIMED-BY: Number One's builder, block 972,830, on the Admiral's word in K183 and
K183-AMENDMENT-1: draw the mini player that keeps a guest's live Jitsi room playing
while they browse the site — stage, dock, shade, undock-and-move, phone strip, and
the camera-on "Do you want to leave the reading?" sheet that closes on Escape or a
tap outside.
BRANCH: `feat/task-639-live-mini-player`
WORKTREE: `~/dev/worktrees/task-639`

BUILD LANE (K184, block 972,965; the Admiral's ruling A on desk card
972844-oc-mockup-t-639 — build the mockup with Number One's fixes; the K183
rulings, block 972,844): the mockup's drawn mechanism becomes the real thing —
a layout-owned context + host holds the ACTUAL Jitsi embed (never a DOM move,
never a reload on client navigation), the three room-owning islands mount a
thin bridge instead of the embed, bar buttons are WORDS, the phone strip is
uncramped, the leave pop-up fits one line at both widths, the rejoin card
serves ALL guests and self-dismisses at 11 seconds, the dock never renders
under /a, the page grows bottom padding while the phone strip shows, and a
non-production test switch (`?livedock=test`) opens the dock with a real
meet.jit.si test room for the iPhone check.

## OWNS
- `work-claims/task-639.md` (this file)
- `src/components/live/LiveRoomContext.tsx` (NEW — the layout-owned session
  store: join/leave/rejoin/dismiss, identity-keyed idempotence, the rect the
  stage mode follows)
- `src/components/live/LiveRoomBridge.tsx` (NEW — the thin client leaf the
  room-owning islands render in place of the embed; joins the context,
  reports its own rect, unmounts WITHOUT leaving so client navigation keeps
  the room)
- `src/components/live/LiveRoomDock.tsx` (NEW — the layout-owned host that
  mounts the REAL `JitsiRoom`/`JitsiViewer` and every drawn state: stage,
  dock, shade, float, phone strip, leave Sheet, 11 s rejoin card, the /a
  exclusion, the phone-strip page padding, the test switch. REPLACES the
  mockup's `src/components/reading/LiveRoomDock.tsx`, which was never
  committed and is deleted in this lane)
- `src/app/layout.tsx` (the provider + host mount after `{children}`)
- `src/app/kit.css` (the dock's `lrd-` rules — the mockup's inline `<style>`
  block cannot ship: a new .tsx gets a ZERO hand-typed-colour allowance from
  the design-drift ratchet, so the rules move into the kit's own stylesheet,
  appended as one banner-marked section; no existing rule touched)
- `src/app/cartridge.css` (THREE new tokens beside the always-night
  `--pop-bg`/`--pop-edge`/`--pop-shadow` recipe — `--pop-ink`/`--pop-pink`/
  `--pop-rose`, the dock card's inks; the card never theme-flips
  (TASK-398's law), so its inks must be pinned night values, and literals
  are banned from kit.css's additions region by the reading-look law)
- `src/components/reading/ReadingStage.tsx` (the bridge replaces the direct
  `JitsiRoom` mount; the cover/chip/`kit-stage-viewer` wrapper stay; the
  island dismisses the dock session on a server-side end)
- `src/components/reading/ReadingStageDoor.tsx` (same bridge swap for the
  Parts 1/3/4 door, same server-close dismissal)
- `src/components/rooms/StageView.tsx` (the story-time branch mounts the
  bridge with `kind="watch"`; the stage2 branch's byte-pinned `JitsiRoom`
  mount is UNTOUCHED; poll-close and joinStage2 dismiss the watch session)
- `tests/live-room-dock.test.ts` (NEW — dock state machine, the 11-second
  card, the /a exclusion, the camera-on pop-up path, the word-button law,
  the phone-padding rule, the test-switch gate)
- `tests/reading-stage.test.ts` (re-trued pins, by name: the room now mounts
  through `LiveRoomBridge`, and the "Allow camera and microphone" hint rides
  the DOCK's JitsiRoom — the Body itself never speaks of a camera)
- `tests/jitsi-embed-options-477.test.ts` (re-trued pins, by name: the
  guestView `JitsiRoom` mount lives in `LiveRoomDock.tsx` now)
- `tests/heart-field-story-time.test.ts` (re-trued pin, by name: the story
  branch mounts `<LiveRoomBridge kind="watch" ...>` — the domain/room/
  onEnded/onFailed props keep their exact pinned spellings)

READ-ONLY: everything else. `src/components/booking/JitsiRoom.tsx` and
`src/components/reading/JitsiViewer.tsx` are mounted by the dock but never
edited; `PlaygroundIsland.tsx` keeps its own in-place mount (its floor-lock
flow is a separate shape — bridging it is its own lane if wanted);
`/reading/playground`, `/meet`, `/live`, the studio and every console page
are untouched.
