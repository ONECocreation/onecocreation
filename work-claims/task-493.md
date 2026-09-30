# TASK-493 claim

Builder: Ms. Kimi's crew (Kimi Code)
Block: 969,308 (height at pickup)
Branch: feat/task-493-every-letter-in-the-room
Worktree: /home/pac/dev/worktrees/task-493
Base: d0f85c7 (main @ the T-491/T-494 merges — PR #119 and PR #120 both
ancestors, verified with `git log --oneline -3`; the brief's HELD
condition is satisfied)

GOAL (brief `TASK-493-oc-every-letter-in-the-room.md`, SCOPE-letters
lane 3): `/a/letters` lists every letter the house sends, grouped
Welcome sequence / Reading / Store / Sessions / System, each row saying
WHEN it sends in plain words; `welcome` and `order-receipt` get their
missing rows and `sendReadWithLoveLetter` joins the letters system as
the editable key `read-with-love` (override-first, rendered through
`letterHtml`, the rail-dependent room fragment riding a `{{room}}` slot
under the offer-letters doctrine).

Ground truth re-run on d0f85c7 at cut: the LETTERS array carries the
nine rows the brief names (six keyed, three unkeyed; no `welcome`, no
`order-receipt`); EDITABLE_LETTERS holds the eight keys in
src/lib/letters.ts:23-32; LETTER_DEFAULTS covers all eight;
DEFAULT_AUDIENCE is total over LetterKey; sendReadWithLoveLetter sits
hardcoded at src/lib/lead-magnet.ts:65-103 (drifted four lines from the
draft's 68-106); the length-8 pins sit at
tests/free-reading-path.test.ts:209 and tests/letters-send.test.ts:177;
the preview iframe line is src/app/a/letters/page.tsx:310 and carries
T-494's `sandbox=""` — never this lane's. No flag-and-stop condition
triggered.

## OWNS (verbatim from the brief)

`src/lib/letters.ts` (the `EDITABLE_LETTERS` / `DEFAULT_AUDIENCE` /
`LETTER_DEFAULTS` additions for `read-with-love` and the three comment
updates ONLY — SERIALIZED behind T-491 and T-494, who reshape this file
first; the base line above names which merges) · `src/lib/lead-magnet.ts`
(`sendReadWithLoveLetter` only, :68-106 at draft; the rest of the file
byte-identical; SERIALIZED behind T-491, which owns
`sendLeadMagnetLetter` in the same file) · `src/app/a/letters/page.tsx`
(the LETTERS array, the group labels, the when words, the slots fetch
and the two Reading rows; the preview iframe line 310 is NEVER this
lane's — SERIALIZED behind T-494's one-attribute edit there) · NEW
`tests/letters-every-letter-in-the-room.test.ts` (name per SUMMARY) ·
`tests/free-reading-path.test.ts` and `tests/letters-send.test.ts` (the
two length-pin lines and their comments ONLY, honestly broken) ·
`work-claims/task-493.md` + `work-claims/task-493-register.md` (the
claim commit comes first, the register beside it).
