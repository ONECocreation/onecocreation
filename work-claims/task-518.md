# TASK-518 claim

Builder: Ms. Kimi's crew (Kimi Code)
Block: 969,339 (height at pickup)
Branch: feat/task-518-love-knows-who-bought
Worktree: /home/pac/dev/worktrees/task-518
Base: 8ef0363cb879693eb23fffa6d839c66704398708 (origin/main @ the T-493
merge, PR #123 — the brief's HELD condition is satisfied: T-491 PR #119,
T-494 PR #120, and T-493 PR #123 are all ancestors)

GOAL (brief `TASK-518-oc-love-knows-who-bought.md`, ruling of record
K131): every settled purchase (membership, pass, package, booking, store
order, gift) sends Love ONE short letter at her notice address
(`offerNotifyTo()`): who bought, what, which tier or pass and for how
long, the amount, one write-back button. Once per order via SET NX on
`order:<id>:love-notified` (the order-receipt.ts marker idiom); direct
`sendMail` like the receipt, never the queue; words editable in the
Letters room as `purchase-love-notify` (EDITABLE_LETTERS 9 to 10);
never card details; one /a switch turns it off.

Ground truth re-run on 8ef0363 at cut: EDITABLE_LETTERS holds the nine
keys at src/lib/letters.ts:23-33 (T-493's `read-with-love` the ninth,
length pins at 9); the room page's LETTERS array carries the post-T-493
shape (group + when fields, src/app/a/letters/page.tsx:23); `letterFor`
is exported from src/lib/pwyc-letters.ts:120; `offerNotifyTo` at
pwyc-letters.ts:25-27; the receipt marker idiom at
src/lib/order-receipt.ts:133/:235; `buyerEmailOf` at order-receipt.ts:69;
`recordChargeEvent`'s settled-flip block with the receipt call at
src/lib/store.ts:834-852; the three direct code-settle writes at
store/checkout/route.ts:249, cart/checkout/route.ts:365,
bookings/checkout/route.ts:201; `bestPackageGrant` private at
src/lib/entitlement-fulfil.ts:63; `getBooking` at
src/lib/booking-orders.ts:305; the features group at
src/lib/site-config.ts:87-112 with defaults at :239-249, sanitize's
generic bools() at :285-294 and saveSiteConfig's whole-group merge at
:691; FEATURE_ROWS at src/app/a/site/SiteRoom.tsx:31-41; FEATURE_LABELS
total Record at src/components/console/NavEditor.tsx:34-53. One drift
from the draft: tests/letters-one-render.test.ts's per-key block still
reads "all eight" (T-493 merged without adding a read-with-love case
there) — this lane adds its one case and re-trues the count word
honestly, the T-493 gap named in SUMMARY. No flag-and-stop condition
triggered.

## OWNS (verbatim from the brief)

- `work-claims/task-518.md` (NEW, first commit), `work-claims/task-518-register.md` (NEW)
- `src/lib/purchase-love-notify.ts` (NEW)
- `src/lib/letters.ts` (the `EDITABLE_LETTERS` / `DEFAULT_AUDIENCE` / `LETTER_DEFAULTS` additions and the comment truing ONLY; SERIALIZED behind T-493, the HELD note in the LANE line)
- `src/lib/store.ts` (ONE call in the `recordChargeEvent` settled-flip block, beside the receipt; nothing else in the file)
- `src/app/api/store/checkout/route.ts`, `src/app/api/cart/checkout/route.ts`, `src/app/api/bookings/checkout/route.ts` (ONE call each at the named code-settle blocks)
- `src/lib/site-config.ts` (the one feature field, its default, its docblock)
- `src/app/a/site/SiteRoom.tsx` (ONE FEATURE_ROWS entry)
- `src/components/console/NavEditor.tsx` (ONE FEATURE_LABELS line; minimal-forced-edit, load-bearing: the total Record fails tsc without it; the TASK-187/TASK-393 precedent; justification in SUMMARY)
- `src/app/a/letters/page.tsx` (ONE row in the post-T-493 LETTERS array)
- `tests/purchase-love-notify.test.ts` (NEW), `tests/free-reading-path.test.ts` and `tests/letters-send.test.ts` (the two length-pin lines and comments ONLY), `tests/letters-one-render.test.ts` (the one new per-key case and the count word ONLY)

WIDENED at build time (the seam law: a real widening edits the claim
first, in its own named add):

- `tests/order-receipt.test.ts` (the three pins that count letters on a
  settle ONLY — a settle now mails two once-only letters, the receipt to
  the buyer and this lane's letter to Love; updated with TASK-518
  comments, never deleted; the minimal diff rides in SUMMARY's seam list)

READ-ONLY: `src/lib/pwyc-letters.ts` (`offerNotifyTo` and `letterFor`
reused, never edited) · `src/lib/order-receipt.ts` (`buyerEmailOf`
reused) · `src/lib/entitlement-fulfil.ts`, `src/lib/booking-fulfil.ts`,
`src/lib/gift-vouchers.ts` · `src/lib/mail-queue.ts`,
`src/app/api/mail/tick/route.ts` · both webhook routes, both reconcile
routes · `src/app/api/admin/matrix/ceremony/route.ts` ·
`src/app/api/admin/site/route.ts` · `src/app/api/admin/letters/**` ·
`src/lib/mail.ts` · `src/lib/booking-orders.ts` (`getBooking` read only)
· `src/lib/money-words.ts` · `src/app/letters/[key]/page.tsx` ·
`vercel.json` · every buyer-facing letter sender · `package-lock.json`.

NOT: any settle-logic, webhook, checkout-math, rail, or order-record
change; no buyer-facing letter change; no roll-up, digest, or dashboard;
no Stripe path; no new env var or KV doc; no queue send; no deploy
steps.
