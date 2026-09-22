# work-claims/task-396.md — task-396 (ONE Cocreation: the photos wear the dawn — light-mode images)

Lane: the home crew (Sonnet builder, under Number One's gate). Base = onecocreation main
**bdcbc181b128933d672b55e2d27316d10338ce34** (`git rev-parse HEAD` on this worktree matched
this sha exactly before any commit). Branch `feat/task-396-light-mode-photos`. Worktree
`~/dev/worktrees/task-396` (cut by Number One), `npm ci` already done. Lane ports
**4678–4681**. Brief: `~/dev/kimi/inbox/TASK-396-oc-light-mode-photos.md`. Claimed at block
968,132 (Number One's cut); this claim written at block 968,133 (house beacon, fresh read).

Fixes B15 (the room/shelf photos vanishing in light mode) at its mechanism: the room-package
banners (`RoomsShelf.tsx`) and the store's meditations band (`ShelfSection.tsx`) hard-coded a
dark scrim in BOTH themes. The ruled recipe (K96/Astra, decision B): the photo URL rides a CSS
custom property set inside each component's EXISTING `style={{}}` object (no new style-block
literal); a new CSS class per surface composes `linear-gradient(<the exact night literals that
were inline>), var(<the property>) center / cover no-repeat`, with a dawn twin under
`html[data-oc-theme="light"]` wearing the lion's own light-scrim shape; both new classes join
`cartridge.css:415`'s `:not()` exemption list, the file's own idiom (`.lions-gate` already sits
there). `.keep-dark` is NOT the dawn treatment (decision C). No mockup (decision D — the swap
changes no layout, SCOPE already blesses the pattern at W-05).

## OWNS

- `work-claims/task-396.md` (NEW, this file, first commit)
- `src/components/rooms/RoomsShelf.tsx` (the class attachment on the package `<section>` +
  the custom-property edit inside its EXISTING style object — every other line byte-identical)
- `src/components/store/ShelfSection.tsx` (the `meditations` entry of `SHELF_BANDS` + the
  custom-property/class edit at the section's existing style consumer — every other line
  byte-identical)
- `src/app/cartridge.css` (additive: two new class pairs beside the lion's own `:288-297`, plus
  the two class names added to `:415`'s `:not()` exemption list — everything else in the file
  byte-identical, `:422` and `:468-495` untouched)
- NEW `tests/light-mode-photos.test.ts`

## READ-ONLY and FORBIDDEN

READ-ONLY: `src/components/sections.tsx` (393/394's — never opened this lane), `src/app/layout.tsx`,
`src/components/ThemeLantern.tsx`, `src/brand/cartridge.ts`, `src/brand/cartridges/*`,
`src/lib/matrix-rooms.ts`, `src/lib/tiers-content.ts`, `src/app/api/media/route.ts`,
`src/app/kit.css`, `src/app/house.css` (Template check, read this session).

FORBIDDEN: any `<picture>`/`prefers-color-scheme`/theme-hook machinery, any new CSS file, any
image-file swap of a photo that isn't Love's to swap, any placeholder or fake "light version",
any layout change, touching `sections.tsx`, any civil-date stamp (block heights only).

## Gates

This builder runs, inside this worktree only: `npx vitest run` (whole suite), each live
`scripts/*.test.mjs`, `npx eslint src tests --max-warnings=0`, `npx tsc --noEmit`,
`npx next build`.

## Cut note

Ground truth as of block 968,098 (K96 — Astra fold), cut on main `bdcbc18` at block 968,132
(Number One), per the brief.
