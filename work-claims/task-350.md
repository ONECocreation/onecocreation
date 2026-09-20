# work-claim — task-350 (ONE Cocreation: the OC UI kit, lane 2 — `SignInCard` on `/login`)

Lane: home crew (Number One sonnet sub-agent). Base = onecocreation main
**3418e2d3316bd5bca34c47e1df661d4ff7a21dba** (the T-349 OC UI kit merge, OC PR #22). Branch
`feat/task-350-signin-card`. Worktree cut by Number One, `npm ci` already run there (clean at
cut). Lane ports **4522–4525**. GO: `~/dev/home/inbox/TASK-350-oc-signin-card-login.md`. Plan
reviewed by Ms. Kimi (REVIEW-K83, BUILDABLE-WITH-CHANGES — folded into the brief's RULED
section, superseding "either acceptable" lines). Design of record: `briefings/
oc-ui-kit-architect-pass.md` (§1/§3/§4/§5) + `briefings/artifacts/oc-kit-me-login-mockups.html`
(M1/M2/M3).

A new `SignInCard` component — built from the lane-1 kit's `Tabs`/`Card`/`Field`/`Button` —
mounted on `/login`'s Puck-published path (the `LoginDoor` block): ONE box, Email tab (default)
+ Key tab, the B2 "what is this?" explainer, and a 30-second timeout around the direct-extension
sign (R-069 lesson, M3's exact words). RULED (K83): WRAP not replace — `door-machine.ts` stays
byte-identical and `DoorSheet.tsx` keeps its name and its two other mounts (the header's sheet,
the `/login` fallback, the signer-return strip) untabbed and otherwise unchanged; `SignInCard`
is a new, additive presentation for the Puck-published `/login` path only, reusing
`door-machine.ts`'s model directly (redrawn in kit parts, not a re-skin of `DoorSheet.tsx`'s own
inline-styled render).

## OWNS

NEW `src/components/door/SignInCard.tsx`, `src/lib/puck-blocks/login-door.tsx` (the `fields`/
`defaultProps` addition + swapping the block's mounted component to `SignInCard`),
`src/lib/signer-doors.ts` (an ADDITIVE export only — `SIGN_TIMEOUT_MS`/`SignTimeoutError`/
`withSignTimeout`, the shared 30-second-timeout helper, decision 3(b) taken — no existing
export's signature changes), `src/components/door/DoorSheet.tsx` (line 220's `await` plus the
one import-line addition it needs — adopting `withSignTimeout`, no copy/UI change), NEW
`tests/signin-card.test.ts`, `tests/login-puck.test.ts` (one assertion updated —
`createLoginDoor()`'s block now mounts `SignInCard`, not `DoorSheet`; the pin's INTENT — the
block renders the real, single sign-in component, `mount="page"` — is kept, named as a widening
in SUMMARY), `work-claims/task-350.md`.

READ-ONLY: `src/components/door/door-machine.ts` (byte-identical, reused), `src/components/
SignerDoors.tsx` (mounted as-is, `kind="login"`), `src/components/Kind0Doors.tsx` (untouched
this lane — not a genuine one-line drop-in once inspected, named as follow-on work),
`src/app/api/**`, `src/lib/next-path.ts`, `src/lib/puck-config.tsx`, `src/lib/puck-seeds.ts`,
`src/components/EmailDoor.tsx` and its callers, `@frens-earth/puck-config`/`package.json`,
`src/app/house.css`, `src/components/kit/**`, `src/app/kit.css`, `src/app/login/
signer-return/page.tsx`, `src/app/login/page.tsx`.

NOT: `/me`, the header session light, token renames, new dependencies, `Kind0Doors.tsx`'s call
site.

## Gates

`npx vitest run` · `node scripts/calendar-view.test.mjs` · `node scripts/
cartridge-identity.test.mjs` · `node scripts/square-payments.test.mjs` · `npx eslint .` ·
`npx tsc --noEmit` · `npx next build`. `npm run check:usability` is NOT a gate for this lane
(fails 3 pairs on main already, cited in the ask — report the delta, don't block on it).
`package-lock.json` unchanged (no new dependency).

## Shots

`scripts/shots-fixture.sh --ports 4522-4525 --out ~/dev/home/outbox/task-350/shots --routes
/login --cookie none --themes dark,dawn --widths 1440,390`, plus a `--click` pass for the Key
tab (the 30-second timeout state is proven by a unit test instead — no `window.nostr` stub in
this harness).

## Cut note

Stamp: 0018.07.02 a₿, block 967,899 (the hold-lifted block, house beacon).
