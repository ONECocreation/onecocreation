# TASK-477 claim

Builder: sonnet sub-agent for Number One
Block: 968,624+ (Love's live reading, ongoing)
Branch: feat/task-477
Worktree: /home/pac/dev/worktrees/task-477
Base: origin/main e136672

GOAL: the Jitsi room defaults for the embedded rooms on /reading.

Love hosts every room from the direct meet.onecocreation.com link ("Join
on camera" on /a/site/reading), never from the embed — so the embed
(`src/components/booking/JitsiRoom.tsx`) is always the GUEST view on
/reading (mounted by `ReadingStage.tsx` for parts 1/2 and
`ReadingStageDoor.tsx` for parts 3/4; `JitsiViewer.tsx`, the old one-way
embed, is confirmed retired from /reading and untouched).

The Admiral's four rulings, from the embed's `configOverwrite` alone (no
server scripts):

1. Stage view (dominant speaker large) by default, tileview button
   available, never forced — already true (no `filmstrip`/tile-forcing
   key exists in the embed or is added here); confirmed, no code change
   needed for this ruling alone.
2. Screen share is host-only — the /reading guest embed's own
   `toolbarButtons` becomes the house list (server's
   live-config.js:~250) minus `'desktop'`, only for the guest-view
   mounts. Every other `JitsiRoom` caller (`/live`, `/meet`, the
   Playground, `/rooms/*`, the studio desk) renders byte-identical.
3. Moderator menu (remoteVideoMenu, participants-pane) stays reachable —
   nothing in the embed override touches `remoteVideoMenu`, and
   `participants-pane` stays in the guest toolbar list.
4. No `startVideoMuted`, `channelLastN: 1`, or `filmstrip: false` in the
   embed override — confirmed absent both before and after this lane
   (that was the retired one-way `JitsiViewer`'s shape, not this one).

## OWNS

- `work-claims/task-477.md` — this file.
- `src/components/booking/JitsiRoom.tsx` — EDIT: extract the External API
  options object into a pure, exported `jitsiEmbedOptions(...)` function;
  add an optional `guestView` prop (default falsy, byte-identical for
  every existing caller) that adds the house `toolbarButtons` list minus
  `'desktop'` to `configOverwrite` when true.
- `src/components/reading/ReadingStage.tsx` — EDIT: one line, its
  `<JitsiRoom .../>` mount passes `guestView`.
- `src/components/reading/ReadingStageDoor.tsx` — EDIT: one line, same.
- `tests/jitsi-embed-options-477.test.ts` — NEW: pins
  `jitsiEmbedOptions()`'s returned object (no `'desktop'`, has
  `'tileview'`, no `startVideoMuted`, prejoin kept, branding keys kept)
  and confirms the non-guest shape is unchanged (no `toolbarButtons` key
  at all — matching every pre-existing caller's real output).

## READ-ONLY

Everything else. In particular, never touched: `JitsiViewer.tsx` (the
retired one-way embed — never deleted, per house law), the server's
`live-config.js` (read-only reference at
`~/dev/briefings/walk-968624/live-config.js`), and any file owned by the
other lanes running alongside this one (T-476 store/qa-entitlement,
T-478 sign-in UI, T-479 waiting-overlay mockup — no code).
