# work-claim — task-386 (OC · the sign-in sheet fits a phone)

Lane: the home crew (Sonnet builder, under Number One's gate). Base = onecocreation main
**c9ebcb94f2eec21570ecd9f15edcb3764dd8b7ef** (PR #33 / T-381 merged; unchanged since block
968,056, re-checked via `git rev-parse HEAD` at cut — matches this worktree's HEAD exactly).
Branch `feat/task-386-sign-in-sheet-fits-a-phone`. Worktree cut by Number One at
`~/dev/worktrees/task-386`, `npm ci` run fresh by this builder (550 packages, 0
vulnerabilities). Lane ports **4638–4641**. Brief:
`~/dev/kimi/inbox/TASK-386-oc-sign-in-sheet-fits-a-phone.md`.

A phone-width layout fix for the ONE popup `DoorButton.tsx` draws — the header's sign-in
sheet, and the signed-in member's own menu, which share the exact same positioning code
today. The fix moves the POSITION half of that recipe (the COLOR half already rides
`--pop-bg`/`--pop-edge`/`--pop-shadow`, cartridge.css:95-98's "once" jug) from a per-instance
inline object in `DoorButton.tsx` into a shared `house.css` rule (mirroring `.nav-sub`, the
ONE other consumer of the same recipe), so a phone-width override — inside the ONE existing
`@media(max-width:1000px)` block that already holds `.nav-tail`'s own rules, never a new one
— can re-anchor the popup to the screen instead of to the narrow button it hangs from, with a
real 10px gutter on both sides (the same number `.nav-items` already uses on this
breakpoint), no `!important`, no new literal colour, no new stylesheet. The member menu also
gets its own second fix (`.door-pop--menu`) for an independent width overflow Astra's review
caught: a long unbroken `{name}` inherits `white-space:nowrap` from `.nav-tail` and the menu
wrapper has no `max-width`, so a long claimed name could push `role="menu"` wider than the
phone on its own, regardless of the anchor fix.

Duty 3 (hunting the Admiral's own words, "the main home button is broken when trying to log
in from there") is CLOSED by his own words at block 968,056 — the light code's 8-second draw,
ruled to stay as-is. This lane's Ground carries the trace (every other mechanism ruled out) as
the record; it stands on its own merit regardless — the phone sign-in sheet really does run
off the screen, measured.

## OWNS

`src/components/door/DoorButton.tsx` (Build 3 — delete the inline `pop` object, `className`
on both popup wrappers instead of `style` spread), `src/app/house.css` (Build 1–2, additive
only — two new base rules, `.door-anchor`/`.door-pop`, right after `.nav-sub`'s own block;
plus a three-rule addition, `.door-anchor{position:static}` / `.door-pop{right:10px}` /
`.door-pop--menu{...}`, inside the one existing phone `@media(max-width:1000px)` block), NEW
`tests/door-pop-fits-phone.test.ts` (Build 4 — source pins only, no render, matching this
suite's own node/no-jsdom idiom), `work-claims/task-386.md` (this file, first commit). Four
files.

## Gates

`npx vitest run` · each live `scripts/*.test.mjs` (`calendar-view.test.mjs`,
`cartridge-identity.test.mjs`, `square-payments.test.mjs`) · `npx eslint src tests
--max-warnings=0` · `npx tsc --noEmit` · `npx next build` (Number One's gate, after
`git merge main`). This builder runs only `npx vitest run` / `npx eslint` / `npx tsc
--noEmit` per the brief — no `next build`, no `shots-fixture.sh`, no server started; Number
One runs the full gate and the Chrome walk (1440/430/390/360/320, both themes, both popups).

## What is NOT in this lane

Not a fix to the logo/home link (`SiteHeader.tsx` untouched — every configuration Number One
measured navigated home correctly; duty 3 is closed by the Admiral's own words, not by this
lane). Not a redesign of the sign-in card's content (`door-machine.ts`, `DoorSheet.tsx`,
`SignInCard.tsx` untouched). Not the desktop layout (above 1001px the popup keeps its exact
current position, byte-equivalent, just moved from inline to a class). Not the redirect/
`?next=` machinery. Not the PopupHost/popup-trigger system (one inconclusive, data-dependent
lead reported in the brief's Ground, named its own lane if ever confirmed against production
data — not built here). Not `.nav-items`'/`.nav-sub`'s own rules (read as the precedent, never
edited). No new dependency, no new CSS custom property, no third
`@media(max-width:1000px)` block, no `!important`, no new literal colour.

## Cut note

Stamp per the brief, block 968,061 (claimed; Astra's plan review folded in — BUILDABLE-WITH-
CHANGES, five items, all in the brief).
