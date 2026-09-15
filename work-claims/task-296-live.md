# work-claim — task-296-live (T-296 wave B: /live become designer pages with honest data-bound blocks, or carry an explicit words-only ruling)

Lane: Ms. Kimi (sub-agent). Base = onecocreation main @ **4f286c7** (the T-305 merge; wave A complete on ca83068 beneath it).
Branch `feat/task-296-live`. Worktree cut by Number One; `node_modules` absent at claim time → `npm ci` is the
first act after this claim lands. Lane ports **4398–4401**. GO: `~/dev/kimi/inbox/TASK-296-oc-every-page-in-style-wave-b.md`.

## The one difference from wave A
This lane MAY edit `src/lib/puck-config.tsx` and `src/lib/copilot.ts` — appending a block registration and its copilot
mirror is the point of wave B. Append only (new lines at the end of the existing lists); never reorder or rewrite an
existing entry. Every new block lives in its own new file under `src/lib/puck-blocks/`.

## The rubric (GO §2) — decide per piece, say the decision in the SUMMARY
- Static words (eyebrow, stacked hero lines, blurbs, doors with real hrefs) → seed blocks, transcribed verbatim.
- A self-contained CLIENT widget (reads its own session/API, needs no server-judged props) → a **{ id }-only block**:
  the JoinSurface/FormDoors shape — the block renders the existing component, the stored doc holds only the id, nothing is
  fossilised. The component stays where it is; the block file imports it.
- A widget that needs SERVER-judged props (a shelf listed on the server, rails judged on the server, live state) → the
  **RetreatsList/PackagesGrid shape**: a block + an `apply<Name>ToPuck(data, props)` injector the page calls at render.
- If neither is honest (the whole page is one live machine with no editable words worth the designer) → the
  **words-only ruling**: leave the route unwired, keep the row as words, and rewrite its `page-states.ts` note to say
  WHY in one sentence ("words-only — T-296 ruling: …"). A ruling is a valid LANE-DONE, not a failure.

## Per page — this pair
- **/live** is the hardest page and runs alone: two whole states (live → embed + room card; idle → schedule + YouTube pointer), every word conditioned on `getLiveState()`. Honest shapes, pick and say why: (a) ONE block `LiveDoor` + `applyLiveToPuck(data, { state, room, embed })` rendering both states from the existing pieces, with the page's eyebrow/h1 seeded (the h1 itself flips with state — so the h1 is part of the block, not the seed); (b) the words-only ruling ("words-only — T-296 ruling: every word on /live is conditioned on live state; nothing static to design") with the row's note rewritten. `LIVE_SCHEDULE` / `LIVE_YOUTUBE` are constants from `src/lib/live.ts` — the idle copy could be editable words, which is the one argument for (a). `JitsiRoom` and `TIERS` stay where they are.

## OWNS
The pair's `src/app/<page>/page.tsx`, their seed regions in `src/lib/puck-seeds.ts`, their rows in `src/lib/page-states.ts`,
NEW files under `src/lib/puck-blocks/`, APPENDED lines in `src/lib/puck-config.tsx` + `src/lib/copilot.ts`, one test file per
page, `work-claims/task-296-live.md`. NOT `src/components/**` (fallbacks + the widgets themselves — a block imports
them, never edits them; a needed change there = flag-and-stop with the diff), NOT the other pairs' pages, NOT wave A pages.

## Gates (verbatim, honest exit codes — no `| tail` masking)
`npx vitest run` · `node scripts/calendar-view.test.mjs` · `node scripts/cartridge-identity.test.mjs` ·
`node scripts/square-payments.test.mjs` · `npx eslint src tests --max-warnings=0` → 0 · `npx tsc --noEmit` ·
`npx next build` · shots read (fallback = published, the block renders the SAME widget in both) · the pages panel shows
each wired row as DESIGNER and each ruled row as words with its new note. Shots:
`bash scripts/shots-fixture.sh --ports 4398-4401 --routes "/live" --cookie none` fallback AND `--seed-puck <slugs>`
published, both themes × 1440/390; where a page's widget only shows itself to a signed-in member, add a `--cookie member` run
of the same routes and read both. Before final gates: `git merge main`, union-resolve the shared files (seeds regions,
page-states rows, the manifest test's designer array, and now the appended lists in puck-config.tsx/copilot.ts — keep every
side's lines), check every `Content: Block[] = [` still closes, re-run the full gates + shots.

## Report
`~/dev/kimi/outbox/task-296/live/SUMMARY.md` written AS YOU GO (Seams · gates · shots · the per-page decisions), ending once
with `LANE-DONE <full sha>`. Free kit prefixes: `lv` (/live).

— Number One, 0018.06.25 a₿ (block ~967,192 at cut)
