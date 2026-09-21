# work-claim — task-352 (OC UI kit, lane 4: `/me` signed in = three tabs)

Lane: the home crew (Sonnet builder) under Number One's gate. Base = onecocreation
`main` @ `3a59ae95a8498129c2c4e5359bde78f564c627e6`. Branch
`feat/task-352-me-signed-in-tabs`. Worktree cut by Number One; `npm ci` already done.
Lane ports **4530–4533** (re-grepped against every `work-claims/*.md`'s own ports line
at claim time — still free: task-349 4518–4521, task-350 4522–4525, task-351
4526–4529, task-355 4534–4537, task-356 4538–4541). Brief:
`~/dev/home/inbox/TASK-352-oc-me-signed-in-tabs.md`. Stamp 0018.07.02 a₿, block
967,915 (house beacon).

The signed-in `/me` view (today one long stacked column per member kind) becomes
three tabs — Profile, Calendar, Purchases — built from the lane-1 kit's real
`Tabs`/`Card`/`Button` (T-349, merged). Mounted inside `MeSwitch.tsx`'s `"email"` and
`"key"` branches only; no new API route, no auth change, no "link a key" affordance
of any shape (RULED, the Admiral — held out of this lane entirely).

## OWNS

Restructured (both non-loading branches of `MeSwitch.tsx` into the tab shell; the
`loading`/`error`/`signed-out` branches untouched):
`src/components/me/MeSwitch.tsx`

Sheds its own purchases/quick-doors cards, keeps only the welcome card:
`src/components/me/EmailMemberPanel.tsx`

Named decision: mounted whole, unchanged internals, only its call site moved:
`src/components/me/MePanel.tsx`

The stale "community calendar lands here next" line, reworded; mounted for both
member kinds now, per Build item 6:
`src/components/me/MemberQuickCards.tsx`

Comment-only correction (Pre-allowed seam — the stale "bare Fragment of three
siblings" prose both files shared):
`src/lib/puck-blocks/me-switch.tsx`
`src/components/style/BuilderMarker.tsx`

First commit, this file:
`work-claims/task-352.md`

New test suite, source-string pins on the above:
`tests/me-signed-in-tabs.test.ts`

READ-ONLY (called/mounted, not edited): `src/app/me/page.tsx`,
`src/components/me/ConstellationCard.tsx`, `src/components/ProfileEditor.tsx`,
`src/components/calendar/**`, `src/app/me/calendar/page.tsx`,
`src/components/door/door-machine.ts`, `src/app/api/member/**`,
`src/hooks/useMemberSession.ts`, `src/components/me/session-state.ts`,
`src/lib/puck-seeds.ts`, `src/components/kit/**`,
`src/components/door/SignInCard.tsx`, `src/app/style/kit/page.tsx`

NOT: `/me` signed out (T-351's, done), the calendar data lane / "4b" (a new
member-scoped calendar API route, an all-events builder, a mine/all filter), the
header session light (lane 5), any auth change, any API route edit, token renames,
new dependencies, `@frens-earth/puck-config`, any "link a key" feature in any wording.
