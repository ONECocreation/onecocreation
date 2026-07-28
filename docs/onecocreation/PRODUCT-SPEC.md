# onecocreation — the product spec (a business in a box)

*The admiral's fren, 0018.04.16 a₿. He is the admin; the goal is to move
onecocreation OFF paid ShinePages onto a free, bitcoin-native site on the
Pac's Arcade framework — one that actually WORKS. This is the brand-kit-
in-a-box made real for a wellness/coaching creator, and the first true
template consumer besides frens.earth + pacsarcade.*

## The north star
**It has to WORK.** ShinePages' experience is terrible; reliability is
the #1 feature. Everything below is worthless if the thing is flaky.

## The three workflows

### 1. DONATIONS
- Bitcoin / lightning, **non-custodial** — sats land in onecocreation's
  OWN BTCPay/LNbits node, never held by us (clean tools, clean words;
  we provide the rails, never touch their money).
- A simple "support this work ⚡" surface; optional suggested amounts.

### 2. PAY FOR SERVICES (bookable + payable)
- 1:1 meetings, haircuts, sessions — each a bookable service.
- Needs a **calendar / booking** layer (pick a slot → pay → confirmed).
  Ties to the house ship's-calendar work; this is real appointment
  scheduling (availability, timezone, confirmation).
- Payment on booking via their BTCPay (bitcoin/lightning); non-custodial.

### 3. CLASSES + COMMUNITY (Matrix)
- A community area + classes — **Matrix**, same as Pac's Arcade
  (RTFM 005 "Classroom Setups & Management"; the arcade's live proof:
  Element re-brands by config alone, server_name set once). onecocreation
  gets its own branded Matrix rooms: classes as rooms, a community space,
  teacher moderation.

## TIERED PACKAGES — pay-gated access (the core)
Progressive entitlements — you get what you paid for:
| package | unlocks |
|---|---|
| **A** | X (base) |
| **B** | X + Y |
| **C** | X + Y + Z classes |
- Each package → email + whatever perks are outlined per tier.
- **The gate = the artist-registry entitlement pattern** (the LEVEL-LOCKED
  door): a member's tier is checked before content/classes/community
  rooms render. Package → Matrix room access + content + email list.
- Payment (their BTCPay) → tier granted → Matrix invite + content unlock.
- Honest: this is a real membership/entitlement system; build it on the
  house's existing gate pattern, keys/tier as consent.

## THE LEAD MAGNET — free meditation on newsletter signup
- Sign up for the newsletter → get a **free meditation**.
- The admiral's shape: **a nostr note + an email.**
  - Nostr: a signed note / the meditation delivered as a nostr event
    (sovereign, verifiable, ties to @-identity).
  - Email: the newsletter itself + the meditation link.
- ⚠ **New capability flag:** the house has NOT sent email yet. This needs
  an email path — options to explore: a self-hosted/relay SMTP on the VPS,
  or a provider (Listmonk self-hosted for newsletters = sovereign +
  free-ish; or a transactional provider). Sovereignty + deliverability
  tradeoff — decide with the admiral. Newsletter list management + the
  double-opt-in is real work.

## The house pieces this reuses
- **BTCPay** — donations + service payments + package payments (their node).
- **Matrix** (RTFM 005) — classes + community, tier-gated rooms.
- **Ship's calendar / booking** — appointment scheduling.
- **Entitlement gate** (artist-registry LEVEL-LOCKED pattern) — the tiers.
- **Newsletter / ceremony** work — the welcome + the lead magnet.
- **Nostr** — the free-meditation note; identity.
- **The brand kit** — onecocreation's OWN theme, not frens.earth's.

## Phased build (honest scope)
- **Phase 0 — TODAY'S DEMO:** the 1:1 preview showing all of this as
  sections so the fren sees the vision (donate ⚡ · book a service ·
  classes & community · the 3 packages · free-meditation signup).
- **Phase 1 — it works:** the real framework site live on their existing
  Vercel project, content 1:1, donations wired to their BTCPay.
- **Phase 2 — pay for services:** the booking + pay-on-book flow.
- **Phase 3 — packages + gating:** the tiered entitlement system.
- **Phase 4 — Matrix classes + community:** branded rooms, tier-gated.
- **Phase 5 — newsletter + lead magnet:** email path + the nostr note.

## Phase 6 — THE SITE AGENT (pacBOT on their floor) — build when the site is done
The admiral's vision: the customer talking to the site's helper is
*really talking to Pac*, as an agent on their site — and real trouble
routes to Pac through SCAR for his hands.

- **Two skills, merged.** (1) A **site-expert skill** — knows onecocreation
  inside and out (every page, workflow, package/tier, service, FAQ, the
  donation + booking + Matrix flows). Packaged as a **standalone skill in
  onecocreation's OWN repo** (it ships with the site; the site knows
  itself). (2) **pacBOT** (the scrubbed voice — `pacbot.skill`, GTI-free).
  Merge = a support agent that answers in Pac's real voice AND knows the
  site cold. To the customer it feels like Pac is right there helping.
- **The escalation ladder (human-in-the-loop, never autonomous on money
  or accounts):** the agent answers what it can (site help, where-do-I,
  package questions, how-to). On **real trouble** — a payment problem, a
  booking that broke, an angry customer, anything money/account-touching,
  or "I don't actually know" — it does NOT improvise: it **alerts Pac**
  and **opens a SCAR ticket / update** for him to review and take action.
  (The @no1-bridge spec + the SCAR duty roster are the rails; THE DESK's
  honesty law binds — the agent flags uncertainty, never fakes a fix.)
- **Boundaries (bind hard):** the agent never moves money, never changes
  a booking/account, never handles a customer's keys or PII — it informs,
  it routes, it escalates. Clean tools, clean words. Non-custodial all the
  way down: even the helper can't touch what isn't Pac's to touch.
- **The payoff:** onecocreation gets 24/7 support in Pac's voice, and Pac
  gets a filtered feed of only the things that actually need him — from
  the SCAR panel he already runs. A fren staffed by a fren.

## The principle
Their brand, their money, their community — we supply the framework and
never hold any of it. A fren helping a fren build something that's THEIRS.
That's the whole reason Pac's Arcade exists.
