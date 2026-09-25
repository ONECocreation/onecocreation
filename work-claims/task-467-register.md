# TASK-467 register — the reading day agenda brick

Branch `feat/task-467-reading-day-brick`, base `a2cc258`. HEAD after this
lane: `044d7e2`.

## What changed, and why (the quotes)

Love, the call with her (`briefings/walk-968482/walk.txt`, 42:41–45:03):
> "just put this whole room brick right in the other on the weekly
> reading page … with three buttons of the times … the reading, then the
> second stage, then the q&a."
> "the first one's going to be just unlocked the moment they put in their
> email … they would see the times, see that 1:11 is unlocked, and then
> they would see the other two times and they could click on that and it
> would tell you 'join us after the free live, this is included in [the
> package] for this amount of money or simply purchase it now', and
> then they'd click on one of those two choices, would take them to the
> store."

The Admiral's tracker note (block 968,561): "make sure to have a brick
that shows an agenda with times names of sessions prices if applicable
and links to watch the video. so the video for the book reading is in
the heart field stage, the encore is in the playground … the q&a is in
the evening star." Today's answers (same block): the Playground gate is
tier-derived (`STAGE2_MIN_TIER`, currently A, TASK-465 moves it to B);
the Encore starts at "2:22 PM MDT"; the Q&A can be bought once for $33
or comes with Evening Star.

Built:
- `src/lib/reading-day.ts` — the ONLY place `ENCORE_TIME` ("14:22"),
  `QA_TIME` ("15:33") and `QA_ITEM_ID` ("q-a-meetup-with-love") are
  written, plus `clockWords`/`sameDayAt` (pure).
