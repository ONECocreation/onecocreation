# TASK-494 claim

Builder: Ms. Kimi's crew (Kimi Code)
Block: 969,0xx (height at pickup)
Branch: feat/task-494-letters-safety
Worktree: /home/pac/dev/worktrees/task-494
Base: c8af298242fa97874bde668193ba51c2494f7c3b (T-491's LANE-DONE tip;
this lane STACKS on T-491 — its letters.ts edits are in this base)

GOAL (brief `TASK-494-oc-letters-safety.md`, design of record
`briefings/sprints-968624/SCOPE-letters-love-edits.md` lane 7): letters
safety. (1) The audience gate on `/letters/[key]`: a letter whose
`audienceOf(key, override)` is `members` renders only for a signed-in
member (valid `pa-fren` session AND `tierForSubject` non-null) or the
operator; everyone else gets `notFound()`; `generateMetadata` wears the
same gate so the subject stops leaking. The check rides a PURE exported
helper beside `audienceOf` in `src/lib/letters.ts`. (2) The `"` fix:
`bodyToHtml`'s escape pass gains `"` -> `&quot;`, and the directive
values parsed in `letterHtml` (hero URL, section title/image/href/blurb,
cta label/href) are escaped (`&`, `<`, `>`, `"`) before they reach
`richShell`; directive hrefs admit single-`/` site paths and explicit
`https://` URLs only, anything else falls to literal text (T-227 rule,
per T-491's security review). (3) `sandbox=""` on the preview iframe at
`src/app/a/letters/page.tsx:310`. (4) Pins for all three in NEW
`tests/letters-safety.test.ts`.

## OWNS (verbatim from the brief)

- `src/app/letters/[key]/page.tsx` (the gate + gated metadata)
- `src/lib/letters.ts` (the pure gate helper beside `audienceOf`, and
  the escaping fix at `bodyToHtml`/`letterHtml` only; the rest of the
  file untouched; SERIALIZED behind T-491, the base line says which tip)
- `src/app/a/letters/page.tsx` (line 310's `sandbox=""` ONLY; the /a
  uniformity law is untouched by a one-attribute change)
- NEW `tests/letters-safety.test.ts` (name recorded in SUMMARY)
- `work-claims/task-494.md` + `work-claims/task-494-register.md` (the
  claim commit comes first, the register beside it)

READ-ONLY (per brief): `src/lib/mail.ts`, `src/lib/member-auth.ts`,
`src/lib/member-tier.ts`, `src/lib/member-links.ts`,
`src/lib/operator-auth.ts`, `src/app/rooms/[slug]/page.tsx`,
`src/app/reading/page.tsx`, `src/middleware.ts`,
`src/app/letters/page.tsx`, `src/components/LettersRoom.tsx`,
`src/app/api/me/letters/route.ts`, `src/app/news/page.tsx`,
`src/components/NavMenu.tsx`, `src/lib/site-config.ts`,
`src/app/a/letters/[key]/page.tsx`, `src/app/api/admin/letters/**`,
`src/lib/lead-magnet.ts`, all existing test suites.

NOT in scope (per brief + T-491's review): the order-receipt pre-render
substitution and its `String.replace` `$` hazard — those ride a
follow-on receipt lane.
