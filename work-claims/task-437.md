# WORK-CLAIM — TASK-437 — ONE Cocreation: the homepage's reading button goes to `/reading`

CLAIMED-BY: **Ms. Kimi's builder** (K116 Ask 1, brief by Number One)
CLAIMED-AT: block 968,221 a₿
BRANCH: `feat/task-437-hero-door-to-reading` · WORKTREE: `~/dev/worktrees/task-437` ·
BASE: main @ `e1840cd8a85dcc2e948ea054747e4ce79a8f4665` · PORTS: 4798–4801

Saturday-critical. The hero's rose "Join the Weekly Reading" button leads to the PAID
Chronicles room (tier B, "…with the Observer membership"); Love's Saturday reading is FREE
and has its own page, `/reading`. The Admiral ruled (block 968,215): "send them to the
/reading." This lane re-points the hero door — one door for EVERY visitor (guest, member,
any tier), href `/reading`, the words derived from the LIVE reading schedule (weekday +
time in the schedule's zone + free), never hardcoded, no tier name, no price. Derive-or-dash:
schedule `on: false` → no door, no words (the `{readingDoor && (…)}` gate and Love's book
picture inside it, T-228, stay). `/rooms/weekly-reading` itself is untouched — it stays the
paid Chronicles room. The "see her live" button is T-438, NOT this lane.

CHOICE (brief Build 1): KEEP the export name `weeklyReadingDoor` — five test files and
PreviewHero.tsx:43's docblock cite it; the signature changes (the door no longer derives a
room or follows the visitor's tier; it derives from the schedule), and every citer is
re-trued in the same lane. Recorded here per the brief.

OWNS (from the brief, verbatim):
- `src/components/sections.tsx`: the `weeklyReadingDoor` function and the `Hero`
  component's door block only.
- `src/app/page.tsx`: the schedule read + the `<Hero>` prop (`:34-62` region).
- `tests/join-the-reading.test.ts`, `tests/site-knows-who-is-signed-in.test.ts` (the
  weeklyReadingDoor arms), `tests/reading-book-picture.test.ts` (the source pin, re-trued,
  not deleted).
- NEW `tests/hero-door-to-reading.test.ts`.
- `work-claims/task-437.md` (this file).

READ-ONLY: `src/app/reading/page.tsx`, `src/lib/reading-room.ts`,
`src/lib/reading-schedule.ts`, `src/lib/matrix-rooms.ts`, `src/lib/room-access.ts`,
`src/components/style/PreviewHero.tsx`. FORBIDDEN: room gates, tiers, middleware, the
`/reading` page, new CSS, new colours, a new `style={{`.

Tests red first, then green, per the brief's Tests section. Gates (verbatim, via
`~/dev/shortcuts/oc-gate.sh`): `npx vitest run` · `for f in scripts/*.test.mjs; do node
"$f"; done` (each `0 failed`) · `npx eslint src tests --max-warnings=0` · `npx tsc --noEmit`
· `npx next build`. Shots are Number One's (the house shots method) — owed, named in the
SUMMARY; `shots-fixture.sh` is not run. Slop review required; no security review (no gate
changes).

LAW: commits only, named `git add` only; never merge/fetch/push/config; block-height
stamps only, no civil dates.
