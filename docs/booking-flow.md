# Booking — pay for a slot (spec v1)

*Written ~0018.05.02 a₿ on the captain's call: **booking outranks Fourthwall.**
Spec v2 gave this one line ("services wired to the ship's-calendar work"),
which made the revenue path the thinnest plank in the document. This is that
plank, specified.*

**Scope discipline, stated first.** The goal is getting Love off ShinePages
and earning. This spec covers **booking a paid 1:1**. It deliberately does
NOT solve the Circle replacement (community + class hosting) — that is a
separate, later, and genuinely optional piece. Love can take bookings on the
new site while Circle still runs. Nothing here waits on Matrix, Moodle, or
the auction.

Greenfield: no calendar, booking, or availability code exists
(`/api/frens/availability` is *name* availability — unrelated).

---

## The flow, end to end

```
/book/<service>
  │
  ├─ 1. SEE      available windows, rendered in the visitor's timezone
  ├─ 2. PICK     a slot  → soft-held while they check out
  ├─ 3. WHO      for me  /  a gift for someone else
  ├─ 4. PAY      Love's own BTCPay — lightning instant, on-chain held
  ├─ 5. CONFIRM  receipt page + .ics download + meeting link
  ├─ 6. DELIVER  email (⚠ blocked) · nostr DM · NIP-52 event
  └─ 7. REMIND   T-24h and T-1h, with the link
```

---

## 1 — Availability: rules, not slots

Love sets **recurring weekly rules** plus **date overrides** in the admin.
Slots are *materialized on read*, never stored as a giant pre-generated
table — an artist changing their Tuesday hours must not require a migration.

```ts
interface AvailabilityRule {
  weekday: 0|1|2|3|4|5|6
  start: "09:00"; end: "17:00"     // in the ARTIST's timezone, always
  serviceIds: string[]             // which services this window serves
}
interface DateOverride {
  date: "2026-08-14"
  kind: "blocked" | "extra"
  start?: string; end?: string
}
interface Service {
  id: string
  title: string
  durationMin: number              // 30 / 60 / 90
  bufferMin: number                // gap after — back-to-back 1:1s are cruel
  price: Price                     // sats + fiat, per the store's money law
  pricingMode: "fixed" | "pwyc"    // give-what-you-can rides here too
  minLeadHours: number             // no "book me in 5 minutes"
  maxAdvanceDays: number
  meetingRail: MeetingRail         // §5
  artistTz: string                 // IANA, e.g. "America/Los_Angeles"
}
```

**The timezone law (the classic bug, killed up front):**
- Store every instant in **UTC**. No exceptions, no local strings in records.
- Render slots in the **visitor's** detected timezone, with a visible picker.
- **Always show Love's timezone too**, labelled. "10:00 your time · 13:00
  Love's time." A customer who shows up an hour late is a refund and a bad
  feeling; the label costs one line.
- DST is why rules are stored as wall-clock-plus-IANA-zone rather than UTC
  offsets. "Tuesdays 9am" must stay 9am across the change.

**BFT note:** booking times are civil-calendar appointments with real humans —
they render as **ordinary dates and times, not block heights**. Per
`bft-display.md`, the `~estimateHeight` stamp belongs on the *order* record,
not on the appointment a person has to show up to.

---

## 2 — The slot hold (the design crux)

The gap between "picked" and "paid" is where double-bookings are born. On
bitcoin it is worse: **an on-chain payment sits in `processing` for 10–60+
minutes.** You cannot hold a slot open for an hour on optimism, and you
cannot take someone's sats and then tell them the slot is gone.

```
pick → HOLD (ttl) → charge_created → settled → CONFIRMED
                 ↘ ttl expires / expired / underpaid → slot RELEASED
```

- The hold is a real record with a TTL, written **before** the charge is
  created, keyed by slot. A second visitor sees the slot as taken.
- **Lightning: hold ~15 min** (the BTCPay invoice window). Settles instantly,
  confirms instantly. This is the good path.
- **On-chain: hold ~90 min**, and the UI says so plainly at the point of
  choice: *"paying on-chain holds this slot for 90 minutes while the
  transaction confirms."* Never a silent spinner.
- Release is **idempotent and re-derivable from order state** — the same rule
  spec v2 set for fulfilment on serverless. A swept-up hold that a late
  settle then contradicts resolves to: **the paid booking wins**, and if the
  slot was retaken, it escalates to Love with a refund path. Say it in the
  ops copy rather than discovering it live.

**⚡ This is why the CLN register matters.** Lightning turns booking from a
90-minute anxiety into an instant confirmation. `action-register-vps-lightning.md`
is still open; it is now on booking's critical path for UX quality, though
not for correctness — on-chain works, it just feels worse.

