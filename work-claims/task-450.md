# TASK-450 claim

Builder: Ms. Kimi's crew
Block: 968,370 (0018.07.05 a₿)
Branch: feat/task-450-heart-field-story-time
Worktree: /home/pac/dev/worktrees/task-450
Base: cae2548d5fb6d5431e61194094c1c104861007e6
Brief: /home/pac/dev/kimi/inbox/TASK-450-oc-heart-field-story-time.md
Governing note: /home/pac/dev/kimi/inbox/K124-build-the-encore-449-then-heart-field-story-time-450.md (§T-450, ruling 2)

Contract: while Stage 1 is published, the Heart Field room (READING_ROOM_SLUG) shows a "● Story time" pill in the room's own pill idiom. The pill's click does a fresh uncached /api/stage1 re-check and mounts the one-way JitsiViewer (Guest, untouched) on the room's stage only through stage1WatchTarget (imported from ReadingStage.tsx, never re-implemented). A NEW 20 s /api/stage1 poll inside StageView, gated to the reading-room slug, is display-only. Chat is off in that stage state only, via a local chatOff = chatHidden || storyRoom !== null consumed at the grid modifier and the chat region gate only. Stage2Door stays exactly as it is (ruling 2); precedence is !live && !stage2Room.

Owned paths and limits:
- src/components/rooms/StageView.tsx: the poll, the pill, the storyRoom swap branch, the chatOff computation, the honest failure note line — no other hunk. No new CSS class, no inline style, no colour literal (the 3/2/0 drift ceiling must hold).
- tests/heart-field-story-time.test.ts: NEW.
- work-claims/task-450.md and work-claims/task-450-register.md.

Read-only (never touched): Stage2Door.tsx, RoomVideoSlot.tsx (byte-pinned), ClassroomView.tsx, StageChat.tsx, classroom.css, src/app/rooms/**, JitsiViewer.tsx, ReadingStage.tsx (the stage1WatchTarget import only — zero edit), src/components/booking/JitsiRoom.tsx, src/app/api/**, every T-449 file, all existing tests.

First commit is this claim. Subsequent commits: red tests, the StageView build, the register. Tests must fail before implementation. Baseline vitest counts recorded at cut. All five gates run via ~/dev/shortcuts/oc-gate.sh. Shots at 1440 and 390, both themes, Jitsi script stubbed in the page (never a real connection to any meet host), saved under /home/pac/dev/kimi/outbox/task-450/shots/.

No root WORK-CLAIM.md edits; no environment-file reads, secrets, vault, server/Jitsi configuration changes; no new dependencies; no push/fetch/merge or git configuration changes; no Gregorian stamps anywhere. Any needed out-of-scope change is a seam and stops the lane.

Rule 9 (K123): the brief records a conditional discharge — no field+button row exists in this lane. If the build grows one, node ~/dev/shortcuts/oc-row-align.cjs <url> --submit-fail runs and its output lands in the register.
