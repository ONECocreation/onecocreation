# WORK-CLAIM — TASK-126 (the Read with Love letter + the squares' heading + the last public haircut strings)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.16 a₿ (block 965,941)
BRANCH: `feat/task-126-read-with-love-letter`
WORKTREE: `~/dev/worktrees/task-126`
BASE: main tip `016fe0b` (merge T-119; T-120 and T-123 already merged — all
spec steps run, nothing waits).
ROOM: Three parts, one lane. (1) THE LETTER: a subscriber joining with
`source === "readwithlove"` receives the Read with Love welcome letter —
subject "Read with Love — your seat", body about the weekly live reading,
the Zoom line read from `READ_WITH_LOVE_ZOOM_URL` SERVER-SIDE ONLY; unset,
the line honestly reads "The Zoom link is coming — I'll send it before the
first reading." (derive-or-dash — never a fake or placeholder URL, never the
URL in any page markup). The day-two welcome is SKIPPED for this source (it
is about the meditation); every other source is byte-for-byte unchanged.
`.env.example` gains the var NAME and a comment only — the value is never
echoed anywhere. (2) THE HEADING: `sections.tsx` and `support/page.tsx`'s
"Where Pay It Forward Flows / It doesn't stop here" above the squares
becomes **"Three Doors"** with sub "Give forward, follow along, read with
me." — both places, same words, no other copy moves. (3) STEP 4 (added at
the T-119 gate): Love no longer offers haircuts — the "Silent Haircuts"
spotlight entry leaves `CommunitySpotlight.tsx`, the two "Silent Haircut —
Women/Men" choices leave `CutsChooser.tsx` (the chooser keeps working with
what remains; empty renders nothing), and `SlotPicker.tsx` drops the "A
silent haircut — ConsciousCuts" phrase. Afterwards `grep -rni haircut
src/app src/components` returns zero hits and the output rides the SUMMARY.
Does NOT touch `.env.local`, :3000/:4100 (the operator's live processes),
the main checkout, or any deployment. Dev server on :3126 only, killed by
recorded PID.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge
to main, never push. ENGLISH-PIN. No new dependencies. BFT dating in
comments. Love design laws: no serif faces, contrast ≥ 4.5:1, no color-only
meaning. Module law: no cross-app imports.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/lib/lead-magnet.ts` — the Read with Love welcome letter sender
- `src/app/api/subscribe/route.ts` — source branch: RWL letter, day-two skip
- `.env.example` — `READ_WITH_LOVE_ZOOM_URL` name + comment only
- `src/components/sections.tsx` — the heading above the squares ONLY (~294)
- `src/app/support/page.tsx` — the same heading ONLY (~68)
- `tests/read-with-love-letter.test.ts` (new) — the vitest pins
- `src/components/CommunitySpotlight.tsx` — the Silent Haircuts entry out
- `src/components/booking/CutsChooser.tsx` — the two haircut choices out
- `src/components/booking/SlotPicker.tsx` — the haircut phrase out (~584/613 ONLY)

Brief: `~/dev/kimi/inbox/TASK-126-oc-read-with-love-letter.md` (cut 0018.06.16 a₿)
Gates: `npx vitest run` ≥ 28 · `node scripts/calendar-view.test.mjs &&
node scripts/cartridge-identity.test.mjs && node scripts/square-payments.test.mjs`
· `npm run lint` = 0 · `npx tsc --noEmit` · `npx next build` · shots of the
squares under the new "Three Doors" heading in dark + dawn (own dev server on
:3126, stopped by PID after) → `~/dev/kimi/outbox/task-126/shots/` ·
SUMMARY.md in `~/dev/kimi/outbox/task-126/`
Questions → Number One.
