# TASK-466 register — reading block-picture polish (block 968,561)

Branch: `feat/task-466-reading-polish`
Worktree: `/home/pac/dev/worktrees/task-466`
Base: `a2cc258` (main after #87/#88)
HEAD: `877ec90`

## What changed, and why (the Admiral's words)

1. **"all of these buttons would be centered."** Every button row on the
   card and the Playground banner was ALREADY centered by kit.css
   (`.kit-stage-controls .kit-btn-row{justify-content:center;width:100%}`
   for the card, `.kitx-actions{justify-content:center}` for the banner) —
   confirmed by the shot measurements below (`leftGap === rightGap` on
   every one of 24 button captures). No new centering CSS was needed or
   added.

2. **"the watch again is not going to happen right now. but we can change
   this to the watch 2nd part in the playground if the user isnt a member
   for that package we would show a lock icon and have them go through the
   added to cart pay function."** "Watch again" is retired on the ended
   card in BOTH variants (still published, or closed underneath) — there
   is no replay. In its place, one link to `/reading/playground`; that
   page already owns sign-in, the package/add-to-cart door and the join
   for real (unread here — this lane only links to it). A visitor who
   doesn't clear the Playground's floor yet sees a lock glyph (inline SVG,
   `aria-hidden="true"`) ahead of the label plus, in words underneath
   (never the icon alone — the legibility doctrine), who it's for: "Part
   two is for {floor} members and up." An entitled visitor sees the same
   link with neither. The link steps aside when the Playground banner is
   ALREADY showing its own door (`playgroundOpen`) — never two Playground
   buttons on the page at once (proven: the `ended-banner` shots show only
   the banner's "Go to the Playground", never a second one).

3. **"this would be an item where the big - needs to be replaced we have a
   new line that should be started here. this would be considered slop."**
   "The reading has ended — thank you for being here." is now two
   sentences on two lines: "The reading has ended." then "Thank you for
   being here." The failed state's "The picture didn't open just now — the
   reading itself is fine on our side." lost its dash the same way (one
   line, two sentences: "...just now. The reading...").

4. **"noticing all the buttons here are not the same size everything it
   doesnt look like our style team looked at this before hand."** Every
   `kit-btn` on the card and banner now carries `kit-btn-sm` — "Try again"
   and the ended/left "Watch again" (now "Watch part two" on ended; "Watch
   again" survives unchanged on left) were the last full-size holdouts.
   Confirmed by the shot script: all 24 captures show `kit-btn-sm` on
   every rendered button, no exceptions.

5. The floor name is never a literal. `reading/page.tsx` derives it from
   `TIERS[STAGE2_MIN_TIER].name` and the lock from `tierForSubject` +
   `tierSatisfies(tier, STAGE2_MIN_TIER)` — the exact composition
   `/api/stage2/route.ts`'s GET uses — so this stays true the moment the
   parallel TASK-465 lane moves `STAGE2_MIN_TIER` from `"A"` to `"B"`.
   `src/lib/stage2-access.ts` was never touched by this lane.

## Obstacle found and fixed only after SEEING it (read this before trusting the unit suite alone)

The task's own suggested label, **"Watch part two in the Playground"**,
passed the entire unit suite (renderToStaticMarkup has no layout engine —
it cannot see width) but measured **~382px wide** at `kit-btn-sm` in a
real browser and **bled ~34px past the ended card on a 360px phone (~19px
at 390px)** — `.kit-stage{overflow:hidden}` silently clipped both ends of
the words. Screenshot evidence before the fix:
`/tmp/claude-1000/-home-pac-dev/24e774c2-4341-4868-9ad5-ce8ddc548e73/scratchpad/shots466/ended-360-light.png`
(first capture, since overwritter) showed "ATCH PART TWO IN THE PLAYGROUN"
— both edges cut off. This is the exact clipping shape TASK-463/464 fixed
for two earlier labels by resizing the CLASS; here the class was already
the smallest one (`kit-btn-sm`), so the fix had to be the WORDS. The
label shipped is **"Watch part two"** — measured 266px wide, dead
centered (24px/24px), zero page overflow at every width. This is a
judgment call, not the Admiral's own exact words (he never dictated a
literal label string) — flagging it plainly for his review rather than
guessing further.

## Pins re-trued (file:line before → after)

- `tests/reading-stage.test.ts`
  - `bodyProps()` default: added required `playgroundLock: { locked: false, floorName: "Test Tier" }`.
  - "ended — ... Watch again only while still published" describe →
    renamed "ended — ... TASK-466 (block 968,561) retired Watch again for
    one Playground door, in BOTH variants"; its 3 `it`s re-trued: the
    em-dash sentence assertion → two-sentence assertions; `toContain("Watch
    again")` → `not.toContain` + `toContain("Watch part two")` +
    `toContain('href="/reading/playground"')`; the closed-underneath case
    re-trued the same way (it now DOES carry a control, where before it
    carried none).
  - "the Playground banner ... closed Stage 2 (playgroundOpen false)
    renders NO banner" — its `not.toContain("/reading/playground")`
    assertion is now conditional on `!over.ended` (the ended case
    legitimately carries its own Playground link when the banner isn't
    open; the banner-specific "Want an encore?" string is still asserted
    absent unconditionally).

- `tests/reading-watch-heart-field-457.test.ts`
  - `bodyProps()` default: added `playgroundLock`.
  - "ended, still published: Watch again links to /rooms/heart-field" →
    renamed and re-trued to assert NO Watch again, NO `/rooms/heart-field`,
    and the new Playground link instead.

- `tests/reading-small-watch-464.test.ts`
  - `bodyProps()` default: added `playgroundLock`.
  - Describe block renamed "SUPERSEDED by TASK-466"; the
    "ended-while-published: Watch again is kit-btn kit-btn-main, no
    kit-btn-sm" pin is replaced (no Watch again at all now); the
    "left-while-published" pin is re-trued from "no kit-btn-sm" to
    "kit-btn-sm" (ruling 3 — one size everywhere; left kept its label,
    lost its full size).
  - Module docblock: added a paragraph naming the supersession instead of
    rewriting the original TASK-464 record.

- `tests/reading-love-cover-456.test.ts`, `tests/reading-buttons-phone-463.test.ts`
  - Prop-widening only (`playgroundLock` added to the fixed `body`/`render`
    literal); no assertion changed — neither file renders the ended card's
    lock, and the cover-art/phone-fit pins they own are untouched.

- `tests/reading-page.test.ts`
  - "no tier or payment logic anywhere on this page" → re-trued (not
    weakened) to: no payment logic ever, AND the page's one sanctioned
    entitlement read must go through `tierForSubject(`, `tierSatisfies(`
    and `STAGE2_MIN_TIER` (the exact `/api/stage2/route.ts` composition),
    AND never a literal tier letter as a comparison target. This is a
    deliberate, ground-truth expansion of the page's scope per this
    lane's own contract (block 968,561) — the page now legitimately reads
    entitlement, so the old blanket ban is replaced with a narrower,
    stronger one.

## Kit classes reused / new CSS

Reused (no changes): `kit-btn`, `kit-btn-main`, `kit-btn-sm`, `kit-btn-row`,
`kit-stage-controls` (its existing `.kit-btn-row{justify-content:center;
width:100%}` child rule), `kitx-actions` (the banner's existing centering
modifier), `kit-text-quiet`, `kit-body`, `kit-card`, `kit-card-body`,
`kitx-flow`, `kit-stage2-card`.

New CSS — **one rule**, `src/app/kit.css`:
```
.kit-lock-icon{margin-right:6px;vertical-align:-2px}
```
Reason: spacing/baseline for the inline lock glyph only — no colour of its
own (the icon inherits the link's ink via `currentColor`, same as
`WildDoors.tsx`'s `INSTAGRAM_GLYPH` pattern). Every button row the icon
sits inside was already centered by existing kit.css rules; this is not a
centering rule and doesn't duplicate one. Confirmed harmless against the
design-drift ceilings (ReadingStage.tsx carries no `style={{` — the icon
uses a plain `className`, not an inline style — and the new kit.css rule
uses neither `!important` nor a serif font, the only two CSS metrics that
gate).

## Follow-ups NOT built this lane (read-only per the claim)

- `src/components/rooms/ReadingSignUp.tsx` — the "Keep me posted" button
  (member kind, public variant) is **already centered**: its `<form
  className="kit-inline-form">` carries no `<Field>` in that branch, and
  `.kit-inline-form{display:flex;...justify-content:center...}` applies
  directly (kit.css's own comment: "Only forms with a field become grids;
  the member's button-only form stays flex."). No change needed or made.
- The host section's "Back to the reading" button
  (`src/app/reading/page.tsx`, already `kit-btn-sm`) sits inside
  `.kitx-host .kit-btn-row{justify-content:flex-start}` (desktop) /
  `justify-content:center` (mobile, ≤640px) — a deliberate two-column
  left-aligned layout (photo left, text+button right, both left-aligned)
  distinct from the stage card's centered-column layout. The one existing
  class that centers a row unconditionally, `.kitx-actions`, ALSO sets
  `flex:1 1 240px;max-width:320px` on its child — it would stretch this
  one button to a different width rule than every other `kit-btn-sm` on
  the page. Since no existing kit class centers this row without changing
  its sizing behavior, and the claim's contract says "otherwise leave them
  and list them in the register as a follow-up," this is left as-is.
  Flagging for the Admiral: if he wants it centered too, it needs either a
  new kit-level modifier (plain `justify-content:center`, no `flex-basis`
  override) or a deliberate call that the host block's left-alignment is
  intentional and this one row is the exception.
- The "left" state (K122 item 8, "You left the reading.") — **CONFIRMED
  STILL REACHABLE** since TASK-457, despite that lane's own docblock
  claiming "every former Watch control is now a plain Link": the wired
  `watch()` function (still called by `tryAgain()` from the "failed"
  state's "Try again" button, `ReadingStage.tsx:468`) still sets
  `watching=true` and mounts `JitsiViewer` LOCALLY on a successful
  re-fetch — it never redirects. A visitor who hits "failed" then "Try
  again" successfully can therefore still reach "watching" on /reading
  itself, and a subsequent hangup (`viewerEnded()`) on a still-published
  stage reaches "left". This lane kept its link/label/behavior unchanged
  (only resized to `kit-btn-sm`, ruling 3) since it is rejoining the LIVE
  show, not a replay. The dead in-place-mount removal TASK-457's docblock
  promised is still the "after-Saturday tidy lane," not this one.

## Shot measurements (all 24: 4 states x 3 widths x 2 themes)

Server: `next build` + `next start -p 4889` (production, `SEAT_SECRET=
throwaway-466`). Shots: Puppeteer via
`/home/pac/dev/apps/puck-studio/node_modules/puppeteer`, `executablePath:
/usr/bin/chromium`, a fresh `browser.createBrowserContext()` per run,
`/api/stage1`/`/api/stage2` forced via request interception (ended forced
by serving `published` on the first poll then `closed` from the second —
the real 20 s poll cadence, waited out for real, not mocked away).
PNGs: `/tmp/claude-1000/-home-pac-dev/24e774c2-4341-4868-9ad5-ce8ddc548e73/scratchpad/shots466/{state}-{width}-{theme}.png`
(`closed`, `live`, `ended`, `ended-banner` x `360`/`390`/`1440` x
`light`/`dark`).

Aggregate result across all 24 captures (script:
`/tmp/claude-1000/-home-pac-dev/24e774c2-4341-4868-9ad5-ce8ddc548e73/scratchpad/shot466.cjs`,
full JSON:
`/tmp/claude-1000/-home-pac-dev/24e774c2-4341-4868-9ad5-ce8ddc548e73/scratchpad/shot466-v2.log`):

- `document.documentElement.scrollWidth - innerWidth` = **0** on every one
  of the 24 captures (no horizontal page overflow at any width/theme/state).
- Every rendered `kit-btn` carries `kit-btn-sm` in its class list — 24/24.
- Every button's `leftGap === rightGap` (measured against its
  `.kit-stage-controls`/`.kit-card-body` ancestor) — dead centered on
  24/24 captures. Sample rows (360px, light):
  - closed: "Go to the Heart Field", w=266, gaps 24/24
  - live: "Watch Love live", w=266, gaps 24/24
  - ended: "Watch part two", w=266, gaps 24/24, lock svg present, floor
    line "Part two is for Weekly Intuitive members and up." present
  - ended-banner: "Go to the Playground" (banner's own), w=266, gaps
    25/25; the ended card's own link is absent (no duplicate)
- `ended-banner` state confirms the no-duplicate rule directly: `Watch
  part two` never appears when `playgroundOpen` is true; only the
  banner's `Go to the Playground` renders (matched by
  `tests/reading-polish-466.test.ts`'s own pin of the same rule).
- The lock icon + floor words rendered on every `ended` capture (the
  throwaway server has no real signed-in member session, so every visitor
  reads as anonymous/locked — the honest default; the UNLOCKED render
  (no icon, no floor line) is unit-tested in `reading-polish-466.test.ts`
  but not separately screenshotted, since faking an entitled member
  session in this environment would mean fabricating vault/KV state
  outside this lane's scope).
- textContent (not innerText) was used for every label match in the shot
  script, avoiding the uppercase `text-transform` trap named in the brief.

## Gate

```
$ ~/dev/shortcuts/oc-gate.sh /home/pac/dev/worktrees/task-466
Test Files  238 passed (238)
     Tests  3010 passed (3010)
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

## Obstacles

1. **The clip bug the unit suite couldn't see** (detailed above) — the
   task's own suggested exact label overflowed at phone widths;
   `renderToStaticMarkup` has no layout engine, so only the real-browser
   shot pass caught it. Resolved by shortening the label to "Watch part
   two"; flagged for the Admiral since it changes his suggested wording,
   even though he never dictated it as a literal string.
2. **The "no tier or payment logic" test had to be re-trued, not just
   satisfied** — this lane's own contract requires `reading/page.tsx` to
   read entitlement server-side for the first time ever on that page.
   Re-true, not delete: the new assertion is narrower AND stricter (bans
   literal tier letters outright) than the one it replaces, so the guard
   the original test existed for (no hand-rolled payment/tier gate) still
   holds.
3. **`STAGE2_MIN_TIER`/TASK-465 collision risk** — this lane reads
   `STAGE2_MIN_TIER` and `TIERS[STAGE2_MIN_TIER].name` in two files
   (`reading/page.tsx`, and indirectly via the floor-name prop in
   `ReadingStage.tsx`) but never edits `src/lib/stage2-access.ts` itself
   and never writes a literal tier letter/name anywhere in source (only
   test fixtures use a placeholder "Test Tier" string, never asserted
   against a real tier name). Should merge cleanly with TASK-465's value
   change (A → B) with no rebase conflict expected, since the two lanes
   touch disjoint files except for reading (`reading/page.tsx`'s ~line
   143 "What you will experience" hunk, which this lane never touched —
   confirmed by diff: only the props block and the new derivation right
   above `return` were added).
4. **The "left" state's continued reachability** — TASK-457's own
   docblock claims every former Watch control is now a plain Link with no
   in-place mount, but the wired `watch()`/`tryAgain()` path still mounts
   `JitsiViewer` locally on a successful re-fetch. This is pre-existing
   behavior this lane did not create or change (only resized its "Watch
   again" label) — noted for whoever picks up the "after-Saturday tidy
   lane" TASK-457 deferred, so the dead-path removal doesn't accidentally
   break a still-reachable state.
5. **The host "Back to the reading" button and `ReadingSignUp`'s button**
   — left untouched per the claim's own "otherwise leave them and list
   them in the register" instruction; see Follow-ups above for exactly
   why (one is already correct, one has no side-effect-free existing kit
   class to reuse).
