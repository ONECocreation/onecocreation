# work-claim — TASK-278: ONE Cocreation: rename `Fren*` components + hook → `Member*` (HB-5, H109, A)

LANE: home crew (sonnet) · worktree `~/dev/worktrees/task-278` · branch `feat/task-278` · base main @ `8aeca76`
(T-276 + T-277 merged; tip gate running). RULING (0018.06.25 a₿ · block 967,125): step 3's judgment call —
rename the hook's `fren` property to `member` throughout (consistency; every consumer is touched anyway).

OWNS: `src/components/FrenChip.tsx`→`MemberChip.tsx`, `src/components/FrenMenu.tsx`→`MemberMenu.tsx`,
`src/components/FrenMenuFooter.tsx`→`MemberMenuFooter.tsx`, `src/components/FrenProfile.tsx`→`MemberProfile.tsx`,
`src/app/u/[handle]/page.tsx`, `src/app/u/[handle]/not-found.tsx`,
`src/hooks/useFrenSession.ts`→`src/hooks/useMemberSession.ts`, the 12 other importer files
(`src/app/login/signer-return/page.tsx`, `src/components/BbConsole.tsx`, `src/components/door/DoorButton.tsx`,
`src/components/door/DoorSheet.tsx`, `src/components/me/MePanel.tsx`, `src/components/OperatorGate.tsx`,
`src/components/ProfileEditor.tsx`, `src/components/ReadWithLove.tsx`, `src/components/ReleaseTag.tsx`,
`src/components/welcome/WelcomeFlow.tsx`), `tests/door-machine.test.ts` (the enforcement pin only),
`tests/console.test.ts` (`:88,91` local const rename), `tests/operator-gate-email-seat.test.ts` (`:27-28`
string literal update), `work-claims/task-278.md`. Plus two minimal-forced-edit comment rewords outside OWNS:
`src/components/rooms/RoomVideoSlot.tsx:65`, `src/app/api/frens/session/route.ts:18`.

NOT-OWNS: `tests/operator-auth-email-seat.test.ts:2` (`OperatorFrenSession` — T-281's package-scope territory).
`/api/frens/*` route paths and route handler files — T-280. `@/lib/fren-auth` module — T-279. Ms. Kimi's live
lanes (`src/lib/puck-seeds.ts`, `src/lib/puck-blocks/**`, `src/lib/page-states.ts`, `src/components/style/**`,
`src/components/PuckEditor.tsx`, `src/app/packages/**`, `src/app/style/**`).