---

## 3 — Buying for someone else: a voucher, not a slot

The captain's "buy for someone" has two readings, and only one of them is
sane:

- ❌ *Book a specific slot for another person* — the purchaser is guessing at
  a stranger's Tuesday. It fails constantly.
- ✅ **Buy a session credit; the recipient schedules it themselves.**

So a gift purchase issues a **voucher**, decoupling payment from scheduling:

```ts
interface Voucher {
  code: string                 // long, random, the capability
  serviceId: string
  purchasedBy?: string         // tag or npub, optional
  recipientNote?: string       // "happy birthday, love mom"
  state: "unredeemed" | "scheduled" | "used" | "expired"
  orderId: string
  expiresAt?: string           // policy call — see below
}
```

- Redemption is the same `/book/<service>` flow with the code applied — the
  payment step is already satisfied, so it goes hold → confirmed.
- **The admin counter Love asked for** — "how many future gifts are
  outstanding" — is a count over `state: "unredeemed"`. Cheap, and it is real
  money owed in sessions, so it belongs on the console front page.
- **Policy call for Love:** do vouchers expire? *Recommend no hard expiry* —
  an expired gift someone paid for is the kind of thing that curdles a
  wellness brand. If Love wants one, it must be stated at purchase, on the
  voucher, and in the reminder.
- This is the same machinery as the store's gift requirement. **Build it once,
  here**, and let the store's gift items reuse it.

---

## 4 — Payment

Straight onto the shipped rails — this is the part that is already done. Love's
own BTCPay, non-custodial, the existing order state machine, the existing
webhook. A booking is an order with `fulfillment: 'service'`.

- `pricingMode: "pwyc"` — give-what-you-can applies to sessions too, which is
  arguably where it matters most. A PWYC booking is a **real booking with
  identical standing**; nothing about the confirmation, reminder or meeting
  differs. Anything else turns a kindness into a visible second class.
- The order carries `bookingId`; the booking carries `orderId`. The order
  stays the record of fact for money; the booking is the record of fact for
  time.
- Refund/cancel fires the release hook: slot freed, meeting link revoked,
  voucher restored to `unredeemed` if it was a gift.

---

## 5 — The meeting link

A per-service knob, never hardcoded. Love may already have Zoom; that is a
perfectly good answer and shipping beats purity.

```ts
type MeetingRail =
  | { kind: "static";  url: string }      // Love's standing Zoom/Meet room
  | { kind: "jitsi";   domain: string }   // room minted per booking
  | { kind: "matrix";  roomId: string }   // the arcade Synapse
  | { kind: "orbee" }                     // the nostr floor
```

- **v1 recommendation: `static`.** If Love has a Zoom link, use it. Zero new
  infrastructure, zero new failure modes, and Love already knows the tool.
- `jitsi` mints a fresh room per booking (long random name + lobby, or JWT
  once self-hosted) — the upgrade when Love wants per-session privacy.
- `matrix`/`orbee` reuse the house rails; the Synapse at
  `matrix.pacsarcade.org` already runs, so this is available rather than
  theoretical — but a 1:1 wellness session does not need it, and Love's
  customers should not have to make an account to be met.
- The link is issued **at confirmation and delivered with the reminder** —
  never rendered on the public service page.

---

## 6 — Confirmation & the calendar legs

### The .ics file — do this one first

Generate an iCalendar `VEVENT`: start/end in UTC, `SUMMARY`, `DESCRIPTION`
with the meeting link, `ORGANIZER` (Love), `UID` = booking id, `SEQUENCE` for
updates, plus a `VALARM` at −60 min so the customer's own device reminds them.

**This is the highest-value, lowest-cost piece in the whole spec.** It works
in Google Calendar, Apple Calendar and Outlook with no integration, no OAuth,
no API key — and the `VALARM` means the customer gets a reminder **even
before our reminder system exists.** Ship it as a download on the receipt
page immediately; attach it to email later.

### Google Calendar — the no-OAuth shortcut

Full Google Calendar API means OAuth 2.0, a Google Cloud project, consent
screens and stored refresh tokens. For one artist that is disproportionate.
Two directions, two cheap answers:

- **Reading Love's busy time → their calendar's private iCal URL.** Google
  exposes a "Secret address in iCal format" per calendar. Poll it, parse
  `VEVENT` blocks, overlay them as busy. No OAuth, no cloud project.
  **⚠ Honest caveat, and it decides the design:** that feed is cached and can
  lag by hours. It is **advisory, never authoritative** — good for "Love
  blocked out next Tuesday," useless for "Love booked something twenty
  minutes ago."
  → **Therefore: our own store is the source of truth for bookable time.**
  Love keeps site-bookable hours as deliberate windows, plus a one-click
  "block this slot" in the admin for same-day changes. Google is an overlay
  that can only ever *remove* availability, never add it.
