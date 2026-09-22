# work-claim — task-381 (OC · the ONE reading schedule source + Love's card to set it)

Lane: the home crew (Sonnet builder, under Number One's gate). Base = onecocreation main
**9552f74bb3e212b6aac412df449018ddef07a9ac** (T-365 merged, PR #30 — `git log -1` on this
worktree's HEAD before any commit matches this sha exactly, reconfirmed at cut). Branch
`feat/task-381-reading-schedule-source`. Worktree cut by Number One at
`~/dev/worktrees/task-381`, `npm ci` run fresh by this builder (550 packages, 0
vulnerabilities). Lane ports **4618–4621**. Brief:
`~/dev/kimi/inbox/TASK-381-oc-reading-schedule-and-notice.md`.

**Split, block 968,047:** the notice itself (a public, visible thing) is a SEPARATE lane,
T-382, held on the Admiral's mockup nod. This lane is the source only — a pure library, a
`SiteConfig.reading` field, and an `/a/site/reading` operator sub-room. **No public
surface** — nothing under `src/app/rooms` or `src/components/rooms`.

Four RULED decisions this lane builds exactly as ruled: **D1** the reading card is its own
sub-room at `/a/site/reading` (not inline in `SiteRoom.tsx`'s Switches card); **D2**
`SiteConfigPatch.reading` is a whole-object replace, same shape as `about`; **D3** the
`/api/admin/site` PUT route refuses a malformed `reading` patch in words, mirroring the
existing `about` refusal; **D4** the zone field is a `<select>` seeded from `USA_ZONES`
with the currently-stored zone kept as an extra option (SlotPicker.tsx's own Map pattern).

## OWNS

NEW `src/lib/reading-schedule.ts` (the pure library — `ReadingSchedule`,
`DEFAULT_READING_SCHEDULE`, `validateReadingSchedule`, `nextReading`), NEW
`src/app/a/site/reading/page.tsx`, NEW `src/app/a/site/reading/SiteReadingRoom.tsx`, NEW
`src/app/a/site/reading/ReadingScheduleCard.tsx` (local placement, mirroring
`about-videos/AboutVideosCard.tsx`'s closer single-endpoint precedent), NEW
`tests/reading-schedule.test.ts` (the pure library), NEW `tests/reading-schedule-config.test.ts`
(the `SiteConfig` field, `sanitizeReading`, the route refusal, the accordion row),
`work-claims/task-381.md` (this file, first commit).

Pinned tests edited ON PURPOSE (authorised in the brief's OWNS section): `tests/site-room-accordion.test.ts`
(the exact-array `SITE_SUBS` pin gains the `reading` row before `brand`, plus one
`siteSubForPath("/a/site/reading")` assertion) and `tests/a-site-rooms-wear-the-gate.test.ts`
(`PAGES` gains the new page; the describe title's "four" becomes "five").

Additive only: `src/lib/site-config.ts` (the `reading` field on `SiteConfig`/`SiteConfigPatch`,
`sanitizeReading`, the two wiring lines in `sanitize()`/`saveSiteConfig()`),
`src/app/api/admin/site/route.ts` (the `readingPatchError` check only), `src/components/console/SiteConsoleShell.tsx`
(the one new `SITE_SUBS` row only).

READ-ONLY (per brief, untouched): `src/lib/booking-time.ts`, `src/lib/us-zip-tz.ts`,
`src/app/a/booking/page.tsx`, `src/app/a/site/SiteRoom.tsx`, `src/app/a/site/community-door/**`,
`src/app/a/site/about-videos/**`, `src/components/console/glass.tsx`,
`src/components/console/CommunityDoorCard.tsx`. `tests/site-config.test.ts` untouched.

## Gates

`npx vitest run` · each live `scripts/*.test.mjs` (`calendar-view.test.mjs`,
`cartridge-identity.test.mjs`, `square-payments.test.mjs`) · `npx eslint src tests
--max-warnings=0` · `npx tsc --noEmit` · `npx next build` (Number One's gate, after
`git merge main`).

## What is NOT in this lane

No public surface — nothing under `src/app/rooms` or `src/components/rooms`. No edit to
`LIVE_SCHEDULE` (`src/lib/live.ts:25`). No production KV/Blob write. No fix to the
`wallClockToUtc` spring-gap/autumn-repeat comment mismatch found in `booking-time.ts` — that
file is READ-ONLY here; the mismatch is reported as a finding, not fixed. No `next build`/gate
script run — Number One runs the gate.

## Cut note

Stamp per the brief, block 968,047 (split) / 968,048 (claimed, Astra's plan review folded).
