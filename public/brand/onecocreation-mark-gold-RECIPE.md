# One Cocreation — Gold-Coin Mark (faithful recreation)

**What this is.** A clean, scalable **vector recreation** of One Cocreation's existing
gold-coin wordmark — the flat "coin-O" logo reading **ONE Cocreation**. It is built to be a
**drop-in replacement**: same logo, crisp at any size, transparent background, dark-mode
native (the brand runs on black at all times).

> This is a **faithful recreation from a template raster** (the reference PNG), reconstructed
> by sampling the actual pixels — not a redesign. When the client's machine with the true
> source art is reachable, reconcile against it; any divergence, the original source wins.
> Do **not** confuse this with `onecocreation-badge.png`, which is a *different, elevated*
> redesign (purple→gold disc, twin stars, orbit ring) and was left untouched.

## Files
| File | What |
|---|---|
| `onecocreation-mark-gold.svg` | Full lockup (coin + star + "NE" + "Cocreation"). viewBox `0 0 451 196`. Master. |
| `onecocreation-coin-gold.svg` | Coin-only mark (ring + star, no wordmark). Square viewBox `0 0 144 144`. For favicons / avatars / template icons. |
| `onecocreation-mark-gold.png` | Raster export, 1024×445, transparent. |
| `onecocreation-coin-gold.png` | Raster export, 1024×1024, transparent. |

Both SVGs are self-contained (all geometry + gradients inline; the wordmark is **outlined
paths**, no external font needed) and validate as XML.

## Sampled palette (pulled from the reference PNG with PIL — not eyeballed)

**Gold coin — metallic gradient stops** (vertical, top-lit struck-coin):
- Specular / near-white gold highlight: `#FCF6C0`, `#FFF7CC`
- Bright bevel: `#F7DE68` → `#F6DA5A`
- Mid gold: `#D6AB3B` → `#C79A2E` → `#976E1D`
- Deep bronze edge / shadow: `#6A490F` → `#412C08`
- Dark rim lines (outer/inner bevel shadow): `#3A2706`, `#241704`

**Radiant star (inside the coin):**
- Core (near-white warm): `#FCFDF6` (sampled center) / `#FFFDF4` (drawn core)
- Inner bloom: `#FFF6C4` → `#FCE27A`
- Gold falloff: `#EDBB48` → `#C98E2B`, fading to transparent
- Long 4-point rays on axes; shorter diagonal glints; soft warm radial glow

**"NE" letters — vertical purple→gold gradient** (a signature detail of the real mark):
- Top (cap line): `#5F2779` (violet) → `#7A456C` → `#946460` → `#B0805A` (bronze) →
  `#D2A64D` → **`#EFC546`** (gold, baseline)

**"Cocreation" (purple word):** `#531F73` (medium violet; sampled cluster `#4F1D70`–`#531F73`)

**Ground:** transparent SVG; brand context is pure black `#000` ("dark mode all the time").

## Geometry (in the 451×196 reference frame)
- **Coin:** center `(115, 68)`; outer radius **69**; gold ring band **r51→r69** (~18px thick);
  ring-thickness ≈ **0.26 × outer radius**; inner "hole" (dark face + star) radius ≈ **51**.
- **Star:** long points reach **r≈37** (≈0.54 × coin radius); shorter diagonal glints **r≈20**;
  bright core **r≈5**; glow ≈ **r40**. Centered on the coin.
- **"NE":** cap top `y52`, baseline `y110` (**cap height 58**), N `x192–244`, E `x254–300`,
  stroke ≈ 8–9px. Coin right edge (~184) → N is an ~8px gap, so **coin + NE reads "ONE."**
- **"Cocreation":** cap top ≈ `y120`, baseline `y170` (**cap height 50**), `x152→446`,
  set left-tucked under the coin/NE junction, slightly looser tracking, stroke ≈ 7px.

## Font
- **Wordmark = Poppins Regular** (SIL OFL). Identified by matching the reference: geometric
  sans, **double-story `a`**, round bowls, and — decisively — cap height 50 / stroke ≈ 7px
  matched Poppins **Regular** (Medium ran too heavy at 8–10px).
- "Cocreation" is set from **real Poppins Regular glyph outlines** (converted to SVG paths via
  fontTools), so it needs no webfont and stays crisp/faithful.
- "NE" is drawn as **exact geometric vector paths** (not the font) so the widths match the
  reference precisely (Poppins caps ran ~10% narrow) and the purple→gold gradient sits cleanly.

## Fidelity
Reconstructed directly from the reference pixels: coin center/radii, ring thickness, star
proportions, letter metrics, and every color were **measured, not guessed**. An SVG-vs-reference
overlay (my mark under the reference at 50%) registers **near-perfectly** — coin diameter, ring
band, "NE", and "Cocreation" all align. The metallic ring is rebuilt as a proper top-lit struck
coin (bright bevel ridge → deep bronze shadow), which reads a touch cleaner/more premium than
the slightly softer template raster, but stays true to its gold, its proportions, and its
purple→gold "NE" signature. **Verdict: "that's our logo, cleaned up."**

*Known small liberties (documented for the reconcile):* the recessed coin face carries a very
subtle warm vignette for depth (the raster's face is flat black); the ring bevel is idealized
as an even top-lit torus rather than copying the raster's exact per-angle glints.
