# work-claim — task-295-news-media (T-295 wave A, pair 5: /news + /media become designer pages)

Lane: Ms. Kimi (sub-agent). Base = onecocreation main @ **78d61b3** (the T-295 pair 3 + 4 merge, per K36).
Branch `feat/task-295-news-media`. Worktree cut by Number One; `node_modules` absent at
claim time → `npm ci` is the first act after this claim lands. Lane ports **4378–4381**.
GO: `~/dev/kimi/inbox/TASK-295-oc-every-page-in-style-wave-a.md` + K36.

## Ground (from the GO)
- Wired precedent, byte-for-byte: `src/app/about/page.tsx:68-88` (`getPuckPage(slug)` →
  `<Render config data>` inside SiteHeader/PaletteVars/SiteFooter/PopupHost; today's JSX
  untouched as the fallback). Route gates (`features.*` switches) come FIRST on the page
  (T-232 idiom). `force-dynamic` on the designer branch (pair 1 pattern).
- Seeds in `src/lib/puck-seeds.ts` (`SEEDS[slug]`, the `kit()` idiom, unique ids incl. slot
  children — the T-231 lesson). Data-bound pieces = a local block in `src/lib/puck-blocks/` +
  registry + copilot mirror + `apply*ToPuck` injection — never fossilise live data into a seed.
- `src/lib/page-states.ts`: flip the `/news` and `/media` rows words → designer as they
  land. (`/packages` row was already cured by pair 1 — do not touch it.)
- Pages-panel manifest test `tests/pages-panel-states.test.ts` walks `src/app/*/page.tsx`.
- Words law: transcribe, never rewrite.

## Per page (GO verbatim)
1. Read the page JSX; list every piece: prose → seed blocks verbatim; pictures → Image blocks
   with real paths; doors/buttons → Button/ButtonRow with real hrefs; forms/data → existing
   block, else flag-and-stop with the diff (never touch `puck-config.tsx`/`copilot.ts` in this
   lane), else "stays JSX-only, said in the seed".
2. Seed + Puck-first wiring + `page-states.ts` row + tests (fallback renders; published fixture
   doc renders; a draft never leaks; unique seed ids).
3. Shots via `bash scripts/shots-fixture.sh --ports 4378-4381 --routes "/news,/media"
   --cookie none` fallback AND `--seed-puck news,media` published (T-294 landed the seed flag
   in-repo; the outbox variants are retired). Both themes × 1440/390. Fallback = published,
   read and said.

## OWNS
`src/app/news/page.tsx`, `src/app/media/page.tsx`, their seed regions in
`src/lib/puck-seeds.ts`, their rows in `src/lib/page-states.ts`, one test file per page,
`work-claims/task-295-news-media.md`. NOT `puck-config.tsx`/`copilot.ts`
(flag-and-stop), NOT `src/components/**`, NOT home, NOT wave B pages, NOT the other
pair's pages (/bday, /time).

## Gates (verbatim, honest exit codes — no `| tail` masking, K29 law)
`npx vitest run` · `node scripts/calendar-view.test.mjs` · `node scripts/cartridge-identity.test.mjs` ·
`node scripts/square-payments.test.mjs` · `npx eslint src tests --max-warnings=0` → 0 ·
`npx tsc --noEmit` · `npx next build` · shots read (fallback = published) · pages panel shows
both rows as DESIGNER. Before final gates: `git merge main` (union-resolve the three shared
files if they conflict: `puck-seeds.ts` regions, `page-states.ts` rows, the manifest test's
designer array), then re-run the full gates + shots after the merge.

## Report
`~/dev/kimi/outbox/task-295/news-media/SUMMARY.md` written AS YOU GO, ending once with
`LANE-DONE <full sha>`.

Free kit prefixes to use: `nw` (/news), `mi` (/media).

— Number One, 0018.06.25 a₿ (block 967,185 at cut)
