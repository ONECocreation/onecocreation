# work-claim — task-441 (OC · S · the store shelf: the one-week pass sits last, and a lone card on the last row sits in the middle)

Lane: the home crew (Ms. Kimi's builder, under Number One's gate). Base = onecocreation
main **5828cd0** (confirmed by `git rev-parse HEAD` in this worktree). Branch
`feat/task-441-shelf-pass-last`. Worktree cut by Number One at `~/dev/worktrees/task-441`,
`npm ci` done before hand-off. Lane ports **4814–4817**. Brief:
`~/dev/kimi/inbox/TASK-441-oc-shelf-pass-last-lone-center.md` (block 968,222). Ground-truth
note: main has since moved to `67154f546368708a16f9abef05b7b4b425809e34` (PR #63 = T-437);
this lane stays on its cut base — Number One handles any main-merge at the gate.

What the lane builds: in `ShelfSection.tsx`, a new pure export
`isTasterPass(item)` = `kind === "package" && (entitlementDays ?? 0) > 0`; `shelfGroups`
sorts (taster last) first, then `effectiveAmount` ascending (the price law holds inside
each band), with one line added under the `:56` law comment ("tasters (one-week passes)
sit after the tiers — the Admiral, block 968,222"); and the lone-last-card centre —
`loneLast` = `count >= 4 && count % 3 === 1 && groupItemsByBundle(group.items).length === 0`,
giving the grid class `grid grid-3 grid-lone-center` (exactly today's string when false).
In `src/app/house.css`, ONE rule inside the existing `@media(min-width:760px)` block at
`:304`: `.grid-3.grid-lone-center>:last-child{grid-column:2}`. No new media query, no new
colour, no `style={{`. Mockup seen:
`~/dev/briefings/shelf-968222/PREVIEW-memberships-lone-center-1080.jpg` (row 1 Weekly
Intuitive $33 · Observer $55 · Evening Star $111; row 2 the pass centred under Observer).

## OWNS

`work-claims/task-441.md` (this file, first commit),
`src/components/store/ShelfSection.tsx`,
`src/app/house.css` (the one rule at `:304` only),
`tests/shelf-pass-last.test.ts` (NEW).

READ-ONLY (grounding only, never edited): `src/lib/store.ts`, `src/lib/store-sections.ts`,
`src/components/store/StoreItemCard.tsx`, `src/components/store/FreeMeditationCard.tsx`,
`src/app/store/page.tsx`, `src/app/store/memberships/page.tsx`,
`tests/store-bundles.test.ts`, `tests/store-sections.test.ts`,
`tests/meditations-shelf.test.ts`.

## What is NOT in this lane

Never touched: store data, the catalog, `/a/store`, any price; `StoreItemCard` and the
card's own look; any other grid, `.reveal`, the bundle markup, `globals.css`'s own
`.grid-3` at `:320`; `/packages/*` and `/memberships` (T-439 territory). The
count % 3 === 2 pair case keeps today's left-aligned pair (the Admiral asked about the
single wrap only). No push, no PR, no merge, no fetch, no rebase, no config. Block-height
stamps only.

## Cut note

Claimed at block 968,232 (house beacon `curl -s https://time.pacsarcade.org/height`).
