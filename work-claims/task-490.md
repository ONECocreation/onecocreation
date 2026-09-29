# TASK-490 claim

Builder: Ms. Kimi's crew (Kimi Code)
Block: 969,090 (height at pickup)
Branch: feat/task-490-live-strip
Worktree: /home/pac/dev/worktrees/task-490
Base: origin/main 7b33fb6 (PR #114, TASK-489)

GOAL (brief `TASK-490-oc-live-strip.md`, design of record
`walks/968624/SCOPE-live-strip.md`, RULED block): wire Love's four
reading-day door buttons to the site-wide live strip. `/api/live` reads
the four door states server-side; any door `published` lights the strip
with `kind: "reading"`, the part number, and the part's title; the
strip's dot PULSES (the named exception to the idle-motion law, the
live dot only, stilled under `prefers-reduced-motion`); every door
fails closed on a throw; the Jitsi room name NEVER enters the payload.

## OWNS

- `work-claims/task-490.md` — this file. Committed alone.
- `work-claims/task-490-register.md` — the lane's running register.
- `src/app/api/live/route.ts` — EDIT: the additive reading case only.
- `src/components/LiveStrip.tsx` — EDIT: feed type, fetch mapping,
  `stripModel` reading case, the dot's pulse class.
- ONE existing sheet — additive pulse class + keyframes +
  reduced-motion block only (the sheet named in SUMMARY).
- `tests/live-strip-reading.test.ts` — NEW.

READ-ONLY (imported, never edited): the four door getters,
`readingPartHref`/`parseReadingPart`, `src/lib/**`, `src/app/reading/**`,
`src/app/a/**`, `tests/go-live-door.test.ts`,
`tests/stage-honours-the-full-scene.test.ts`, `tests/reading-look.test.ts`,
`scripts/shots-fixture.sh`, `src/components/SiteHeader.tsx`,
`src/app/layout.tsx`.

NOT: any gate in the strip (the page gates); any freshness change
(30 s poll, 15 s CDN stay); any restyle beyond the dot's pulse class;
nothing under /a; no KV schema, env, or deploy change.
