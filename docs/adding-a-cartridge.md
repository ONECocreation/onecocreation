# Adding a cartridge — a field report

TASK-09/S11, lane 3. The claim under test: a fourth cartridge can be added
by a stranger — someone who did not build the registry, the twins, or the
dressing room. The cartridge added here is `blank`: a plain template for
the next community, no invented identity, every missing piece a labeled
ASSET SLOT or an honest empty. This file records what it ACTUALLY took, in
the order it happened, including the false starts. Not what should work —
what did.

## The touch points, counted

**Three existing files touched, two files created. That is the whole recipe.**

1. **`src/brand/cartridges/blank.ts`** — CREATED. The whole non-CSS identity
   in one object, typed `Cartridge` (the derived shape — a missing field is
   a type error, so the shape enforces completeness for free). Modeled on
   `earthside.ts`/`pacman.ts`: `voices: []` where real words don't exist,
   ASSET SLOT comments on every art path, `doors.timeTipUrl: ""` (the
   shape's own documented honest empty), `nav.accent: "gold"` so
   CartridgeVars pours nothing.
2. **`src/brand/cartridge.ts`** — THREE one-line code edits: the import,
   the `CartridgeId` union (`| "blank"`), the registry entry. Plus two
   comment sweeps where the prose still said "three directions". The
   selection line itself stays `"love"` — the new entry is inert unless
   chosen.
3. **`src/app/cartridges.css`** — ONE new twin block scoped
   `html[data-oc-cartridge="blank"]` (neutral paper/ink tokens, system
   fonts, plain body ground), plus the header comment's id list.
4. **`docs/adding-a-cartridge.md`** — CREATED. This file.

No component edits. No route edits. No harness edits. No layout edits.
No new dependencies.

## What picked `blank` up with ZERO edits

Every one of these was verified, not assumed:

- **The root layout's attribute logic** — `data-oc-cartridge="blank"`
  appeared on `<html>` when flipped, and with `love` re-selected the home
  HTML carries ZERO `data-oc-cartridge` matches (curled and grepped). The
  `data-oc-theme` hits in the same HTML are the boot script's own.
- **Metadata and viewport** — the served `<title>` read
  "Blank Cartridge — A Plain Starting Point" under the flip.
- **The dressing-room validator** — proof below.
- **The Brand Board picker** — `BrandBoard.tsx` renders `choices` from the
  API's `cartridges` shelf, which the route builds from
  `Object.keys(cartridges)`. Verified by reading both ends: nothing
  enumerates ids by hand anywhere in the chain. (The board itself is
  operator-gated; the chain was verified at the code and rail level, not
  clicked.)
- **The identity harness** — `node scripts/cartridge-identity.test.mjs`
  derives IDS from the file's own `CartridgeId` union. With `blank` in the
  union it ran the per-id write loop over FOUR ids and printed
  **161 passed, 0 failed** — the 159 baseline plus the two assertions the
  fourth id generates by itself. Zero harness edits.
- **Every `cartridge` consumer** — the header/footer marks (broken-image
  alt text showing "Blank Cartridge", which is the ASSET SLOT honesty made
  visible), the hero art paths, the voices shelf (empty — nothing
  rendered), the sign-in ceremony (blank's placeholder words render on
  /login), the thank-you, the tier art.

## The validator proof — S10's claim, confirmed

S10's comment says: *"a fourth cartridge joins the validator's list the day
it joins the registry."* Exercised directly (`writeIdentityField` against a
temp copy of the real `cartridge.ts`, the harness's own discipline — the
repo's file never touched):

```
Object.keys(cartridges) = ["love","pacman","earthside","blank"]
blank in the registry's own keys: true
writeIdentityField("cartridge.id", "blank", Object.keys(cartridges)) → {"ok":true,"field":"cartridge.id","value":"blank"}
on disk: activeCartridgeId: CartridgeId = "blank";  ✓ lands
writeIdentityField("cartridge.id", "sega", …) → {"ok":false,"reason":"the cartridge is one of the registry's own: love, pacman, earthside, blank","status":400}
file untouched after refusal: true
blank → love round-trip byte-identical: true
```

`"blank"` accepted with no validator edit; `"sega"` still refused before
disk, and the refusal reason itself now names all four ids — the list is
the registry's own.

## What did NOT pick it up — the gaps, plainly

This is the payload. A fourth cartridge is "add a file + register it" for
the identity and the token pour, but NOT for these:

1. **`src/app/services/page.tsx` — the `kd()` helper is a two-way branch.**
   `activeCartridgeId === "earthside" ? earth : love` decides which literal
   gradient the keep-dark bands wear. A fourth cartridge silently falls
   into the `love` bucket, and because these are INLINE STYLES the CSS
   twin cannot reach them without `!important`. Visible in
   `blank-services.png`: the lower bands wear Love's celestial night.
2. **`cartridge.css` bakes Love's art and skies.** `.hero::before` carries
   a literal `url("/images/consciouscuts/nebula.webp")`; the four skies and
   the keep-dark law are Love's selectors. Earthside's twin overrode them
   rule by rule; a thin twin like blank's wears Love's sky. Visible in
   `blank-home.png`: the hero shows the nebula (washed over the poured
   paper) and the white light-language glyph.
3. **Page copy is not cartridge-driven.** `/services` under blank still
   says "CONSCIOUS CUTS & WAXING … CREATE AN ACCOUNT". The cartridge
   dresses identity slots — name, art, sign-in, thanks, voices, meta — not
   page prose. A stranger expecting the words to follow the cartridge will
   find them authored in the pages. Visible in `blank-services.png`.
4. **The dressing-room write rail addresses `cartridge.ts` alone.** The
   anchors match that file exactly once BECAUSE pacman/earthside/blank live
   in their own files — so with a non-love cartridge selected, the board
   READS the active cartridge's values but a write to e.g. `logo.lockup`
  lands on LOVE's object. (`cartridge.id` works — the selection line
   genuinely lives in `cartridge.ts`.) A pre-existing S9 seam, shared by
   pacman and earthside; reported, not fixed here.
