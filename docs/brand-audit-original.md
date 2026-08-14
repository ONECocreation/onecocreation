# Brand Fidelity Audit — Original ONE Cocreation (ShinePages) vs the rebuild cartridge
Captured 0018.05.20 a₿ from inside the builder (public site EXPIRED — "Your account has expired!").
Screenshots: ~/dev/troubleshooting/onecocreation/original/ (48 files).

## The headline
The original is "Where Heaven AND Earth Meet" — and the rebuild kept only Heaven.
Original imagery splits: cosmic night (golden hand-from-clouds hero, starfields, moon,
cosmic lion, aurora, the purple/gold/teal membership card triad) AND red-rock earth
(Love arms-raised on the rocks, her own photos, heart-rock, sunsets). The cartridge
carried the cosmic half only.

## Original font stack (computed, not guessed)
- Headings: Helvetica/Arial 46px w400 #3E3E3E (one 72px "E.T. Phone Home")
- Body: Lucida Grande 18px (some 21) #3E3E3E
- Nav: Segoe UI 25px gold #FAC51C
- Emphasis: Barlow 700 (20/28px) — Barlow genuinely original; cartridge promoted it to display (good)
- CTAs: Open Sans 24-26px letterspaced caps, WHITE squared (0-radius) buttons
- Script: Licorice + Shadows Into Light LOADED in theme; the two big purple calligraphy
  banners ("Where Heaven and Earth Meet", "New Earth Living") are IMAGES, not live text
- No serif in site text (only the vendor booking widget's Cormorant Garamond default)

## Original palette
- Ground: WHITE/light-first with black header+bands; signature surface = lavender #DBD4E4
- Others: #E1E1E1 gray, #EAD9CB warm sand, text #3E3E3E/#444, dark panels #2B2C30
- Gold: nav #FAC51C (brassy), hero ≈#D9A94E (≈ our #D9B24E — match)
- Deep script purple ≈#5B3E8E; violet FAQ accordions; gradient 27° #DBD4E4→#000
- Membership triad: purple / gold / teal gradients (straight into our palette — match)

## Drift verdicts
- ADOPT: lavender #DBD4E4 as a token (most-used original surface; #8B76C4 alone doesn't cover it).
  Consider/decide on nav-gold #FAC51C as a loud variant.
- KEEP (legitimate evolutions): dark-first night ground, Barlow display, 37/30 middle scale
  steps, gold CTAs, glass panels, no-serif.
- QUESTIONS FOR LOVE (not corrections):
  1. The purple calligraphy banners are a signature gesture vs the no-script law — options:
     (a) keep as image/SVG art marks (logo-exempt), (b) redraw in Barlow caps,
     (c) sanction ONE script face for taglines only.
  2. The EARTH half (red rock, her own photos) is unrepresented in the rebuild — the brand's
     own axis says it belongs.

## Broken/residue in the original (tell Love)
Account expired (public site DOWN); "Offers" nav = empty href; footer renders literal
"Copyright © {2026} {OneCocreation}"; template CALL TO ACTION buttons + stock pink-blazer
imagery on About/Work With Me/Join The Tribe; unfinished "Title" FAQ accordion; illegible
testimonial carousel; page-name typo "Collborators".

## System emails (14, all stock ShinePages, transcribed in full in the audit transcript)
Digital access, appointment reminder/new, community approved/mention/reply, double opt-in,
member approved/password, order shipped/new/canceled/completed, subscription failed.
All merge-tag {braces}; ready to re-create on Love's rails (the planned email import).

## Automations
- "new contact" (draft, OFF): tag → welcome email → 2d → email 2 → 2d → email 3 → untag.
  A 3-email welcome drip skeleton worth importing.
- "Leap of Faith" (draft, OFF): empty if/else. Campaigns: "Intro rate" (never sent).
