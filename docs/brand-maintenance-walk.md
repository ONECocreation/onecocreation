# Brand Maintenance Walk — One Cocreation as a swappable template

*Audit date 0018.05.15 · scope `src/app/**`, `src/components/**`, `src/app/globals.css`, `src/app/onecocreation.css`*

## Verdict

The token layer in `src/app/onecocreation.css` (lines 7–35) is real and good. Three things stop this being a cartridge-swappable framework:

1. **A whole page family is still hard-light.** `.mgmt-ground` resolves to `--cream` (`#FBF6EF`) and never flips. 17 customer routes ride it.
2. **The two flagship marketing pages (`/about`, `/services`) paint sections and text with raw hex**, not tokens — and the light-mode `!important` repaint rule flips their backgrounds out from under that text.
3. **Brand identity is scattered across ~8 files** (tokens, section bands, asset paths, emoji, nav copy, footer copy, fonts) with no single cartridge entry point.

---

## PRIORITIZED PUNCH LIST

### P1 — breaks on brand swap or light/dark flip

| # | Where | Current | Suggested |
|---|---|---|---|
| P1‑1 | `src/app/globals.css:1648` | `.mgmt-ground{background:var(--cream,#0b0b12)}` — `--cream` is `#FBF6EF` in `:root` and has **no** `html[data-oc-theme="light"]` counterpart, so it is permanently paper | introduce `--ground` (dark `#141021`, light `#FCF7F0`); `.mgmt-ground{background:var(--ground)}` |
| P1‑2 | `src/app/globals.css:1750-1754` | `.mgmt-body [class*="bg-black"],[class*="bg-void"]{background:rgba(255,255,255,.72)!important}` | `var(--glass)` |
| P1‑3 | `src/app/onecocreation.css:385` | `.mgmt-body [class*="bg-panel"]{background:rgba(255,255,255,.62)!important}` | `var(--panel)` |
| P1‑4 | `src/app/onecocreation.css:430-431` | `.mgmt-rail{background:rgba(255,255,255,.5);border:1.5px solid rgba(139,118,196,.3)}` | `var(--glass)` / `var(--glass-edge)` |
| P1‑5 | `src/app/onecocreation.css:277` | `html[data-oc-theme="light"] main section:not(.keep-dark):not(.lions-gate){background:…!important}` — stylesheet `!important` **beats inline style**, so every inline dark gradient on `/about` + `/services` flips to cream while their inline light text does not | either add `.keep-dark` to those sections (fast) or move the bands to tokens (right) |
| P1‑6 | `src/app/about/page.tsx:60,122,150,174` | dark section gradients, **no** `.keep-dark`; body text at `:101,107` `#EDE6F2`, `:112` `#F3ECDD`, `:246` `rgba(237,230,242,.85)`, `:240` `#EDE6F2` | `var(--ink-body)` / `var(--ink-strong)`; add `.keep-dark` |
| P1‑7 | `src/app/services/page.tsx:87,144,181,221,252,313` | six dark gradient sections, no `.keep-dark`; teal/gold/rose text at `:89,93,98,118,119,123,149,186,189,201,207,224,236,245,257,296,299,315` | `var(--teal-bright)`, `var(--gold-2)`, `var(--rose)`, `var(--ink-strong)` |
| P1‑8 | `src/app/services/page.tsx:31-34` | `darkGlass` const duplicates the **dark** values of `--glass`/`--glass-edge` as literals (`rgba(22,17,40,.66)` / `rgba(139,118,196,.35)`) — used 6× (`:168,200,228,238,306`) and never flips | delete; use `lightGlass` (`:36-39`, already correct) and rename it `glass` |
| P1‑9 | `src/app/services/page.tsx:46` | `<main style={{background:"#1a1428"}}>` | `var(--ground)` |
| P1‑10 | `src/app/onecocreation.css:202` | `.svc{background:var(--panel);border:1px solid rgba(255,255,255,.85)}` — near-white border on the dark panel today | `var(--glass-edge)` |
| P1‑11 | `src/app/onecocreation.css:245-274` | the whole cosmic-walk band palette is 20+ raw hexes keyed to `#about/#services/#classes/#offers/#support/#free/#contact` — **brand-specific IDs and brand-specific colors** | move to a `--band-1…--band-7` token ladder in the cartridge block |
| P1‑12 | `src/app/onecocreation.css:391` | `.mgmt-body [class*="text-pink"]{color:var(--magenta)}` — `--magenta` is **not** in `:root`; it only exists inside `BrandProvider`'s wrapper `<div>` (`src/lib/brand-onecocreation.ts:88`) | define `--magenta` in the `:root` cartridge block, or use `var(--rose)` |
| P1‑13 | `src/components/console/glass.tsx:12-37` | the console's whole vocabulary is paper literals: `field.background:"#fff"` `:14`, `field.color:"#4a4458"` `:16`, `glassCard` `rgba(255,255,255,.72)` / `rgba(255,255,255,.9)` `:21-22`, `sheet.background:"#fffdf8"` `:34` | tokenize to `--field-bg`, `--field-ink`, `--glass`, `--glass-edge`, `--sheet-bg` |
| P1‑14 | `src/app/u/[handle]/not-found.tsx:13` | `className="button"` — bare **arcade** `.button` on a customer 404; only repainted when nested under `.mgmt-body` (`onecocreation.css:392`), which this page is not | `className="btn btn-gold"` |
| P1‑15 | `src/components/SiteHeader.tsx:15`, `SiteFooter.tsx:9` | literal `/brand/onecocreation-lockup.svg`, `/brand/onecocreation-mark.svg` | cartridge `logo.lockup` / `logo.mark` |

### P2 — inconsistency (survives a swap, but drifts)

