# work-claim — task-339 (the site-wide live indicator reads legibly — LiveStrip bigger dot, larger type, roomier padding, a real button-shaped "Join")

Lane: home crew (Number One sonnet sub-agent, H128). Base = onecocreation main @ **488dadc or newer**. Branch `feat/task-339-live-strip-legible`.
Worktree cut by Number One; `npm ci` already done. Lane ports **4482–4485**. GO: `~/dev/home/inbox/TASK-339-oc-live-strip-size.md`.

OWNS: `src/components/LiveStrip.tsx` (the `:68-81` style/markup block only), `tests/go-live-door.test.ts` (additive assertions only) or a new test file, this claim.

READ-ONLY: `src/components/SiteHeader.tsx`, `src/components/LiveBanner.tsx`, `src/app/layout.tsx`, `src/app/api/live/route.ts`, `src/lib/live.ts`, `src/lib/matrix-rooms.ts`.

Forbidden: env/KV, deploy steps, BFT/date math, any change to `stripModel()`'s return shape or the label/href text, any new color token, any second live surface, unmounting/remounting `LiveBanner.tsx`.

cut 0018.06.27 a₿, built 0018.06.27 a₿
