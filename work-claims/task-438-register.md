# REGISTER — task-438 (block 968,222; HOLD LIFTED block 968,269 · 0018.07.05 a₿)

Stage 1 on `/reading` as a one-way house Jitsi room + the approved round-3
reading look. Brief: `~/dev/kimi/inbox/TASK-438-oc-stage1-oneway-jitsi.md`
(core 1–164, "Your actions" 165–180, Amendment 1 182–273, Amendment 2
274–400 — Amd 2 wins over Amd 1, HOLD LIFTED 407–424).

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
