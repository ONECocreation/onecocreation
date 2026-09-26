# TASK-473 claim

Builder: Sonnet 5 sub-agent for Number One
Block: 968,624 (the Admiral's flow ruling on top of TASK-471, plus one
mid-lane course change from Number One relaying a further ruling on
Part 4 — see Obstacles)
Branch: feat/task-473
Worktree: /home/pac/dev/worktrees/task-473
Base: feat/task-471 @ 06e4b29 (rebased onto it mid-lane after task-471
gained review fixes — see the rebase note below)

The Admiral's flow ruling: "there will be an agenda item that shows what
time each class is. for the end user they will stay on /reading. and love
will start and stop each door. that will open up the screen at the top.
users can have a button that shows the next room is open, and if they
didnt pay then they can have the option to pay. after pay completed take
user back to /reading for the class and show the screen with live" / "no
need to talk about the encore. just have the users pick the button for
the time and the video changes to the correct one."

**COURSE CHANGE (same block, relayed by Number One mid-lane, after the
first pass on Part 4 shipped a Link to `/rooms/<slug>` and polled the
site-wide `/api/live` flag):** the Admiral ruled ONE screen on /reading —
nobody goes to /rooms, signed-in visitors join or leave any room right
there. Part 4 was rebuilt as a thin caller of a NEW generic
`ReadingStageDoor` component (the same one Part 3 uses), polling
`/api/qa-door` (T-475, a separate lane, not built here) instead of
`/api/live`. See Obstacles for the full story and what changed.

## OWNS

New files:
- `src/lib/reading-parts.ts` — pure: `ReadingPart` (1-4), `PartDoorInfo`,
  `defaultReadingPart()` (the part whose door is open, latest opened; else
  the next part by time), `OpenFlags`/`CLOSED_FLAGS`, `latestOpenPart()`,
  `openDoorNotice()` (the "next room is open" courtesy line).
- `src/components/reading/ReadingPartContext.tsx` — the ONE client
  selection state (`ReadingPartProvider`/`useReadingPart`), shared by the
  stage band and the agenda brick. Degrades to an inert Part-1 default
  outside any Provider (never throws) so every existing
  `renderToStaticMarkup` pin across the reading surface keeps working
  unchanged.
- `src/components/reading/ReadingPartSelectLink.tsx` — the agenda row's
  own time button: an `<a href="#stage">` that also calls `select(part)`
  on click (graceful degrade without JS: still lands on the stage).
- `src/components/reading/ReadingDayOpenNotice.tsx` — the one quiet line
  above the agenda naming whichever door just opened elsewhere (item 3's
  OR clause), polling `/api/stage1`/`/api/stage2`/`/api/qa-door` at the
  house's 20 s cadence.
- `src/components/reading/ReadingStageDoor.tsx` — the GENERIC gated-door
  top screen (course change): `ReadingStageDoorBody` (pure) + a default
  export that polls whichever `door` ("stage2" | "qa") it's given. Shared
  by Parts 3 and 4 — one implementation, never two.
- `src/components/reading/ReadingStagePart3.tsx` — thin caller: door
  "stage2", composes the not-owned card from `encoreFloor`.
- `src/components/reading/ReadingStagePart4.tsx` — thin caller: door
  "qa", composes the not-owned card from `qaOffer`. No `/api/live`, no
  `/rooms/<slug>` link, no `signedIn`/`qaEntitled` props (the wire's own
  `decision` already encodes both, server-side, the same law
  `/api/stage2` already keeps).
- `src/components/reading/ReadingStageDeck.tsx` — mounts exactly ONE of
  `ReadingStage` (parts 1/2) / `ReadingStagePart3` / `ReadingStagePart4`,
  chosen by the shared selection. An if/return chain — switching parts
  naturally unmounts the old screen (its own JitsiRoom disposes) before
  the next one mounts; "exactly one conference at a time" falls out of
  React's own rendering, no extra guard needed.
- Tests: `tests/reading-parts-473.test.ts`, `tests/reading-part-select-473.test.ts`,
  `tests/reading-stage-door-473.test.ts`, `tests/reading-stage-deck-473.test.ts`,
  `tests/reading-return-path-473.test.ts`.
- `work-claims/task-473.md` — this claim.

Edited files:
- `src/app/reading/page.tsx` — wraps the stage band + agenda in
  `ReadingPartProvider` (default part computed once, server-side, from
  Stage 1/Stage 2's real state — Part 4's door has no server-side reader
  yet, course change, so it reads closed until T-475 lands); mounts
  `ReadingStageDeck` instead of a bare `ReadingStage`; composes Part 3/4's
  own props (`encoreFloor`/`qaOffer`, called again here rather than
  threaded through `ReadingDay.tsx` so that file's own tested shape stays
  untouched); drops "the Playground," from the "What you will experience"
  line (item 4).
