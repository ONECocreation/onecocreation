# work-claims/task-398.md — task-398 (ONE Cocreation: the grey-paint family — W-01's keep-dark pin + B12's lighter header + W-07's sticky-footer law)

Lane: the home crew (Sonnet builder, under Number One's gate). Base = onecocreation main
**11ef2f46341eb8d2b403cdd9d3c86bc769260001** (`git rev-parse HEAD` on this worktree matched
this sha exactly before any commit — no merge needed, the branch was cut at the tip). Branch
`feat/task-398-grey-paint-family`. Worktree `~/dev/worktrees/task-398` (cut by Number One),
`npm ci` already done. Lane ports **4682–4685**. Brief:
`~/dev/kimi/inbox/TASK-398-oc-grey-paint-family.md`. Claimed at block 968,138 (Number One's
cut, hold released — TASK-396 merged as #44, main re-grepped); this claim written at block
968,140 (house beacon, fresh read).

Fixes B6/B12/B14 at their mechanism, all three sharing one root cause per surface:
- **W-01** — `main .keep-dark` (cartridge.css:437-440) already pins eight tokens against the
  dawn repaint; it never covered `--panel`/`--edge`/`--ghost-bg`/`--ghost-ink`, so a keep-dark
  frame's `.card` (the book picture under "Join the Weekly Reading", B6) and `.btn-ghost`
  (`/book`'s "more info", B12) still read the dawn grey. Four declarations added, values
  byte-identical to the night pour (`:27`, `:31`) — night unchanged by construction, dawn no
  longer leaks inside a keep-dark frame.
- **B12's header clause** — `house.css:286`'s `.site-header` painted a literal
  (`rgba(14,12,24,.86)`); no token poured it, so it could not follow the theme at all. ONE
  token, `--header-bg`, added to the night pour (`:26-33`, byte-identical night value) and the
  dawn block (`:240-274`); `house.css:286` now consumes `var(--header-bg)`. **Named decision A
  — PLUM LIFT, RULED by Number One at block 968,136**: the dawn value is `rgba(36,26,51,.86)`,
  the palette's own `--band-2` family (`#241a33`) at the same `.86` alpha — his newest words "a
  little lighter" answered with zero collateral to the gold nav, the here-mark, DoorButton's
  pin, the burger or the lockup (all hold on the plum family).
- **W-07** — no bare `main{}` rule and no `100vh`/`100dvh` existed in `house.css`, so a short
  page's `.site-footer` (`margin-top:30px`) stopped wherever the content ended (B14's mid-screen
  footer on `/retreats`). The `body` rule (`:32-36`) gains a flex column + `100dvh` (with the
  `100vh` fallback first); one NEW `main{flex:1 0 auto;display:flex;flex-direction:column}`
  rule; `.site-footer`'s `margin-top:30px` → `margin-top:auto`. Covers both page shapes the site
  builds (header/footer as `<main>` siblings, and header/footer inside `<main>`, the house
  idiom on sixteen-plus pages) — no page file touched.

## OWNS

- `work-claims/task-398.md` (NEW, this file, first commit)
- `src/app/cartridge.css` (three additive spots ONLY: the `main .keep-dark` ruleset `:437-440`,
  the `:root,.oc-pv-dark` pour beside `:27`, the dawn block beside `:240` — every other line
  byte-identical; `:446` and `:453` NOT touched)
- `src/app/house.css` (`:286` one-declaration swap to `var(--header-bg)`; the `body` rule
  `:32-36` additive; one NEW `main{}` rule; `.site-footer` `:296` margin — every other line
  byte-identical; the console override — `.mgmt-ground .site-header` — NOT touched)
- `tests/keep-dark-bands.test.ts` (additive assertions only, in the file's own byte-equality
  idiom)
- NEW `tests/grey-paint-family.test.ts`

## READ-ONLY and FORBIDDEN

READ-ONLY: `src/components/sections.tsx` (393's regions; fixed by the pin, never opened),
`src/components/ServiceCard.tsx` + `src/app/book/page.tsx` (fixed by the pin),
`src/components/door/DoorSheet.tsx` (377's), `src/components/PopupHost.tsx` (the hand-carried
copy — named in Seams, not extended), `src/components/rooms/RoomsShelf.tsx` +
`src/components/store/ShelfSection.tsx` (396's), `src/components/door/DoorButton.tsx` (its pin
stays true under the plum lift), `src/components/SiteHeader.tsx` / `NavMenu.tsx` /
`LiveStrip.tsx` / `ThemeLantern.tsx` / `BasketChip.tsx`, `src/app/layout.tsx`, every page file,
`src/lib/puck-seeds.ts`, `scripts/`, `vercel.json`.

FORBIDDEN: any edit to a `.tsx` or page file; any new stylesheet; any `!important`; any
per-page or per-route rule; retyping pinned values from memory instead of copying the night
pour; touching the dawn blanket (`:446`) / the lions-gate-dark blanket (`:453`) / the console
override; moving the header or footer out of any `<main>`; `position:fixed`/`sticky` on the
footer; any civil-date stamp (block heights only).

## Gates

This builder runs, inside this worktree only: `npx vitest run` (whole suite), each live
`scripts/*.test.mjs`, `npx eslint src tests --max-warnings=0`, `npx tsc --noEmit`,
`npx next build`.

## Cut note

Ground truth as of block 968,132 (K97, first cut, drafter Ms. Kimi); named decision A (PLUM
LIFT) ruled by Number One at block 968,136; cut on main `11ef2f4` at block 968,138 (Number One;
TASK-396 merged as #44, hold released; every `cartridge.css` line past the lions re-pinned +31
— confirmed by this builder via fresh grep before any edit: `main .keep-dark` at `:437-440`,
its docblock at `:422-436`, the dawn blanket at `:446`, `main:not(.lions-gate-dark)` at `:453`,
all matching the brief's SUPERSEDING banner exactly). This claim written at block 968,140.
