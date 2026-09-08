# WORK-CLAIM — TASK-165 (/book/cuts wears the house style — the T-152 seam, ruled B)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.17 a₿ · block 966,080
BRANCH: `feat/task-165-cuts-style`
WORKTREE: `~/dev/worktrees/task-165`
BASE: main tip `21aca88` (T-163 merged — vitest base 285).
ROOM: Cut from the T-152 review's seam, ruled B by the Admiral ("t152 - b
restyle now"): `src/app/book/cuts/page.tsx` +
`src/components/booking/CutsChooser.tsx` (116 lines) still wear the console
skin (the mgmt-* wrapper, page-local font/hex inlines, lit-paper-on-light
assumptions) on a PUBLIC door. Conscious Cuts is hidden by the `cuts`
switch (H58) so nobody reaches it today; when it returns it must look like
/book and /sessions after T-152. BUILD: restyle the chooser and the page
with the same classes/tokens T-152 gave /book (keep-dark night ground,
book-hero-veil + book-shelf-veil, kicker / stack-hero / lead, the house
FONT TRIO — NO serifs, the SlotPicker glass + lit-paper-field idiom for
the steps, the chip-select pressed law for the picked session). NO logic
change to the chooser — same props (none), same SESSIONS list, same
sessionStorage writes (LOC_KEY), same SlotPicker hand-off.
THE GATE, AS FOUND: the spec reads "keep T-160's switch gate — with `cuts`
OFF the route shows NotOpenYet inside the chrome (verify, don't rebuild)".
Verification on the base: T-160 gated /classes, /book, /store — /book/cuts
was NEVER gated (the `cuts` switch only hides the nav/sections doors). The
spec's own shots require the OFF state to render NotOpenYet, so this lane
adds the minimal gate branch at the very top of the owned page file, in
T-160's exact idiom (getSiteConfig → shared NotOpenYet inside SiteHeader/
SiteFooter chrome), clearly delimited, with the one-line justification in
SUMMARY.md. The gate mechanism itself is not rebuilt — the route adopts
the shared component the other gated routes already use.
CONCURRENCY: lanes T-161 (a/site, about, site-config), T-163 (merged),
T-167 (a/money, console cards, webhook route) run beside this one — all
disjoint from the OWNS list. Never touches another worktree, the main
checkout, the live site/vault, `.env.local`, or the operator's live
processes. Dev server on :3157 only, killed by recorded listener PID
(`ss -tlnp`).
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge
to main, never push, never archive. Never `git stash` (shared across
worktrees). ENGLISH-PIN. No new dependencies. BFT dating in comments. Love
design laws: no serif faces (house tokens only), contrast ≥ 4.5:1, no
color-only meaning. Derive-or-dash — never a fake link, number or name.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/app/book/cuts/page.tsx` — the house wrapper (T-152's /book idiom)
  + the minimal T-160-idiom `cuts` gate (see THE GATE, AS FOUND above)
- `src/components/booking/CutsChooser.tsx` — house restyle, zero logic
  change (same state, same writes, same SlotPicker hand-off)
- `tests/cuts-style.test.ts` (new) — the style + gate pins, read-the-source
  idiom (sessions-style.test.ts / route-gates.test.ts)

Brief: `~/dev/kimi/inbox/TASK-165-oc-book-cuts-house-style.md`
(cut 0018.06.17 a₿)
Gates: `npx vitest run` (base 285, must grow) · `npm run lint` = 0 ·
`npx tsc --noEmit` · `npx next build` · ALL `node scripts/*.test.mjs`
(calendar 70, cartridge 183, square-payments 36 hold) · shots: /book/cuts
with the `cuts` fixture switch ON (data/site-config.json, gitignored) both
themes × 1440/390, and OFF once (NotOpenYet) — own dev server :3157,
killed by recorded listener PID; harness borrowed per the task-148 outbox
idiom (shoot.cjs + run-shots.sh, puppeteer by require-path from repo
node_modules, NEVER a dependency) → `~/dev/kimi/outbox/task-165/shots/` ·
SUMMARY.md in `~/dev/kimi/outbox/task-165/`, ending LANE-DONE + full sha.
Questions → Number One.