| # | Where | Note |
|---|---|---|
| P2‑1 | `src/components/booking/SlotPicker.tsx:150-152,479-481,542-544` | the selected-day pill recipe (`1.5px solid #b4862b` / `linear-gradient(135deg,#ebcb77,#b4862b)` / `#3a2a06`) is inlined **three times**; a fourth copy in `store/BuyPanel.tsx:120-122` |
| P2‑2 | `src/components/store/CartPanel.tsx:193-198` `tinyBtn`, `:199-202` `softLink`, `store/AddonActions.tsx:30-34` `quiet`, `ServiceCard.tsx:82-98`, `app/a/booking/page.tsx:32-35` `textBtn` | five separate hand-rolled "quiet text button" recipes with three different sizes (`.68`/`.72`/`.74`/`.76`/`.78rem`) and three letterspacings (`.05`/`.06`/`.08em`) |
| P2‑3 | `src/components/TipJar.tsx:73-90` (card-buttons), `:94-110` (preset pills) | two bespoke button shapes; the pills nearly are `.btn-ghost` + `.btn-sm` |
| P2‑4 | `src/components/store/ImageLightbox.tsx:73-86` | three 44px circular glyph buttons hand-styled (`rgba(235,203,119,.6)` border, `rgba(14,12,24,.6)` fill, `#ebcb77` ink); `SlotPicker.tsx:106-110` has a **different** 40px circular nav button; `console/AdminWeekGrid.tsx:315,322` has a **third** 34px variant |
| P2‑5 | `src/components/FrenBadge.tsx:46-60,106-125` | dropdown trigger + logout row hand-styled; `#ECE3C9` `:97` and `#C79AE8` `:121` duplicate `--ghost-ink` and the header's `.logo .wm span` color |
| P2‑6 | `src/app/onecocreation.css:154` | `.logo .wm span{color:#c79ae8}` — the only place this lavender lives; matches FrenBadge's `#C79AE8` by accident |
| P2‑7 | `src/components/rooms/RoomsShelf.tsx:50-53` | tier accents `#a34e6c/#5f4b96/#a34e6c/#b4862b` hardcoded, then string-concatenated into alpha (`${g.accent}55`, `12`, `33` at `:151,152,158`) — hex-only, will break if a cartridge supplies `rgb()` |
| P2‑8 | `src/components/rooms/RoomView.tsx:36-41` | four avatar gradients + `TEACHER_GRADIENT` as literals; `:198,225-226,233` repeat them |
| P2‑9 | `src/app/store/page.tsx:67-74` | `BANDS` record — four more raw section gradients, same problem as P1‑11 |
| P2‑10 | `src/components/store/QuickView.tsx:57-92` vs `console/glass.tsx:29-37` | two overlay+sheet recipes with the **same** scrim `rgba(24,18,38,.55)` but different z-index (70 vs 60), radius (22 vs 16), shadow, and paper (`#fffdf8` both) |
| P2‑11 | `src/components/store/ImageLightbox.tsx:61` | a **third** overlay: `rgba(14,12,24,.88)`, z-index 80 |
| P2‑12 | `src/components/console/AdminWeekGrid.tsx:285-296` | a **fourth** overlay+sheet, locally redefined instead of importing `glass.tsx` |
| P2‑13 | form field recipe duplicated 6× | `ContactForm.tsx:7-8`, `SubscribeForm.tsx:61`, `store/BuyPanel.tsx:15-16`, `store/CartPanel.tsx:185-186`, `booking/SlotPicker.tsx:401-402`, `TipJar.tsx:125-127` — all `1px solid rgba(139,118,196,.45)` + `rgba(255,255,255,.9x)` + `#4a4458`, with radius 10 and four different alphas |
| P2‑14 | card recipe duplicated ~14× | `borderRadius:20 + var(--glass-edge) + boxShadow "0 24px 60px -30px rgba(120,100,160,.55)"` at `booking/BookingReceipt.tsx:94-96`, `booking/ManageBooking.tsx:58-60`, `booking/SlotPicker.tsx:115-119,503-507,564-566`, `store/BuyPanel.tsx:92-94`, `store/OrderStatus.tsx:113-115`, `store/ImageLightbox.tsx:33-34` — this **is** `.card` with a different radius. Sibling recipe (radius 18/20, shadow `-28px rgba(120,100,160,.45)`): `me/MemberQuickCards.tsx:22-24`, `me/EmailMemberPanel.tsx:58-60`, `LettersRoom.tsx:36-37,101-102`, `app/news/page.tsx:41-42`, `store/CartPanel.tsx:214-216` |
| P2‑15 | `src/app/onecocreation.css:176` vs `:280` | `.hero::after` declared twice with different gradients; `:176` is dead |
| P2‑16 | `src/app/onecocreation.css:398-403` vs `:407-412` | `.tier-pill--a/--b` declared twice, second block fully overrides the first — dead code |
| P2‑17 | `src/app/onecocreation.css:47` | `.btn-teal` sits in the hero block, above the `.btn` base at `:79`; hardcodes `#8FD0D8` instead of `var(--teal-bright)`, and has no `:hover` sibling like the others |
| P2‑18 | `src/components/console/glass.tsx:56-63` | `CHIP_TONES` — six tone recipes as literals; `rooms/RoomsShelf.tsx:72-73,87-88` reimplements four of the same six inline instead of importing `Chip` |
| P2‑19 | status-color literals scattered | `#3c6b49` (paid/ok) in 8 files, `#a34e6c` (error) in 9 files, `#7a5a12` (waiting) in 6 files, `#5f4b96` (unlock) in 5 files, `#a33` in `app/a/store/page.tsx:416,460` and `console/RetreatsDesk.tsx:183` — should be `--ok/--warn/--err/--info` |

### P3 — cosmetic / document-and-move-on