- `src/lib/reading-day-doors.ts` — `encoreFloorDoor()` (the floor
  package's name/href via `stage2PackageDoor`, its own live monthly
  price sale-aware) and `qaDoor()` (the pass's live price, falling back
  to adding Evening Star itself — its own item id, derived from
  `TIER_PAGES`, never a second literal — when the pass isn't live).
- `src/components/reading/ReadingDay.tsx` — async server wrapper: reads
  the session (`sessionsFromCookieHeader((await headers()).get("cookie"))
  [0]`, `/reading/page.tsx`'s own idiom), resolves `tierForSubject`
  (`/api/stage2`'s own idiom), FAILS CLOSED on any throw (tier stays
  `null`), renders nothing when no reading is published.
- `src/components/reading/ReadingDayBody.tsx` — the pure card, three
  `kit-rows` rows in the Heart Field's own `card room-card` shell.
- `src/components/reading/ReadingDayUnlockButton.tsx` — a kit-classed
  sibling of `AddTierButton.tsx` (same POST `/api/cart` → `oc-cart-
  changed` → `location.assign("/cart")` flow), carrying the inline lock
  glyph.
- `src/app/reading/page.tsx` — ONE import, ONE `<section className=
  "kitx-section"><div className="wrap"><ReadingDay /></div></section>`,
  immediately before the "WHAT YOU WILL EXPERIENCE" comment. Nothing
  else in this file touched (house test `tests/reading-page.test.ts`'s
  own "no tier or payment logic" pin still holds — checked, still green).
- `src/app/kit.css` — ONE new rule, `.kit-lock-icon` (spacing/baseline
  for the inline lock svg — the exact rule TASK-466's own lock needs
  too; both lanes will want it, so it's added here as well rather than
  making this lane depend on that branch merging first) — plus the
  phone-stacking media rule below.

## A build-time fix (SEEN, then fixed)

First build+shot pass: at 360px, "Unlock with Weekly Intuitive" (the
Encore's locked button, the brief's own "e.g." wording) measured
**327.8px** at `kit-btn-sm` (nowrap, R-071 — button text never wraps).
The room-card's own content width at 360px is **~308px**. The button
was visibly clipped by the card's own `overflow:hidden`
(`shots467/full-card-360.png` — "UNLOCK WITH W" cut off mid-word). A
future tier rename could only make this worse (it's a live-derived
name, never a fixed length).

Fix: the visible label is now **"Unlock"** alone (117.9px, always
safe); the full sentence — "Comes with {name} and up. {price} a
month." — already lived in the row's own quiet line in plain sighted
text, and now also rides an `aria-label` on the button
("Unlock with Weekly Intuitive") for anyone on a screen reader. Also
added a phone-stacking rule, `.room-card .kit-rows` at ≤640px (button
drops below the text, centered — the brief's own words, "rows centered
on phones"), mirroring `.kit-stage1-card`'s own existing precedent one
rule up in the same file.

Re-measured after the fix, real Chromium, `/reading` served on
:4891 — **zero overflow, both themes, all three widths**:

| width | theme | card right edge | widest button right edge | page overflow (scrollWidth − innerWidth) |
|---|---|---|---|---|
| 360 | dark/light | 338 | 288.5 ("Unlock the Q&A") | 0 |
| 390 | dark/light | 368 | 303.5 ("Unlock the Q&A") | 0 |
| 1440 | dark/light | 1238 | 1215 (right-aligned, desktop grid) | 0 |

Every button on every row measured `overflowsCard: false` and
`overflowsViewport: false` (script + full JSON output kept alongside
the shots). Text matched with `textContent`/raw HTML, never
`innerText` (CSS uppercases it — the brief's own warning).

## Shots (SEEN, not assumed)

`/tmp/claude-1000/-home-pac-dev/24e774c2-4341-4868-9ad5-ce8ddc548e73/scratchpad/shots467/`:
- `final-dark-360.png` / `final-light-360.png` — full page, signed out, post-fix.
- `final-dark-390.png` / `final-light-390.png` — same, 390px.
- `final-dark-1440.png` / `final-light-1440.png` — same, 1440px.
- `card-1440-clip.png` — a tight crop on the card at 1440 (the cleanest look at all three rows together).
- `full-card-360.png` — the PRE-FIX shot, kept as the evidence for the clipping bug above.

All shots are the SIGNED-OUT state (the worst case: every row's
non-entitled/anonymous branch shows at once). Signed-in and entitled
states are covered by `ReadingDayBody`'s own renderToStaticMarkup
pins (`tests/reading-day-467.test.ts`) — the brief's own instruction:
"Don't try to mint sessions."

Note on the price lines: this dev server has NO seeded
`data/store-catalog.json` (a clean checkout, per house convention — the
catalog is gitignored dev-only), so `encoreFloor.price`/`qaOffer.price`
both read `null` in these shots and the quiet price lines correctly
render nothing (never a dash). The pure-body tests exercise the
price-present states directly with a mocked `getItem`.

## Pins re-trued

None. `tests/reading-page.test.ts` (the house law suite for `/reading`)
passes unchanged — the one new import/section doesn't touch any pinned
line, and the "no tier or payment logic" / no-literal-weekday / kitx-
class-count pins all still hold. `tests/reading-playground.test.ts`,
`tests/reading-buttons-phone-463.test.ts`, `tests/reading-look.test.ts`,
`tests/reading-stage.test.ts`, `tests/stage2-access.test.ts`,
`tests/stage2-paid-door.test.ts`, `tests/stage2-route.test.ts` all still
pass unchanged (checked directly, not assumed).

## Kit classes reused / new CSS

Reused, zero page-local CSS: `card room-card` (the Heart Field brick's
own shell, `PackageRoomsCard.tsx`'s literal classes), `kit-h2`,
`kit-rows`/`kit-rows-end` (`Stage1Card.tsx`/`Stage2Details.tsx`'s own
"one row, one control on the right edge" grid), `kit-btn kit-btn-main
kit-btn-sm` (the one button size, every button on the card), `kit-field-
error` (the unlock button's own failed-add message).

New CSS, both in `src/app/kit.css`:
1. `.kit-lock-icon{display:inline-block;margin-right:6px;vertical-
   align:-2px}` — spacing/baseline for the inline lock svg only, no
   colour of its own (`currentColor`). Shared verbatim with TASK-466's
   own lock (same rule, same reason — see that lane's own kit.css diff).
2. `@media (max-width:640px){.room-card .kit-rows>li{grid-template-
   columns:1fr;gap:8px;text-align:center}.room-card .kit-rows-end{
   justify-self:center}}` — the phone-stacking fix above, scoped to
   `.room-card` so `Stage2Details`' own two-column short prices (and
   `.kit-stage1-card`'s own 768px rule) are untouched.

## The Admiral's-hands list

1. `q-a-meetup-with-love` is kind `"digital"` today — **buying it grants
   NO room access** on its own. The Q&A row's "Unlock the Q&A" button
   adds it to the basket honestly (a real purchase), but nothing in this
   lane or any other grants a tier or a room from it. To make the
   purchase actually open the Evening Star room, the Admiral needs to
   turn it into a tier-C package with a window (the brief's own words:
   "a 3-day window") in `/a/store` — until then, a buyer pays and gets
   the digital item only.
2. TASK-465 moving `STAGE2_MIN_TIER` from `"A"` to `"B"` needs no change
   here — `encoreFloorDoor()` reads the constant and `TIER_PAGES` live;
   the Encore row's name/price/item id all follow automatically.
3. TASK-468's email box needs `id="sign-up"` on `/reading` — this lane's
   Row 1 signed-out button links `#sign-up` and pins that literal anchor
   in its own test (`tests/reading-day-467.test.ts`, `href="#sign-up"`).
   If TASK-468 names the id anything else, Row 1's button silently does
   nothing on click; check it lands.
4. Once real store items exist for `weekly-intuitive` (or `observer`
   after TASK-465), `q-a-meetup-with-love`, and `evening-star`, the
   quiet price lines on `/reading` will show real prices — they show
   nothing right now on a clean dev checkout (see the shots note above),
   which is correct, not broken.

## Obstacles

1. **The label overflow** (see above, "A build-time fix") — found only
   by actually rendering and measuring in Chromium, not by reading the
   brief's own "e.g." example literally. The brief's suggested wording
   ("Unlock with Observer") is a real overflow risk for ANY tier name
   longer than roughly "Observer" itself on a 360px phone; future
   builders reusing this pattern elsewhere should measure before
   shipping a `kit-btn-sm` with a live-derived name inside it, not
   after.
2. **Puppeteer's ESM entry path** — the brief names `puppeteer` under
   `/home/pac/dev/apps/puck-studio/node_modules/puppeteer`; that
   package's `package.json` exports map resolves the bare specifier to
   `lib/esm/puppeteer/puppeteer.js` (not `.../node.js`, which doesn't
   exist in this version) — a plain `import puppeteer from
   ".../node_modules/puppeteer/lib/esm/puppeteer/node.js"` throws
   `ERR_MODULE_NOT_FOUND`. Used the `puppeteer.js` path instead; noting
   it here so the next lane doesn't rediscover it the hard way.
3. **No `data/store-catalog.json` in this checkout** (expected, per
   house convention — memory: "catalog push to prod needs the Admiral
   operator session; `data/store-catalog.json` is gitignored dev-only")
   — meant the live shots show no price lines. Confirmed this is the
   honest "derive-or-omit" behavior via the mocked-`getItem` unit tests,
   not a bug in the shots.
4. No blocker reached the Admiral's hand beyond the four items above —
   this lane's own scope (the brick + its two doors) is otherwise
   complete and gated green.

## Gate

`~/dev/shortcuts/oc-gate.sh /home/pac/dev/worktrees/task-467` (run bare,
after every change, last run on HEAD `044d7e2`):

```
Test Files  238 passed (238)
     Tests  3031 passed (3031)
scripts/calendar-view.test.mjs: 70 passed, 0 failed
scripts/cartridge-identity.test.mjs: 179 passed, 0 failed
scripts/console-matrix.test.mjs: 14 passed, 0 failed
scripts/fixture-kv.test.mjs: 45 passed, 0 failed
scripts/square-payments.test.mjs: 58 passed, 0 failed
eslint 0
tsc 0
build ok
GATES GREEN
```

## Number One's review fixes (block 968,561)

After seeing the shots:
- **The Encore button read just "Unlock" beside "Unlock the Q&A".** It now reads "Unlock the Encore", the same shape as the Q&A button. The aria label is "Unlock the Encore with {floor}".
- **A locked row said nothing about who it was for when the store gave no price.** The shots were blank, since there's no local catalog. Now the Encore row always says "Comes with {floor} and up.", and the price is added when known. The Q&A row always names Evening Star (a link), with its price when known.
