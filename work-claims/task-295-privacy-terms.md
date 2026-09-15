# work-claim — task-295-privacy-terms (T-295 wave A, pair 2: /privacy + /terms become designer pages)

Lane: Ms. Kimi (sub-agent). Base = onecocreation main @ **57bba3a** (the T-293 merge, per K31/K32).
Branch `feat/task-295-privacy-terms`. Worktree cut by Number One; `node_modules` absent at claim
time → `npm ci` is the first act after this claim lands. Lane ports **4326–4329**.
GO: `~/dev/kimi/inbox/TASK-295-oc-every-page-in-style-wave-a.md`.

## Ground (from the GO)
- Wired precedent, byte-for-byte: `src/app/about/page.tsx:68-88` (`getPuckPage(slug)` →
  `<Render config data>` inside SiteHeader/PaletteVars/SiteFooter/PopupHost; today's JSX
  untouched as the fallback).
- Seeds in `src/lib/puck-seeds.ts` (`SEEDS[slug]`, the `kit()` idiom, unique ids incl. slot
  children — the T-231 lesson). Data-bound pieces = a local block in `src/lib/puck-blocks/` +
  registry + copilot mirror + `apply*ToPuck` injection — never fossilise live data into a seed.
- Route gates (`features.*` switches) come FIRST on the page (T-232 idiom).
- `src/lib/page-states.ts`: flip `/privacy` and `/terms` rows words → designer as they land.
- Pages-panel manifest test `tests/pages-panel-states.test.ts` walks `src/app/*/page.tsx`.
- Words law: transcribe, never rewrite; the legal pages' words are verbatim transcripts.

## Per page (GO verbatim)
1. Read the page JSX; list every piece: prose → seed blocks verbatim; pictures → Image blocks
   with real paths; doors/buttons → Button/ButtonRow with real hrefs; forms/data → existing
   block, else flag-and-stop with the diff (never touch `puck-config.tsx`/`copilot.ts` in this
   lane), else "stays JSX-only, said in the seed".
2. Seed + Puck-first wiring + `page-states.ts` row + tests (fallback renders; published fixture
   doc renders; a draft never leaks; unique seed ids).
3. Shots via `bash scripts/shots-fixture.sh --ports 4326-4329 --routes "/privacy,/terms"
   --cookie none` fallback AND published (seed fixture KV `puck:page:<slug>` per the T-231/T-232
   pattern; T-291's `--seed` copy lives at `~/dev/home/archive/task-291/…/shots-fixture-seeded.sh`
   (if present) until T-294 lands it in scripts/), both themes × 1440/390. Fallback = published,
   read and said.

## OWNS
`src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, their seed regions in
`src/lib/puck-seeds.ts`, their rows in `src/lib/page-states.ts`, one test file per page,
`work-claims/task-295-privacy-terms.md`. NOT `puck-config.tsx`/`copilot.ts` (flag-and-stop),
NOT `src/components/**`, NOT home (T-293), NOT wave B pages, NOT the other pair's pages.

## Gates (verbatim, honest exit codes — no `| tail` masking, K29 law)
`npx vitest run` · `node scripts/calendar-view.test.mjs` · `node scripts/cartridge-identity.test.mjs` ·
`node scripts/square-payments.test.mjs` · `npx eslint src tests --max-warnings=0` → 0 ·
`npx tsc --noEmit` · `npx next build` · shots read (fallback = published) · pages panel shows
both rows as DESIGNER. Before final gates: `git merge main` (main moved to 7b6f7bf; expect a
lockfile change → `npm ci` after the merge).

## Report
`~/dev/kimi/outbox/task-295/privacy-terms/SUMMARY.md` written AS YOU GO, ending once with
`LANE-DONE <full sha>`.

— Ms. Kimi, 0018.06.25 a₿ (block 967,174 at cut)
