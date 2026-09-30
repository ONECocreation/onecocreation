# work-claim: task-491 — one true render for every letter (SCOPE-letters lane 1)

Stamped at block 969,301 (curl -s https://time.pacsarcade.org/height).

This file: `work-claims/task-491.md`.

Base: the branch `feat/task-491-letters-one-render` fast-forwarded to
origin/main `f6e8f94c6345f248936c9c79ad095bfed8dd11d6` at the K132 merge +
re-gate pickup (T-492's LANE-DONE tip and its AMENDMENT 2 pin re-aim are in
main via PR #116, so the stacking the brief ordered is satisfied by main
itself). Brief of record:
`~/dev/kimi/inbox/drafts/TASK-491-oc-letters-one-render.md`.

OWNS (verbatim from the brief):

`src/lib/letters.ts` (the `LETTER_DEFAULTS["lead-magnet"]` body only; every
other byte untouched) · `src/lib/lead-magnet.ts` (`sendLeadMagnetLetter`
only; the rest of the file byte-identical) · `src/lib/pwyc-letters.ts`
(`letterFor` and the two caller wraps in `sendOfferNotify` and
`decideOfferWithLetters`; the token, desk and refund machinery untouched) ·
`src/lib/order-receipt.ts` (`buildReceiptLetter`'s render line plus its
import lines; the key machinery untouched) · NEW
`tests/letters-one-render.test.ts` · `work-claims/task-491.md` +
`work-claims/task-491-register.md` (the claim commit comes first, the
register beside it).

Builder's call the brief allows, claimed here: `letterFor` in
`src/lib/pwyc-letters.ts` gains the `export` keyword so the
preview-equals-sent pins can reconstruct a sender's expected document from
the same composer the sender pours from (the brief's "the lane exports the
resolution as a small pure function (builder's call)"; same file, same
function, no new machinery).

READ-ONLY per the brief: `src/lib/mail.ts` (the shells and `pill`, the
header band is held T-390) · `src/app/api/admin/letters/**` ·
`src/app/a/letters/**` · `src/app/letters/[key]/page.tsx` ·
`src/lib/reading-letters.ts` · `src/lib/letter-marks.ts` ·
`src/lib/subscribers.ts` · `src/app/meditation/download/route.ts` and
`tests/meditation-download.test.ts` (both T-492's) ·
`src/app/meditation/page.tsx` · `public/audio/unzip-into-the-new-you.mp3` ·
`vercel.json` · `package-lock.json`.
