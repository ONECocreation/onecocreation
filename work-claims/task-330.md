# work-claim — task-330 (OC admin nav v2 — Brand folds under Site, Live + Studio merge into one Studio room)

Lane: home crew (Number One sonnet sub-agent, H128). Base = onecocreation main @ **1495428 or newer**. Branch `feat/task-330-admin-nav-v2-studio`.
Worktree cut by Number One; `npm ci` done. Lane ports **4466–4469**. GO: `~/dev/home/inbox/TASK-330-oc-admin-nav-v2-studio.md`.

OWNS: `src/components/console/SiteConsoleShell.tsx`, `src/app/a/studio/page.tsx`, `src/app/a/live/page.tsx`, one NEW wrapper component under `src/components/console/` (`StudioHub.tsx`), `tests/console.test.ts` (the order/label pin), `tests/go-live-door.test.ts` (the two named pins only), `tests/today-summary.test.ts` / `tests/studio-director-desk.test.ts` (the one named pin only, if decision 5b), any new coverage for the above, and `work-claims/task-330.md`.

READ-ONLY: `src/lib/console.ts` (registry), `src/app/a/live/go-live-room.tsx`, `src/components/studio-overlay/StudioRoom.tsx`, `src/components/studio-overlay/SendToUserChooser.tsx`, `src/lib/live.ts`, `src/lib/live-links.ts`, `src/lib/studio/**`, `src/lib/booking-orders.ts`, `src/lib/matrix-rooms.ts`, `src/components/LiveStrip.tsx`, `src/components/console/LiveDoorCard.tsx`, `SITE_SUBS`'s four existing `/a/site/*` entries and their behavior.

Sibling lanes live now (never read or touch): `~/dev/worktrees/task-332` (owns `src/components/LettersRoom.tsx`, `src/app/api/me/letters/route.ts`), `~/dev/worktrees/task-333` (owns `src/components/studio-overlay/StudioRoom.tsx`, `SendToUserChooser.tsx`).

cut 0018.06.26 a₿, built 0018.06.27 a₿
