# work-claims/task-391.md — task-391 (OC · the Saturday reading page, W-30)

Lane: the home crew (Sonnet builder), under Number One's gate. Base = onecocreation main
**1c653f1d977e76bec4769c689e5de959f56c98d5** (`git rev-parse HEAD` on this worktree matched
this sha exactly before any commit — "Merge pull request #38 from
ONECocreation/feat/task-383-design-drift-guard"). Branch
`feat/task-391-saturday-reading-page`. Worktree `~/dev/worktrees/task-391` (cut by Number
One), `npm ci` run fresh by this builder (550 packages, 0 vulnerabilities). Lane ports
**4658–4661**. Brief: `~/dev/kimi/inbox/TASK-391-oc-saturday-reading-page.md`. Mockup:
`~/dev/briefings/walk-968036/mockups-1/frag-w30.html` + `notes-w30.md`, both read this
session — M1 RULED APPROVED AS DRAWN (the Admiral, block 968,088). PR title (Number One's
to open, not this builder's): **PAGE · the Saturday reading page**.

ONE new public page at `/reading` (route confirmed free this session — `ls src/app/` shows
no existing `reading` directory besides the operator's `src/app/a/site/reading/`): a server
component reading `src/lib/reading-schedule.ts`'s `ReadingSchedule` source (via
`getSiteConfig()`, `config.reading ?? DEFAULT_READING_SCHEDULE`), never a literal weekday or
clock time anywhere in the page or its helpers — Love retypes the day at `/a/site/reading`
and this page follows on the next reload (`export const dynamic = "force-dynamic"`, the same
pattern `src/app/rooms/[slug]/page.tsx:22` already uses). Named decisions A/B/D applied as
RULED TAKE; C AMENDED — `feat/task-388-reading-sign-up-block` reconfirmed unmerged (zero
commits ahead of main) at cut time, so the page ships with the reading-door CTA alone, no
second door; E already SATISFIED (the mock's nod).

## OWNS

NEW `src/app/reading/page.tsx` (server component: hero, one CTA via
`readingDoorHref(signedIn)`, the "Join me weekly" premise, the "Next reading." card, the four
experience items with the recurrence item DERIVED from the schedule's own weekday, the host
card, `SiteFooter` mounted as home does), NEW `src/components/ReadingHeroCountdown.tsx` (the
one client island — binds T-382's `Countdown` plus the optional "Starting soon"/"Stay tuned"
words to both the hero's date line and the "Next reading." card, importing `noticeState`/
`nextBoundaryMs` from `ReadingNotice.tsx` rather than re-deriving the four-state law), NEW
`tests/reading-page.test.ts`, this file (`work-claims/task-391.md`, first commit).

Additive, narrowly: `src/components/NavMenu.tsx` (one `PAGE_CATALOG` row for `/reading`,
ungated per decision D), `src/lib/site-config.ts` (the matching one `KNOWN_NAV_HREFS` row —
every other line byte-identical; this file is a seam T-387 also touches elsewhere),
`src/app/kit.css` (the five RULED `kitx-` rules appended — `kitx-balanced`, `kitx-flow`,
`kitx-actions`, `kitx-mark`, `kitx-photo`, lifted verbatim from the approved mock's own
`<style>` block, layout-only, no new colour/border/shadow/font value; every other line
byte-identical).

NOT owned: `public/reading/` assets — Love's video explanation and the mobile "Love with a
book" graphic are believed, not yet delivered; both slots ship absent (no placeholder box,
nothing rendered) rather than invented.

## READ-ONLY and FORBIDDEN

READ-ONLY: `src/lib/reading-schedule.ts`, `src/lib/reading-room.ts`, `src/lib/booking-time.ts`,
`src/components/studio-overlay/Countdown.tsx`, `src/components/rooms/ReadingNotice.tsx`
(`noticeState`/`nextBoundaryMs` imported), `src/components/SiteFooter.tsx`,
`src/app/a/site/reading/*`.

FORBIDDEN: any word/image from the Kajabi reference; any hard-coded weekday/time string; any
new CSS file or class beyond the five RULED `kitx-` rules; any new literal colour/border/
shadow/font value; any inline `style={{}}`; any second CTA competing with the reading door; any
edit to `reading-schedule.ts`/`reading-room.ts`; a placeholder box for an absent asset; any
tier or payment check; any page-local timezone math; duplicating the footer; any production
KV/Blob write; any civil-date stamp in commits/claim (block heights only, per this file).

## Gates

This builder runs, inside this worktree only: `npx vitest run` (whole suite), each live
`scripts/*.test.mjs`, `npx eslint src tests --max-warnings=0`, `npx tsc --noEmit`. `next build`,
`scripts/shots-fixture.sh`, and the Chrome walk are Number One's, per this lane's own
instructions (mirrors task-382/task-384's same builder/gate split).

## Cut note

Stamp per the brief, block 968,088.
