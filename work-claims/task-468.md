# TASK-468 claim

Builder: sonnet sub-agent for Number One
Block: 968,561 (the Thu 2026-09-24 call with Love + the Admiral's today notes)
Branch: feat/task-468-reading-one-email-box
Worktree: /home/pac/dev/worktrees/task-468
Base: a2cc258 (main after #87/#88)

Contract (briefings/walk-968482/walk.txt [00:06:27]-[00:07:26],
[00:29:56]-[00:31:18], [00:39:04]-[00:40:52]; briefings/walk-968482/ACTIONS.md
"Workflow changes" item 2): one box on /reading that both signs a visitor up
AND signs them in — "sign me up... keep me posted... it takes care of two
things at one time" — email, a six-digit code, then "they're logged in," all
without leaving the page. Today's note (968,561): "after email key login,
give the option to open the watch now reading first part."

## OWNS
- `src/app/reading/page.tsx`: ONLY the `<ReadingSignUp variant="public" .../>`
  mount line and its now-unused import — replaced with the new box. The
  surrounding `<section>` and its comment are untouched.
- `src/components/rooms/ReadingSignInBox.tsx`: NEW — the one box (email step,
  code step, joined state, returning-member state), reusing the existing
  `/api/auth/email/start` + `/api/auth/email/verify` routes and
  `postReadingSignUp`/`ReadingSignUpCard` from `ReadingSignUp.tsx`.
- `tests/reading-one-box-468.test.ts`: NEW.
- `tests/reading-page.test.ts`: the two pins tied to the old
  `<ReadingSignUp variant="public">` mount, re-trued to the new box.
- `tests/reading-look.test.ts`: the one pin ("mounts ReadingSignUp
  variant=public EXACTLY ONCE...") re-trued to the new box.
- `work-claims/task-468.md`, `work-claims/task-468-register.md`.

## READ-ONLY
Everything else, in particular: `kit.css`, `house.css`, `ReadingSignUp.tsx`,
`reading-sign-up-state.ts` (reused, not edited), `EmailDoor.tsx`,
`SignInCard.tsx`, `door-machine.ts`, `src/lib/member-auth.ts`,
`src/lib/email-auth.ts`, `src/lib/subscribers.ts`, `src/app/api/auth/email/*`,
`src/app/api/member/*`, `src/lib/next-path.ts`, `tests/reading-sign-up.test.ts`
(the component it pins is unchanged), `tests/login-card.test.ts`,
`tests/door-machine.test.ts`.
