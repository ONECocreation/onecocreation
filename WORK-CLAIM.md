# WORK-CLAIM — TASK-105 (/studio REFERENCE: the ShinePages recon as its own category, read-only + point-to-new-site sweep)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: BFT derive-or-dash — claimed at session start, cut 0018.06.12 a₿ brief
BRANCH: `feat/task-105-reference-shinepages`
WORKTREE: `~/dev/worktrees/task-105`
BASE: main tip `799a71f` (docs: ShinePages recon vault)
ROOM: `/studio` pages panel + a new read-only `/studio/reference/[slug]` viewer + `/api/recon-img` + `src/lib/mail.ts` links. Does NOT touch the pages/KV store, the seeds, `docs/shinepages-recon/` content, or :3000/prod.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge to main, never push, never touch :3000/prod. The reference group is read-only — nothing writes to KV; old seeds untouched.

Files this lane touches:
- `WORK-CLAIM.md` (this claim)
- `src/components/studio/PagesPanel.tsx` (second, read-only REFERENCE group below the site pages)
- `src/app/studio/reference/[slug]/page.tsx` (new — the reference viewer, operator-gated)
- `src/app/api/recon-img/route.ts` (new — allowlisted read-only image route over docs/shinepages-recon/)
- `src/lib/shinepages-recon.ts` (new — slug → title/md/shots manifest)
- `src/lib/mail.ts` (SITE literal → siteBase() sweep)
- `package.json` (+ vitest devDep, "test" script), `vitest.config.ts` (new), `tests/` (new)

Brief: `~/dev/kimi/inbox/TASK-105-studio-reference-shinepages.md` (cut 0018.06.12 a₿)
Questions → Number One.
