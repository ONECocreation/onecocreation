# WORK-CLAIM — TASK-229 — ONE Cocreation: on /packages the picture is the door

CLAIMED-BY: **Number One**
CLAIMED-AT: 0018.06.23 a₿ · 12:50 · block 966,893
BRANCH: `lane/task-229` · WORKTREE: `~/dev/worktrees/task-229` · BASE: main @ `44ed65d`

Love, on the 2026-09-13 call: "I'd rather just the picture be a [button] instead of more
words"; the picture on each home membership card becomes a `Link` to that tier's own page
(focus-visible, `aria-label` = the package name, hover scale kept). The card's action door
now reads the same `features.store` switch the tier page already reads (`tierRailsOn`):
rails ON → a compact "See the package" link to the tier page (the waitlist form leaves the
card); rails OFF → today's waitlist form, unchanged. The lead words gain one exported const
so T-232's verbiage seed can find them later.

OWNS: `src/components/sections.tsx` (`Packages()` only), the optional (new)
`src/lib/tier-offer.ts`, tests. NOT the tier page's checkout, NOT `entitlement.ts`, NOT
`tiers-content.ts`.

Gates: `npx vitest run` (baseline before, must grow ≥ 3) · `node scripts/calendar-view.test.mjs` ·
`node scripts/cartridge-identity.test.mjs` · `node scripts/square-payments.test.mjs` ·
`npx eslint` 0 · `npx tsc --noEmit` · `npx next build`. Shots: `/packages` dark + dawn,
1440 + 390, fixture `features.store` ON and OFF (two states).

LAW: money path untouched (no checkout code); never the live Square; never push; never
archive; no serif.
