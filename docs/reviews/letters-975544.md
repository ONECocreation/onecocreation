# Letters schedule truth — review (block 975,544 brief)

## Incident: not proved

The reported `sends: []` is **not sufficient to conclude never queued**.
The prior reader catches KV errors as `[]`; both record and index expired after
14 days; the guessed key may be wrong. No operator cookie was taken from chat,
no production letter/recipient data was read, and no send/tick was invoked.

The local checkout was stale. Work starts at `052c21ee`, preserving merged
[PR #191](https://github.com/ONECocreation/onecocreation/pull/191), which describes
an actual scheduled letter shifted from 11:11 to 12:11 Mountain by browser-zone
parsing. That is contradictory evidence to investigate, not proof that it is
this same letter. #191's Mountain-time field, checkbox, Send now, cancellation
and rescheduling remain intact. The old typed-count wording is not restored.

Vercel CLI 62.1.0 authenticated via its existing local login, without exposing
credentials. The incident-window query (November 10 07:00Z to November 12 07:00Z)
returned HTTP 400. A broader query returned only today's six requests, including
two POST 200s. Request logs have no letter key/test flag here: those successes
cannot identify this letter or establish a list delivery. No raw request data
is committed. Sanitized evidence: `letters-975544-evidence.json`.

Today's `/api/mail/tick` logs contain six HTTP 200s, ten minutes apart,
11:00–11:50 UTC. This proves observed current cadence, not the host, installed
crontab, yesterday's cadence, or receipt in an inbox. The configured red-hawk
Number One seat is SFTP-only. No attempt was made to bypass that restriction.

## What this PR changes

- Letter rows derive Draft / Scheduled / Sending / Sent to N / Cancelled from
  `letters:sends:<key>`. Missing/error history says unavailable, not Draft.
  “Draft” explicitly means **no recorded list send**, not a historical assertion.
- Picking a time says it is not queued. The send response only confirms Scheduled
  after the new send ID is read back from history. An accepted send with missing
  bookkeeping warns against retrying. Unknown keys no longer look like empty history.
- Future aggregate send records/indexes do not expire, so future-scheduled sends
  and Sent rows cannot silently turn into Draft. Old expired records cannot be
  recovered; no data migration is run. No recipient addresses in these aggregates.
- A time picked in the panel is saved as an **intent**, not a queue item. This is
  new data: an abandoned time from before rollout cannot be reconstructed.
  Intent writes serialize, survive reload, and show failures explicitly.
- One leave prompt per chosen time: in-app links plus browser unload/back guards.
  Browsers control unload wording and may suppress it; the durable intent is the
  fallback, not a guarantee that mobile/browser exits always show a prompt.
- A durable notice work item is written after a verified operator send. The
  existing tick sends a schedule confirmation and completion summary to Love's
  existing `OFFER_NOTIFY_EMAIL` (same default as purchase/offer notices).
  Rescheduling produces an updated confirmation. Cancelled sends never say sent.
- Passed intents with **no recorded send** get an operator note only, to Love and
  `OPERATOR_EMAILS` (trimmed, validated, deduplicated). No subscriber-enqueue or
  list-send call exists in the missed-intent path. Any send history, including
  cancellation, suppresses this warning. KV errors defer it.
- Notices use existing SMTP and cap; failure/cap exhaustion retries next tick.
  Per-recipient claims suppress concurrent/repeated notices. As with ordinary
  SMTP, acceptance followed by process loss before the success write can duplicate
  a notice; this is not an exactly-once delivery guarantee.
- Console letters room and send panel show the last **completed** mail tick,
  unavailable/never-recorded honestly, and a stale note after 20 minutes. Reading
  status never invokes a mail tick. No cron edits or Vercel configuration changes.

## Voice handoff

`src/lib/letter-delivery-copy.ts` contains provisional wording for Lumen to review:
not queued, intent remembered/failed, leave prompt, status unavailable, accepted
but unverified, all status labels, and scheduled/completed/missed email subject
and body. Templates receive subject, exact Mountain datetime, queued/sent/dropped
counts, and panel URL. The recipient set is server-owned, never form-controlled.
Notification of these slots was queued to Lumen's session, not claimed read.

## Remaining live checks (Admiral/operator, after a signed ship)

1. Confirm the actual letter key from the panel URL and distinguish it from the
   guessed key. Read its status, do not send it as part of verification.
2. Inspect pacman's existing red-hawk cron **in the operator's terminal**. Print
   only the five schedule fields for lines matching `mail/tick`; never paste a
   raw crontab containing `x-seat-secret` into chat. If missing, review the existing
   `briefings/vps-scripts/add-mail-cron.sh` before any restoration. This PR does
   not restore it; the current cadence is already observed.
3. After the next naturally occurring tick, confirm the console timestamp moves.
4. With a separately approved fixture letter/audience, verify schedule and complete
   notices arrive in Love's inbox and a missed intent notes only the operator set.
   Do not repurpose the waiting letter as a test. No live inbox verification yet.

Merge and ship remain the Admiral's. This branch does neither.

## Verification

- Full Vitest suite: **337 files, 4,625 tests passed** (18 new delivery tests).
- `npm run lint`: passed; `tsc --noEmit`: passed.
- `NEXT_PUBLIC_CONSOLE_CHROME=site npm run build`: passed (Next 16.3.5).
- Six existing script test suites: **377 checks passed**, none failed.
- Dark-mode fixtures: letters room + send panel at 1440 and 390 px, inspected.
- Browser interaction check: picked/restored time says not queued; first leave
  prompt stays; second leave does not repeat; an intercepted accepted-but-
  unverified send shows the warning; exactly one intercepted POST; no desktop
  horizontal overflow. No actual list send (even in the fixture) for that check.
- Fixture servers/ports shut down and verified free. No production mail or writes.

The screenshot fixture uses invented content and addresses. Local artifacts:
`/home/pac/dev/briefings/oc-letters-schedule-truth-shots/site-chrome/`.
The first screenshot run used the repository's default SCAR chrome; it is not
product evidence. The second build/run uses the artist's `site` chrome above.

[Desktop panel](letters-975544/panel-desktop.png) ·
[Mobile panel](letters-975544/panel-mobile.png) ·
[Browser assertions](letters-975544/interaction-checks.json)
