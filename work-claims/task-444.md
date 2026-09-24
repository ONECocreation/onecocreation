# TASK-444 — reading doors claim

Builder: Chief O'Brien on Astra, guest builder.
Claim block: 968337.
Brief: /home/pac/dev/hermes/inbox/TASK-444-oc-reading-doors.md
Base: 8ca76077f95340e41f3bb5d9aa1b8141179190bf
Branch: feat/task-444-reading-doors
Worktree: /home/pac/dev/worktrees/task-444

Contract

Reading doors on the home card, default Community menu, member menu, letters insert, and welcome letter point to /reading. Home CTA: Go to the reading. Heart Field keeps its own room door. Saved menus and operator welcome-letter overrides survive untouched.

Owned implementation

- src/lib/reading-room.ts: only READING_PAGE_PATH export and ruling comment.
- src/components/ReadWithLove.tsx: public href and ruled CTA; remove unused session dependency.
- src/components/NavMenu.tsx: Community row, Heart Field catalog label, necessary constant import.
- src/components/door/door-machine.ts: member reading row and necessary constant import.
- src/app/a/letters/page.tsx: insert call and import.
- src/lib/lead-magnet.ts: roomUrl expression and necessary constant import; override unchanged.
- tests/reading-doors.test.ts: new red-first contract tests.
- Brief-named existing tests: changed door assertions only when broken.
- work-claims/task-444.md and work-claims/task-444-register.md.
- WORK-CLAIM.md: explicit user requirement for the root claim.

Sequence: claim commit → red test commit → build commit → pins commit → gates → register commit.

Gates, run in this worktree with real output retained in the final report:

    npx vitest run
    for f in scripts/*.test.mjs; do node "$f"; done
    npx eslint src tests --max-warnings=0
    npx tsc --noEmit
    npx next build

No edits to read-only paths, styles, saved menu storage, Heart Field derivation or readingDoorHref. No env-file reads, secret output, fetch, merge, push, git config, stash, or broad staging. Named git add paths only. Clean tree at hand-back.

Number One merges main with TASK-438 before integration gating and preview acceptance. No attempt to merge it here. Final report: /home/pac/dev/hermes/outbox/task-444-gpt-6-astra/SUMMARY.md.
