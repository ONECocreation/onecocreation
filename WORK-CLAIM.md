# WORK-CLAIM — TASK-163 (the catalog write never loses a race — the write lock)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.17 a₿ · block 966,080
BRANCH: `feat/task-163-catalog-lock`
WORKTREE: `~/dev/worktrees/task-163`
BASE: main tip `45d1d59` (T-145 merged — spendInventory lives in store.ts).
ROOM: `src/lib/store.ts`'s readCatalog()/writeCatalog() is a whole-document
read-modify-write on KV key `store:catalog`. Two settles in the same
instant (T-145's spendInventory) or an editor save beside a settle each
read the same doc and the last writer wins — a lost inventory decrement or
a lost edit. BUILD: NEW `src/lib/catalog-lock.ts` with `withCatalog(mutate)`
— a short lock (KV `SET store:catalog:lock <token> NX PX 4000`, retry with
jitter up to ~2 s, give up in words), read-mutate-write, release only if
the token matches; on the file/blob dev paths a process-local promise
chain is the lock. EVERY catalog mutation in store.ts (upsert, delete,
status flips, spendInventory, the category rename path — which rides
upsertItem per item) goes through it; no caller keeps its own read+write
pair. No behaviour change otherwise.
Does NOT touch `.env.local`, any port (no dev server needed), the
operator's live processes, the live site/vault, the main checkout, any
other lane's worktree, or any deployment.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates with BFT
stamps. Never merge to main, never push, never archive. Never `git stash`
(shared across worktrees). ENGLISH-PIN. No new dependencies. BFT dating in
comments. Derive-or-dash — never a fake link, number or name.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/lib/catalog-lock.ts` (NEW) — the withCatalog write lock
- `src/lib/store.ts` — route the mutations through withCatalog only
- `tests/catalog-lock.test.ts` (NEW) — the vitest pins with a fake kv

Brief: `~/dev/kimi/inbox/TASK-163-oc-catalog-write-lock.md`
(cut 0018.06.17 a₿ · block 966073)
Gates: `npx vitest run` (base 281, must grow — two concurrent spends on
inventory 3 × qty 2 end at 0 + soldout, never 1; an editor save during a
settle keeps both changes; a lock timeout returns the honest error) ·
`npm run lint` = 0/0 · `npx tsc --noEmit` · `npx next build` ·
`node scripts/*.test.mjs` (calendar 70, cartridge 183, square-payments 36)
· shots: NONE (no rendered surface — said so in SUMMARY.md) · SUMMARY.md
in `~/dev/kimi/outbox/task-163/`, ending LANE-DONE + full sha.
Questions → Number One.
