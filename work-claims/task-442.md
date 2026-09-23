# work-claim — task-442 (OC · close the sign-in return-path open redirects — one validator)

Lane: the home crew (Ms. Kimi's builder, under Number One's gate). Base = onecocreation
main **1f1acd9** (confirmed by `git rev-parse HEAD` in this worktree). Branch
`feat/task-442-next-path-open-redirect`. Worktree cut by Number One at
`~/dev/worktrees/task-442`, `npm ci` done before hand-off. Lane ports **4818–4821**.
Brief: `~/dev/kimi/inbox/TASK-442-oc-next-path-open-redirect.md` (block 968,279).
This is lane A of the Jitsi host-pass plan (`PLAN-jwt-login.md` §3 rule 8, §4 row A):
the two sign-in return-path open redirects get fixed BEFORE any host sign-in uses that
path — and the hole is live on production today either way.

What the lane builds:

1. `src/lib/next-path.ts`: harden `safeNextPath` and make it THE one validator. Keep both
   export names, the module path and the one-argument call shape. The rule, in order:
   `raw: unknown` — anything that isn't a non-empty string returns `null` (fixes the
   repeated-`?next=` array crash with no edit to `welcome/page.tsx`); `null` on any C0
   control, DEL or backslash anywhere (`/[\u0000-\u001f\u007f\\]/`); must start with `/`,
   not `//`; resolve against a fixed SENTINEL origin (never `window.location.origin`,
   never Host/x-forwarded-host), `null` if the origin differs or `u.pathname` starts
   with `//`; **return `raw` unchanged — never normalise** (normalising turns
   `/..//evil.example` into `//evil.example`). Docblock rewritten short: the rule and why.
2. `src/app/login/signer-return/page.tsx`: replace ONLY the hand-rolled
   `const next = rawNext && /^\/(?!\/)/.test(rawNext) ? rawNext : null;` with
   `const next = safeNextPath(rawNext);`, plus the import. `useSearchParams` stays the
   source, the effect deps stay, every claim-branch line byte-identical.
3. NEW `tests/next-path-open-redirect.test.ts`: the brief's Tests 1–5 (refused set,
   encoded arrival, byte-identical legit paths through both validators, the
   signer-return source pin + the `get("next")` census pin, and the existing pins stay
   green unmodified).

## OWNS

`work-claims/task-442.md` (this file, first commit),
`src/lib/next-path.ts`,
`src/app/login/signer-return/page.tsx` (the `const next =` line and one import only),
`tests/next-path-open-redirect.test.ts` (NEW),
`REGISTER.md` (the lane's report file, last commit — no SUMMARY.md, no LANE-DONE;
the orchestrator files those).

READ-ONLY (grounding only, never edited): `src/components/door/DoorSheet.tsx`,
`src/components/door/SignInCard.tsx`, `src/components/door/door-machine.ts`,
`src/components/EmailDoor.tsx`, `src/app/welcome/page.tsx`,
`src/components/welcome/WelcomeFlow.tsx`, `src/lib/signer-doors.ts`,
`src/components/SignerDoors.tsx`, `src/lib/puck-blocks/login-door.tsx`,
`src/middleware.ts`, `src/lib/rooms-door.ts`, `src/lib/room-access.ts`,
`src/lib/reading-room.ts`, `tests/free-reading-path.test.ts`,
`tests/door-machine.test.ts`, `tests/door-key-handoff.test.ts`,
`tests/me-signed-out.test.ts`.

## What is NOT in this lane

Never touched: `welcome/page.tsx` and `WelcomeFlow.tsx` (T-414's draft claims
`welcome/page.tsx`); no props to `SignInCard`; no renaming of `safeNextPath` /
`nextPathFromLocation`, no module move, no second argument; never a normalised return;
no new UI, CSS, `style={{`; no existing test's assertions edited or deleted. The
brief's "Honestly not in this lane" items (login-CSRF through signer-return, the NIP-46
`auth_url` scheme check, Host-header checkout return URLs, `rooms-door.ts` dropping a
room URL's query) are seen and left — later lanes, not built here. No push, no PR, no
merge, no fetch, no rebase, no config. Block-height stamps only.

## Cut note

Claimed at block 968,282 (0018.07.05 a₿; live tip via
`curl -s https://mempool.space/api/blocks/tip/height`).
