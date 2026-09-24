# REGISTER — task-438 (block 968,222; HOLD LIFTED block 968,269 · 0018.07.05 a₿)

Stage 1 on `/reading` as a one-way house Jitsi room + the approved round-3
reading look. Brief: `~/dev/kimi/inbox/TASK-438-oc-stage1-oneway-jitsi.md`
(core 1–164, "Your actions" 165–180, Amendment 1 182–273, Amendment 2
274–400 — Amd 2 wins over Amd 1, HOLD LIFTED 407–424).

## Fix round (K122, block 968,284)

The gate review's thirteen findings, fixed on top of `e4acaa0` (Number
One's merge of main `1f1acd9`). Note:
`~/dev/kimi/inbox/K122-438-fix-round-before-the-pr.md`. Red first: the
pins for 6a/7/8/SEC-4 (plus the flips for 1/2/3/4/9/10) landed as commit
`3dd2661` — 21 failed / 118 passed across the five affected suites, every
failure a pin for a fix not yet built; item 13's four pins went red the
same way before their fix.

1. **OP-1 narrow stacking** — `Stage1Card` carries `kit-stage1-card`;
   under the READING LOOK banner a ≤768px media query stacks each
   `.kit-rows>li` (words, state line, control on the row's right edge).
   The base `1fr auto` is untouched, so Stage2Details' prices keep the
   row's right edge at 390 (SHEET-live-390 honoured). Pins: the class in
   stage1-card.test.ts, the rules in reading-look.test.ts.
2. **Host state line** — the host row's words are static again and a
   `<em data-host={phase}>` carries HOST_WORDS verbatim from the note
   (closed / prepared / published). One pin per phase in
   stage1-card.test.ts (each asserts exactly one `<em`; published asserts
   no "then Publish" leaks into the other phases).
3. **Disabled look** — `.kit-rows-end :disabled` /
   `[aria-disabled="true"]` get opacity .55 + not-allowed, scoped to the
   rows' control cell. Pin in reading-look.test.ts.
4. **Re-read after refusal** — the operator card's `refresh()` (a fresh
   no-store GET) now runs in the act's refusal AND catch paths, so a
   refused/failed PUT re-reads the truth instead of keeping stale words.
   Pin: ≥2 `void refresh()` occurrences.
5. **SEC-4** — the admin PUT's action block sits in a try/catch: a store
   that doesn't answer returns `jsonNoStore({ok:false,reason:"the stage
   store didn't answer — nothing changed"},500)`. Behavioural pins for
   prepare and close in admin-stage1-route.test.ts (fetch throwing →
   500, no-store, the exact body).
6a. **Countdown into the island** — `ReadingHeroCountdown` gains
   `whenOnly`; the page hands TWO server-composed nodes into
   `ReadingStage` (`countdown`, `countdownWhen`) and the island shows the
   cells only while closed, the when-lines until ended, neither in ended.
   Body pins per phase + page/stage source pins.
