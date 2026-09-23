# work-claims/task-438.md — task-438 v2 (ONE Cocreation: Stage 1 on /reading as a ONE-WAY house Jitsi room, plus the approved reading look)

Lane: builder K118 (Ms. Kimi's dispatch), under Number One's gate. Base =
**9b044833c9947a3682ff28c93b8baa57e689f7d7** (`git rev-parse HEAD` on this worktree matched
this sha exactly before any commit — T-439's LANE-DONE `8b9a69c` with main `67154f5` merged
in at the cut; both ancestors confirmed by the orchestrator, never re-fetched here). Branch
`feat/task-438-stage1-oneway-jitsi`. Worktree `~/dev/worktrees/task-438`, `npm ci` already
done. Lane ports **4802–4805**. Brief: `~/dev/kimi/inbox/TASK-438-oc-stage1-oneway-jitsi.md`
(read whole — the body, Amendment 1 (block 968,230), Amendment 2 (block 968,232) which wins
every "→ M<n>" line, and the HOLD LIFTED tail (block 968,269); tail re-read before the first
edit and again before the gate run, per house law). Claimed at block **968,269**
(0018.07.05 a₿ — house beacon, fresh read; `bftDate(968269)`).

**What this lane builds.** Stage 1 — the free Saturday reading — moves onto its own one-way
house Jitsi room on the public `/reading` page: a sibling lifecycle to T-439's Stage 2
(`closed → prepared → published` in its own KV key `stage1:state:${TENANT}`, minted through
`mintJitsiRoom()`, fail-closed, Denver-midnight expiry via T-439's `stage2Expired` imported
READ-ONLY), a public `/api/stage1` (`no-store` on every response, body keys exactly
`{ ok, phase, room, jitsiDomain }`, a room only for published-and-unexpired state, zero Jitsi
probes, never a request clock), an operator `/api/admin/stage1` (401/400/409 — Publish from
closed, expired included, is REFUSED; never mint on Publish), a `Stage1Card` on
`/a/site/reading` under the /a uniformity law (ONE state per row said once under the row's
words, ONE control per row on the same right edge in every state, pending/error replaces the
row's state), a watch-only `JitsiViewer` (`disableInitialGUM`, muted-start belt-and-braces,
NO `startSilent` — it kills remote audio — NO nonexistent `startAudioOnly`, toolbar =
fullscreen+hangup only, Guest display name, `p2p.enabled=false`), and a `ReadingStage` island
(phase-only SSR — never a room or host URL in HTML/RSC — a 20 s poll, a Watch button that
re-fetches fresh and mounts only the fresh published room, the single-embed Stage 2 handoff
copied from `StageView.tsx:150-163` with an always-visible Leave, and `Stage2Door` mounted
with `signInHref="/login?next=%2Freading"`).

**The look (Amendment 1, as amended by Amendment 2 — the Admiral approved the mockup).**
`/reading` opens with the `keep-dark sky-veil` + `.sky-stage` sky band (CosmicSky plus the
home hero's drifting nebula — the one nebula rule MOVED out of `cartridge.css:287-293` into a
shared class, home pinned byte-identical), the `blocks` countdown variant (the day on one
line, Love's time on the next — every gap inside clock-plus-zone normalized to U+00A0, the
zone never hard-coded — then "Your time" after mount, then the four tabular-numeral cells),
the `.kit-stage` frame (the book waits in it; Love's live picture replaces it on one tap —
browsers block sound that starts on its own; Full screen + Leave as the only two watching
tools), `Stage2Details` (every word derived from `TIERS`/`TIER_PAGES`/the live
`weekly-one-week` store item), the `.kit-list`, the `.kitx-host` portrait, the existing
`ReadingSignUp` mounted once as its own "Stay in the know" section (new `public` variant —
the `room` render byte-identical), and the two reading letters' stage door re-pointed to
`/reading` always (`stageDoorHtml` only — never a `/rooms/` href to a signed-out reader).

**OWNS (binding).** NEW: `src/lib/stage1.ts`, `src/app/api/stage1/route.ts`,
`src/app/api/admin/stage1/route.ts`, `src/app/a/site/reading/Stage1Card.tsx`,
`src/components/reading/ReadingStage.tsx`, `src/components/reading/JitsiViewer.tsx`,
`src/components/reading/Stage2Details.tsx`, and tests `stage1-state`, `stage1-route`,
`admin-stage1-route`, `reading-stage`, `jitsi-viewer`, `stage1-card`, `reading-look` under
`tests/`. EDITS: `src/app/reading/page.tsx`, `src/app/a/site/reading/SiteReadingRoom.tsx`
(`:23-24` mount), `src/app/kit.css` (additions only, the named shared variants), the one
nebula rule moved out of `src/app/cartridge.css:287-293`,
`src/components/ReadingHeroCountdown.tsx` (the `blocks` variant ONLY — `hero`/`card`
byte-identical), `src/components/rooms/ReadingSignUp.tsx` (the `public` variant ONLY — the
`room` render byte-identical), `src/lib/reading-letters.ts` (`stageDoorHtml` only), and
`tests/reading-page.test.ts`, `tests/reading-letters.test.ts`,
`tests/reading-sign-up.test.ts` (all re-trued, never deleted). Plus this file and
`work-claims/task-438-register.md` (the lane's register — widened in the K122 fix round when
the register moved off the repo root; house law from block 968,284: a builder's register
lives at `work-claims/task-NNN-register.md`).

**READ-ONLY / FORBIDDEN (binding).** Everything T-439 owns (`stage2*` imported read-only,
`Stage2Door`, `StageView`, `Stage2Card`, `globals.css`, `packages/[slug]/page.tsx`) and
NEVER `JitsiRoom.tsx` (T-439 pin 7). No `meeting.rail` flip, no site-config writes, no
`live.ts`/`/api/live`/VDO/studio doors, no `RoomVideoSlot`/`ClassroomView`/`rooms/[slug]`,
no T-437 homepage files, no store/cart/payments/catalog, no Jitsi server config, no new CSS
beyond the named kit.css additions, no `style={{`, no new colour literal, no serif, reduced
motion stills every animation. OWNS exits: flag-and-stop, never edit an unowned file.

**Order.** This claim → the red tests → build to green → the five gates
(`~/dev/shortcuts/oc-gate.sh`) → slop + security reviews (the orchestrator's seats) →
REGISTER.md at the worktree root with the unresolved runtime checks (including "a viewer on
a room Love has not opened" per the LIFTED tail, and Amendment 2's Saturday-morning-letter
cron dependencies).
