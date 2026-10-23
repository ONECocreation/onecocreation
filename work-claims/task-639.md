# WORK-CLAIM - T-639 - ONE Cocreation: the live-room mini player (MOCKUP ONLY)

CLAIMED-BY: Number One's builder, block 972,830, on the Admiral's word in K183 and
K183-AMENDMENT-1: draw the mini player that keeps a guest's live Jitsi room playing
while they browse the site — stage, dock, shade, undock-and-move, phone strip, and
the camera-on "Do you want to leave the reading?" sheet that closes on Escape or a
tap outside.
BRANCH: `feat/task-639-live-mini-player`
WORKTREE: `~/dev/worktrees/task-639`

## OWNS
- `work-claims/task-639.md` (NEW)
- `src/components/reading/LiveRoomDock.tsx` (NEW — the mockup dock, all six states)
- `src/app/layout.tsx` (mockup edit only: one mount line for `<LiveRoomDock />` after `{children}`)

READ-ONLY: everything else. `src/components/reading/JitsiViewer.tsx` and
`src/components/booking/JitsiRoom.tsx` are the real embeds — the mockup draws a styled
placeholder live picture, never the real external_api.js. Mockup edits beyond the claim
file stay uncommitted and are archived as a diff in the outbox.

MOCKUP-ONLY: no production behavior changes are claimed; the draw answers R-093's
"keep the video live while browsing" with a drawn mechanism (one persistent element,
re-matched to the stage rect on /reading, docked elsewhere — no DOM move, no iframe reload).
