# work-claim — task-384 (OC · the reading room always opens the Stage)

This is `work-claims/task-384.md`. Lane: the home crew (Sonnet builder), under Number
One's gate. Base = onecocreation main **c9ebcb94f2eec21570ecd9f15edcb3764dd8b7ef**
(`git log -1` on this worktree's HEAD before any commit matches this sha exactly —
"Merge pull request #33 from ONECocreation/feat/task-381-reading-schedule-source").
Branch `feat/task-384-reading-door-opens-the-stage`. Worktree cut by Number One at
`~/dev/worktrees/task-384`, `npm ci` run fresh by this builder (550 packages, 0
vulnerabilities). Lane ports **4630–4633**. Brief:
`~/dev/kimi/inbox/TASK-384-oc-reading-door-opens-the-stage.md`. PR title (Number One's
to open, not this builder's): **FLOW · the reading-room door always opens the Stage**.

**The design, RULED (not re-opened here):** no door change anywhere, no query string
ever put on a URL — the whole fix lives inside `vantage.ts` as a transient, per-visit
decision. While a member stands in the reading room (`#heart-field:onecocreation.com`,
the site's one `minTier: "all"` room) and has not yet clicked a vantage tab THIS visit,
the room resolves to the Stage, regardless of any OTHER room's saved vantage. The
instant they click a tab, that tab wins for the rest of this visit AND legitimately
writes the one shared `oc-room-vantage` key, exactly as it does today — arrival never
writes the shared preference, only an explicit pick does. `reading-room.ts` gains one
pure predicate, `opensOnStage(pathname)`.

## OWNS

`src/lib/reading-room.ts` (the new `opensOnStage` export and its one docblock sentence
— `roomPath`/`READING_ROOM_PATH`/`READING_ROOM_SLUG`/`readingDoorHref` stay
byte-identical), `src/components/rooms/vantage.ts` (the new `PinnedVisit`/`StorageLike`
types, the exported `vantageFor`, the exported `createVisitStore` controller, the one
production `store` singleton, and `useRoomVantage`'s new body —
`resolveVantage`/`ROOM_VANTAGE_SITE_DEFAULT`/`readVantage`/`readServerVantage`/
`useRoomVantage`'s exported TYPE stay byte-identical), the new test file
(`tests/room-vantage-arrival.test.ts`), `work-claims/task-384.md` (this file, first
commit). No existing test is edited.

## READ-ONLY and FORBIDDEN (per brief)

READ-ONLY: `src/components/rooms/VantageSwitcher.tsx`, `src/app/kit.css`,
`src/app/house.css`, `src/app/cartridge.css`, every other test file in `tests/`.

FORBIDDEN: `src/components/rooms/ClassroomView.tsx`, `src/app/rooms/[slug]/page.tsx`
(T-382's files), `src/components/NavMenu.tsx`, `src/components/door/door-machine.ts`,
`src/lib/lead-magnet.ts`, `src/app/a/letters/page.tsx`,
`src/components/rooms/PackageRoomsCard.tsx`, `src/lib/rooms-door.ts`,
`src/middleware.ts` — no door, no href, no query string on any URL, no styling change,
no new npm dependency, no change to `VANTAGE_KEY`'s persisted value except through the
existing, unchanged `setVantage` write.

## Gates

`npx vitest run` · each live `scripts/*.test.mjs` (`calendar-view.test.mjs`,
`cartridge-identity.test.mjs`, `square-payments.test.mjs`) · `npx eslint src tests
--max-warnings=0` · `npx tsc --noEmit` · `npx next build` (Number One's gate, after
`git merge main`). This builder runs everything short of `next build` and the shots
walk, per its own instructions.

## What is NOT in this lane

Not a door change of any kind — every href on the site stays byte-identical to base.
Not a middleware or `rooms-door.ts` change. Not a fix to `PackageRoomsCard.tsx:166-168`'s
missing `?next=` (named residual (a) in the brief). Not a persisted-storage change
beyond the existing, unchanged `setVantage` write — arrival never calls
`localStorage.setItem`. Not a change to `resolveVantage`, `ROOM_VANTAGE_SITE_DEFAULT`,
`readVantage`/`readServerVantage`'s return contracts, `roomPath()`,
`READING_ROOM_PATH`/`READING_ROOM_SLUG`'s values, `ClassroomView.tsx`, or
`src/app/rooms/[slug]/page.tsx`.

## Cut note

Stamp per the brief, block 968,061 (claimed).
