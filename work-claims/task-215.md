# work-claim — task-215 (store and About polish)

Lane: home crew (sonnet), one-shot. Base = onecocreation main @
**869217084b321f71e33cf3978e51989a94c69358** (`8692170`, T-213's merge — the GO header's cut point).
Branch `feat/task-215-store-about-polish`.
Worktree already cut, `node_modules` already installed.

Baseline gate (established at cut, before any change): `npx vitest run` → **727/727, 68 files**.

## OWNS (re-grepped at cut, per T210-216-GROUNDING.md §T-215 + the GO header)
- shelf + categories: `src/app/store/page.tsx`, `src/components/store/ShelfSection.tsx` (`SHELF_GROUPS`,
  `SHELF_BANDS`), `src/lib/store-sections.ts`, `src/app/store/{meditations,memberships}/page.tsx`,
  `RelatedItems.tsx`
- editor category field: `src/app/a/store/page.tsx` (the `category` field, the `KIND_WORD` map, the
  Categories tab), `src/lib/store.ts`, `src/app/api/admin/store/route.ts`
- item card back + full view: `src/components/store/StoreItemCard.tsx`, `src/app/house.css` (the flip
  contract), `src/app/store/[id]/page.tsx`, `ImageLightbox.tsx`
- bundles: NOT FOUND at cut (re-verified) — no `bundle` field anywhere on `StoreItem`; this lane adds
  the grouping field (a data-model touch on `src/lib/store.ts` + `src/app/api/admin/store/route.ts`) —
  declared here per the grounding's instruction, never a new money rail
- About playlist: `src/app/about/page.tsx`, `house.css` (`.about-playlist`/`.about-video`),
  `src/lib/about-content.ts`, `about-playlist-puck.ts` (read-only — Puck-first branch untouched),
  `youtube-id.ts` (read-only), NEW `src/components/about/AboutPlaylist.tsx` +
  `src/components/about/about-playlist-machine.ts` (the state machine)
- heaven-and-earth stroke: `house.css` (`.about-script`)
- the two card colour rules: `src/app/globals.css` (unowned vanilla-template leftover, NOT touched —
  it is dead CSS, see Seams), `src/app/house.css` (`.card`), `src/app/cartridge.css` (`#classes .card`
  family — the divergent one)
- rooms stack: `src/components/rooms/RoomsShelf.tsx`, `src/components/rooms/PackageRoomsCard.tsx`
  (read-only), `src/lib/matrix-rooms.ts` (`groupRoomsByPackage`, `RoomPackage`), `src/app/classes/page.tsx`
  (read-only — already renders `<RoomsShelf />` inside its own section)
- tests: `tests/store-item-editor.test.ts` seam only (read, not edited unless a regression appears),
  new `tests/store-item-editor-category.test.ts`, `tests/store-bundles.test.ts`,
  `tests/about-playlist-cycle.test.ts`, `tests/heaven-earth-stroke.test.ts`, `tests/two-card-colors.test.ts`,
  extension to `tests/rooms-shelf.test.ts`, extension to `tests/store-cards.test.ts` (Full-view-is-a-real-
  link pin)

NOT the money rail (T-198), NOT the store's data model beyond the bundle grouping field.

## OWNS exits
- **flag-and-stop** (default): `src/components/store/FreeMeditationCard.tsx` shares the exact same
  `.flip-scroll`/no-scroll bug as `StoreItemCard.tsx` and sits in the same shelf grid, but it is not a
  named OWNS path — listed under Seams with the exact minimal diff, untouched.
- No minimal-forced-edit exits taken (see Seams for what was flagged instead).

## Findings (verify-first, per belief-vs-knowledge) — filled in as build proceeds; see SUMMARY.md
