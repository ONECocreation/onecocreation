# TASK-482 claim

Builder: sonnet sub-agent for Number One
Block: 968,624+ (Saturday, reading day)
Branch: feat/task-482
Worktree: /home/pac/dev/worktrees/task-482
Base: origin/main 5186ccf

GOAL: the automated reading-day letters send LOVE'S OWN WORDS, not the
built-in default copy. The 2 a.m. day-of letter went out with "Don't
forget — the reading is today" instead of her composed letter "Weekly
Reading with Love #2" — `src/lib/reading-letters.ts` builds both
automated reading letters (`readingConfirmationLetter`,
`readingDayOfLetter`) in code and never reads the letters vault
(`src/lib/letters.ts`: `letters:tpl:<key>` via `getLetterOverride`).

Two-part build, ORDER CHANGED mid-lane by the Admiral (via Number One):

PART 1 (hotfix, its own commit, gated green on its own before Part 2
starts): `reading-letters.ts` reads two NAMED, HARDCODED composed-letter
keys — `weekly-reading-with-love` (confirmation) and
`weekly-reading-with-love-2` (day-of), the production keys confirmed
from the live /a/letters list — rendered with the SAME renderer
`/api/admin/letters/send` uses (`letterHtml`), falling back to the
built-in words unchanged when that letter is missing, its body is
empty, or the vault errors.

PART 2 (the originally-briefed "Sends automatically" slot UI): one KV
slot per automatic send (`letters:auto`), settable from
`/a/letters/[key]`'s own page ("Not automatic" / "When someone signs up
for the reading" / "Reading-day morning (2 a.m.)"); when a slot is SET
it overrides Part 1's hardcoded default for that send.

## OWNS

- `work-claims/task-482.md` — this file.
- `src/lib/reading-letters.ts` — EDIT: Part 1's named default keys +
  composed-letter lookup/fallback wired into the two send paths (guards
  R1-R7 untouched); Part 2's slot lookup layered on top (slot wins over
  the hardcoded default when set).
- `src/lib/letters.ts` — EDIT (Part 2 only): the `letters:auto` slot
  store (get/set helpers), fail-closed to "no slot" on a KV error.
- `src/app/api/admin/letters/slots/route.ts` — NEW (Part 2 only):
  operator-gated GET/PUT for the slot map, mirroring
  `src/app/api/admin/letters/route.ts`'s auth.
- `src/app/a/letters/[key]/page.tsx` — EDIT (Part 2 only): the "Sends
  automatically" row.
- `tests/reading-letters-composed-482.test.ts` — NEW (Part 1): pins the
  named default keys, the fallback triad (missing / empty / KV error),
  and that the send paths route through the composed-letter builders.
- `tests/letters-auto-slots-482.test.ts` — NEW (Part 2): the slot store,
  the admin route's auth gate, and slot-overrides-default.

## READ-ONLY

Everything else. In particular: `src/app/api/admin/letters/route.ts` and
`src/app/api/admin/letters/send/route.ts` (read for the renderer/auth
pattern, not edited), `src/lib/booking-time.ts`, `src/lib/mail.ts`. No
other lane's files (task-478..481 running alongside).
