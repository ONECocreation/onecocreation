# WORK-CLAIM - T-636 - ONE Cocreation: the Pay It Forward page (BUILD)

CLAIMED-BY: Number One's builder, block 974,079, on the Admiral's word in
K187 item 1 (Desk card 972826, his A "Build it, with my two fixes",
974,059): build the approved mockup (claim ad88a338) for real on current
origin/main, with the row law fixed (Give button, sats pills and the custom
amount box: one height, one centre line, within 1 px, measured at 1440 and
390) and the two reused store lines that carry a dash reworded so no dash
remains. The production double gate (jarsOpen() AND liveJarKeys()) stays as
drawn.
BRANCH: `feat/task-636-pay-it-forward`
WORKTREE: `~/dev/worktrees/task-636`
BASE: origin/main `7bc9487e` (merge #184)

## OWNS
- `work-claims/task-636.md` (this file)
- `src/app/pay-it-forward/page.tsx` (NEW — the public Pay It Forward page as
  drawn in the approved mockup: the field hero, how-a-gift-travels cards, the
  payforward jar in the gift drawer's warm panel WITH the production double
  gate wired in (jarsOpen() AND liveJarKeys(); derive-or-dash, a closed rail
  or a hidden jar renders no jar panel), the quiet way back. The two reused
  GiftDrawer lines that carry a dash are reworded here so no dash remains;
  every other reused word stays verbatim)
- `src/components/TipJar.tsx` (Number One's fix 1, the row law: the Give
  button rides the same `.btn-sm` size as the sats pills beside it and the
  custom amount box's padding/line-height land on the same 42px box — one
  height, one centre line, wherever a jar renders)
- `tests/pay-it-forward.test.ts` (NEW — source pins in the house idiom: the
  page's double gate, the two reworded dash-free lines, the row-law classes
  and input metrics, the presets/blurb truths)

READ-ONLY: everything else. `src/components/store/GiftDrawer.tsx` keeps
Love's approved words verbatim (its own dash lines are hers, unchanged);
`src/lib/jars.ts`, `src/lib/payments.ts`, `src/components/sections.tsx`
(liveJarKeys) are called, never edited. The trial-ending letter's
"Pay it forward" pill lives in the live /a/letters draft data (source copy
at ~/dev/briefings/mail/incoming/972671-love-trial-ending/trial-ending-draft.md:17)
— a data edit at the desk, not a repo file; named as a seam, not changed here.