5. **The theme switch keeps Love's dawn.** Blank's bare attribute is its
   plain day; the visitor's night/dawn toggle (`data-oc-theme="light"`)
   reaches LOVE's dawn repaint, not a blank twin. The same quirk earthside
   rides, from the other side. Noted in the twin's own comment.
6. **The sign-in kit's `--color-*` family** (the second `:root` block in
   `cartridge.css`) is poured by NO twin — earthside didn't either.
   LoginPanel's door inks read it, so a blank door keeps celestial ink
   hues. Known, consistent with the existing cartridges.

## False starts and surprises, in the order they happened

- **Node's type-stripping demands explicit extensions.** The first
  validator-proof run died with `ERR_MODULE_NOT_FOUND` on
  `./cartridges/pacman` — importing `cartridge.ts` pulls the registry's
  extensionless relative imports, which node's resolver won't follow. The
  proof script copies `src/brand` into the temp dir and patches only the
  import specifiers IN THE COPIES. The harness never hits this because it
  imports only `cartridge-identity.ts` (whose cartridge import is
  type-only, erased).
- **The harness grew on its own.** 159 → 161 with zero edits; the two new
  assertions are the per-id write + round-trip for `blank`.
- **No type errors occurred.** The derived `Cartridge` type plus the two
  sibling files taught the shape by example. The odd-looking
  `accent: "gold" as "gold" | "dawn"` is load-bearing in `cartridge.ts`'s
  love object (under `as const` it keeps the union detectable so
  `CartridgeShape` can special-case it) and harmless pattern-matching in
  the sibling files.
- **`pkill -f "[n]ext start" kills EVERY lane's server.** Mine died
  mid-screenshots when a sibling lane cleaned up its own. If the shots
  look wrong, check the server is yours, then retake.
- **Two comments lied the moment blank landed** — `cartridge.ts`'s header
  ("a REGISTRY of three directions") and `cartridges.css`'s header ("the
  other two voices"). Both swept. S10's claims (route + rail + harness
  headers) all proved TRUE.

## Gates, verbatim (worktree root, `love` selected, final tree)

```
npx tsc --noEmit                                → clean
npx eslint .                                    → 65 errors, 9 warnings (baseline, delta zero)
npm run build                                   → green (also green with the selection flipped to "blank")
node scripts/cartridge-identity.test.mjs        → 161 passed, 0 failed
```

Inert-on-default proof: with `blank` registered and `love` selected, the
production build's home HTML carries zero `data-oc-cartridge` matches;
nothing in the pour renders without the attribute.

## Proof shots (outside the repo — ../lane3-shots/)

- `blank-home.png` — the flip live: `data-oc-cartridge="blank"`, neutral
  nav inks, blank's `<title>`; the header mark a broken-image alt ("Blank
  Cartridge") — an ASSET SLOT telling the truth; the hero still wears
  Love's baked nebula and white glyph (gap 2).
- `blank-services.png` — gap 1 (kd() celestial bands), gap 3 (Love's page
  copy), and honest broken-image alts where the art slots point at nothing.
- `blank-login.png` — blank's sign-in ceremony live ("@YOURCOMMUNITY ·
  JOIN THE COMMUNITY", the placeholder door and footnote) on Love's baked
  page ground.

The flip was done by hand-editing the one selection line, `npm run build`,
`npx next start -p 3313`; afterwards the line was edited BACK to `"love"`
(a plain `git checkout -- src/brand/cartridge.ts` would have destroyed the
registration — the checkout revert only works when the flip is the file's
only change) and the throwaway popup-setter page was deleted.
