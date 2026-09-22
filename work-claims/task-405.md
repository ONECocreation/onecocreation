# work-claims/task-405.md — task-405 (ONE Cocreation: W-20 — the user menu says "Welcome", Calendar opens the calendar tab on /me)

Lane: the home crew (Sonnet builder, under Number One's gate). Base = onecocreation main
`b12a09d24ebae533fc44ab77dfdfb92222687a61` (PR #51 on #50 on #49), cut at block 968,146.
Branch `feat/task-405-user-menu-calendar-tab`. Worktree `~/dev/worktrees/task-405` (cut by
Number One), `npm ci` already done. Lane ports **4706–4709**.
Brief: `~/dev/kimi/inbox/TASK-405-oc-user-menu-calendar-tab.md`.

Claimed at block 968,146 (house beacon, fresh read at claim time).

An Astra plan review landed as an AMENDMENT under the brief's CLAIMED banner before this claim
was written; every ruling (R1–R5) is folded into the OWNS list, the Build, and the tests below,
and named again in SUMMARY at hand-back. R1 withdraws one earlier claim: a tab click replaces
the current address; Back does not replay tab clicks.

## OWNS

- `work-claims/task-405.md` (NEW, this file)
- `src/components/door/door-machine.ts` — the two menu rows (`:101`, `:103`) + their adjacent
  comments ONLY — the third row (the reading room) and the file's other exports untouched
- `src/components/me/MeSwitch.tsx` — the `?tab=` param read (new `useSearchParams`/`useRouter`
  calls, called BEFORE the loading/error/signed-out early returns per R4), both branches' `Tabs`
  wiring (`active`/`onChange` in place of `defaultActive`), and the docblock's superseded
  "Tab state is uncontrolled… no URL param" sentence — every other line byte-identical
- `src/app/me/calendar/page.tsx` — whole file becomes the forward (`permanentRedirect`)
- `tests/door-machine.test.ts` (`:121-126`), `tests/her-words.test.ts` (`:79-84`),
  `tests/me-signed-in-tabs.test.ts` (`:61-65` + a NEW forward pin, per R5's full spec)
- `tests/one-header-treatment.test.ts` — WIDENED at pickup by Number One (the builder's own
  hand-back named this as a seam, not a fix): the `EXCLUDE_EXACT` allowlist gains
  `src/app/me/calendar/page.tsx` with its reason (a bare 308 forward never returns JSX — the
  same class as `login/signer-return`), and the it-title's courier count re-trues to four. One
  entry + one word; the census itself is untouched.

## READ-ONLY (grounding, never edited)

`src/components/door/DoorButton.tsx` (the menu render + the name/proof header — E5 blessed it,
byte-identical), `src/components/kit/Tabs.tsx` (the controlled override contract already built),
`src/app/me/page.tsx` (the `force-dynamic` export at `:26` already covers the param read on both
its branches — `:43-54` Puck-published, `:72` hand-built), `src/components/me/MemberCalendar.tsx`,
`EmailMemberPanel.tsx` / `MePanel.tsx` / `MemberQuickCards.tsx` / `ConstellationCard.tsx`,
`puck-seeds.ts` and the whole Puck stack, every stylesheet.

## FORBIDDEN (per brief)

A new visible control; a hash-based mechanism (`#calendar`) alongside the query param — one
mechanism, not two; editing any label beyond the one row; a `window.location` client-side bounce
for the forward (the server redirect is the honest one); any civil-date stamp (block heights
only). `DESIGN_DRIFT_WRITE=1` is never run this lane (adds no new `.tsx`/`.css` file).

## Named decisions (drafter's lean, ruled TAKEN at the cut)

A — the kit's controlled `Tabs` override, driven by `?tab=`, validated against the branch's tab
ids, `profile` fallback, `router.replace` with `{ scroll: false }` (`/me` plain for `profile`,
`/me?tab=<id>` otherwise). B — `permanentRedirect("/me?tab=calendar")` (308) in
`src/app/me/calendar/page.tsx` — the whole page body and its `metadata` export go. C — the door
sheet's greetings (`door-machine.ts:133`, `:152`) stay untouched — one word changes, not three.

## AMENDMENT rulings folded (block 968,146, after the Astra review)

R1 — "the back button walks tabs honestly" WITHDRAWN: `router.replace` leaves no history trail;
the words everywhere read: a tab click replaces the current address; Back does not replay tab
clicks. R2 — the `force-dynamic` export is at `me/page.tsx:26` (not `:29`, which is the
docblock); it covers both branches of `/me`; every consumer of `MeSwitch` is grepped and audited
in SUMMARY — any consumer that is neither force-dynamic nor Suspense-wrapped is a named Seam, not
an out-of-OWNS fix. R3 — `onChange` rebuilds the URL from the CURRENT `searchParams`
(`new URLSearchParams`), so other query params survive a tab click; the hash does not (named in
SUMMARY); the "MemberCalendar does not refetch" claim narrows to "no remount" only — refetch
behaviour is unverified. R4 — `useSearchParams`/`useRouter` are called before every early return;
the validated tab id is computed once and handed to BOTH `<Tabs>`; no second `kind === "email"`
literal; the existing boundary-marker/branch-slice test pins are preserved. R5 — the
me-signed-in-tabs re-pin checks both `<Tabs>` share one `active` value (allowlist + `profile`
fallback, no `useState` seeded from the param) and one `onChange`; the forward pin matches the
literal `permanentRedirect("/me?tab=calendar")` call, not two strings apart.

Block height at claim: 968,146.
