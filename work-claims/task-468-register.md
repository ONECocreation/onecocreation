# TASK-468 register — the reading page's one email sign-up/sign-in box

Block 968,561. Branch feat/task-468-reading-one-email-box. Base a2cc258.

## What changed, and why (the contract, quoted)

The call with Love (briefings/walk-968482/walk.txt): "it could say sign up
you know keep me posted or sign up maybe it's both yeah sign me up keep me
posted and it takes care of two things at one time" ([00:06:27]-[00:07:26]);
"send them the token like that six digit and then they're logged in"
([00:29:56]-[00:31:18]). The Admiral, today (968,561): "want to watch the
live, be sure to sign up > email and code, all stays on page, with the keep
me posted or stay in the know emails. after email key login, give the
option to open the watch now reading first part."

`src/app/reading/page.tsx`'s one hunk (the `<ReadingSignUp variant="public"
.../>` mount + its import) is replaced with `<ReadingSignInBox />` — a new
component, `src/components/rooms/ReadingSignInBox.tsx`. Surrounding
`<section>` and its comment kept; the comment now names TASK-468.

## The traced auth path

- **start**: `POST /api/auth/email/start {email}` -> `{ok, reason?}`
  (`src/app/api/auth/email/start/route.ts:10-49`) — mints a 6-digit code,
  mails it. The code-door meter (`code-door-limit.ts`, 3 sends / 10 min
  window) runs untouched.
- **verify**: `POST /api/auth/email/verify {email, code}` -> `{ok, handle,
  space}` + `Set-Cookie` (`src/app/api/auth/email/verify/route.ts:30-78`).
  Sets the real member-session cookie, `SameSite=Lax` (route.ts:74) — this
  repo's CSRF guard for that cookie. **Searched for a file named
  "login-csrf-origin-guard" — none exists anywhere in this repo** (`grep
  -rn "csrf\|CSRF" src/`, `find . -iname "*csrf*"`, `find . -iname
  "*origin-guard*"` all came back empty outside comment mentions of
  `Origin` unrelated to this door). `email-auth.ts`'s own five-wrong-tries
  verify limiter rides along, untouched.
- **session**: the shared client store (`useMemberSession`/
  `applyMemberSession`, `src/hooks/useMemberSession.ts`) is updated in
  place by the SAME call `SignInCard.tsx`'s own `verifyCode` (:200-204)
  already makes — no new client auth surface.

`ReadingSignInBox.tsx` calls exactly these two routes and nothing else
(`tests/reading-one-box-468.test.ts`'s own source pin greps for any
`/api/auth/` call outside `email/start` and `email/verify` and fails
closed if one appears — there is none).

## The new-account naming question, answered with file:line

Traced what happens after `verify` for a BRAND-NEW email:

`verify/route.ts:70-77` names the member by the RAW EMAIL itself —
`{ ok: true, handle: email, space: "email" }`, and
`makeMemberToken(email, "email")` (line 68). **There is no "first part of
the email" default anywhere on this path today.**

The ONLY surface in this repo that forces a manual "pick a name" step is
`/login`'s `SignInCard.tsx`: `verifyCode` (:186-218) reads
`/api/member/profile` after verify; an empty `displayName`/`accountName`
sets `isNew`, which `door-machine.ts`'s `reduce()` (:40-41, the
`"verified"` event) sends to the `"new-name"` state; `claimName`
(:307-347) then PUTs `/api/member/profile` (`profile/route.ts:119-186`,
D5's name-uniqueness claim). This is a DIFFERENT sign-in surface
(`/login`), never mounted by this lane.

`EmailDoor.tsx` — the OTHER real caller of the SAME `/api/auth/email/*`
routes — never forces that step either: its own `verify` (:70-98) goes
straight to `step: "done"` and a redirect. **`ReadingSignInBox` follows
EmailDoor's own precedent**: no forced claim step, so "all stays on page"
holds and this sign-in lane adds no new server path (the brief's own
instruction).

**Follow-up, not built here**: auto-naming (deriving a default
`@onecocreation` handle from the email's local part, matching Love's "that
creates their account... that's your username until you customize it")
would need a new default written into `verify/route.ts` around line 71
(the `{ ok: true, handle: email, ... }` response — e.g. deriving and
persisting an `accountName` from `email.split("@")[0]` there) or into
`profile/route.ts`'s GET lazy-heal around line 108. Left as a named
follow-up per the brief; not built in a sign-in lane.

## Every redirect the reused components make, and this box's own non-navigation

- `EmailDoor.tsx` verify success (:82-89): `step: "done"`, then
  `window.location.assign(nextPathFromLocation() ?? "/me")` after 900ms —
  a full-page redirect.
- `SignInCard.tsx` `finish()` (:349-353): `router.push(landingFor(...))` —
  `/welcome` for a new soul, `next` or `/me` for a returning one, or closes
  a sheet.
- **`ReadingSignInBox` navigates nowhere.** Its `onVerified` handler
  (`ReadingSignInBox.tsx`, the default export) calls `applyMemberSession`
  (updates the shared store in place) and `router.refresh()` only — no
  `window.location`, no `router.push` (pinned by
  `tests/reading-one-box-468.test.ts`'s source-string test). The visitor
  stays on `/reading#sign-up` through every state.

## Security

No sign-in without a verified code: `verifyAndSubscribe` (in
`ReadingSignInBox.tsx`) only reaches `postReadingSignUp` (the subscribe
call) AFTER `/api/auth/email/verify` answers `{ok:true}` — pinned by two
tests (a failed verify never calls `/api/subscribe`; a verified one calls
it exactly once, with the exact `{email, source:"reading"}` body). No new
token type — the existing member-session cookie only. Existing rate limits
(code-door-limit.ts, email-auth.ts's verify limiter) and the cookie's own
`SameSite=Lax` CSRF guard are untouched (no new route was added). Next-path
sanitizing (`src/lib/next-path.ts`) is untouched and unneeded here — the
Nostr-key link emits one static, pre-validated same-origin path
(`/login?next=%2Freading`), never user input; `/login`'s own
`safeNextPath` still guards it on arrival. T-453 (a payment return never
signs anyone in) is untouched — nothing here touches the payment/webhook
paths.

## Pins re-trued

- `tests/reading-page.test.ts:210-215` (before: asserted `<ReadingSignUp `
  mounted once with `variant="public"`) -> now asserts
  `ReadingSignInBox` is imported from
  `@/components/rooms/ReadingSignInBox` and mounted exactly once, and that
  `ReadingSignUp` no longer appears in the page source at all.
- `tests/reading-page.test.ts:217-222` (before: asserted the literal
  `'{ kind: "off" }'` string, tied to the old `state` prop) -> now asserts
  the box is never wrapped in a `next &&` guard (ungated by construction —
  the new component takes no schedule-derived prop at all), keeping K122
  item 13's law (mounts in every schedule state).
- `tests/reading-look.test.ts:118-125` (before: asserted `<ReadingSignUp
  variant="public"` mounted once) -> now asserts `<ReadingSignInBox`
  mounted once and `ReadingSignUp` no longer appears in the page source;
  `kitx-section-first` and the no-`/news`-href checks kept as-is (both
  still true).
- `tests/reading-look.test.ts:127-135` ("the three Heart Field CTAs are
  retired... no `/rooms/heart-field`, no `href="/rooms/`") — **NOT
  changed, still passes**: this pin reads only `page.tsx`'s own source, and
  the new box's `/rooms/heart-field` link lives in the separate
  `ReadingSignInBox.tsx` file, never in `page.tsx` itself.
- `tests/reading-sign-up.test.ts` — **not touched**. It pins
  `ReadingSignUp.tsx`/`ReadingSignUpCard` directly, which this lane never
  edits (still mounted, unchanged, inside `ReadingNotice.tsx`'s room
  variant, and reused verbatim inside `ReadingSignInBox`'s
  returning-member state).

Never deleted or weakened a test — every change above narrows an assertion
that named the OLD mount to name the NEW one, plus one honest new
assertion (`ReadingSignUp` no longer appears at all) that is strictly
stronger than what it replaced.

## Kit classes reused, no new CSS

`kit-signup`, `kit-inline-form` (the exact row that already proves the
button/input height-and-centre law via `kit-inline-form:has(>.kit-field)`,
kit.css ~:341-348), `kit-stack`, `kit-h2`, `kit-text-quiet`, `kit-btn
kit-btn-main kit-btn-sm`, `center` (house.css:89, text-align only). Zero
new CSS. Zero inline `style={{}}` blocks (design-drift.test.ts's and
operator-census.test.ts's own new-file allowances are untouched — 0 style
objects, 0 styled buttons measured either way).

## Row alignment — measured, not guessed

`~/dev/shortcuts/oc-row-align.cjs "http://127.0.0.1:4892/reading#sign-up"
--widths 1440,390,360 --themes dark,light`:
```
ok   row-align ... dark 1440: field "reading-signin-email" h=51.2 · button "EMAIL ME A CODE" h=51.2 · Δcentre 0 Δheight 0
ok   row-align ... light 1440: field "reading-signin-email" h=51.2 · button "EMAIL ME A CODE" h=51.2 · Δcentre 0 Δheight 0
2 rows measured, 0 outside ±1px
```
At 390/360 the field and button stack vertically (kit.css's own pre-existing
`@media (max-width:640px)` rule on `.kit-inline-form`, unmodified by this
lane, the same rule `ReadingSignUpCard`'s own row already relies on) — the
tool's own law ("a stacked phone row... is not a row and is not measured")
correctly counts 0 rows there, not a failure.

`--submit-fail` (a forced non-2xx, error text showing): same 0/0 result at
1440 both themes — 4 rows measured, 0 outside ±1px.

## Shots (SEEN, not guessed)

Server: `env -i PATH="$PATH" HOME="$HOME" NODE_ENV=production
SEAT_SECRET=throwaway-468 npx next start -p 4892 -H 127.0.0.1`. Puppeteer
from `/home/pac/dev/apps/puck-studio/node_modules/puppeteer`,
`executablePath: /usr/bin/chromium`, a fresh `createBrowserContext()` per
shot. Saved to
`/tmp/claude-1000/-home-pac-dev/24e774c2-4341-4868-9ad5-ce8ddc548e73/scratchpad/shots468/`:

- `signed-out-dark-1440.png`, `signed-out-light-1440.png` — the row on one
  line, `Δheight 0`, `Δcentre 0` (row-align tool above), `overflowRight: 0`.
- `signed-out-dark-390.png`, `signed-out-light-390.png`,
  `signed-out-dark-360.png`, `signed-out-light-360.png` — field/button
  stacked (the existing sub-640px rule), `overflowRight: 0` at every size.
- `code-step-dark-390.png` — `/api/auth/email/start` intercepted with the
  route's real success shape (`{ ok: true }`, `start/route.ts:48`), an
  email typed, the code field (`id="reading-signin-code"`) shows in the
  SAME box, no navigation.

Full per-shot measurements (input/button height, centre delta, overflow) in
`.../shots468/results.json`. Server stopped by its `ss -ltnp | grep 4892`
PID, never `pkill -f`.

## Vitest / gate

`npx vitest run` (whole suite): 238 files, 3015 tests, all green.
`npx eslint src tests --max-warnings=0`: clean. `npx tsc --noEmit`: clean.
`npx next build`: "Compiled successfully".

## Obstacles

- **Two self-inflicted red herrings in the new test's own source-string
  pins**: the doc comment in `ReadingSignInBox.tsx` originally named
  `window.location.assign` and `router.push` in PROSE (explaining what the
  box does NOT do) — which then tripped this lane's own
  `not.toContain("window.location")` / `not.toContain("router.push")`
  source pins, since a `.not.toContain` check reads the whole file
  including comments. Fixed by rephrasing the doc comment to describe the
  same facts without the literal substrings. Lesson for future
  source-string pins in this house: a doc comment can trip its own test.
- **`useRouter()` cannot be exercised under `renderToStaticMarkup`**: an
  early draft of this lane's test suite tried to render the default,
  hook-wired `ReadingSignInBox` directly (to pin "renders nothing while
  the session is unchecked", mirroring `ReadingSignUp`'s own such test).
  `ReadingSignInBox` calls `useRouter()` unconditionally (a real React
  rule — hooks can't be conditional), and Next's `useRouter` throws
  ("invariant expected app router to be mounted") outside a real App
  Router tree, which this repo's node-only vitest (no jsdom, no router
  provider) can never provide. `ReadingSignUp`'s own default export avoids
  this because it never needs a router at all. Removed that one test
  (not in the brief's required list) rather than touch production code to
  route around a real React hook rule; the "never flash before checked"
  law is still proven — by the pure `classifySignUpKind` gate itself
  (already exhaustively pinned in `tests/reading-sign-up.test.ts`, reused
  verbatim here) and by `ReadingSignInBox`'s own one-line early return.
- **No file named "login-csrf-origin-guard" exists in this repo** — the
  brief named it as something to "keep... in the path." Searched
  thoroughly (grep for csrf/CSRF/Origin across `src/`, find for
  `*csrf*`/`*origin-guard*`); found nothing. The real CSRF guard for the
  member-session cookie is its `SameSite=Lax` attribute
  (`verify/route.ts:74`) — untouched, since this lane adds no new route.
  Flagged here rather than silently assumed.
- **Server error copy the box can surface still carries a dash**: if the
  code-door meter holds (`code-door-limit.ts:25`, `CODE_DOOR_HELD =
  "too many codes asked for — give it a few minutes and try again"`),
  that exact string — with an em dash — would show as this box's error
  note. This is pre-existing copy in a file outside this lane's OWNS
  (shared infrastructure, `EmailDoor.tsx`/`SignInCard.tsx` already surface
  it verbatim too), so it was not edited here. Named as a follow-up for
  whoever next touches `code-door-limit.ts`'s copy.
- **Design call**: on arrival already signed in (case 3), this box shows
  the reused member "Keep me posted" card PLUS the "Watch in the Heart
  Field" button together (the brief's item 3 only explicitly required the
  reused card; item 2's "ONE button" language was for the just-verified
  case). Chose to add the Watch button there too, since the Admiral's
  standing ask ("after email key login, give the option to open the watch
  now") reads as "whenever signed in," not only "the moment they just
  signed in" — flagged here as a judgment call, easy to narrow back to
  just the reused card if that reading is wrong.

## Follow-ups

1. Auto-name a brand-new email account (the "first part of the email"
   default) — needs a change to `verify/route.ts` (~line 71) or
   `profile/route.ts`'s GET lazy-heal (~line 108); out of scope for a
   sign-in lane per the brief.
2. `code-door-limit.ts:25`'s `CODE_DOOR_HELD` copy carries an em dash;
   worth a follow-up copy-only fix under the file's own owner.

## Number One's review fixes (block 968,561)

After seeing the code-step shot at 390:
- **The code step said nothing about where the code went.** It now reads "A code is on its way to your inbox. It works for ten minutes. Sent to **{email}**." These are the /login sheet's own words, without its dash.
- **A mistyped email was a dead end.** There was no way back short of reloading. Now a quiet line reads "Wrong email? Use a different one". It's a link, the same shape as the Nostr key pointer on the email step, so the box keeps one button size.
- **The "subscribe-unknown" note pointed at a button that wasn't on screen.** It now says "Reload this page to try Keep me posted again." After a reload the visitor is a signed-in member, and the reused card shows that button.
