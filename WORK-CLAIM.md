# WORK-CLAIM — TASK-132 (Zoom leaves Love's words; her own room — meet.onecocreation.com — comes in)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.17 a₿ (block 965,952)
BRANCH: `feat/task-132-zoom-out-room-in`
WORKTREE: `~/dev/worktrees/task-132`
BASE: main tip `29e69c6` (T-129 merged — `getSiteConfig().meeting` exists and
is the letter's source of truth). T-133 (matrix identity) runs in parallel on
other files — no collision expected.
ROOM: ZOOM OUT, ROOM IN. (1) `src/lib/lead-magnet.ts` — the Read with Love
welcome letter's room line is built from the site's meeting config, not a
Zoom env: `meeting.rail === "jitsi"` → `https://<meeting.jitsiDomain>/
read-with-love` (a fixed public room name; the letter says guests wait for
Love, who is the moderator); `vdo` → the VDO.Ninja guest link for room
`read-with-love` (`https://vdo.ninja/?room=read-with-love`, same param shape
as /meet/[bookingId]); neither → "The room link is coming — I'll send it
before the first reading." The OPTIONAL override env is renamed
`READ_WITH_LOVE_ROOM_URL` (server-side only; `.env.example` renamed with a
comment noting the old `READ_WITH_LOVE_ZOOM_URL` name, renamed by this
task). No "Zoom" anywhere in the letter. (2) Copy sweep — Love's site only:
every Zoom mention in the OWNS files → "live room" / "Love's room" / "a
live weekly meetup in Love's room". The admin rail label "Zoom / any link"
is NOT touched (T-129 owns it behind `allowStaticLinks`). The template repo
is NOT touched. (3) `tests/read-with-love-letter.test.ts` — jitsi config →
the letter carries `https://meet.onecocreation.com/read-with-love` and no
"Zoom"; vdo config → the vdo guest link; unconfigured → the "coming" line;
the override env wins. The site-config module is mocked per test (the
letter's config source pinned, not the fs/KV drivers).
Does NOT touch `.env.local`, :3000/:4100 (the operator's live processes),
the main checkout, or any deployment. Dev server on :3132 only (4132 if a
second is needed), killed by recorded PID. KNOWN SEAMS outside OWNS
(flagged in SUMMARY, not edited): the /a rooms' "Zoom / any link" labels
(src/app/a/booking/page.tsx, src/app/a/site/page.tsx) — T-129's, hidden
behind allowStaticLinks; canvas-zoom code in AliveEffects / PuckEditor /
ImageLightbox is not a meeting hit; src/lib/site-config.ts's own comments
name the static rail "Zoom / any link" (T-129's file, not this lane's).
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge
to main, never push. ENGLISH-PIN. No new dependencies. BFT dating in
comments. Love design laws: no serif faces, contrast ≥ 4.5:1, no color-only
meaning. Module law: no cross-app imports. Derive-or-dash — never a fake
link, number or name.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/lib/lead-magnet.ts` — the room line from the meeting config; env renamed
- `src/components/ReadWithLove.tsx` — door copy + header comment
- `src/components/WildDoors.tsx` — header comment only
- `src/components/SubscribeForm.tsx` — header comment only
- `src/components/sections.tsx` — the two package-card feats lines (copy only)
- `src/lib/tiers-content.ts` — Zoom mentions only
- `src/lib/puck-seeds.ts` — Zoom mentions only (~227, 241, 722, 886, 890, 1062)
- `.env.example` — the env rename + comment
- `tests/read-with-love-letter.test.ts` — the new pins

Brief: `~/dev/kimi/inbox/TASK-132-oc-zoom-out-room-in.md` (cut 0018.06.16 a₿)
Gates: `npx vitest run` ≥ 41 (this main's baseline, must not shrink) ·
`node scripts/calendar-view.test.mjs && node scripts/cartridge-identity.test.mjs
&& node scripts/square-payments.test.mjs` · `npm run lint` = 0 ·
`npx tsc --noEmit` · `npx next build` · shots of the Read with Love door + the
rendered letter HTML in BOTH themes → `~/dev/kimi/outbox/task-132/shots/` ·
the verbatim zoom grep pasted in SUMMARY.md in `~/dev/kimi/outbox/task-132/`
Questions → Number One.
