# TASK-478 claim

Builder: sonnet sub-agent for Number One
Block: 968,624+ (Friday's walk with Love)
Branch: feat/task-478
Worktree: /home/pac/dev/worktrees/task-478
Base: origin/main e136672

Two sign-in faults from briefings/walk-968624/walk.txt + ACTIONS.md S5:

1. **"The name could not be claimed. Try another."** — Love hit it on
   iPhone/iPad (0:53:42). Traced to `src/app/api/member/profile/route.ts`'s
   PUT: `SET accountname:<name> … NX` refuses whenever the key already
   exists, with NO check for WHO holds it — a double submit (a re-tap
   before the first request's response painted, common on iOS Safari's
   own lag) reads the SAME member's own already-successful claim as a
   stranger's conflict, 409. `src/lib/registry.ts`'s `claimHandle` (the
   nostr-key twin, `SignInCard.tsx`/`DoorSheet.tsx`'s SAME `claimName`
   function, the OTHER branch) carried the identical bug. Fixed both with
   a pure verdict (`decideNameClaim` / `decideHandleClaim`: given who
   holds it and who's asking, "claim" | "mine" | "taken") — "mine" reads
   as an idempotent success, never a 409; only a genuinely DIFFERENT
   holder is "taken". The 409 wording is now plain, no em dash: "That
   name is taken. Try another." (both files, matching words). iOS
   autocapitalization/trailing space was ALREADY normalized server-side
   (`.trim().toLowerCase()`, both files) before this lane — verified with
   tests, not re-invented.

2. **The "Email me a code" button/field mismatch** (measured 51.2px vs
   42px, a 9.2px gap — real Chrome, real fonts, local dev server AND
   production, read-only). Root cause: `.kit-field-input` (kit.css) never
   declared its own `line-height`, so it inherited the page's ambient
   copy line-height (globals.css body rule, 1.0625rem/1.6 — sized for
   paragraphs, not a one-line pill) while `.kit-btn-main` already pins an
   explicit `line-height:1.25`. This breaks the field/button MATCH
   whenever they're not both riding `.kit-inline-form`'s grid-stretch
   trick — which itself only covers widths >640px; AT iPhone/iPad widths
   (≤640px) `ReadingSignInBox`'s OWN row collapses out of the stretch and
   shows the SAME mismatch. Fixed with `.kit-field-input{line-height:
   normal}` (kit.css) — verified in real Chrome to land the field at
   exactly 42.0px, matching the button with 0.0px gap, every width, both
   themes, the failed-submit state included. `DoorSheet.tsx` and
   `EmailDoor.tsx`'s own email inputs are plain inline styles (never
   `.kit-field-input`), so each carries the identical one-line
   `lineHeight: "normal"` fix inline.

## OWNS

- `work-claims/task-478.md` — this file.
- `src/app/api/member/profile/route.ts` — EDIT: `decideNameClaim`
  (exported pure verdict) + the PUT handler's reservation check now reads
  who holds the name before refusing; `NAME_TAKEN_REASON` reworded.
- `src/lib/registry.ts` — EDIT: `decideHandleClaim` (exported pure
  verdict) + `claimHandle`'s blob/file branches read the existing
  entry's npub before refusing; new `HANDLE_TAKEN_REASON`, same words as
  `NAME_TAKEN_REASON`. `seatReservedHandle` (the operator seat, a
  DIFFERENT function) and its own "already claimed" wording are
  UNTOUCHED — `/api/admin/registry/seat/route.ts`'s status-code mapping
  reads that function's result, never `claimHandle`'s.
- `src/components/door/SignInCard.tsx` — EDIT: the claim-fallback string
  reworded, no em dash.
- `src/components/door/DoorSheet.tsx` — EDIT: the SAME claim-fallback
  reword; its `field` style object gains `lineHeight: "normal"`.
- `src/components/welcome/WelcomeFlow.tsx` — EDIT: the SAME
  claim-fallback reword (comment updated too).
- `src/components/EmailDoor.tsx` — EDIT: `inputStyle` gains
  `lineHeight: "normal"`. Unmounted dead code today (verified: no live
  import anywhere) — fixed for consistency per the brief's explicit ask,
  not a live-repro fix.
- `src/app/kit.css` — EDIT: one added line-height declaration inside the
  existing `.kit-field-input` rule. The nested `.kit-inline-form
  .kit-field-input` grid-layout rule (a DIFFERENT, already-pinned
  selector) is untouched.
- `tests/member-profile-name-claim.test.ts` — NEW: `decideNameClaim`
  pure cases + the plain-copy law (no em dash), both files.
- `tests/registry-handle-claim.test.ts` — NEW: `decideHandleClaim` pure
  cases + `claimHandle` (file driver) behavioral cases: taken by
  another, already mine (double submit), iOS capitals/trailing space.
- `tests/email-code-row-height.test.ts` — NEW: source-pins for the
  line-height fix (kit.css + both inline-style files).
- `tests/me-constellation-stars.test.ts` — EDIT: three pre-existing
  pinned assertions of the OLD "already claimed" reason updated to the
  new wording; two NEW cases added to describe("E") — the double-submit
  success (SAME member, "mine") and the double-submit-shaped attempt
  from a DIFFERENT member (still 409) — plus one iOS
  capitals/trailing-space case. This file's OTHER groups (A-D, F) are
  untouched.

## READ-ONLY

Everything else. In particular, per the Admiral's note on other lanes
running in parallel: `src/app/a/site/qa-entitlement*` / T-476's own
files, `src/components/rooms/JitsiRoom.tsx` (T-477), and any T-479
mockup files — none of those were touched or needed touching for this
lane.
