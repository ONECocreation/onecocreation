# WORK-CLAIM — TASK-261 (ONE Cocreation: Love gets her director's desk, and a guest's door is one click with camera + mic)

CLAIMED-BY: Number One (Claude Fable 5.1), solo lane, no parallel runs.
CLAIMED-AT: 0018.06.24 a₿ (block 967,044).
BRANCH: `feat/task-261`
WORKTREE: `~/dev/worktrees/task-261`
BASE: main @ `5648470` (T-257 merged) — re-verified at claim time (`git log -1` on the worktree matched; `git rev-parse HEAD` = `5648470ab318cae0a204d2c4ad79626a6181641`).
BRIEF: `~/dev/home/inbox/TASK-261-oc-director-desk-and-guest-door.md`

## Ground (re-grepped at claim)
- `src/lib/live.ts` still carries the pure builders `vdoBase`/`studioVdoLinks`/`studioGuestCameraLink` inline (lines 87-121) alongside the server-only chain (KV, mail-queue, entitlement) — confirmed by reading the whole file.
- `src/app/a/live/go-live-room.tsx:98-113` `guestMeetingLink` is a client-local duplicate (the file's own docblock at :105-110 explains why: a VALUE import from `live.ts` would drag the server-only chain into the client bundle).
- `src/app/a/studio/page.tsx:61-68` builds the SAME `{room, push, guest}` shape inline instead of calling `studioVdoLinks` — a second hand-written derivation of the same room name.
- Fork param verification (`~/dev/apps/onecocreation-studio`, read-only): confirmed every `urlParams.has(...)` this lane relies on — exact line citations in SUMMARY.md.
- Existing tests pinning the OLD bare `.guest` shape that this lane must update: `tests/studio-own-door.test.ts:67`, `tests/go-live-door.test.ts:128`.

## Plan (as scoped by the brief)
1. New `src/lib/live-links.ts` (no server imports) — the pure URL builders: `vdoBase`, `studioVdoLinks` (guest now one-click), `studioGuestCameraLink` (T-249's signature kept), new `studioGuestLink(host, room, handle?)`, new `studioDirectorLink(host, room)`, and `guestMeetingLink` moved from go-live-room.tsx.
2. `live.ts` re-exports the above from `./live-links` (one source, server callers' imports unchanged).
3. `go-live-room.tsx` imports `guestMeetingLink`/`studioDirectorLink` from `@/lib/live-links` directly (client-safe), re-exports `guestMeetingLink` for the existing test import path; the Next row gets "Open your director's desk" (primary) + "Step on camera" (secondary, keeps the existing `href={studioVdo.push}` pin).
4. `/a/live/page.tsx` and `/a/studio/page.tsx` derive `studioDirector`/`director` via `studioDirectorLink`; `/a/studio/page.tsx`'s inline vdo object replaced by `studioVdoLinks` (dedup).
5. `StudioRoom.tsx` links card grows a third row: the director's desk, on camera, a guest's door — each with a one-line "what this is" + the room name.
6. Tests: update the two stale `.guest` pins, add builder pins for the two new functions, a "one source" identity pin (`live.ts` re-export === `live-links.ts` export), and render pins for the new doors.

OWNS (per brief): `src/lib/live.ts` (+ NEW `src/lib/live-links.ts`), `src/app/a/live/go-live-room.tsx`, `src/app/a/live/page.tsx`, `src/app/a/studio/page.tsx`, `src/components/studio-overlay/StudioRoom.tsx` (links card only), tests. NOT `src/components/rooms/**` (T-260), NOT `door-machine.ts`/`middleware.ts` (T-259), NOT the fork.

LANE-DONE pending build + gates + shots + commit.
