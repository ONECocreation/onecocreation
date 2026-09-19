# work-claim — task-337 (the Jitsi one-time door — a mint-once, unguessable private room beside the studio's existing VDO copy doors)

Lane: home crew (Number One sonnet sub-agent, H128). Base = onecocreation main @ **488dadc**. Branch `feat/task-337-oc-jitsi-one-time-door`.
Worktree cut by Number One; `npm ci` already done. Lane ports **4490–4493**. GO: `~/dev/home/inbox/TASK-337-oc-jitsi-one-time-door.md`.

OWNS: `src/components/studio-overlay/StudioRoom.tsx` (new props + new card mount only), `src/app/a/studio/page.tsx` (new prop wiring), `src/components/console/StudioHub.tsx` (pass-through of the two new props only, per the CUT NOTE), `src/app/a/studio/actions.ts` (new `mintJitsiDoor` export only, additive), new files `src/lib/studio/jitsi-door.ts`, `src/components/studio-overlay/JitsiDoorCard.tsx`, `tests/studio-jitsi-door.test.ts`, this claim.

READ-ONLY: `src/lib/site-config.ts` (`meeting.jitsiDomain` read, not modified), `src/lib/live.ts`, `src/lib/live-links.ts`, `src/lib/store.ts` (`kv()` imported, not modified), `src/lib/tenant.ts`, `src/lib/studio/roster.ts` (pattern reference only), `src/lib/studio/doc.ts`, `src/lib/studio/scenes.ts`, `src/components/rooms/AfterHoursDoor.tsx`.

Forbidden: env/KV values, deploy steps, BFT/date math, any change to `site-config.ts`'s meeting rail default, any behavior change to the three existing VDO copy-door cards, any Jitsi VPS config.

cut 0018.06.28 a₿, built 0018.06.28 a₿