6b. **Band rhythm** — `.sky-stage .kitx-flow{gap:12px}`, kicker/h1
   margins 0 inside the band, `.sky-stage .kit-count{margin-top:10px}` —
   the mock's own numbers. Measured against the mock directly (its own
   fragments + mock.css composed in a headless browser): h1 151.6 /
   day 211.8 / frame 440.2 at 1440 closed — byte-identical to the mock's
   own 151.6 / 211.8 / 440.2 (the note's parenthesized ~158/~227 were
   approximations; frame's ~441 was exact). At 390×844 published first
   paint the Watch button sits at y 664–734, fully inside the fold — the
   note's mock numbers to the pixel.
7. **Following date** — exported pure `readingShownNext(next, following,
   nowMs)`; the page derives `following = nextReading(schedule,
   next.endsAtMs)`; the island's `markEnded` computes the ended words'
   date handler-side (the purity law — no Date.now() in render). Pin:
   three clocks (before/at/after next's start) with `toBe` identity.
8. **Hangup ≠ ended** — the viewer's own hangup re-reads `/api/stage1`
   fresh (no-store): still published → "You left the reading." + Watch
   again; closed underneath → the ended words; a failed read → ended
   (honest, never a stuck room). Pins: the left branch render and ≥3
   no-store fetches in source.
9. **Signup gap** — `.kit-signup` slimmed to positioning; the 16px gap
   lives on `.kit-signup .kit-card-body` (the Card wraps children in
   `.kit-card-body` — the outer gap never landed). Pin in
   reading-look.test.ts.
10. **Card once watching** — `showStage2Card = watching || ended ||
    stage2Room !== null`: the published first paint has no Stage 2 card
    (the open sheet), the card appears the moment the viewer watches (the
    live sheet). The published pin flipped + a watching-has-card pin.
11. **Deviation (j)** — declared, not built: the guest form is NOT
    server-rendered (see Deviations).
12. **REGISTER moves off the repo root** — claim widened by
    `work-claims/task-438-register.md` (`d64dee2`), then `git mv`
    (`351768f`). Echoed as deviation (k).
13. **(Appended to the note at block 968,284, after the Admiral's word)**
    With the schedule OFF, `/reading` is a clean "date to come" page:
    Stay in the know shows in EVERY schedule state (the off-gate is now
    the room variant's only; the public card's words name no date), the
    blocks countdown renders NOTHING when off (the pin the item
    supersedes — "Stay tuned, with love." in the band — was flipped; the
    hero/card variants keep their off words byte-identical), and the
    ended words say "Love will share the next reading date soon." —
    never "The next reading is …". Four pins with the `on:false` fixture.
    The weekly case is byte-exactly what items 6–7 made it (their pins
    untouched, green).

Test counts: 2671 passed at `e4acaa0`'s gate → **2739 passed (219
files)** after the round (the merge brought two suites; the round added
the red pins and item 13's four). The five affected suites: 139/139
before item 13, 149/149 across the four item-13 suites after.

Also this round: `tests/reading-letters.test.ts` grew a fake-timer pin
(`vi.setSystemTime(TICK_15Z)` in the day-of describe) — the fixture's
STARTS_AT_MS crossed the real clock mid-session and `sendReadingDayOf`
honestly re-checks `Date.now()` at send time. Test-only; no lib change.

Gate results (verbatim, `~/dev/shortcuts/oc-gate.sh
/home/pac/dev/worktrees/task-438`, block 968,284):

```
census: 1119 objects, baseline 1119 · families: 179/12/5/8/61/0 · fonts: 47 token/32 literal
 Test Files  219 passed (219)
      Tests  2739 passed (2739)
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

The census needed NO baseline move this round (1119/1119; the new
`.kit-stage1-card` media rules declare no fonts and no new literals).

## What landed, file by file

- `src/lib/stage1.ts` — the three-phase lifecycle (`closed → prepared →
  published`, closed again on end/expire). `publishStage1` from closed —
  EXPIRED included — returns `null` and NEVER mints a room; the admin
  route turns that into the 409. `writeStage1State` throws when `kv()`
  returns null so the route layer can fail closed. Key
  `stage1:state:${TENANT}`; imports `stage2Expired` from `@/lib/stage2`
  (the same midnight-Denver law; the docblock says "Denver", never the
  tz literal). No `America/` string anywhere in the file.
- `src/app/api/stage1/route.ts` — `GET(request)` (tsc pins the arg; the
  test calls it with a real `Request`). Body exactly
  `{ ok, phase, room, jitsiDomain }` — room and domain are null unless
  published. no-store. A broken KV reads as the closed body with a 200
  (fail-closed, never a 500 on a public poll). The config read happens
  ONLY in the published branch.
- `src/app/api/admin/stage1/route.ts` — mirrors `admin/stage2`: the same
  `gate()` (401), `jsonNoStore`, PUT actions (`prepare` / `publish` /
  `close`), 400 on an unknown action. A refused publish answers 409
  `{ ok: false, reason: "prepare first — Stage 1 never publishes from closed" }`.
- `src/app/a/site/reading/Stage1Card.tsx` — the operator card. Default
  export is fetch-wired; the pure `Stage1CardBody` is exported for
  renderToStaticMarkup tests. Two `kit-rows` rows (`data-row="lifecycle"`
  and `data-row="host"`); phase in `<em data-state={phase}>`; busy shows
  `<em>Publishing…</em>`; errors show `<em role="alert">`. The disabled
  host control is `<a aria-disabled="true">` with NO href (a `<span>`
  would break the control-count pin). The source mentions 409 so the
  operator-facing failure path is greppable.
- `src/app/a/site/reading/SiteReadingRoom.tsx` — mounts
  `<SectionHead label="Stage 1 — the reading (everyone watches)" />` and
  `<Stage1Card />` ahead of the existing Stage 2 head (3 added lines).
- `src/components/reading/JitsiViewer.tsx` — the one-way viewer around
  the UNCHANGED `JitsiRoom`. Toolbar exactly `["fullscreen","hangup"]`;
  no `startSilent`/`startAudioOnly` (the docblock avoids even the words —
  the no-camera/microphone-word pin covers comments); config pins per
  the brief; `onEnded`/`onFailed` farewell events for the island.
- `src/components/reading/Stage2Details.tsx` — the "what opens Stage 2"
  card body. Every word derived from TIERS / TIER_PAGES / the live store
  item (`@/lib/entitlement` + `@/lib/tiers-content`); no `$\d` literal,
  no weekday, no camera words. Default export `{ weekPass }`. Stays
  server-graphed — see deviation (h).
- `src/components/reading/ReadingStage.tsx` — the island.
  `ReadingStageProps` = initialPhase / next / scheduleTz / jitsiDomain /
  stage2Details (a `React.ReactNode` — no `\broom\b` anywhere in the
  interface; phase-only SSR). `ReadingStageBodyProps` = the 12 pinned
  props + optional frameRef / onViewerEnded / onViewerFailed. The pure
  `ReadingStageBody` carries every phase per the phase-control law (one
  primary control per phase); `stage1WatchTarget` is the exported pure
  helper — the Watch click's OWN fresh no-store fetch is the only thing
  that can mount a room. 20 s poll (display only); published→closed
  under the viewer ends the watch on THAT poll; the single-embed
  conditional (StageView.tsx:150-163's pattern) swaps Stage 1 for the
  unchanged `JitsiRoom` when Stage 2 is joined; "Leave Stage 2 · back to
  the reading" re-polls at once and never auto-restarts.
  `signInHref="/login?next=%2Freading"`; Full screen rides
  `requestFullscreen` on the frame; no matrix/classroom import.
- `src/app/reading/page.tsx` — the stage band
  (`keep-dark sky-veil sky-stage sky-nebula`, `id="stage"`, `<CosmicSky />`),
  the derived kicker `Live every ${weekday} · free`, the blocks
  countdown, ReadingStage fed phase-only, the public sign-up
  (`<ReadingSignUp variant="public" …>` exactly once), M3's three
  kit-list lines (weekday derived, pass price from the live store item),
  the host section with the real portrait and "Back to the reading ↑" to
  `#stage`, SiteFooter once. The raw-cookie session read stays (brief
  lines 77/117) with `void session` — no signed-in branch remains.
  `deriveWeekPass()` reads `weekly-one-week`, takes sale-over-price, and
  dashes on a shelf failure (never a 500 on a courtesy). cartridge.css
  import dropped. `Stage2Details` is rendered HERE (server) and handed
  into the island as `stage2Details` — deviation (h).
- `src/components/ReadingHeroCountdown.tsx` — `variant` is now
  `"hero" | "card" | "blocks"`. The blocks branch is fully self-contained
  ahead of the existing code; hero/card are byte-identical (fixtures
  captured pre-lane pass). `nbsp = (s) => s.replace(/\s/g, "\u00A0")` —
  every gap inside the clock-plus-zone line is U+00A0, proven under a
  stubbed Intl. The 1 s tick exists only for blocks.
- `src/components/rooms/ReadingSignUp.tsx` — `variant?: "room" | "public"`
  defaulting to `"room"` on both components (`variant = "room"` appears
  exactly twice — pinned). The public branch renders the kit Card
  "Stay in the know" with the reminder line and `.kit-inline-form`
  ("Keep me posted"); the room render is byte-identical (3 fixture pins).
- `src/lib/reading-letters.ts` — `stageDoorHtml` now points at
  `${siteBase()}/reading` via `readingPill`; the `READING_ROOM_PATH`
  import is gone; the R6 docblock re-worded (the pins forbid "/rooms/"
  and "@/lib/reading-room" in the file). Call-site words unchanged.
- `src/app/kit.css` — the READING LOOK additions (banner to EOF): every
  roll-call class; the nebula as ONE shared rule
  `.sky-nebula::before,.hero::before{` with the old body byte-exact; the
  reduced-motion stop covering both; `linear-gradient(180deg,transparent,var(--ground))`;
  `.kit-list>li` as `display:grid;grid-template-columns:18px 1fr;gap:12px`
  (the marker within 32 px of its text); every mock colour translated to
  tokens or `color-mix()` of one token; no `font:` shorthands — only
  `.kit-count-num` keeps `font-family:var(--font-h1)`.
- `src/app/cartridge.css` — the `.hero::before` rule moved OUT (it rides
  the shared kit.css selector group now); the keyframes stay; the comment
  says so.
- `tests/operator-census.baseline.json` — `CENSUS_WRITE=1` run (names
  follow reality; counts only lowered) PLUS the one hand-raise the lane
  owns: kit.css `fontDecls` 9 → 10 (the token `font-family` on
  `.kit-count-num`). See deviation (g).
- Test files: `stage1-state` (32), `stage1-route` (12),
  `admin-stage1-route` (9), `jitsi-viewer` (12), `reading-stage` (20),
  `stage1-card` (15), `reading-look` (44), `reading-page` (30),
  `reading-letters` (41), `reading-sign-up` (36) — re-trued post-red
  where the red pins guessed wrong (see (i)).

## Gate results (verbatim, `~/dev/shortcuts/oc-gate.sh`, run twice)

First run: vitest/scripts/eslint/tsc green, **build FAILED** — Turbopack
"Module not found: Can't resolve 'dns/promises'" (+2 more) from
`@redis/client`, traced through the CLIENT bundle:
`redis → src/lib/entitlement.ts → Stage2Details → ReadingStage →
reading/page.tsx`. Fixed by server-side composition (deviation (h)).

Second run — all five gates:

```
census: 1119 objects, baseline 1119 · families: 179/12/5/8/61/0 · fonts: 47 token/32 literal
 Test Files  217 passed (217)
      Tests  2671 passed (2671)
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

Lockfile md5 matched `node_modules/.gate-lock.md5` — no `npm ci` needed.

## Deviations (each ruled by the brief or a house law)

(a) `.hero::before` rides the kit.css shared selector group
    `.sky-nebula::before,.hero::before` because `sections.tsx` is
    read-only — the home hero renders byte-identically (fixture pins),
    and the reduced-motion stop is new but Amendment-1-ruled.
(b) The mock's literal colours were translated to tokens / `color-mix()`
    of one token — the no-new-colour-literal law wins over mock-fidelity.
(c) The kicker and the experience-list weekday are DERIVED from the
    schedule, never the mock's literal "Saturday" (BFT/computed-time law;
    tests use the Wednesday default and call it Wednesday).
(d) The iframe `allow` attribute is NOT pinned locally: upstream
    `external_api.js` always sets it (fullscreen included), so L2's
    "pin allow=fullscreen" is satisfied by the vendor script; a local
    override would only fight upstream.
(e) The Stage 2 card is hidden for a FRESH closed visitor (the approved
    sheets: it shows once live, once ended, and while Stage 2 is
    joined) — a visitor arriving in the end→publish gap sees no card.
(f) `/api/stage1` keeps a defensive try/catch around the published-branch
    config read even though `getSiteConfig()` cannot throw today — the
    fail-closed law is load-bearing and must not depend on a callee's
    present-day behaviour.
(g) `tests/operator-census.baseline.json`: `CENSUS_WRITE=1` only ever
    LOWERS counts, so the one raise this lane legitimately owns —
    kit.css fontDecls 9 → 10, the token `font-family:var(--font-h1)` on
    `.kit-count-num`'s display face — was hand-edited into the baseline.
    This is the review-visible baseline move the lane was told to make.
(h) `Stage2Details` is rendered by the SERVER page and passed into
    `ReadingStage` as a `ReactNode` (`stage2Details`): the details read
    `@/lib/entitlement`, whose dynamic `redis` import can never enter a
    client bundle (the first gate run's build failure). The island
    imports it nowhere — pinned by tests on BOTH sides (the stage test
    forbids the import; the page test requires it).
(i) Red-pin corrections I made post-commit where my own red tests had
    guessed wrong: the sections pin is `className="hero keep-dark"`;
    the NBSP pins assert the RAW U+00A0 char (React 19
    renderToStaticMarkup never emits `&nbsp;` — measured); the public
    sign-up pin expects `Love&#x27;s`; the two stub constructors take no
    args (unused-var warnings otherwise); `/api/stage1`'s handler is
    `GET(request)` because the test calls it with a real Request.
(j) K122 item 11, declared not built: the sign-up's member/guest branch
    stays session-resolved CLIENT-side. Server-rendering the guest form
    would flash it at members on every first paint — the exact flash
    `ReadingSignUp.tsx`'s own Ground law exists to prevent ("never flash
    the form before the session resolves"). The honest pins stand: real
    SSR carries 0 of `#reading-sign-up-email`; the hydrated DOM carries
    exactly 1 (reading-sign-up.test.ts's card-body render pin and
    reading-page.test.ts's source pin).
(k) K122 item 12, the OWNS widening, echoed per the house habit: the
    claim grew `work-claims/task-438-register.md` as its own commit
    (`d64dee2`) BEFORE the `git mv` (`351768f`) — 442 carried the same
    root `REGISTER.md`, so the second PR to merge would have hit
    add/add. The register now lives inside `work-claims/`, never
    deleted.

## Owed at runtime (NOT buildable here — flagged, not worked around)

- "A viewer on a room Love has not opened": jicofo's login lock means
  Jitsi shows its own "waiting for the host" dialog (HOLD LIFTED
  §420–424). Owed runtime check; do NOT build around it.
- iPhone autoplay: UNKNOWN. Possible "Tap to listen" step. Owed check.
- Amendment-2 cron deps: `CRON_SECRET` in the Vercel env, `tick()` must
  not throw before the reading step, `MAIL_HOURLY_CAP` — verified only
  as far as the repo allows; the env side is owed.
- P2P-off-one-side behaviour, crafted-client audio, room capacity, and
  the previews-share-production-KV-and-mail warning — owed runtime
  checks per the brief.
- Owed shots (Number One): the 5 phases + Stage 2 at 1440/390 in night
  and dawn against the round-3 sheets; theme via localStorage BEFORE
  load; day/time/your-time lines = exactly 1 each at both widths and
  both themes; the operator rows.

## Not in this lane (by design)

- No SUMMARY.md / LANE-DONE — the orchestrator writes those.
- All read-only files untouched: JitsiRoom, every T-439 file, every
  T-437 file, studio/jitsi-door, store, tenant, reading-schedule,
  booking-time, site-config, member-auth, operator-auth, middleware,
  live, RoomVideoSlot, ClassroomView, rooms/[slug]/page, lead-magnet,
  ReadingNotice. ReadingHeroCountdown hero/card and ReadingSignUp room
  renders byte-identical; reading-letters touched only in
  `stageDoorHtml`; kit.css touched only under the READING LOOK banner.