- **Writing to the customer's calendar → the .ics above.** Already solved.

Full two-way OAuth sync stays a v2 knob, taken only if Love's actual usage
proves the overlay insufficient.

### Nostr — NIP-52

Love publishes a **time-based calendar event (kind `31923`)** per booked
session; the calendar itself is kind `31924`; the customer can RSVP with kind
`31925`. This is the sovereign leg, it rides the strfry relay we already run,
and it is genuinely nice — but it reaches only customers who have nostr.

**Sequencing: .ics first, nostr second, Google-read third.** The .ics serves
100% of customers on day one.

---

## 7 — Reminders (⚠ two blockers, named honestly)

The captain asked for a reminder before the meeting. It needs two things the
house does not have:

**Blocker A — a scheduler.** Vercel serverless has no background worker (spec
v2 residual risk #4). The answer is **Vercel Cron**: a `crons` entry in
`vercel.json` hitting an authenticated `/api/bookings/tick` every 15 minutes,
which sweeps for bookings crossing T−24h and T−1h and marks each reminder
sent so a re-run cannot double-send. `vercel.json` currently has **no `crons`
key** — this is a config addition, not an architecture change. Cheap.

**Blocker B — email. The house has never sent an email.** This is the same
capability flagged in onecocreation's PRODUCT-SPEC since 0018.04 and still
unmoved. It blocks the confirmation email, the reminder email, and the
newsletter/segmentation work. **It is now on the revenue path** and should be
decided rather than deferred again: Listmonk self-hosted on the VPS
(sovereign, more ops) vs a transactional provider (deliverability, less
sovereign) vs the Zap webspace's mailboxes (shared-IP caveat).

**Interim that ships without either** — and it is not nothing:
1. Receipt page with the full booking detail (works today).
2. **`.ics` download with a `VALARM`** — the customer's own calendar reminds
   them. This covers the reminder need for most people *before we send a
   single email.*
3. Nostr DM if the customer signed in with a key.

Ship the interim, then let email upgrade it. Do not let email block booking.

---

## Data model summary

```
Service          → the offering (duration, price, rail, tz)
AvailabilityRule → Love's recurring windows
DateOverride     → blocks and one-off extras
Hold             → slot + ttl, pre-payment
Booking          → slot + orderId + customer + state + meeting link
Voucher          → prepaid credit, gift path
Order            → EXISTING. money, unchanged.
```

Routes (`/api/bookings/*`), gated per spec v2's route-gate matrix: slot list
public · hold public · confirm via order · reminders cron-authenticated ·
availability edits operator-session · **refunds per-action signature**.

---

## Build order

1. **Service + availability rules + admin editor** — Love can describe their week.
2. **Slot rendering with the timezone law** — public `/book/<service>`.
3. **Hold + checkout on the existing BTCPay rails** — money already works.
4. **Receipt page + `.ics` with `VALARM`** — this is the MVP finish line.
5. **Vercel Cron + reminder sweep** — nostr DM and receipt-state only.
6. **Vouchers / gifting** — plus Love's outstanding-gifts counter.
7. **Google secret-iCal overlay** — advisory busy blocks.
8. **NIP-52 publish.**
9. **Email**, whenever the capability lands — upgrades 4, 5 and 6 at once.

**Steps 1–4 are a bookable, payable, confirmable 1:1 with no new
infrastructure, no email, no Matrix and no Google.** That is the ShinePages
exit for the part of Love's business that earns.

---

## Open calls for the captain

1. **Love's timezone**, and whether they ever travel across zones.
2. **Voucher expiry** — recommend none.
3. **Meeting rail** — does Love already have Zoom? (Recommend using it.)
4. **On-chain hold window** — 90 min proposed. Too long, too short?
5. **The email path.** Overdue, now revenue-blocking.

## Residual risks

1. The **Google iCal lag** makes the overlay advisory; a Love who books
   privately on Google at short notice will still get double-booked. The
   admin "block this slot" button is the mitigation, and it depends on Love
   actually pressing it.
2. **No-shows and cancellations** are unspecified here — policy before code,
   and it is Love's policy to set, not ours.
3. **Refunds on a non-custodial rail stay painful** (spec v2 residual #3).
   A cancelled session meets that in week one.
4. **Reminders are only as reliable as Vercel Cron** — a missed tick is a
   missed reminder. The `.ics` `VALARM` is the belt to that suspender, which
   is the second reason to ship it first.