| # | Where | Note |
|---|---|---|
| P3‑1 | `src/components/time/*.css`, `orrery/orrery.css:17-24` | deliberately locally-scoped, self-documented "the clock face never theme-flips". Correct as-is; add a `<!-- exempt -->` marker in the cartridge doc so future sweeps skip it |
| P3‑2 | `src/app/time/page.tsx:61,74,90,109-111,288` | `#f2ead8`, `#ffb347`, `#ff6600`, `#6fd7e0`, `#ffd700` — the orrery palette leaking out of its scope into page chrome. Should read `var(--orr-*)` |
| P3‑3 | `src/components/CosmicSky.tsx:54,68-69` | starlight `#F6EFD9` / `rgba(246,239,217,…)` — canvas, not CSS. Take a prop or read a token |
| P3‑4 | `src/components/LightCode.tsx:41,49` | glyph fill `#fff` set from JS; `onecocreation.css:326-330,344` sets the same in CSS |
| P3‑5 | `src/components/sections.tsx:111-113` | jewelry SVG stroke `#C77B4A` ×3 → `var(--copper)` |
| P3‑6 | `src/components/sections.tsx:120-123` | four gemstone `from`/`to` hex pairs — content data, fine, but belongs in `lib/` not a component |
| P3‑7 | `src/components/WildDoors.tsx:14,26,36` | three habitat ground gradients — deliberate wild-card paper, matches `.wild-card` at `onecocreation.css:103`. **Keep**, but note both places must move together |
| P3‑8 | `src/components/BftClock.tsx:111-112`, `time/TimeDoor.tsx:177` | bitcoin orange `#f7931a` — protocol color, never brand. Correct; document as exempt |
| P3‑9 | `src/app/letters/[key]/page.tsx:35` | `background:"#FBF6EF"` → `var(--cream)` (a letter is paper — deliberate, but should read the token) |
| P3‑10 | `src/app/packages/[slug]/page.tsx:156` | `rgba(243,220,227,.35)` → `--blush` (token exists in `brand-onecocreation.ts:53`, never reaches CSS) |
| P3‑11 | `src/app/layout.tsx:66`, `src/app/manifest.ts:16-17` | `themeColor`/`background_color` `#0a0a14` hardcoded three times = `--space` |

---

## 1 · Hardcoded color literals, customer-facing, by file

Deliberate literals **excluded** per the brief: `#4a4458` (ink on paper inputs), `#3a2a06` (ink on gold), `#EBCB77`/`#8FD0D8`/`#E7B2C3` **when they are accent-on-dark and the section is `.keep-dark`**, and the wild-card paper inks (`#3f3a4e`, `#897F97`, `#B4862B` under `.wild-*`).

### `src/app/services/page.tsx` — 34 literals, worst offender
- `:32-33` `darkGlass` — `rgba(22,17,40,.66)`, `rgba(139,118,196,.35)` → **P1‑8**
- `:46` `#1a1428` on `<main>` → **P1‑9**
- `:54,112,290` overlay scrims `rgba(20,18,40,.28)`, `rgba(14,10,28,.6)`, `rgba(16,12,30,.55)` → `--scrim-1/2/3`
- `:60,65` `rgba(255,255,255,.9/.6/.5)` drop-shadows + border on the hero art
- `:87,144,181,221,252,313` six section gradients → **P1‑7 / P1‑11**
- `:89,224,315` kicker `#E7B2C3` → `var(--rose)` (`.kicker` already sets it — these overrides are redundant)
- `:93,119,123,189,207,299` `#EBCB77` → `var(--gold-2)`
- `:118,149,186,201,257,296` `#8FD0D8` → `var(--teal-bright)` (note `.sh-teal` already sets it — redundant)
- `:157` `rgba(143,208,216,.5)` + `rgba(35,99,110,.7)` — teal ring, only place in the codebase
- `:236,245` `#E7B2C3` testimonial attribution
- `:301` `rgba(237,230,242,.8)` → `var(--ink-body)`

### `src/app/about/page.tsx` — 26 literals
- `:39` hero gradient (inside `.keep-dark`, OK) · `:60,122,150,174` band gradients → **P1‑6**
- `:42,235` `#E7B2C3` · `:44,47` `#F4ECFF` · `:45,104,238` `#8FD0D8` · `:110,244` `#EBCB77`
- `:101,107,240` `#EDE6F2`, `:112,237,251` `#F3ECDD`, `:246` `rgba(237,230,242,.85)` → `--ink-body`/`--ink-strong`
- `:52,128,206` shadows `rgba(10,8,30,.6)`, `rgba(35,60,80,.45)`, `rgba(35,26,60,.55)` — three unique shadows where `var(--soft)` exists
- `:96,230` background-image composites (image on child div — survives the flip)

### `src/components/booking/SlotPicker.tsx` — 34 literals
`:108-109` gold nav button · `:119,507,566` the `-30px rgba(120,100,160,.55)` card shadow ×3 · `:150-152,479-481,542-544` selected-pill ×3 (**P2‑1**) · `:160` `#3a2a06`/`b4862b` dot · `:164` `rgba(137,127,151,.45)` empty-day ink · `:401-402` field (**P2‑13**) · `:406,651` `#a34e6c` · `:646` `#7a5a12`. Everything else already reads `var(--muted, …)` / `var(--ink-body)` — this file is halfway home.

### `src/components/store/CartPanel.tsx` — 21
`:166,207` `#7a5a12` · `:185-186` field · `:193-198` `tinyBtn` · `:199-202` `softLink` · `:216` card shadow · `:228` `#3c6b49` · `:320` `#5f4b96` · `:382` `#a34e6c`

### `src/components/CertCase.tsx` — 15 (arcade component, `/a` only)
`:16-45` five rarity shells as Tailwind arbitrary values (`bg-[linear-gradient(150deg,#c2c2c2,…)]`, `border-[#6f6f6f]`, `bg-[#1b1b1b]`, …). Entirely outside the token system; mixes with arcade `border-cyan/60`, `border-pink/70`.

### `src/components/booking/BookingReceipt.tsx` — 15
`:85` `#a34e6c` · `:94-96` card · `:125-127` waiting chip (`rgba(180,134,43,.5)`, `rgba(217,178,78,.12)`, `#7a5a12`) · `:136-137,145` paid chip (`rgba(78,138,95,.45/.1)`, `#3c6b49`) — this is `glass.tsx`'s `Chip` reimplemented inline

