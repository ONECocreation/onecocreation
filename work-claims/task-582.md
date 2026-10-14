# WORK-CLAIM - T-582 - ONE Cocreation: no long dash in email subjects

CLAIMED-BY: Number One's builder, on the Admiral's word at block 970,203: "yes clean up the long dashes in subjects too."
BRANCH: `feat/task-582-subject-dashes`
WORKTREE: `~/dev/worktrees/task-582`
BASE: origin/main `61c160a9`

## OWNS
- `work-claims/task-582.md` (NEW)
- the SUBJECT strings only in: `src/lib/letters.ts`, `src/lib/lead-magnet.ts`, `src/lib/reading-letters.ts`, `src/lib/order-receipt.ts`, `src/lib/mail-booking.ts`, `src/lib/mail-studio-invite.ts`, `src/lib/live.ts`, `src/lib/cart-reminders.ts`, `src/lib/gift-vouchers.ts`, `src/lib/entitlement-fulfil.ts`, `src/app/a/letters/page.tsx`, `src/app/api/bookings/[id]/change/route.ts`, `src/app/api/contact/route.ts`, `src/app/api/mail/test/route.ts`
- the test pins of those subjects in `tests/`
- `tests/subject-no-long-dash-582.test.ts` (NEW)

READ-ONLY: everything else; bodies, comments, page titles.

## FOUND, NOT IN THIS LANE
- Love's own overrides live in KV and are not in code; any dash she typed stays until she edits it.
- Body copy still carries long dashes (many).
- `src/app/letters/[key]/page.tsx` browser title `${subject} — One Cocreation` is a page title, not a subject.
