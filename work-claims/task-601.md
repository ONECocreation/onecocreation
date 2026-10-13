# WORK-CLAIM - TASK-601 - ONE Cocreation: the weekly next-reading draft carries Love's standing adjustments

CLAIMED-BY: Ms. Kimi, on the Admiral's A on Desk card 971255 (block 971,279; HOLD LIFTED line in the brief), brief inbox/TASK-601 (Kimi house), Love's words refs/loves-travels-971252/WORDS.md ("The letter adjustments"), framing corrections from Number One's note K171 (the site's .btn values are the LAW; the mockups are a reference, not files to copy; one button only; render order is lane 553c1's).
BRANCH: `feat/task-601-letter-standing-adjustments`
WORKTREE: `~/dev/worktrees/task-601`
BASE: origin/main (18fe9f7d, PR #158)

THE RULE: every "next reading" draft (and, for the greeting / no-members / sign-off only, the after-reading draft) carries Love's standing adjustments: the book-cover hero line (absolute, from the one shared constant), "Hello, beautiful soul!", the Intl short zone (MDT/MST, never "Mountain") in subject and body, the Heart Field replays line, the cta button that says the time ("1:11 PM"), the site .btn paint on the letter's cta pill (gradient 135deg #E7B2C3 to #C56E8B, ink #2E0E1D, bold, letter-spacing 2px, uppercase, radius 6px; email cannot animate the shimmer, the gradient is the shine), the YouTube Lives paragraph, and her five-line sign-off. Nothing typed that the schedule can derive. No em dash in new words.

## OWNS
- `work-claims/task-601.md` (NEW)
- `src/lib/reading-week-drafts.ts` (the letter words, zoneLabel drops FRIENDLY_ZONE, the hero line)
- `src/lib/reading-cover.ts` (NEW: the one neutral cover constant, no "use client", no server-only imports)
- `src/components/reading/ReadingStage.tsx` (the one COVER_SRC line: import instead of the literal)
- `src/lib/mail.ts` (the cta pill style only: a "cta" variant of pill() wearing the site .btn paint; primary and muted variants untouched)
- `tests/reading-week-drafts-534.test.ts`, `tests/after-reading-draft-538.test.ts` (pin tests updated to the new words, never deleted)
- `tests/letters-one-render.test.ts` (the PILL_FILL render pin follows the cta pill's new paint; pinned-string-across-lanes lesson, said in the SUMMARY)
- `tests/fixtures/letters-render-golden.json` (the T-552 golden, regenerated ON PURPOSE through its own UPDATE_LETTERS_GOLDEN=1 path: change 6 repaints the cta pill, so exactly the cta-carrying bodies' hashes move)
- `~/dev/kimi/outbox/task-601/`

READ-ONLY: `src/lib/letters.ts` (admitsDirectiveUrl verified, unchanged), `src/components/sections.tsx`, `src/lib/reading-letters.ts`, `src/lib/join-letters.ts`, the schedule modules, the live site. Not the October 17 draft in the room (hand paste, Number One's), not the three time buttons, not render order (lane 553c1), not T-602/T-603.
