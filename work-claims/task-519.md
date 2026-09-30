# TASK-519 claim

Builder: Ms. Kimi's crew (Kimi Code)
Block: 969,342 (height at pickup)
Branch: feat/task-519-the-join-letter
Worktree: /home/pac/dev/worktrees/task-519
Base: 5ed20c8cbb4a68a7ada954c9b66cd722b7d800fa — the named K126 trap-1
stack: T-493 HAS merged (PR #123, origin/main 8ef0363) and T-518 is
LANE-DONE awaiting gate at 5ed20c8, whose diff carries exactly the
EDITABLE_LETTERS 9-to-10 state the brief expects (length pins at 10,
this lane moves them to 12). T-493's merge is an ancestor of the cut
tip (verified with git merge-base). The brief's HELD condition reads
honestly against this stack: both diffs are IN the base.

GOAL (brief `TASK-519-oc-the-join-letter.md`, ruling of record K131):
before every live session each seat holder gets ONE letter — the ONE
link, the start time in their own zone when known, and three plain
lines (open on computer or phone; press Allow for camera and
microphone; if it says no, refresh once) — plus a second short letter
at start time. Two seeded letters `join-reminder` / `join-start` with
{{session}}/{{when}}/{{link}} slots via letterFor; audience = the
reading list + the settle-time `reading-seat` tag written in
settleEntitlementFromOrder; the reading reminder rides the shared
dueOccurrenceNow gate, bookings a 24h window; the start letter rides
the tick sweep in a 45-min window; tz capture at the reading sign-up;
the join-screen hint is a code edit on OUR JitsiRoom.tsx; two room
rows in the post-T-493 Sessions-group shape. The weekly member meetup
does not exist in code and is scoped out.

Ground truth re-run on 5ed20c8 at cut: EDITABLE_LETTERS holds the ten
keys at src/lib/letters.ts:23-33 (T-493's `read-with-love` the ninth,
T-518's `purchase-love-notify` the tenth; length pins at 10 in
tests/free-reading-path.test.ts:209, tests/letters-send.test.ts:178,
tests/purchase-love-notify.test.ts:416, and
tests/letters-every-letter-in-the-room.test.ts:93,178); the room
page's LETTERS array carries the post-T-493 shape (group/when/
noPublish, src/app/a/letters/page.tsx:23); `letterFor` exported at
src/lib/pwyc-letters.ts:120; `dueOccurrenceNow` module-private at
src/lib/reading-letters.ts:340 with the T-484 "ONE shared due-check"
comment at :333-339; the tick's reading call at
src/app/api/mail/tick/route.ts:31; addReadingTag at
src/lib/subscribers.ts:113 and listSubscribersByTag at :203;
settleEntitlementFromOrder at src/lib/entitlement-fulfil.ts:99 (the
grant at :115, the buyer-email pattern at :152); BookingRecord
(state/startUtc/artistTz/visitorTz/customer.email/meetingUrl) at
src/lib/booking-orders.ts:35-59, listBookings at :329; isValidTz at
src/lib/booking-time.ts:270 (dependency-free module, imported never
edited); ReadingSignUp's postReadingSignUp posts { email, source:
"reading" } at src/components/rooms/ReadingSignUp.tsx:82-85;
jitsiEmbedOptions at src/components/booking/JitsiRoom.tsx with the
holder/boot at :432-446 and the design-drift ceiling for the file
pinned at 9 styleBlocks / 1 colour (tests/design-drift.ceilings.json);
DEFAULT_READING_SCHEDULE (Wednesday 13:11 America/Denver) at
src/lib/reading-schedule.ts:64; READING_BOOK_TALK_ITEM_ID/QA_ITEM_ID
at src/lib/reading-day.ts:73,60; the nextReading window phase at
src/lib/reading-schedule.ts:149. Drift notes against the draft: (1)
the brief named TWO length pins; the tree carries FOUR (T-518's own
suite and T-493's every-letter suite pin 10 too — the same class of
honestly-broken pin T-518 found; claim widens for both, each its own
named commit). (2) tests/reading-one-box-468.test.ts:115 pins the
subscribe post body EXACTLY { email, source: "reading" } — the
viewerTz addition honestly breaks that one line (claim widens). (3)
the tick-route describe block inside tests/reading-letters.test.ts
pins exact send counts the new join call truthfully changes (on the
reading's day the reminder rides beside the day-of; at the start
instant the start letter is due) — Build 11's own sentence covers
exactly this ("any tick-route pin the new call breaks is updated with
its intent kept and named in SUMMARY"); the library specs in that
file stay byte-untouched. No flag-and-stop condition triggered.

## OWNS (verbatim from the brief)

- `work-claims/task-519.md` (NEW, first commit), `work-claims/task-519-register.md` (NEW)
- `src/lib/letters.ts` (the two `EDITABLE_LETTERS` / `DEFAULT_AUDIENCE` / `LETTER_DEFAULTS` additions and the count comments ONLY; SERIALIZED behind T-493 and T-518, the HELD line names the merges)
- `src/lib/join-letters.ts` (NEW)
- `src/lib/reading-letters.ts` (the one-word `export` on `dueOccurrenceNow` plus one docblock line ONLY)
- `src/app/api/mail/tick/route.ts` (the one added call ONLY)
- `src/lib/subscribers.ts` (the `tz?: string` field and its write path ONLY)
- `src/app/api/subscribe/route.ts` (the `viewerTz` parse/validate/store in the reading branch ONLY)
- `src/components/rooms/ReadingSignUp.tsx` (the posted zone ONLY)
- `src/lib/entitlement-fulfil.ts` (the seat-tag write on settle ONLY; additive, failure-isolated)
- `src/components/booking/JitsiRoom.tsx` (the one hint line ONLY)
- `src/app/a/letters/page.tsx` (TWO data entries in the post-T-493 LETTERS array ONLY; SERIALIZED behind T-493 and T-518)
- `tests/join-letters-519.test.ts` (NEW); `tests/free-reading-path.test.ts` and `tests/letters-send.test.ts` (the length-pin lines and their comments ONLY); `tests/letters-one-render.test.ts` (the two new per-key cases and the count word ONLY)

WIDENED at build time (the seam law: a real widening edits the claim
first, in its own named add):

- `src/lib/subscribers.ts` — beyond the brief's "tz field and its write
  path": the additive `addSubscriberTag(email, tag)` writer and the
  `READING_SEAT_TAG` constant the settle path calls. The seat tag has to
  live in the subscribers store so consent and unsubscribe keep ONE
  meaning (decision 3); entitlement-fulfil.ts owns only the call. The
  minimal diff rides in SUMMARY's seam list.
- `tests/purchase-love-notify.test.ts` (T-518's own length pin at 10
  ONLY) and `tests/letters-every-letter-in-the-room.test.ts` (T-493's
  TWO length pins at 10 ONLY) — the same class of honestly-broken pin
  the brief named in two other files; the draft counted two pins, the
  tree carries four. Updated 10 to 12 with TASK-519 comments, never
  deleted; SUMMARY's seam list names them.
- `tests/reading-one-box-468.test.ts` (the ONE exact-body pin line
  ONLY) — it pins the subscribe post body byte-exactly as
  `{ email, source: "reading" }`; the viewerTz the sign-up now posts
  honestly breaks that one line. Updated with its intent kept (the
  verify-then-subscribe contract, now carrying the zone), TASK-519
  named in the comment.
- `tests/reading-letters.test.ts` (the tick-route describe's TWO send-
  count specs ONLY — the library specs stay byte-untouched) — the
  brief's own Build 11 sentence covers exactly this ("any tick-route
  pin the new call breaks is updated with its intent kept"): on the
  reading's day the join reminder truthfully rides beside the day-of
  letter, and at the start instant the start letter is due. The specs'
  intents (sends land BEFORE the handler returns; nothing LATE ever
  mails) are kept; the counts gain the join letters with TASK-519
  comments. The READ-ONLY line and Build 11 conflict here; the
  reconciliation rides in SUMMARY.
- `tests/reading-stage.test.ts` (the ONE camera/microphone source pin
  ONLY) — a T-471-era pin asserting the stage page says nothing about
  a camera or a microphone; TASK-519's whole point (K131) is to say
  exactly that, in our own words, beside the embed. Updated with its
  intent kept (no OTHER camera/microphone words, no banner while the
  Playground is closed) and the deliberate exception named.

READ-ONLY: `src/lib/mail.ts` · `src/lib/mail-queue.ts` (the `notBefore`
idiom read, deliberately not used) · `src/lib/booking-fulfil.ts` ·
`src/lib/booking-orders.ts` (`listBookings` read only) ·
`src/lib/mail-booking.ts` (its one-zone When is a named follow-up) ·
`src/lib/booking-time.ts` (`isValidTz` imported, never edited) ·
`src/lib/reading-day.ts` · `src/lib/reading-schedule.ts`
(`nextReading` imported for the start window) ·
`src/lib/reading-room.ts` · `src/lib/live.ts` · `src/lib/pwyc-letters.ts`
(`letterFor` reused, never edited) · `src/lib/lead-magnet.ts` ·
`src/app/api/admin/letters/**` · `src/app/a/letters/[key]/page.tsx` ·
`src/app/letters/[key]/page.tsx` · `src/app/meet/[bookingId]/page.tsx` ·
`src/app/meet/studio/**` · `src/components/reading/JitsiViewer.tsx` ·
`src/components/SubscribeForm.tsx` · `vercel.json` · the Jitsi server
kit (`briefings/vps-scripts/jitsi/**`) ·
`tests/reading-day-of-immediate-484.test.ts`,
`tests/reading-letters-composed-482.test.ts` (stay green untouched) ·
`tests/design-drift.ceilings.json` and
`tests/operator-census.baseline.json` (ratchets, never raised) ·
`package-lock.json`.

NOT a new auto-slot; NOT a composed-letter family; NOT the meetup; NOT
a new cron, queue, env, or KV doc shape; NOT a Jitsi server change;
NOT an off switch; NOT checkout tz capture.
