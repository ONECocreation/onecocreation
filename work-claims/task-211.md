# work-claim — task-211 (her words)

Lane: home crew (sonnet), one-shot. Base = onecocreation main @ **7c0f57c** (worktree cut point;
verified `git log -1` matches the dispatch note). Branch `feat/task-211-her-words`.

Baseline gate (established at cut, before any change): `npx vitest run` → **645/645, 60 files**.

## OWNS (re-grepped at cut, per T210-216-GROUNDING.md §T-211)
- nav/menu config: `src/components/NavMenu.tsx`, `src/lib/site-config.ts` (comment only, no change),
  `src/lib/nav-edit.ts` (no change needed), `src/components/door/door-machine.ts`
- Heart Field naming (every site, converged): `src/lib/matrix-rooms.ts`, `src/components/rooms/RoomsShelf.tsx`,
  `src/app/classes/page.tsx`, `src/components/sections.tsx`, `src/components/welcome/WelcomeFlow.tsx`,
  `src/components/console/LiveDoorCard.tsx`, `src/lib/puck-seeds.ts`, `src/brand/cartridge.ts`,
  `src/brand/cartridges/earthside.ts`
- member sessions/calendar: `src/components/door/door-machine.ts` (MEMBER_MENU label),
  `src/app/me/calendar/page.tsx`, `src/components/me/MemberCalendar.tsx`
- shared month grid (reused, not rebuilt): `src/components/calendar/*` — read/import only, no edits needed
  (BftMonthGrid/WeekRibbon's existing props cover the member calendar's needs)
- /rooms labels (Circle → Events): `src/components/rooms/VantageSwitcher.tsx`
- /support card: `src/components/ReadWithLove.tsx`
- /classes bottom (Element note): `src/components/rooms/RoomsShelf.tsx` (same file as the Commons fix)
- social handle: `src/components/WildDoors.tsx` (no shared constant existed; introduced correctly here)
- tests: new `tests/her-words.test.ts`, `tests/member-calendar.test.ts` (or similar — named at build time)

## NOT owned (flag-and-stop → Seams, untouched)
- `src/lib/letters.ts` — T-214's file (ruling: "T-214 owns letters.ts; T-211 touches only its two
  Heart Field strings → flag-and-stop seam"). Two strings there say "the Commons" — listed in
  Seams with exact diff, not edited.
- `src/app/api/admin/matrix/ceremony/route.ts` — only a code comment example (`#heart-field:` →
  `heart-field`), not a rendered string; no change needed, not a seam.
- the community calendar page itself / CircleView.tsx / booking logic — reused read-only (the
  shared BftMonthGrid/WeekRibbon components), never rebuilt or edited.

## Judgment calls (minimal-forced-edit, one line each, per standing clause)
- `src/brand/cartridge.ts` L201, `src/brand/cartridges/earthside.ts` L162: not in the brief's plain-English
  OWNS list, but grounding names them explicitly under "T-211 — Heart Field strings (every site)" and the
  changed text is the welcome door's copy (door components) — load-bearing for item 1's "everywhere the
  room is named". Literal-only word swap, no structural change.
- `src/lib/puck-seeds.ts`: seed/draft content for the Puck editor, not the live pages' render path today
  (confirmed: getPuckPage() returns null for classes/memberships until Love publishes) — but it is the
  copy she will see and could publish, and grounding names exact lines under T-211. Literal-only converge.
- `src/components/console/LiveDoorCard.tsx` L41: admin console (Love's own Go-Live desk), not a customer
  page — but it is a "door component" (doorRoomGroups' picker) explicitly named under T-211 in grounding.
  Renamed the label, kept "free for every member" (admin-only context, item 5's ban is scoped to the
  /support Read-with-Love card specifically).
- `src/components/welcome/WelcomeFlow.tsx` L82: overlaps T-212 per the Overlaps table, but grounding names
  this exact line under T-211 and it's a single-string swap with no structural change — safe ahead of T-212.

## Derive-or-dash
- The Instagram description text under WildDoors.tsx's `@gysyluv` card is Love's own words to write —
  no invented copy kept. The card now names the handle alone; a single clearly-commented constant
  (`INSTAGRAM_DESCRIPTION`) is the slot for her real line, `null` until she sends it (derive-or-dash: a
  null slot renders nothing, never a placeholder sentence).

## Shots
Heart Field door/nav, Calendar week default + month toggle, /rooms Events tab, /support card,
/classes bottom — both themes (dark/dawn), 1440 + 390 — against the production build on a fixture
KV (ports 3231/3232), harness adapted from `~/dev/hermes/archive/task-210/patches/task-210/shots/`.

## Operator runbook
None expected — words-and-labels lane, no env/KV/DNS changes.
