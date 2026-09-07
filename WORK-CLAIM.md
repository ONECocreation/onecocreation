# WORK-CLAIM — TASK-134 (the jars follow the switches; the pay-it-forward jar becomes GIFTS OF GRATITUDE with its own header)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.17 a₿ (block 965,964)
BRANCH: `feat/task-134-gifts-of-gratitude`
WORKTREE: `~/dev/worktrees/task-134`
BASE: main tip `a7da8b5` (T-133 merge; T-135/136/137 of this wave run in
parallel on OTHER files in other worktrees — rebase onto main before
reporting if main moved).
ROOM: The Admiral (test session): "when I turned bitcoin off it still
displayed the gifts of gratitude under /support. That jar name should be
renamed to Gifts of Gratitude everywhere; it can have its own header under
the support area." So: ONE helper `jarsOpen()` gates the jars on
`features.jars` AND the bitcoin rail actually live (`liveAdapter()`
non-null) — /support and the home Donations() both read it so they can
never disagree; the `payforward` jar's LABEL becomes "Gifts of Gratitude"
everywhere it is named (the KEY stays `payforward` — ledger continuity);
and on /support the jars split into "Tip the field" (Tip Love · Tip One
Cocreation) and "Gifts of Gratitude" (the payforward jar) with a two-line
explainer and a quiet dash line for the future "how gifts were received"
(derive-or-dash — no fake stories).
Does NOT touch `.env.local`, prod, KV/blob stores, the main checkout, or
any deployment. Dev server on :3134 only, killed by recorded PID.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge
to main, never push. ENGLISH-PIN. No new dependencies (puppeteer borrowed
for shots, never a project dependency). BFT dating in comments. Love design
laws: no serif faces, contrast ≥ 4.5:1, no color-only meaning. Module law.
Derive-or-dash.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/components/TipJar.tsx` — the rename, an `only` filter for the split,
  JARS exported for the test pins
- `src/app/support/page.tsx` — jarsOpen() gate + the two jar sections
- `src/components/sections.tsx` — Donations() gate ONLY
- `src/lib/letters.ts` — line ~135 copy ONLY ("The Gifts of Gratitude jar…")
- `src/app/a/money/page.tsx` — JARS label ONLY
- `src/app/api/tip/route.ts` — comments/labels ONLY
- `tests/jars.test.ts` (new) — the vitest pins

Known seam (flagged in SUMMARY.md): the spec pins `jarsOpen()` in
TipJar.tsx, but TipJar is a `"use client"` module — a server page cannot
call a client-module export — so the helper lives beside `liveAdapter()`
in `src/lib/payments.ts` (one small additive export, load-bearing).
`src/app/a/page.tsx`'s JAR_LABELS carries the same jar label (one-token
rename under the "everywhere it is named" law). `src/lib/puck-seeds.ts`
seed copy still says "Pay It Forward" — flagged, not touched.

Brief: `~/dev/kimi/inbox/TASK-134-oc-gifts-of-gratitude.md` (cut 0018.06.16 a₿)
Gates: `npx vitest run` (baseline 69, must grow) ·
`node scripts/calendar-view.test.mjs && node scripts/cartridge-identity.test.mjs &&
node scripts/square-payments.test.mjs` · `npm run lint` = 0 ·
`npx tsc --noEmit` · `npx next build` · shots of /support (jars on),
/support (bitcoin OFF — block gone), home Donations() — dark + dawn →
`~/dev/kimi/outbox/task-134/shots/` · SUMMARY.md in
`~/dev/kimi/outbox/task-134/`
Questions → Number One.
