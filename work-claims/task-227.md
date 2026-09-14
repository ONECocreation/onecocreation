# work-claim — TASK-227: a letter can point at the reading room

LANE: home crew (sonnet) · worktree `~/dev/worktrees/task-227` · branch `lane/task-227`
base: `main @ 1db98ef`

## Baseline (established at cut, before any change)

`npx vitest run`:
```
 Test Files  78 passed (78)
      Tests  790 passed (790)
```

## Scope (OWNS, per the brief)

- `src/lib/letters.ts` — `bodyToHtml`'s inline link rule ONLY: `[text](/path)` (one leading
  slash, no scheme) renders `<a href="${siteBase()}/path">…</a>`; `https?:` unchanged; anything
  else (`javascript:`, `mailto:`, `//host` scheme-relative, a bare word) fails the match and
  stays literal text, same as today.
- `src/lib/letter-marks.ts` — two new pure quick-insert helpers: `insertReadingRoomLink` (the
  Reading room button) and `insertHeroLine` (the Site picture button).
- `src/app/a/letters/page.tsx` — the toolbar (two new buttons) + the hint line under it. No other
  part of the page.
- Tests: extend the existing letters tests / add `tests/letter-site-links.test.ts`.

NOT touched: `src/lib/mail.ts`, the send route, `src/lib/reading-room.ts`, KV, any live letter,
the send route's one-send guard.

## Money/identity paths read (not edited)

`src/lib/reading-room.ts` (`READING_ROOM_PATH`), `src/brand/cartridge.ts`
(`cartridge.hero.heavenEarth` — confirmed against `public/images/heaven-earth.webp`, the curvy
purple-and-black "Where Heaven and Earth Meet" script, before wiring the Site-picture insert to
it), `src/lib/subscribers.ts` (`siteBase()`).
