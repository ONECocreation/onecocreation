# work-claim — task-351 (OC UI kit, lane 3: `/me` signed out = `SignInCard` only; `MeSwitch` gets a real loading state and a real error state)

Lane: the home crew (Sonnet) under Number One's gate. Base = onecocreation main
`2045d56cadcf55b88611d080a5334a9b44398633` (T-350 merged, PR #23). Branch
`feat/task-351-me-signed-out`. Worktree cut by Number One; `npm ci` first. Lane ports
**4526-4529**. Brief: `~/dev/home/inbox/TASK-351-oc-me-signed-out.md`.

RULED (Ms. Kimi's REVIEW-K83, folded into the brief, superseding the brief's own
"recommendation, not a requirement" hedge): decision 4(a) taken — `MeSwitch` reads the
shared `useMemberSession()` hook (additive field + an additive `refresh()` export only,
zero breaking change for its 11 real callers); the pure classifier lives in a NEW sibling
module, `src/components/me/session-state.ts`; a fetch timeout on the session check is in
scope; the "walk the welcome path" secondary link is dropped (no equivalent in M4).

## OWNS

`src/hooks/useMemberSession.ts` (additive: a `status` field, an exported `refresh()`, a
new `useSessionStatus()` subscriber — `useMemberSession()`'s own pinned return shape is
untouched), `src/components/me/MeSwitch.tsx` (the loading/error/signed-out states), NEW
`src/components/me/session-state.ts` (the pure classifier, `classifySessionResponse` +
`classifyMeState`), NEW `tests/me-signed-out.test.ts`, `work-claims/task-351.md`.

READ-ONLY (per brief): `src/app/me/page.tsx`, `src/components/me/EmailMemberPanel.tsx`,
`src/components/me/MePanel.tsx`, `src/components/me/MemberQuickCards.tsx`,
`src/components/me/ConstellationCard.tsx`, `src/components/door/door-machine.ts`,
`src/components/door/SignInCard.tsx`, `src/components/door/DoorButton.tsx`,
`src/lib/next-path.ts`, every `src/app/api/**` route, `src/app/me/calendar/**`,
`src/lib/puck-blocks/me-switch.tsx`, `src/lib/puck-seeds.ts`, the kit
(`src/components/kit/`).

NOT: `/me` signed-in (lane 4), the header session light itself (lane 5), calendar
(4/4b), token renames, new dependencies, `@frens-earth/puck-config`.
