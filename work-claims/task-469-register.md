# TASK-469 register — the 12:12 Housewarming row

Branch `feat/task-469-housewarming-row`, base `865773d` (main after
#89–#92). HEAD after this lane: `17c8f58`.

## What changed, and why (the quotes)

Love, passed on by the Admiral (block 968,567): "will you make a 12:12
button that is linked straight to the stage where everyone gets to see
everyone? I wanna have housewarming with introductions and movement
before the reading." The Admiral, same block: "yes lets cut the 12:12
room."

The two-way call itself already exists and needs NO code: at 12:12,
Love opens the Heart Field's live room from `/a/studio`, and every
signed-in visitor on `/rooms/heart-field` gets a two-way Jitsi call.
This lane is ONLY the button — a new FIRST row on `/reading`'s "The
day's agenda" card (TASK-467, merged as #92).

Built:
- `src/lib/reading-day.ts` — `HOUSEWARMING_TIME = "12:12"`, added
  beside `ENCORE_TIME`/`QA_TIME`, same one-line-docblock style, quoting
  Love and the Admiral (block 968,567). The module's own top docblock
  updated from "two clock times"/"three values" to "three clock
  times"/"four values" (12:12 is confirmed one of `slotsFor`'s own
  "five sacred numbers", `booking-time.ts:324-336`, alongside 14:22 and
  15:33 — checked directly, not assumed).
- `src/components/reading/ReadingDay.tsx` — one new import
  (`HOUSEWARMING_TIME`), one new computed prop:
  `housewarmingStartsAtMs={sameDayAt(next.startsAtMs, schedule.tz, HOUSEWARMING_TIME)}`,
  the exact same idiom as the encore/qa lines right beside it.
- `src/components/reading/ReadingDayBody.tsx` — new mandatory prop
  `housewarmingStartsAtMs: number`; a new FIRST `<li>` row using the
  Reading row's EXACT shape: `<b>{clockWords(...)} · The
  Housewarming</b>`, `<em>Introductions and movement with Love. Cameras
  on.</em>`, and the Reading row's own two buttons verbatim (signed in
  → `kit-btn kit-btn-main kit-btn-sm` "Go to the Heart Field" →
  `/rooms/heart-field`; signed out → same classes, "Sign me up" →
  `#sign-up`). Free: no lock, no price line. The file's docblock
  updated from "THREE rows" to "FOUR rows" plus a new paragraph on this
  lane; row comments renumbered ROW 1 (Housewarming) → ROW 2 (Reading)
  → ROW 3 (Encore) → ROW 4 (Q&A); the "row 1 only" prop comment on
  `signedIn` became "rows 1 and 2 only."

No new files beyond the test (`tests/housewarming-469.test.ts`) — the
card was already mounted on `/reading` by TASK-467/#92, so
`src/app/reading/page.tsx` needed no touch and stays out of this
lane's OWNS.

## Pins re-trued

**One**, and it is a fixture-only addition, not a weakening:

- `tests/reading-day-467.test.ts` — `bodyProps()`'s returned object
  gained `housewarmingStartsAtMs: HOUSEWARMING_MS` (a new fixture
  constant, `Date.parse("2026-09-23T18:12:00.000Z")`, 12:12 PM MDT on
  the same fixture day the file already uses), because
  `ReadingDayBodyProps` now requires that field. **Before:** the
  function returned six required fields plus overrides, no housewarming
  key. **After:** seven required fields, `housewarmingStartsAtMs` first.

Checked every other assertion in that file for a row-count or
row-order pin before touching anything else — there is none. No test
in `tests/reading-day-467.test.ts` counts `<li>` elements, indexes into
the rendered HTML by row position, or otherwise depends on how many
rows the card holds; every assertion is a `toContain`/`not.toContain`
substring check, indifferent to a new row appearing anywhere in the
markup. So the fixture addition above is the ONLY change that file
needed, and the full suite (all 42 of its own tests, see below) passes
unchanged in substance.

## Tests

`tests/housewarming-469.test.ts` (NEW, written and committed RED
first, commit `9d2d7c8`, before any build commit): pins
`HOUSEWARMING_TIME === "12:12"`, `clockWords(...) === "12:12 PM MDT"`,
that the card's own first `<li>` is the Housewarming row (not the
Reading row), that "The Housewarming" appears before "The Reading" in
the rendered markup, both button states (`signedIn`/not) with their
exact hrefs and labels, that `kit-btn kit-btn-main kit-btn-sm` rides
every button on the row, that the row carries no `kit-lock-icon` and no
`$` price in any state, and that no em dash appears in the rendered
card either signed out/nothing-entitled or signed in/everything-
entitled.

At the RED commit, 4 of 11 assertions failed (the real pins for a row
that didn't exist: the constant, "The Housewarming" text, row-order,
the 12:12 clock words); the other 7 passed only by coincidence, since
the pre-existing Reading row already shares the same button/no-lock/
no-em-dash contract this new row also carries. After the build, all 11
pass.

`npx vitest run tests/reading-day-467.test.ts tests/housewarming-469.test.ts`:

```
Test Files  2 passed (2)
     Tests  51 passed (51)
```

## Gate

`~/dev/shortcuts/oc-gate.sh /home/pac/dev/worktrees/task-469`, run bare
(never piped through grep before the `&&`), on HEAD `17c8f58`:

