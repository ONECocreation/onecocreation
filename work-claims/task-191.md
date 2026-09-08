# work-claim — TASK-191

- TASK: 191 — the studio overlay, three scenes first (ONE Cocreation → template)
- HOUSE: kimi (Mr. Kim's crew) · lane size: large
- BRANCH: feat/task-191-studio-overlay · worktree ~/dev/worktrees/task-191
- BASE: main @ 8528a3e ("work-claims: T-185 + T-188 archived — claims pruned") — verified at cut
- BASELINE (vitest at cut, before any change): 55 test files passed, 584 tests passed
- STAMP: cut 0018.06.18 a₿ · block 966119

## OWNS
- NEW `src/app/studio/overlay/**` — the transparent OBS overlay route (?scene=solo|duo|phone, signed token in query)
- NEW `src/app/a/studio/**` — the director's room on Love's desk (scene picker, roster, show title, copy-able overlay URLs, VDO links)
- NEW `src/lib/studio/**` — runnerItems() derivation, overlay token, roster store on KV
- NEW `src/components/studio-overlay/**` — the overlay scenes + the room client
- tests (new) + the ONE re-pin in `tests/style-route.test.ts` (drop only the /a/studio→/style
  assertions; /style stays pinned) — ruled in the brief's GROUND paragraph
- RULED DELETE: `src/app/a/studio/[[...slug]]/page.tsx` (T-175's redirect stub — Next.js refuses
  a page beside the optional catch-all; the /a/studio word is reclaimed with /studio)

## NOT owned
- NavMenu, src/lib/console.ts (the console rail), src/app/style/**, the Site room.
