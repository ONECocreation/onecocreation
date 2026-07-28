# ONE COCREATION — CLAUDE DESIGN PACKAGE — paste everything below this line into Claude Design

ONE COCREATION — "Where Heaven and Earth Meet" — full-site design brief

This is a real brand for a real person: **Love**, the founder of **One Cocreation** — a wellness / coaching / conscious-hair creator. We are moving her site off paid ShinePages onto a free, sovereign, **bitcoin-native** framework — one that is fast, always-on, and actually *works* (reliability is the #1 feature). Build in **her** identity: soft, celestial, luminous — gold / purple / periwinkle. This is NOT an arcade and NOT a bitcoin-orange fintech site. No neon, no hype, no orange dominance. Sacred, gentle, warm.

Two self-contained HTML mockups already exist and are **approved** — your job is to produce the real, refined site that honors them. Default to the **elevated** feel; treat the **1:1** as the safe floor.

## HOW TO USE THIS PACKAGE

- Everything below the header line is the brief. Generate the screens/components in the **Deliverables** section.
- **Two visual north-stars** (the admiral's published reference artifacts — open both before designing):
  - **1:1 (the safe floor):** https://claude.ai/code/artifact/f853c94c-904e-4985-87c3-ebfb889e2ad1
  - **Elevated (the default target):** https://claude.ai/code/artifact/560ffaa4-9a3f-47f1-94ee-12b894b7baae
  - *(These are external published artifacts, not in the repo — confirm they still resolve before relying on them. The authoritative local copies are `preview-1to1.html` and `preview-elevated.html` in this folder; if the links ever drift, the HTML files win.)*
- All brand values below are pulled verbatim from `src/lib/brand.ts` and the two mockups. Do not invent colors, fonts, prices, or copy — everything you need is here and it is all **real** (no lorem, no placeholder text; only clearly-labeled *stubs* for money/identity plumbing).

---

## 1. THE BRAND SYSTEM

**Product:** One Cocreation — *The Way of the Heart* · label *"Where Heaven and Earth Meet"* · a member is a **soul**.

### Color (canonical tokens from `src/lib/brand.ts`)

| Token | Hex | Role |
|---|---|---|
| `space` | `#0a0a14` | celestial dark ground — header, hero, footer |
| `panel` | `rgba(22,18,40,.66)` | translucent dark panel |
| `edge` | `rgba(168,130,240,.22)` | soft lavender hairline borders |
| `cream` | `#FBF6EF` | luminous body base |
| `blush` | `#F3DCE3` | soft rose wash |
| `ink` | `#4A4458` | body text |
| `muted` | `#897F97` | secondary text |
| **`gold`** | **`#D9B24E`** | **MONEY ONLY — sats / bitcoin surfaces** |
| `goldDeep` | `#B4862B` | gold text / prices on light |
| `purple` | `#9B26D6` | wordmark "Cocreation", links, accents |
| `magenta` | `#C42EC9` | vivid accent (use sparingly) |
| `lavender` | `#8B76C4` | primary soft accent, links |
| `rose` | `#C56E8B` | warm accent, CTAs, citations |
| `copper` | `#C77B4A` | the wire-wrapped jewelry motif |

**Extended palette actually used in the mockups (honor these):**
- **Periwinkle body gradient (1:1 floor):** `#D2CCEA → #C1CAEA → #BFC7E6` (fixed, top-to-bottom) — this is the "periwinkle" that leads Love's brand.
- **Luminous body wash (elevated):** layered radial glows of cream/rose/lavender/sky over `#FCF7F0 → #F7EFF3 → #F1EEF8` (fixed attachment). Soft blues `sky #C6D6F0` / `sky-deep #7E9BD6`; rose `#E7B2C3`; lavender `#CBBBEA`.
- **Golden sun (the logo's own gold):** `#E8B923` / `#EBCB77` (gold-2). The 1:1 header uses `gold #E0B24A` + `gold-sun #E8B923`; the elevated uses `gold #D9B24E` + `gold-2 #EBCB77`. Both are correct in their context.

> **HOUSE LAW — GOLD IS MONEY ONLY.** Gold marks the sats / bitcoin surfaces (prices, sats-twin lines, ⚡ CTAs, the Lightning card). Everything else stays soft and warm — lavender, rose, periwinkle, cream. The one exception is the **logo mark itself**, whose golden-sun color is part of Love's identity. Never let bitcoin-orange appear; never let gold bleed into non-money decoration.

### Typography

- **Display / headings — `Cochin`** (Love's brand serif, self-hosted: `cochin-roman.ttf` weight 400, `cochin-bold.otf` weight 700). Stack: `'Cochin','Optima','Palatino Linotype',Georgia,serif`. Embed the fonts as data-URIs — do NOT load from a CDN. Headings are set in Cochin at `font-weight:400` in the elevated version (lighter, more ethereal) and `700` in the 1:1 version; both are valid.
- **Body — system sans:** `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`, ~17px, line-height ~1.6.
- **Kickers / section eyebrows:** small Cochin lines above headings (e.g. *"The Heart Field — Where Heaven and Earth Meet"*, *"Handmade by Love"*, *"E.T. Phone Home"*).

### The logo

**Love's golden-sun "ball logo"** — a transparent, radiant golden sun/orb mark (source art `balllogo.png`; productionized in the scaffold as `public/brand/onecocreation-badge.png`; embedded in both mockups as the `oc-badge` image, ~44–52px). Pair it with the stacked wordmark: **ONE** (gold, letter-spaced `.14em`) over **Cocreation** (purple/violet), both in Cochin, tight leading. Reuse the mark in the footer at ~40px. Embed the logo as a data-URI; never hotlink.

### The Love Light Language glyph — the signature moment

`public/brand/love-light-language.svg` — Love's **channeled, continuous single-line art**, treated with reverence. This is the emotional centerpiece.

- **Placement:** only on the **dark** celestial surface (hero band / hero). 1:1 uses a small band version (~132×172px); elevated uses it **large and center-stage** (`min(360px,74vw) × min(470px,96vw)`).
- **The hand-drawn reveal:** the line **draws itself in** — a `stroke-dashoffset` animation over **8s** (`cubic-bezier(.37,0,.63,1)`), rendering as a glowing white stroke; then at ~7.8s it **fills solid white** over ~1.8s ("drawn in the light, with the dots added in").
- **Glow:** white line with layered golden drop-shadows — `drop-shadow(0 0 6px #fff) drop-shadow(0 0 20px rgba(255,244,214,.55)) drop-shadow(0 0 46px rgba(232,185,35,.42))`.
- **The dots:** ~12 twinkle points fade + pulse in *after* the line completes ("the dots added in").
- **Accessibility:** `role="img"` with `aria-label="Love Light Language — channeled by Love"`; honor `prefers-reduced-motion` (render filled and still, no draw, no pulse); provide a no-JS fallback (glyph visible filled).
- **Reverence rule:** this is Love's channeled art. Reproduce the provided SVG faithfully; do not redraw or "improve" the line.

### Voice

Sacred, gentle, warm. Sound-money native, never hype. Bitcoin is **an option, never a demand** ("or simply pay in dollars"). Non-custodial always — *"we provide the rails; we never touch, hold, or route the money."* Clean tools, clean words. Real, human, a little cosmic (🌈💕💫, 🕊️, ✦, 🦋) — used with restraint.

---

## 2. THE TWO DIRECTIONS — 1:1 vs ELEVATED

Both tell the same story with the same real content. Claude Design must be able to produce **either**; **default to elevated**, keep **1:1 as the honest floor**.

### The 1:1 version (safe floor) — mirrors Love's current ShinePages site, rebuilt bitcoin-native

- Dark sticky header (`#0a0a12`) · golden celestial hero **strip** (280px sky gradient with a ✦) over a dark band holding the small glyph, `H1 LEAP OF FAITH`, `5 DAYS`, `FRESH STEP INTO A NEW MINDSET`, one outline CTA.
- **Periwinkle** body gradient (fixed).
- Sections, in order: **Memberships** (3 image cards + "YES!" buttons, names only) → **Weekly Live Zooms** about-block ($33/mo · $11/wk, meets 4×, two paragraphs, image panel + quote + two buttons) → **Affirmations** ("Or Purchase Single Affirmation Offerings" — 3 dark cosmic cards, $11.11 + ⚡ sats + duration + ADD TO CART) → **ConsciousCuts & Waxing** (welcome hero + 3 columns: Hair & Waxing · Is a Silent Hair Session for You? [4-photo strip] · Become a Free Member) → **⚡ pay-with-bitcoin** panel (the one honest addition) → **Newsletter "BE IN THE KNOW"** (free recording "Unzip Into The New You", Name + Email) → dark footer.
- Restrained motion (only the glyph animates).

### The elevated version (default target) — same site, leveled up

Keeps every piece of real content above, and adds/transforms the following. **These are the specific elevations** — deliver all of them:

1. **Luminous light theme** replaces the flat periwinkle: a soft multi-radial cream/rose/lavender/sky wash, **glassmorphism** cards (translucent white, `backdrop-filter: blur`, 20–24px radii), and larger, softer shadows (`0 24px 60px -30px rgba(120,100,160,.55)`).
2. **Full dark celestial HERO** (a whole section, not a strip): starfield dots, a conic **light-ray** fan, soft drifting **clouds**, a purple+gold radial glow, and a gradient fade into the body. The **glyph is big and central**, drawing itself in. Adds a pill eyebrow *"✦ Leap of Faith — a free 5-day awakening ✦"*, softer title-case `Leap of Faith` with a gold glow text-shadow, and **two** CTAs: **Begin the Journey** (gold) + **Receive the Free Meditation** (ghost).
3. **NEW "Promise" trio** — three glass cards selling reliability gently: 🕊️ *Always here* · 🌙 *Truly yours* · ✦ *Sats, gently*. (This is where the "it has to WORK" north star lives, said softly.)
4. **NEW About / "My Story"** — Love's headshot in a gold-ringed frame beside her real bio (*"solo adventurer… the hero's journey… You Are the Bridge, Where Heaven and Earth Meet"*), kicker *"Smiles, Love"*.
5. **Memberships → true tiered PACKAGES A / B / C** — the three membership names become an entitlement ladder with **A/B/C badges**, real prices ($33 / $55.55 / $111.11 per month), ⚡ sats-twin lines, feature lists (a "＋" chain marker for inherited perks), an "Includes" line, a **"Full Unlock"** ribbon on C, and a **gatenote** explaining the level-locked door (*"your tier gently becomes your key"*).
6. **NEW Adornments** section — Love's handmade wire-wrapped jewelry as a physical-goods store: 4 product cards (Rose Quartz Spiral $88 · Amethyst Ascension $111 · Amazonite Waters $77 · Citrine Sun $99), **original CSS/SVG** stone + copper-wire motifs as placeholders, a story line each, ⚡ sats, "Handmade · ships in 3–5 days", "Add ⚡", an "Artist photo coming" flag, and a gatenote on non-custodial checkout + shipping.
7. **Services elevated → "Silent Hair Sessions"** — a bookable list (Silent Haircut Women $222 · Men $111 · Soul Conversation 1:1 $222 · Discovery Call 30 min $55), each with an icon, ⚡ sats, and "Book ⚡"; a booking **stub** note (Phase 2: pick a slot → pay on book → confirmed); plus **two real 5-star testimonials** (Jennifer, Mike).
8. **NEW Classes & Community** (Matrix) — two glass panels: *Classes* (4 rooms with Package A/B/C lock pills) and *Community* (4 rooms with member-tier lock pills), copy noting it **replaces Patreon / Mighty Networks / Kajabi** ("your name, your rooms, your rules"), and a "Matrix-powered — paying sends your invite automatically" gatenote.
9. **Guided Affirmations** restyled as clean luminous cards (same three $11.11 offerings, ⚡ sats-twin).
10. **Donations elevated → full Support section** — left: kicker, headline *"Sats straight to One Cocreation"*, non-custodial bullets, suggested-amount **chips** (2,100 / 11,111 / 111,111 / Custom), "⚡ Support with Lightning" gold CTA; right: a **mock Lightning invoice card** (QR placeholder, `₿ 11,111 sats`, demo bolt11, stub tag).
11. **Free Meditation** as its own section (image + form): *"A Free Meditation, With Love"* — "Unzip Into the New You", Name + Email, "Send My Free Meditation" (rose CTA), and a delivery note: **a signed nostr note + an email** (email is a new Phase-5 capability).
12. **NEW Contact** — three fact cards: *11:11 Live with Love* (M/W/F @ 11:11 MST/PST, YouTube @Onecocreation) · *Book a Discovery Call* ($55 credited) · *Silent Hair Session* (pay → booking access). Kicker *"E.T. Phone Home"*.
13. **Polish everywhere:** button hover-lift, gold ring frames, ribbons, lock pills, chips, star ratings, section kickers, generous padding (88px vs 56px), and **honesty labels** on every money/identity surface (stub / placeholder / Phase N).

---

## 3. PAGE SECTIONS / STRUCTURE (elevated order)

Also satisfies Love's own structural asks: a simple landing page, an email capture that gives something free, a home for a 3–5 day course, bookable private sessions with group pricing, a community, and recorded meditations.

1. **Header** — dark celestial bar: logo mark + ONE/Cocreation wordmark; nav (About · Memberships · Adornments · Sessions · Community · Free Meditation) + a gold **⚡ Support** pill. Sticky.
2. **Hero** — dark celestial, glyph draw-in, "Leap of Faith · 5 Days" (Love's free 5-day awakening = the course anchor), two CTAs. *Purpose: the sacred first breath; frame the free entry point.*
3. **Promise trio** — three reliability promises. *Purpose: it works, it's yours, sats are gentle.*
4. **About / My Story** — Love's story + headshot. *Purpose: trust, warmth, the "why".*
5. **Memberships (Packages A/B/C)** — the tiered offer + entitlement gatenote. *Purpose: the recurring heart of the business.*
6. **Adornments** — handmade jewelry store. *Purpose: physical goods, bitcoin checkout + shipping.*
7. **Sessions (Silent Hair + 1:1)** — bookable services + testimonials + booking stub. *Purpose: pay-for-services / appointments.*
8. **Classes & Community** — Matrix rooms, tier-gated. *Purpose: the sovereign community + course rooms.*
9. **Guided Affirmations** — recorded meditations for sale. *Purpose: à-la-carte digital goods.*
10. **Support / Donations** — Lightning giving surface. *Purpose: non-custodial support.*
11. **Free Meditation** — newsletter → free meditation lead magnet. *Purpose: grow the list, give first.*
12. **Contact** — live times, discovery call, booking. *Purpose: connect + convert.*
13. **Footer** — mark, nav, legal, honest rebuild note.

---

## 4. THE WORKFLOWS (design altitude — what the user sees + does)

Keep these at brief altitude. Every money/identity path is a **clearly-labeled stub** until its phase lands — never fake a working checkout.

- **Donations (⚡ non-custodial).** A gentle "Support This Work" surface: suggested-amount chips + Custom, an "⚡ Support with Lightning" button, and a Lightning-invoice card (QR + amount + copyable invoice). Sats land in One Cocreation's **own** BTCPay/LNbits node — zero platform fees. *User sees:* pick an amount → scan/pay → thank-you. *Label:* stub (their node not yet linked).
- **Pay-for-services / booking.** Each session is a bookable, payable service (Silent Haircut, Soul Conversation, Discovery Call). *User sees:* pick a service → **pick a slot** (real availability + timezone) → **pay on book** in bitcoin or dollars → confirmation. *Label:* calendar/booking stub (Phase 2).
- **Tiered packages + entitlement gate.** A ⊂ B ⊂ C — pay for a tier and it opens automatically; the tier is checked before content, classes, and community render (the same gentle "level-locked door" pattern from Pac's Arcade). *User sees:* choose a package → pay (⚡ or $) → package unlocks + community invite arrives. *Label:* entitlement gate stub (Phase 3).
- **Classes + community (Matrix).** One Cocreation's own branded Matrix rooms — classes as rooms, a community space, teacher moderation — replacing Patreon / Mighty Networks / Kajabi. Access is tier-gated: your package sends the invite automatically. *User sees:* rooms with lock pills showing the required package. *Label:* rooms illustrative (Phase 4).
- **Newsletter → free meditation (the lead magnet).** Sign up for the newsletter → receive **"Unzip Into the New You"** as **both a signed nostr note** (sovereign, verifiable, tied to @-identity) **and an email** with the meditation link. *User sees:* Name + Email → "Send My Free Meditation" → confirmation. *Label:* email delivery is a new house capability (Phase 5).
- **Adornments (physical goods — bonus workflow).** Handmade wire-wrapped pendants, one-of-a-kind. *User sees:* browse → "Add ⚡" → non-custodial bitcoin/dollar checkout → shipping + address collected. *Label:* placeholder motifs (Love's real product photos drop straight in).

---

## 5. DELIVERABLES FOR CLAUDE DESIGN

Produce these as self-contained screens/components. Default to the **elevated** aesthetic; each must degrade cleanly to the **1:1** floor.

**DELIVERABLE 1 — Brand system + Header + Hero.** The dark celestial hero with the Love Light Language glyph drawing itself in (8s stroke → fill, then twinkles), pill eyebrow, "Leap of Faith · 5 Days", two CTAs (Begin the Journey / Receive the Free Meditation); sticky dark header with logo + ONE/Cocreation wordmark + nav + ⚡ Support pill; the Promise trio directly beneath. *Accept:* Cochin + system fonts embedded; glyph honors `prefers-reduced-motion` and no-JS; gold used only on the ⚡ pill and money; hero legible on the dark ground; fully responsive.

**DELIVERABLE 2 — About / My Story.** Gold-ringed headshot frame + Love's real bio + kicker "Smiles, Love". *Accept:* real copy verbatim; frame ring is soft gold hairline (not a money surface conflict); stacks to single column on mobile.

**DELIVERABLE 3 — Memberships / Packages A·B·C + entitlement gatenote.** Three cards with A/B/C badges, real prices + sats-twin, feature lists (＋ chain for inherited), "Includes" line, "Full Unlock" ribbon on C, gatenote. *Accept:* prices exact ($33 / $55.55 / $111.11); sats amounts approximate and labeled; gate described as a stub; three-up on desktop, one-up on mobile; also renders as the simpler 1:1 "3 memberships + YES!" floor on request.

**DELIVERABLE 4 — Adornments (handmade jewelry store).** Four product cards with original CSS/SVG stone + copper-wire motifs, story lines, prices + sats, ship note, "Add ⚡", "Artist photo coming" flags, physical-goods gatenote. *Accept:* motifs are original (never trace real oracle art); copper `#C77B4A` for the wire; placeholders clearly swappable for Love's photos; 4-up → 2-up → 1-up.

**DELIVERABLE 5 — Sessions / Silent Hair Sessions + booking stub + testimonials.** Bookable service rows (icon · title · note · price + sats · Book ⚡), a booking stub line (Phase 2 flow described), and the two real 5-star testimonials (Jennifer, Mike). *Accept:* no fake calendar; testimonials verbatim; touch targets ≥44px; wraps gracefully.

**DELIVERABLE 6 — Classes & Community (Matrix, tier-gated).** Two glass panels (Classes / Community) with room rows + lock pills (Package A/B/C / member tiers) + "replaces Patreon/Mighty Networks/Kajabi" copy + Matrix gatenote. *Accept:* lock pills read as gentle gates, not paywalls; rooms labeled illustrative; two-up → one-up.

**DELIVERABLE 7 — Guided Affirmations + Support (Lightning donations).** The three $11.11 affirmation cards, and the full Support section: suggested-amount chips (2,100 / 11,111 / 111,111 / Custom) + "⚡ Support with Lightning" + mock Lightning invoice card (QR placeholder, ₿ 11,111 sats, demo bolt11, stub tag). *Accept:* gold confined to money surfaces; non-custodial language present; invoice clearly non-payable/demo; "bitcoin is an option, never a demand" honored (dollar path mentioned).

**DELIVERABLE 8 — Free Meditation lead magnet + Contact + Footer.** The newsletter → free-meditation section (Name + Email, "Send My Free Meditation", nostr-note + email delivery note); three Contact fact cards (11:11 Live M/W/F, Discovery Call, Silent Hair Session); dark footer with mark, nav, legal, honest rebuild note. *Accept:* form is inert/labeled (no real submit); real contact details (YouTube @Onecocreation, MST/PST); footer mark reuses the logo; accessible labels on inputs.

---

## 6. HOUSE LAWS TO HONOR (non-negotiable)

- **Self-contained.** No external CDNs, fonts, scripts, or images. Embed Cochin, the logo, and all photography as data-URIs — the page must open identically offline (both mockups already do this).
- **Real content only.** Every price, name, testimonial, and line of copy here is real — use it. No lorem, no filler, no boilerplate/slop wrapping. The only placeholders allowed are the clearly-labeled **stubs** (money/identity plumbing) and the "Artist photo coming" jewelry flags.
- **GOLD = money only.** Gold marks sats/bitcoin surfaces (prices, sats-twin, ⚡ CTAs, invoice). Everything else soft and warm (lavender/rose/periwinkle/cream). The logo's own golden sun is the sole identity exception. **No bitcoin-orange. No arcade neon.** Her gold/purple/periwinkle leads — this is HER brand, not Pac's Arcade.
- **Responsive.** Relative units, flex/grid, `max-width:100%` images; wide content scrolls inside its own container; the page body never scrolls horizontally. Cards go 3-up → 1-up gracefully.
- **Theme-aware.** The site owns a luminous light body with intentional dark celestial header/hero/footer — that is the brand and must render correctly and legibly for every viewer; if adapting to viewer light/dark theming, preserve the celestial identity and contrast in both.
- **Accessible.** Sufficient contrast (dark text on cream, light text on the celestial ground); `aria-label` on the glyph and inputs; honor `prefers-reduced-motion` (glyph + twinkles render still); touch targets ≥44px; keyboard-navigable.
- **Honesty (THE DESK law).** Never show a working checkout, calendar, or room that isn't wired. Label every stub with its phase. Non-custodial always: we supply the rails and never touch, hold, or route Love's money. Sats amounts are approximate (≈ $100k/BTC) and marked as such.
- **Reverence.** The Love Light Language glyph is Love's channeled art — reproduce it faithfully, treat it as the sacred centerpiece, never redraw it. The elevated mood was *inspired by* soft celestial oracle art but **never copies it** — every motif here is original CSS/SVG.

*Deliverable count: 8. Default aesthetic: elevated. Safe floor: 1:1. Brand owner: Love / One Cocreation.*
