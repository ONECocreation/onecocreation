# work claim — task-291

Claimed 0018.06.25 a₿ (block 967,144) by home crew (Sonnet).

Base: onecocreation main @ c3a0afb (worktree cut here, branch feat/task-291).

Lane: the deliverables check on /a/store — the Admiral (0018.06.25): "need to ensure
that all of meditation items have a digital download. i would like to see a test of
each of these items." A server-side, operator-gated check (`GET
/api/admin/store/deliverables`) over every catalog item that carries — or should carry
— a `media.deliverable`, answering per item whether the file really answers (a blob
HEAD in prod, `fs.existsSync` on the dev driver), NEVER returning `blobPath` (THE LEAK
RULE, store.ts:57). A "Deliverables" panel on /a/store lists the pills + a Re-check
button.

OWNS: `src/app/api/admin/store/deliverables/route.ts` (NEW), `src/components/store/DeliverablesPanel.tsx`
(NEW) + its one mount line in `src/app/a/store/page.tsx`, `tests/store-deliverables-check.test.ts` (NEW),
this claim file.

NOT: `src/lib/store.ts` (read only), the download route, Ms. Kimi's T-287 lanes
(`src/app/a/**` description `<p>` lines), T-293 (`src/app/page.tsx`, the home seed,
`page-states.ts`).