- `src/components/reading/ReadingStage.tsx` — REMOVED the Playground
  banner entirely (its job is now `ReadingDayOpenNotice`) and its own
  `/api/stage2` poll; the ended card's "Watch part two" is now
  `ReadingPartSelectLink` (picks Part 3 in-page) instead of a Link to
  `/reading/playground`. Parts 1/2's own gating (phase/signedIn/room) is
  UNCHANGED — this file stays exactly what task-471 built, minus those two
  retirements.
- `src/components/reading/ReadingDayBody.tsx` — every row's button is now
  the time button: rows 1/2 (signed in) and rows 3/4 (entitled) use
  `ReadingPartSelectLink`; row 3's title drops "the Encore in the
  Playground" for the neutral "The book talk" (its `encoreFloor`/
  `encoreEntitled`/`ENCORE_TIME` internal names are UNCHANGED, only
  visible copy moved); row 3's unlock label is "Unlock the book talk"
  (was "Unlock the Encore"); mounts `ReadingDayOpenNotice` above the rows.
- `src/components/reading/ReadingDay.tsx` — dropped the now-unneeded
  `ROOMS`/`qaRoomSlug` computation (course change: the notice polls
  `/api/qa-door` directly now, no site-wide room-slug match needed).
- `src/components/store/OrderStatus.tsx` — NARROWED item 5 (return path),
  per the brief's own explicit fallback: a fixed "Back to the reading"
  link (`/reading#stage`) shown on a settled order containing
  `weekly-one-week` or `q-a-meetup-with-love`, independent of the site's
  generic membership `door` (`READING_ROOM_PATH`, still
  `/rooms/heart-field` — a different, wider mechanism, untouched).
- Pre-existing test files re-trued for the Playground-banner removal, the
  ended card's new #stage pick, row 3's neutral title/label, the
  `qaRoomSlug`-then-dropped prop churn, and page.tsx's `countdown: (`/
  `following,` object-literal shape (was bare JSX attributes before
  `ReadingStageDeck` existed) — all still proving the SAME rulings they
  always did, just against the current shape:
  `tests/housewarming-469.test.ts`, `tests/reading-buttons-phone-463.test.ts`,
  `tests/reading-day-467.test.ts`, `tests/reading-look.test.ts`,
  `tests/reading-love-cover-456.test.ts`, `tests/reading-page.test.ts`,
  `tests/reading-playground.test.ts`, `tests/reading-polish-466.test.ts`,
  `tests/reading-small-watch-464.test.ts`, `tests/reading-stage.test.ts`,
  `tests/reading-watch-heart-field-457.test.ts`,
  `tests/saturday-polish-454.test.ts`.

## Kit classes reused / new CSS

Zero new CSS, zero inline styles. Reused verbatim: `.kit-stage`,
`.kit-stage-media`, `.kit-stage-waiting`, `.kit-stage-waiting--cover`,
`.kit-stage-viewer`, `.kit-stage-controls`, `.kit-stage-chip`, `.kit-btn
kit-btn-main kit-btn-sm` (the one button size, unchanged), `.kit-rows`/
`.kit-rows-end`, `.kit-lock-icon`, `.kit-text-quiet`, `.kit-body`,
`.kit-btn-row`, `.kit-day`. `ReadingDayOpenNotice`'s line is a bare
`.kit-text-quiet` paragraph — no new class.

## What was NARROWED (reported, not silently dropped)

1. **Item 5 (return path)** — the brief's own fallback text: "do a 'Back
   to the reading' link on the order page when the order contains
   weekly-one-week or the Q&A pass." Built exactly that (OrderStatus.tsx),
   NOT the fuller `orderDoorUrl(..., "return")` → cart → checkout
   same-origin-return-path threading the brief also sketched. The generic
   membership `door` mechanism (`READING_ROOM_PATH`) is untouched — a
   different, site-wide door this lane doesn't own.
2. **Parts 1 and 2 share ONE top-screen view.** Since they are literally
   the same door (Stage 1), selecting between them changes only the
   agenda row highlighted — the stage content (countdown, waiting
   picture, mounted room) stays targeted at the Housewarming (S8's own
   fix, task-471), never re-derived per selected part. Building a second
   countdown variant for Part 2 specifically was cosmetic, not required by
   the ruling's functional intent (open/closed/mount is identical for
   both), and risked the S8 fix task-471 just landed.