### `src/components/store/OrderStatus.tsx` — 14 · `store/BuyPanel.tsx` — 14 · `rooms/RoomView.tsx` — 14
See P2‑8, P2‑13, P2‑14, P2‑19.

### `src/components/store/ImageLightbox.tsx` — 10
`:34` card shadow · `:48` `rgba(139,118,196,.3)` thumb border · `:61` scrim (**P2‑11**) · `:68` `rgba(0,0,0,.5)` · `:74-86` three circle buttons (**P2‑4**)

### Remaining, one-to-eight literals each
`store/QuickView.tsx:57,63-64,72,78,79,84,92` · `ServiceCard.tsx:46,47,53,56,65,70,76,97` · `sections.tsx:111-113,120-123,168` · `rooms/RoomsShelf.tsx:50-53,72-73,87-88` · `booking/ManageBooking.tsx:60,65-66,75,97,102,114` · `TipJar.tsx:82-83,102-103,125-127` · `FrenBadge.tsx:54,74-78,97,119,121` · `app/time/page.tsx:61,74,90,109-111,288` · `app/contact/page.tsx:22,32,35,38,45,88,101` · `app/book/page.tsx:40,43,45,46,48,49,51` · `app/store/page.tsx:68-74,164` · `me/EmailMemberPanel.tsx:59-60,84,109` · `ContactForm.tsx:7-8,40,60` · `booking/CutsChooser.tsx:43-44,82-83` · `WildDoors.tsx:14,26,36` *(deliberate)* · `TagClaim.tsx:74,366,590` *(arcade)* · `me/MemberQuickCards.tsx:22-24,55` · `EmailDoor.tsx:72,87-88` · `CosmicSky.tsx:54,68-69` · `SubscribeForm.tsx:61` ×2 · `ServiceRow.tsx:51,79` · `me/MemberCalendar.tsx:88-89` · `LettersRoom.tsx:37,102` · `BftClock.tsx:111-112` *(protocol)* · `bb/Hatchery.tsx:72,105` *(arcade)* · `app/retreats/page.tsx:48,64` · `app/retreats/[id]/page.tsx:52` · `app/news/page.tsx:42` · `app/store/[id]/page.tsx:47` · `app/letters/[key]/page.tsx:35` · `app/packages/[slug]/page.tsx:156` · `booking/JitsiRoom.tsx:92` · `OperatorGate.tsx:77` · `LightCode.tsx:41,49` · `time/TimeDoor.tsx:177` *(protocol)* · `app/layout.tsx:66` · `app/manifest.ts:16-17`

---

## 2 · Button inconsistencies

**The sanctioned system** (`onecocreation.css:79-84`): `.btn` base + `.btn-gold` / `.btn-ghost` / `.btn-rose` / `.btn-teal` / `.btn-sm`, plus `.btn-shimmer` (`:293-298`) for primary doors only, `.tier-pill--a/b/c` and `.tier-btn--a/b/c` (`:398-412`), `.cat-pills a` (`:126-128`), `.stub` (`:212`), `.lockpill` (`:208`).

**Adoption:** `btn btn-ghost btn-sm` 52 · `btn btn-gold btn-sm` 40 · `btn btn-gold` 16 · `btn btn-ghost` 9 · `btn btn-gold btn-shimmer` 5 · `btn btn-teal` 2 · `btn btn-rose` 2 — healthy on the marketing surface.

**Non-conforming, customer-facing:**

