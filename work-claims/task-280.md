# TASK-280 claim

Owner: home crew (sonnet)
Base sha: 8a919cf
Branch: feat/task-280
Ruling: H106 A, 0018.06.25 a₿ · block 967,125

## OWNS
- `src/app/api/member/session/route.ts` (new, moved)
- `src/app/api/member/claim/route.ts` (new, moved)
- `src/app/api/member/release/route.ts` (new, moved)
- `src/app/api/member/whois/route.ts` (new, moved)
- `src/app/api/member/availability/route.ts` (new, moved)
- `src/app/api/member/upload/route.ts` (new, moved)
- `src/app/api/frens/session/route.ts` (becomes dual-read re-export shim)
- `src/app/api/frens/claim/route.ts` (becomes dual-read re-export shim)
- `src/app/api/frens/release/route.ts` (becomes dual-read re-export shim)
- `src/app/api/frens/whois/route.ts` (becomes dual-read re-export shim)
- `src/app/api/frens/availability/route.ts` (becomes dual-read re-export shim)
- `src/app/api/frens/upload/route.ts` (becomes dual-read re-export shim)
- the 10 client-fetch files named in TASK-280 step 3
- `src/app/api/admin/batch/release/route.ts` (docblock line only)
- `src/app/api/admin/site/route.ts` (docblock line only)
- `tests/door-machine.test.ts` (the one regex + comment)
- `tests/item-page.test.ts`, `tests/stage-title-real-faces.test.ts`,
  `tests/api-voice-sign-in-first.test.ts` (re-grepped, extended for dual-read)
- a new dual-read test file (both-paths handler-identity + zero-literal pin)
- `work-claims/task-280.md`

## NOT-OWNS
- `frens/media/` Vercel Blob object-key prefix (data path, byte-identical,
  step 5)
- `src/app/api/member/bookings/`, `/link-email/`, `/orders/`, `/profile/`
  (pre-existing, unrelated routes — untouched)
- the auth import lines inside each moved route file (T-279 already migrated
  these to `@/lib/member-auth`; this lane's diff is the URL/file move only)
- Ms. Kimi's live lanes (`src/lib/puck-seeds.ts`, `src/lib/puck-blocks/**`,
  `src/lib/page-states.ts`, `src/components/style/**`,
  `src/components/PuckEditor.tsx`, `src/app/packages/**`, `src/app/style/**`)