3. **The "next room is open" notice (item 3) took the OR clause**: "a
   single line above the agenda naming the time," not a per-row relabeling
   ("Join now" replacing each row's own button text). Simpler, and avoids
   threading live door-open flags into every row's own button component.
4. **Part 4, post-course-change, has no server-side default-selection
   reader.** `/api/qa-door` (T-475) doesn't exist yet, and there is no
   `getQaDoorState()`-shaped server function to call from `page.tsx`
   (unlike Stage 1/2). Part 4's door entry in the default-selection array
   reads `open: false` always, honestly, until T-475 lands — the CLIENT's
   own poll (`ReadingStageDoor`/`ReadingDayOpenNotice`) picks it up live
   the moment that route exists, no further code change needed here.

## Gate

`bash /home/pac/dev/shortcuts/oc-gate.sh /home/pac/dev/worktrees/task-473`:

```
Test Files  250 passed (250)
     Tests  3262 passed (3262)
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

## What was NOT done (out of scope for tonight)

- No shots/visual walk (Chrome-shots method) were taken — source + test
  verified only. A real Chrome walk of /reading (all four parts, signed
  in and out, entitled and not) is still owed before Saturday.
- `/api/qa-door` itself (T-475) was NOT built — a separate lane, per the
  course change's own instruction. Until it lands, Part 4 always shows
  its closed state.
- The default-part server computation for Part 4 stays `open: false`
  always (see Narrowed item 4) — will read correctly live via the client
  poll once T-475 ships, but the SSR-computed default selection won't
  prefer Part 4 even when it's genuinely open until then.
- No mockup was made or shown (this ruling was scoped as the flow fix, not
  a new visual design — no new look was introduced; every surface reuses
  existing kit classes verbatim).

## Obstacles

1. **The base branch moved out from under this lane mid-flight.**
   `feat/task-471` gained a review-fix commit (`06e4b29`, three fixes:
   Stage 1's room now issues only for a signed-in caller; the hangup
   unmounts the embed synchronously before its re-check fetch; an em dash
   removed from Stage1Card's admin copy) AFTER this lane's worktree was
   cut from the earlier tip. Caught by a mid-lane message from Number One
   before any of this lane's own commits existed, so `git rebase
   feat/task-471` fast-forwarded cleanly — no conflict, no lost work. Both
   review-fix laws (signed-in-only room, synchronous unmount-before-
   recheck) were already the pattern this lane's own new
   `ReadingStageDoor.tsx` follows (it never issues a room to a caller the
   wire itself hasn't already gated, and its own `onEnded` sets `left`
   before anything else).
2. **The real size of "the smallest correct version" only became visible
   mid-build.** ACTIONS.md/VERDICT/L2L3-TRACE describe the full four-part
   ruling in terms that, read literally, ask for a much larger rebuild
   (four fully independent tabbed screens, each with its own rich
   entitlement UI) than task-471's own architecture supports without
   touching ~16 already-passing, already-pinned test files' exact prop
   shapes. Chose a narrower path: keep `ReadingStage.tsx`'s own
   parts-1/2 machinery COMPLETELY untouched in its gating logic (only the
   banner and the ended-card door were removed, both required by item 4
   regardless), and add Parts 3/4 as NEW, separate, small screens rather
   than folding everything into one rewritten state machine. This kept
   the diff to the 16 pre-existing test files small and mechanical (label/
   href/prop-shape re-trues, not logic rewrites) at the cost of a slightly
   less unified internal architecture (three sibling stage components
   under one deck, rather than one generic four-state machine) — a
   reasonable trade given tomorrow's live show.
3. **The Q&A room's REAL identity (a persistent Matrix community room,
   `#inner-sanctum`, with its own tested `/rooms/<slug>` classroom
   machinery — roster, moderation, scenes) is nothing like Stage 1/2's
   ephemeral Jitsi pilots.** The first pass reused that existing, working
   system (a Link out + `/api/live`, the site-wide banner's own already-
   public flag) specifically BECAUSE building a brand-new inline mount
   for a persistent room the night before a live show, with zero rehearsal
   time, seemed like the higher-risk path. The Admiral's course change
   overruled this: ONE screen, no `/rooms` trip, ever. The generic
   `ReadingStageDoor` this produced is smaller and cleaner than either
   of the two paths considered alone (it just needed T-475's own
   `/api/qa-door` to exist — which it doesn't yet, so Part 4 is honestly
   inert, closed, until that lane ships). Net: the course change made the
   final shape SIMPLER (one generic component, not two divergent ones),
   but it also means Part 4 is not really "live" tonight — it will start
   working the moment T-475 merges, with zero further code here.
4. **`/api/qa-door`'s exact response shape is ASSUMED, not verified** —
   the course-change instruction says it "will mirror /api/stage2 at
   /api/qa-door, with the same JSON shape and min tier C," and this lane
   built `ReadingStageDoor` against that exact contract
   (`{ok, open, decision, reachable?, room?}`). If T-475 lands with any
   field named differently, `ReadingStageDoor`'s poll (`d.decision ??
   (d.open ? "open" : "hidden")`, `d.reachable`, `d.room`) is the one
   place to check first — never re-guessed elsewhere, since both doors
   share this one wire-parsing site.
5. **No live rehearsal of any of this against the real Jitsi/site-config
   stack** — S1/S2 (whether guests actually see video through the bridge)
   remain L1's own territory, untouched and unverified here, exactly as
   task-471 already flagged.