| Where | Recipe |
|---|---|
| `ServiceCard.tsx:82-91` | `background:none;border:0;.74rem/700/uppercase/.08em;color:var(--muted)` — the quiet-text pattern, hand-rolled |
| `ServiceCard.tsx:92-100` | same but `color:"#EBCB77"` |
| `store/AddonActions.tsx:30-34` | quiet pattern, `.72rem`, `.06em` |
| `store/CartPanel.tsx:193-198` | `tinyBtn(gold)` — pill, `.76rem/700`, two-tone borders |
| `store/CartPanel.tsx:199-202` | `softLink` — `.78rem`, underlined, `--muted` |
| `TipJar.tsx:73-90` | selectable **card**-as-button, `borderRadius:18`, gold-wash active state |
| `TipJar.tsx:94-110` | preset amount pill, `999px`, `.84rem/700` — ≈ `.btn-ghost.btn-sm` with a gold active state |
| `SlotPicker.tsx:106-110` | `navBtn` — 40px circle, `rgba(180,134,43,.45)` ring |
| `SlotPicker.tsx:141-163, 472-486, 532-550` | day/slot cell — three near-identical selectable pills |
| `store/BuyPanel.tsx:114-128` | size chip — a fourth copy of that pill |
| `booking/CutsChooser.tsx:78-90` | service row-as-button, `borderRadius:14` |
| `store/ImageLightbox.tsx:73-86` | three 44px circular glyph buttons |
| `FrenBadge.tsx:46-60` | nav-tail dropdown trigger |
| `FrenBadge.tsx:106-125` | logout menu row, `#C79AE8` |
| `NavMenu.tsx:69-76` + `onecocreation.css:441-445` | `.nav-burger` — its own bordered box |
| `ThemeLantern.tsx:26-33` + `onecocreation.css:317-320` | `.theme-lantern` — 46px FAB, own recipe (fine, it's chrome) |
| `app/u/[handle]/not-found.tsx:13` | bare arcade `.button` → **P1‑14** |

**Admin:** `app/a/booking/page.tsx:32-35` `textBtn(color)` factory; `console/AdminWeekGrid.tsx:315,322` 34px circles; everything else in `/a` correctly uses `btn btn-sm btn-gold|btn-ghost`.

**Recommendation:** add three classes and delete ~15 inline recipes — `.btn-quiet` (the uppercase text button, one size), `.chip-select` (the selectable pill: day, size, preset, service), `.btn-round` (circular glyph, `--size` custom property).

---

## 3 · Card variants

The contract is `.card` (`onecocreation.css:129-139`): `var(--panel)` + `1px var(--glass-edge)` + radius 24 + `var(--soft)` + `blur(8px)`, with `.thumb`/`.body`/`.card-title`/`.card-sub`/`.push` zones. Distinct competing recipes in use:

| Recipe | Values | Sites |
|---|---|---|
| **A — panel-card** *(canonical)* | `var(--panel)` · `var(--glass-edge)` · r24 · `var(--soft)` | `.card`, used broadly via `sections.tsx` |
| **B — soft glass 20** | `var(--glass)` · `var(--glass-edge)` · r20 · `0 24px 60px -30px rgba(120,100,160,.55)` | `BookingReceipt.tsx:94`, `ManageBooking.tsx:58`, `SlotPicker.tsx:115,503,564`, `BuyPanel.tsx:92`, `OrderStatus.tsx:113`, `ImageLightbox.tsx:33` |
| **C — soft glass 18** | `var(--glass)` · `var(--glass-edge)` · r18/20 · `0 18px 44px -28px rgba(120,100,160,.45)` | `MemberQuickCards.tsx:22`, `EmailMemberPanel.tsx:58`, `LettersRoom.tsx:36,101`, `news/page.tsx:41`, `CartPanel.tsx:214`, `console/glass.tsx:19-24`, `app/a/money/page.tsx:162` |
| **D — big glass 28** | `var(--glass)` · `var(--glass-edge)` · r28 | `about/page.tsx:23-26`, `services/page.tsx:36-39` |
| **D′ — big glass 28, dark-locked** | `rgba(22,17,40,.66)` · `rgba(139,118,196,.35)` · r28 | `services/page.tsx:31-34` **P1‑8** |
| **D″ — big glass 28, gold-edged** | `var(--glass)` · `1.5px rgba(217,178,78,.4)` · r28 | `contact/page.tsx:20-23` |
| **E — paper card** | `rgba(255,255,255,.5–.72)` · `rgba(139,118,196,.22–.35)` or `rgba(255,255,255,.9)` · r16–20 | `console/glass.tsx:19`, `console/DiscountsDesk.tsx:52`, `console/PwycDesk.tsx:84`, `console/RetreatsDesk.tsx:89,129`, `a/store/page.tsx:109,361`, `a/money/page.tsx:35,162,242`, `a/booking/page.tsx:28,116`, `OperatorGate.tsx:77`, `EmailDoor.tsx:86-88`, `MemberCalendar.tsx:88-89`, `CutsChooser.tsx:43-44` |
| **F — wild card** | `rgba(255,255,255,.72)` · `rgba(255,255,255,.9)` · r22 | `onecocreation.css:103` *(deliberate)* |
| **G — svc row** | `var(--panel)` · `rgba(255,255,255,.85)` · r18 | `onecocreation.css:202` **P1‑10** |
| **H — note bar** | `var(--glass)` · `var(--glass-edge)` · r18, centered | `onecocreation.css:209` *(fine)* |
| **I — nebula override** | `rgba(252,247,240,.94)` · `blur(6px)` | `onecocreation.css:260` *(deliberate readability override on `#classes`)* |

**Recommendation:** collapse B/C/D into `.card` + `.card--sm` (r18) + `.card--lg` (r28); publish `--soft-sm` and `--soft-lg` beside `--soft`; retire recipe E once P1‑1..P1‑4 land (it exists only to fight the light `.mgmt-ground`).

---

## 4 · Popup / modal variants

Four independent overlay+sheet implementations, no shared primitive:

| # | File | Scrim | z | Sheet |
|---|---|---|---|---|
| 1 | `console/glass.tsx:28-37` (`overlay`/`sheet`) | `rgba(24,18,38,.55)` | 60 | `#fffdf8`, r16, `1px rgba(139,118,196,.4)`, `0 18px 50px rgba(24,18,38,.35)`, max 460, `86vh` |
| 2 | `store/QuickView.tsx:57-67` | `rgba(24,18,38,.55)` | **70** | `#fffdf8`, **r22**, same border, **`0 24px 70px rgba(24,18,38,.4)`**, max 460 |
| 3 | `store/ImageLightbox.tsx:61-68` | **`rgba(14,12,24,.88)`** | **80** | image only, r16, `0 30px 90px rgba(0,0,0,.5)`; three bespoke circle buttons `:73-86` |
| 4 | `console/AdminWeekGrid.tsx:285-296` | `rgba(24,18,38,.55)` | 60 | verbatim re-declaration of #1 instead of importing it |

**Consumers of #1:** `a/money/page.tsx:275-276`, `a/store/page.tsx:449-450` (with `maxWidth:780` override), `AdminWeekGrid.tsx:555,620,680,728`.

**Divergences that matter for a swap:** all four sheets are **paper** (`#fffdf8`) — on a dark-first site they are the only white surfaces left; the z-ladder is undeclared (60/70/80 with no token); `QuickView` has no focus trap or `Escape` handler while `ImageLightbox` handles arrows; only `#3`'s scrim is dark enough to be theme-correct.

**Also popup-shaped but unlisted in the brief:**
- `NavMenu` submenu — `onecocreation.css:450-452`: `rgba(20,16,32,.97)` · `1.5px rgba(217,178,78,.4)` · r14 · `0 10px 30px rgba(0,0,0,.4)`
- `FrenBadge` dropdown — `FrenBadge.tsx:74-78`: **byte-identical values, hand-copied into JSX**
- Mobile nav sheet — `onecocreation.css:475-479`: same values again, a third copy

→ one `--pop-bg` / `--pop-edge` / `--pop-shadow` triple would collapse all three.

**Recommendation:** promote `glass.tsx`'s `overlay`/`sheet` into a real `<Sheet>` component with `--z-sheet: 60/70/80` tokens, dark-first surfaces, `Escape` + focus trap, and let QuickView/Lightbox/AdminWeekGrid consume it.

---

## 5 · Font usage

**Clean.** Zero rogue inline `fontFamily` values — every occurrence is `var(--serif)`, `var(--disp)`, `var(--sans)`, `"inherit"`, or the `var(--serif, Georgia)` fallback form.

Definitions and remaining notes:

| Where | Value |
|---|---|
| `onecocreation.css:20` | `--serif:'Cochin','Optima','Palatino Linotype',Georgia,serif` |
| `onecocreation.css:21` | `--sans:-apple-system,…` |
| `onecocreation.css:22` | `--disp:var(--font-disp,'Montserrat'),'Poppins',…` |
| `onecocreation.css:2-3` | `@font-face 'Cochin'` ← `/fonts/cochin-roman.ttf`, `/fonts/cochin-bold.otf` — **hardcoded paths** |
| `app/layout.tsx:14-44` | five `next/font` loads: Retronoid, OpenDyslexic, Press_Start_2P, Montserrat (`--font-disp`), Roboto. **Three are arcade-only** — Retronoid and Press Start ship on every One Cocreation page for the arcade components under `/a` and `/artist`, `/media`, `/u/*`, `/welcome` |
| `brand-onecocreation.ts:64-67` | the same two stacks declared a **second** time as JS strings |
| `brand/themes/onecocreation.ts:38-43` | mapped a **third** time into `--font-arcade`/`--font-pixel`/`--font-body` |
| `onecocreation.css:388` | `.mgmt-body [class*="font-pixel"]{font-family:var(--sans)!important}` — the pixel face is loaded then suppressed |
| `time/strip-clock.css:24`, `time/living-clock.css:19`, `orrery/orrery.css:28`, `globals.css:215` | monospace stacks — deliberate, scoped, documented |

**P2:** the serif/sans stack lives in three places (`onecocreation.css:20-21`, `brand-onecocreation.ts:65-66`, and by reference in `themes/onecocreation.ts`). A cartridge should declare it once and emit the CSS vars.

---

## 6 · Admin side

### Styling system, as it stands

Three layers, in reverse specificity:

1. **arcade-ui / globals.css tokens** — `--color-void/panel/edge/coin/neon/cyan/ghost/pink` (`globals.css:1389+`), the `[data-accent]` bus (`:572-576`), `.console-card` / `.btn-pill` / `.pill` / the SCAR·LET LCARS chrome (`:556-1360`), a `[data-console-theme="lcars"]` remap (`:1388+`). All **dark-native**.
2. **The `.mgmt-*` cartridge** (`globals.css:1644-1793`) — the "site chrome" alternative shell. Mostly token-driven (`var(--serif)`, `var(--ink)`, `var(--muted)`, `var(--edge)`) but pinned to `--cream` at `:1648` and white at `:1752`. Plus 11 more repaint rules in `onecocreation.css:385-392, 404, 430-436`.
3. **`console/glass.tsx`** — the hand-written vocabulary: `field`, `glassCard`, `overlay`, `sheet`, `SectionHead`, `Chip`/`CHIP_TONES`. All paper literals (**P1‑13**).

Chrome selection: `CONSOLE_CHROME` env (`lib/console.ts:31`) → `ConsoleShell` (LCARS) or `SiteConsoleShell` (`components/console/SiteConsoleShell.tsx`), with `site-chrome.tsx:14-15` re-exporting `SiteHeader`/`SiteFooter` as the documented per-clone swap point. This half is genuinely well-factored.

### Remaining wireframe classes, per file

Counting `border-neutral* · bg-black · bg-void · bg-panel · text-cyan · text-neon · text-pink · text-ghost · text-coin · font-pixel · font-mono · border-edge · border-cyan|neon|pink · glow-* · border-2 · border-4 · shadow-[`:

**In `/a` pages and `console/` (37 files, 100 hits total — the shell itself is clean):**

```
21  src/app/a/people/page.tsx
19  src/components/console/RankTrackPanel.tsx
18  src/app/a/connections/page.tsx
17  src/app/a/letters/page.tsx
 6  src/app/a/bots/page.tsx
 5  src/app/a/sim/page.tsx
 4  src/app/a/page.tsx
 3  src/components/console/OverviewPanel.tsx
 3  src/app/a/testing/page.tsx
 2  src/components/console/ReaderDrawer.tsx
 2  src/app/a/status/page.tsx
 2  src/app/a/brand/page.tsx
 2  src/app/a/action/page.tsx
 0  ×24 other files (AdminWeekGrid, ConsoleShell, ScarRail, glass.tsx, …)
```

**The real mass is in `src/components/*.tsx`, the shared panels `/a` mounts — 1,700+ hits:**

```
200  TagClaim.tsx          171  FrenProfile.tsx       154  ArtistRegistry.tsx
 84  MergeQueue.tsx         81  MediaKit.tsx           76  SpacesPanel.tsx
 66  welcome/WelcomeWizard  46  BriefsConnectPanel     45  ProfileEditor.tsx
 44  DecisionsPanel.tsx     40  BriefsPanel.tsx        36  PokeArcadeCard.tsx
 36  BbConsole.tsx          33  SeatReservedPanel      31  ReleaseTag.tsx
 30  SignerDoors.tsx        29  SignoffsPanel.tsx      28  MempoolPanel.tsx
 28  ChatPanel.tsx          27  bb/BuddyDevice.tsx     26  FrenMenu.tsx
 26  BrandTester.tsx        25  TicketsPanel.tsx       25  me/MePanel.tsx
 25  BdayChecker.tsx        24  DeployPanel.tsx        23  Kind0Doors.tsx
 22  MudPanel.tsx           20  bb/Hatchery.tsx        18  RegistrationPage
 18  Markdown.tsx           18  GameOverTag.tsx        17  CertCase.tsx
 16  SigningExplainer       11  RelayResults.tsx       10  StatusReportsPanel
  8  FrenChip · EarthFooter   6  SignerNudge · Notice   5  OperatorGate · BftClock · ArtUpload   4  ShipsLog   2  FrenMenuFooter
```

**⚠ Nine of these are mounted on CUSTOMER routes**, not `/a`, and are only rescued by the `.mgmt-body` repaint:

| Route | Component | Wireframe hits |
|---|---|---|
| `/u/[handle]` | `FrenProfile` + `GameOverTag` | 171 + 18 — **and this page does not wrap in `.mgmt-body`**, so the repaint never fires; `FrenProfile.tsx:470` renders `border-4 border-neon bg-panel shadow-[8px_8px_0_#ff00ff]` raw |
| `/artist` | `ArtistRegistry` | 154 |
| `/media` | `MediaKit` | 81 |
| `/welcome` | `WelcomeWizard` | 66 |
| `/bb` | `BbConsole` (+ `BuddyDevice` 27, `Hatchery` 20) | 36 |
| `/me` | `MePanel` | 25 |
| `/bday` | `BdayChecker` | 25 |
| `/login`, `/brand-preview` | `LoginPanel` → `TagClaim` | 200 |
| `/u/[handle]` (404) | `not-found.tsx:13` bare `.button` | — |

### What a dark-first admin flip would touch

1. **One line unblocks 80% of it:** `globals.css:1648` `var(--cream)` → `var(--ground)`. Every `.mgmt-*` route (`/a/*`, `/login`, `/me`, `/me/calendar`, `/welcome`, `/terms`, `/privacy`, `/classes`, `/rooms/*`, `/artist`, `/media`, `/bb`, `/bday`, `/time`, `/gift/*`, `/meet/*`, `/book/cuts`, `/not-found`) goes dark at once.
2. **Then the four repaint rules that hardcode white:** `globals.css:1752`, `onecocreation.css:385, 431` (+`:389` border color).
3. **Then `console/glass.tsx:12-37`** — five literals, and every desk inherits the fix: `AdminWeekGrid` (18 paper literals — the biggest single file), `a/store` (8), `a/money` (7), `a/booking` (4), `RetreatsDesk` (3), `PwycDesk` (1), `DiscountsDesk` (1).
4. **Then the ~40 inline paper cards** listed under recipe **E** in §3 — these exist *only* to sit on the cream ground and can mostly be deleted in favour of `.card--sm`.
5. **`Chip`/`CHIP_TONES` (`glass.tsx:56-63`)** — six tone recipes need dark counterparts; `RoomsShelf.tsx:72-88` needs to start importing `Chip` rather than duplicating four of them.
6. **`AdminWeekGrid.tsx:491,496,538`** — the day-off hatch uses `rgba(255,255,255,.5)` stripes; needs a token.
7. **Nothing in `ConsoleShell`/`ScarRail`/`ScarHud`/`site-chrome` needs touching** — they are already dark-native or token-driven.

---

## 7 · Template-swap readiness — the brand cartridge

`docs/brand-cartridge.md` already describes the destination (a signed nostr note carrying `BrandTheme`). The gap is that the **runtime** brand lives in eight places, not one.

### What exists today

| Layer | File | Covers |
|---|---|---|
| Sign-in contract | `lib/brand/contract.ts` | `tokens`(14) + `fonts`(4) + `copy`(10) + `doors` + `roleLabels` |
| Site palette | `lib/brand-onecocreation.ts:45-73` | 13 hexes + 2 font stacks + 3 copy strings |
| Adapter | `lib/brand/themes/onecocreation.ts` | maps site → contract |
| Injector | `lib/brand/BrandProvider.tsx:29-57` | emits `--color-*`, `--font-*` on a wrapper `<div>` |
| Visual truth | `app/onecocreation.css:7-35` | the ~30 vars the **site actually renders from** — *not connected to any of the above* |
| Identity | `lib/identity-config.ts:10-33` | domain, space name, host map |
| Console | `lib/console.ts:31`, `console/site-chrome.tsx:14-15` | chrome selection + chrome swap |

**The break:** `onecocreation.css:7-35` and `brand-onecocreation.ts:48-63` describe the same brand with different values and no link. `--ink` is `#E9E2F2` in CSS and `#4A4458` in TS. `--panel` is `rgba(24,19,44,.72)` vs `rgba(22,18,40,.66)`. `--edge` is `rgba(139,118,196,.34)` vs `rgba(168,130,240,.22)`. A swap that edits one leaves the other stale.

### What a cartridge must carry, and where it is hardcoded now

| Cartridge slot | Currently hardcoded at |
|---|---|
| **1. Token block** (dark + light) | `onecocreation.css:7-35` — 30 vars ×2 themes. **Add:** `--ground`, `--magenta`, `--blush`, `--ok/--warn/--err/--info`, `--soft-sm/--soft-lg`, `--pop-bg/--pop-edge/--pop-shadow`, `--field-bg/--field-ink`, `--z-sheet` |
| **2. Section band palette** | `onecocreation.css:245-274` (7 dark + 6 light gradients keyed to brand-named IDs `#about #services #classes #offers #support #free #contact`) and `app/store/page.tsx:67-74` (4 more). **P1‑11** — needs `--band-1…7` |
| **3. Fonts** | `onecocreation.css:2-3` (`@font-face` paths), `:20-22` (stacks), `app/layout.tsx:14-44` (five `next/font` loads, three arcade-only), `brand-onecocreation.ts:64-67` (duplicate stacks) |
| **4. Logo assets** | `SiteHeader.tsx:15` `/brand/onecocreation-lockup.svg` · `SiteFooter.tsx:9` `/brand/onecocreation-mark.svg` · `lib/mail.ts:164,231,240` three more · `MediaKit.tsx:287,302,309` three more · `services/page.tsx:67` `/brand/consciouscuts-logo.png` · `manifest.ts:19-21` icons · `.brandmark-lockup` sizing at `onecocreation.css:218` and `:483` |
| **5. Hero imagery** | `onecocreation.css:170` (`.hero::before` nebula), `:235,240,354` (lions-gate ×3), `:254` (`#classes` nebula) · `sections.tsx:44,63-65,159-165,247-249,315` · `about/page.tsx:50,96,126,152,230` · `services/page.tsx:25-27,50,58,63,108,155,286` · `book/page.tsx:19-25` · `store/page.tsx:70` · `packages/[slug]/page.tsx:138` · `lib/letters.ts:38,71,81-83` — **~45 literal paths, zero indirection** |
| **6. Emoji constellation** | `StackedHero.tsx:25` `🌈 🦋 🪽 💫` **inlined**, then re-inlined at `about/page.tsx:47`, `book/page.tsx:48`, `services/page.tsx:74,151`, `contact/page.tsx:40` — 5 copies of a 4-emoji string. `ServiceRow.tsx:26` and `CutsChooser.tsx:14` add more |
| **7. Nav / IA** | `NavMenu.tsx:11-49` — six doors + sub-menus, brand-specific labels ("ConsciousCuts & Waxing", "11:11 Live with Love", "Heart Field") |
| **8. Footer copy** | `SiteFooter.tsx:13-25` — nav, "Copyright © 2026 One Cocreation", the rebuild paragraph naming Pac's Arcade |
| **9. Metadata / PWA** | `layout.tsx:46-67` (title, description, `themeColor:"#0a0a14"`) · `manifest.ts:10-22` (name, `#0a0a14` ×2, icons) |
| **10. Section IDs** | `onecocreation.css:245-274` keys off `#about/#services/#classes/#offers/#support/#free/#contact`; `sections.tsx` emits them. Renaming a section breaks its band |
| **11. Tier / product naming** | `RoomsShelf.tsx:50-53` ("Heart Field Commons", "Weekly Intuitive", "Observer", "Evening Star" + accent hexes) · `onecocreation.css:398-412` `.tier-pill--a/b/c` · `lib/tiers-content.ts` |
| **12. Named CSS blocks** | `.lions-gate` / `.lions-gate-dark` (`:230-241, 352-357`), `.wild-*` (`:100-125`), `.llstage` / `.ll-line` Love Light Language (`:322-350`), `.stack-hero` (`:38-46`), `.constellation` (`:46`) — all brand-specific class names in the shared theme file |
| **13. Identity / space** | `identity-config.ts:10-33` — already env-driven ✅ |
| **14. Console chrome** | `console.ts:31` + `site-chrome.tsx:14-15` — already a documented one-file swap ✅ |

### Proposed cartridge shape

```
src/brand/
  cartridge.ts        # single source: tokens (dark+light), bands, fonts,
                      # assets{logo,mark,hero,textures}, constellation,
                      # nav, footer, metadata, tierNames
  cartridge.css       # generated :root + html[data-oc-theme="light"] block
  house.css           # brand-free: .btn .card .chip-select .sheet .grid …
```

`onecocreation.css` splits into `cartridge.css` (lines 1–35, 245–274, 230–241, 352–357, 322–350, 100–125 — the brand) and `house.css` (everything else — the framework). `brand-onecocreation.ts` becomes a thin re-export of `cartridge.ts` so the sign-in contract and the site can never drift again.

### Ordered path to swappable

1. **P1‑1 → P1‑4** — kill `--cream` as a ground. One line + three rules. Unblocks the dark-first admin flip.
2. **P1‑5 → P1‑9** — tokenize `/about` and `/services`. The only two pages that genuinely break in light mode.
3. **P1‑11 + P2‑9** — bands to `--band-*`.
4. **P1‑13 + §3 recipe E** — tokenize `console/glass.tsx`, delete the ~40 inline paper cards.
5. **P2‑2 + P2‑4 + P2‑1** — three new classes (`.btn-quiet`, `.chip-select`, `.btn-round`) retire ~15 one-offs.
6. **P2‑10 → P2‑12** — one `<Sheet>` primitive.
7. **§7 items 4–6** — move asset paths and the constellation behind the cartridge.
8. **Split the CSS** into `cartridge.css` + `house.css`; delete `brand-onecocreation.ts`'s duplicate palette.

At step 8, `frens.earth` / `pacsarcade.org` / `localbitcoiners` become a new `cartridge.ts` + an asset folder — no literal hunting.

---
## Walk closed — steps 6–8 shipped (Admiral's walk, 0018.05.15)

The ordered path above is complete. What landed:

- **Step 6** — `src/components/Sheet.tsx` is the one overlay+sheet
  primitive (`--z-sheet:60 / --z-popup:70 / --z-lightbox:80`, shared
  scrim, Escape + tap-outside). QuickView (paper kept deliberate),
  AdminWeekGrid ×4, glass.tsx (delegates + re-exports), ImageLightbox
  (shared scrim + z rung, full-bleed kept). The nav-popup triple rides
  `--pop-bg/--pop-edge/--pop-shadow`.
- **Step 6.5** — the step-5 migration debt: `.btn-quiet` (ServiceCard,
  AddonActions, CartPanel softLink), `.chip-select` (SlotPicker days +
  slots, BuyPanel sizes), `.btn-round` (SlotPicker + AdminWeekGrid nav
  circles, lightbox controls). CartPanel `tinyBtn` qty pills kept —
  chip-select genuinely doesn't fit them.
- **Step 7** — `src/brand/cartridge.ts`: constellation (StackedHero + 5
  inline copies + WelcomeFlow read it), logos (header/footer/services),
  hero imagery (services, about, book, store BANDS, sections.tsx), cuts
  photography, tier art, meta.
- **Step 8** — `src/app/cartridge.css` (brand) + `src/app/house.css`
  (framework) replace onecocreation.css; `brand-onecocreation.ts` is a
  thin adapter over cartridge.ts (P2-15's dead `.hero::after` dropped in
  the split).

**Asset paths still literal (deliberately left — leaf content, not
chrome):** `about/page.tsx` `/images/about/${n}.webp` portrait/scene
sets · `services/page.tsx:155` `/images/consciouscuts/${n}.webp` chair
portraits · `sections.tsx:247-249,315` affirmation + newsletter art ·
`lib/mail.ts:164,231,240` and `MediaKit.tsx:287,302,309` logo copies ·
`manifest.ts:19-21` icons · `packages/[slug]/page.tsx:138` ·
`lib/letters.ts:38,71,81-83`. Sweep them into `cartridge.ts` when the
picker arc begins.
