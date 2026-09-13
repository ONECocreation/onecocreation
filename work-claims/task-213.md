# work-claim — task-213 (the reading door)

Lane: home crew (sonnet), one-shot. Base = onecocreation main @ **0f09d6bc675135f9bc0351d33b82b6509dc8a1a1**
(`0f09d6b`, T-212's merge — the GO header's cut point). Branch `feat/task-213-reading-door`.
Worktree already cut, `node_modules` already installed.

Baseline gate (established at cut, before any change): `npx vitest run` → **715/715, 67 files**.

## OWNS (re-grepped at cut, per T210-216-GROUNDING.md §T-213 + the GO header)
- nav Community section: `src/components/NavMenu.tsx` (`PAGE_CATALOG`, `buildDefaultMenu`'s Community
  subs), `src/lib/site-config.ts` (`KNOWN_NAV_HREFS` — already carries every room path since T-210, no
  edit needed, verified), `src/lib/nav-edit.ts` (read-only reference, no change needed), `src/components/
  door/door-machine.ts` (`MEMBER_MENU`'s reading-room row — ALREADY LANDED by T-210, verified, no change)
- reading room page: `src/app/rooms/[slug]/page.tsx` (read-only — already reads `rosterForRequest` once
  and hands it to `ClassroomView`)
- classroom layout: `src/components/rooms/{ClassroomView,StageView,LessonPathView,CircleView,
  RoomVideoSlot,StageChat,VantageSwitcher}.tsx`, `classroom.css`
- presence: `src/components/rooms/RoomPresence.tsx` (`soulsOnline`) — ALREADY EXISTS (T-184), fed by
  `src/lib/matrix.ts`'s `roomRoster`/`rosterForRequest`
- tests: `tests/nav-config.test.ts` (updated to match the intentional relabel), new
  `tests/reading-door.test.ts`

## Findings (verify-first, per belief-vs-knowledge)
- **The reading room's string source is `src/lib/reading-room.ts`** (`READING_ROOM_PATH`,
  `readingDoorHref`) — T-210 already made `ReadWithLove.tsx`, the member menu
  (`door-machine.ts`'s `MEMBER_MENU`), and the nav's Heart Field row all read this ONE derivation
  (`freeRoom()`, the minTier `"all"` room — today the Heart Field, `#heart-field`). This lane's new
  Community door reuses the SAME `READING_ROOM_PATH` — never a second spelling, per the GO header.
  (The grounding doc's older line naming `weekly-reading` as the reading room's slug pre-dates T-210's
  landing — sections.tsx's separate `weeklyReadingDoor()` on the home Hero targets that different, tier-B
  room by name and is untouched; a different door, not this lane's.)
- **`KNOWN_NAV_HREFS` already allow-lists every room path** (`...ROOMS.map((r) => roomPath(r.id))`,
  T-210) — `READING_ROOM_PATH` survives `sanitizeNavItem`'s round-trip already. No site-config.ts edit
  needed.
- **The member-menu reading-room row is ALREADY LANDED** (`door-machine.ts`'s `MEMBER_MENU`, T-210) —
  verified, no code change.
- **Who's-here (item 20) is ALREADY LANDED** (T-184): `RoomPresence.tsx`'s `soulsOnline` renders online-
  only chips from the page's one `rosterForRequest` read, and `StageView.tsx` already places it as the
  "people" region beside the chat on the Stage (the classroom's default/opening vantage). This lane
  surfaces it in the room the brief means by "the reading room" (the Heart Field's Stage,
  `/rooms/heart-field`) — no new component, the existing one already rides every room including this
  one. Pinned with a new source test (see Build).
- **The classroom's chat + resources both already exist** (T-184): `StageView` has video/chat/people;
  `LessonPathView` already derives and shows a `data-region="resources"` card (`deriveResources`,
  exported and pure). What's missing for the brief's literal "video on top, resources, chat below or to
  the side" (#21) is a `resources` region ON THE STAGE ITSELF (today it only lives on the separate
  Lesson Path tab) — this lane's real layout work.

## Build (real work this lane does)
1. **Nav split (item 19)**: `buildDefaultMenu`'s Community subs split the old combined "Classes & rooms"
   into two independent doors — "Classes" (unchanged href `/classes`, still gated by `features.classes`,
   relabeled to match `PAGE_CATALOG`'s existing "Classes" entry) and "The reading room" (`READING_ROOM_PATH`,
   gated only by the room existing in the registry — derive-or-dash, independent of the classes switch,
   same as Free meditation/11:11). `PAGE_CATALOG` gains a matching entry (no `feature`, so it always
   offers in the editor's page picker) so Love can rename/reorder/nest it like any other page — never
   hardcoded beside the editor.
2. **Resources on the Stage (item 21)**: `StageView` gains a `resources` region between `video` and the
   `chat`/`people` row — a compact resources list, fetched from the SAME `/api/rooms/${slug}/materials`
   feed and filtered with `LessonPathView`'s own exported `deriveResources` (reused, not re-spelled).
   Gated identically to the chat/people below it (no fetch when the room is closed to this visitor).
   Empty resources → no region rendered (derive-or-dash), never an empty box.
3. **Who's-here (item 20)**: no code change — verified already-landed, pinned with a source test that
   the Stage's `people` region reads the page's one roster prop for the reading room specifically.

## NOT owned (flag-and-stop → Seams, untouched)
- `src/components/sections.tsx` (`weeklyReadingDoor`) — the home Hero's separate tier-B "Join the Weekly
  Reading" door; a different room, a different door, not this lane's reading-room string.
- `src/app/a/site/menu/page.tsx` — the editor page itself; only its data source (`PAGE_CATALOG`) changes.
- `src/lib/matrix.ts`, `src/app/api/rooms/[slug]/materials/route.ts` — read-only; no server change.

## Derive-or-dash
No free room in the registry → `READING_ROOM_PATH` is null → no Community reading-room door, no
PAGE_CATALOG entry, no dead link. No resources on a room → no resources region on its Stage.

## Shots
The Community nav open with both doors, the reading room (`/rooms/heart-field`) with who's-here, the
classroom (video/resources/chat + side panel) — both themes (dark/dawn), 1440 + 390, against the
production build on a fixture KV + a stub Matrix homeserver (ports 3261/3262/3263), harness adapted from
`~/dev/hermes/archive/task-210/patches/task-210/shots/`.

## Operator runbook
None expected — no env var, no KV flip, no vault write; the reading-room door derives entirely from the
existing rooms registry.