```
Test Files  243 passed (243)
     Tests  3147 passed (3147)
scripts/calendar-view.test.mjs: 70 passed, 0 failed
scripts/cartridge-identity.test.mjs: 179 passed, 0 failed
scripts/console-matrix.test.mjs: 14 passed, 0 failed
scripts/fixture-kv.test.mjs: 45 passed, 0 failed
scripts/square-payments.test.mjs: 58 passed, 0 failed
eslint 0
tsc 0
build ok
GATES GREEN
```

(A first run reported `BUILD FAILED` with everything else green — see
Obstacles below: two `oc-gate.sh` invocations were running against the
same worktree at once, and a clean re-run immediately after came back
`GATES GREEN`. Confirmed with a standalone `npx next build` too, exit
0, "Compiled successfully in 2.5s".)

## Shots (SEEN, not assumed)

Build served via `next start` on `127.0.0.1:4893`
(`SEAT_SECRET=throwaway-469`, `NODE_ENV=production`), shot with
puppeteer (`/home/pac/dev/apps/puck-studio/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js`,
`executablePath: "/usr/bin/chromium"`), a fresh browser context per
shot, `waitUntil: "networkidle2"`, theme set via
`page.evaluateOnNewDocument` writing `localStorage["oc-theme"]`,
viewport-only screenshots (never `fullPage`), scrolled to the agenda
card with `window.scrollTo({top: cardTop - 90, behavior: "instant"})`,
viewport height 1500 at 360/390 and 1100 at 1440. All six, signed out:

`/tmp/claude-1000/-home-pac-dev/24e774c2-4341-4868-9ad5-ce8ddc548e73/scratchpad/shots469/`:
- `housewarming-dark-360.png`
- `housewarming-light-360.png`
- `housewarming-dark-390.png`
- `housewarming-light-390.png`
- `housewarming-dark-1440.png`
- `housewarming-light-1440.png`
- `measurements.json` — the raw per-shot measurement dump below.

All six LOOKED AT directly. The Housewarming row sits first, above The
Reading, reads "12:12 PM MDT · The Housewarming" / "Introductions and
movement with Love. Cameras on." / a plain "Sign me up" button (signed
out) with no lock icon and no price line, in both themes, at all three
widths. The Reading row's own "Sign me up" button sits directly below
it with the identical right-edge alignment (both themes, all widths).

Measured (from `measurements.json`, in-page `getBoundingClientRect`,
not eyeballed):

| width | theme | `document.documentElement.scrollWidth - clientWidth` | any `.kit-btn` overflowing its card |
|---|---|---|---|
| 360 | dark | 0 | none |
| 390 | dark | 0 | none |
| 1440 | dark | 0 | none |
| 360 | light | 0 | none |
| 390 | light | 0 | none |
| 1440 | light | 0 | none |

Every button on the card (Housewarming's, the Reading row's, and the
two locked Encore/Q&A buttons) measured `overflowsCard: false` in every
shot — the Housewarming row's own "Sign me up" button right-edge
matches the Reading row's "Sign me up" right-edge exactly at every
width (e.g. 360px: both at `rightEdge: 253.42`, card right `338`; 1440:
both at `rightEdge: 1097`, card right `1120`).

## Kit classes reused / new CSS

Zero new CSS. Reused, verbatim: `card room-card kit-day` (the card's
own shell, unchanged), `kit-h2`, `kit-rows`/`kit-rows-end` (the same
one-row-one-control-on-the-right-edge grid every other row on this card
already uses), `kit-btn kit-btn-main kit-btn-sm` (the one button size
on the whole card, now on eight buttons total across four rows instead
of six across three). No page-local styles added anywhere.

## The Admiral's-hands list

1. This lane assumes Love's own `/a/studio` action opens the Heart
   Field's live room at 12:12 for the Housewarming and again later for
   the Reading itself — both draw visitors into the same
   `/rooms/heart-field` door this button points at. No code change is
   needed for that; it's Love's own operating step on the day.

## Obstacles

1. **A flaky first gate run.** The very first `~/dev/shortcuts/oc-gate.sh`
   call exceeded its 120s tool timeout and the harness moved it to a
   background task; it later reported "BUILD FAILED" with every other
   check green (3147 tests, eslint 0, tsc 0). Investigating turned up
   **two** `oc-gate.sh` processes running against the SAME worktree at
   once (the original backgrounded run plus a second one this agent
   started directly with `nohup` while waiting) — almost certainly two
   concurrent `npx next build` invocations racing over the same `.next`
   directory. A standalone `npx next build` run alone (no concurrent
   process) came back exit 0, "Compiled successfully in 2.5s", and a
   clean single re-run of the full gate script came back `GATES GREEN`.
   Lesson for the next agent: when a gate call times out and gets
   auto-backgrounded, do NOT also start a second gate/build run by hand
   against the same worktree while waiting — wait for the first one's
   notification, or kill it explicitly, before re-running. Two builds
   sharing one `.next` directory is the likely cause of a phantom
   `BUILD FAILED`, not a real code defect (confirmed: no build error
   text appeared in either run's actual output).
2. **No other obstacles.** The existing TASK-467 pattern
   (`reading-day.ts` → `ReadingDay.tsx` → `ReadingDayBody.tsx`, pure
   props, `renderToStaticMarkup` tests) was followed exactly and needed
   no deviation; the new row is a straight copy of the Reading row's own
   shape, so no new CSS, no new component, and no page-mount change were
   needed at all.
