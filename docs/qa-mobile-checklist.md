# Mobile QA checklist — the clock pages (/time, /bday)

The half-wheel and the orrery are canvas instruments: they don't reflow like
text, so layout bugs hide at sizes nobody happened to try. Every visual change
to a clock page walks this list before it ships. Started 2026-07-27 after the
admiral caught three of these at 140% zoom.

## Viewports (browser dev tools + at least one real phone)
- [ ] 320 × 568 (smallest supported)
- [ ] 390 × 844 (common phone)
- [ ] 430 × 932 (large phone)
- [ ] ~700 × 800 (the awkward middle: wide but below the md breakpoint —
      regression: huge sun + crushed rings, fixed by the 560px column +
      sun-yields-to-band law)
- [ ] landscape phone (short height — the band clamps, sun floors at 88px)

## Zoom & accessibility (the admiral's catch)
- [ ] Browser zoom 140% and 175% — effective canvas can drop BELOW 320px.
      Regressions found at 140%: relation line wrapped ragged, "to the turn"
      truncated, chevrons crowding the card text.
- [ ] Phone OS text-scale / display-scale turned up (Android font size XL,
      iOS Larger Text) — same class of squeeze.
- [ ] prefers-reduced-motion: the 1s repaint must stay off; page still shows
      a correct (static) reading.

## The sun card (tap each ring, worst offenders first)
- [ ] GENERATION and OLYMPIAD (longest relations) — relation fits or wraps
      cleanly, never ellipsizes mid-word.
- [ ] LAST SAT — "…blocks left" line fits (largest numbers on the dial).
- [ ] No text crosses the sun's left rim at ANY size (rim-aware budget law).
- [ ] Chevrons sit clear below the last card line; tap targets ≥ 44px.

## The wheel
- [ ] Ring labels ladder readable; label fades while its own ball passes.
- [ ] All 13 sign seats present (Capricorn bottom edge, Sagittarius top edge —
      the belt pads inward so neither clips).
- [ ] Balls: no zeros (percent shows instead), month says 1–13, year says the
      year ordinal, last sat says % of road walked.
- [ ] Corner pills legible over passing rings (solid backdrops).

## Data honesty
- [ ] Node unreachable → block pill and date wear the ~, page never blanks.
- [ ] Height rollover (new block): balls, arcs, and pills all tick together.

## Known conventions (don't "fix" these)
- Ring order: second, minute, block, hour, day, week, fortnight, month, moon,
  year, olympiad (= the halving, 210,000), generation (= 6 halvings,
  1,260,000), last sat (6,930,000).
- Units abbreviate in the card (secs/mins); ring labels stay full words.
- Desktop ≥ md keeps the 360° orrery; the half-wheel is the below-md telling.
