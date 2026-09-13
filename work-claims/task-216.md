# work-claim — task-216 (ONE Cocreation: one header, one card style)

Lane: home crew (sonnet), one-shot. Base = onecocreation main @
**b5293b89f27139268f075137368bc4a8c78ee241** (`b5293b8`, T-215's merge — the GO header's cut point).
Branch `feat/task-216-one-header-one-card`. Worktree already cut, `node_modules` already installed.

Baseline gate (established at cut, before any change) — see SUMMARY.md for the verbatim run; expected
759/759 per T-215's own report.

## OWNS (re-grepped at cut, per T210-216-GROUNDING.md §T-216 + the GO header)
- **header** (#39, "the top headers on every page"): `src/components/SiteHeader.tsx` is already the
  ONLY nav-header component (46+ route files import it) — verified true, pinned with an import-census
  test, not re-built. The REAL variance is one level down: eight pages hand-roll the exact
  `<p className="kicker">…<h1 className="stack-hero">…<div className="constellation">` markup that
  `src/components/StackedHero.tsx` already exists to own — `src/app/book/cuts/page.tsx`,
  `src/app/book/page.tsx`, `src/app/cart/page.tsx`, `src/app/contact/page.tsx`, `src/app/me/page.tsx`,
  `src/app/about/page.tsx` (its FIRST hero only — the two mid-page `h2.stack-hero` section dividers are
  a different, already-shared use of the class and are left alone), `src/app/login/page.tsx`,
  `src/app/classes/page.tsx`. All eight converge on `<StackedHero>`; `StackedHero.tsx` gains a `"rose"`
  tone and an optional `kickerTone` prop so /classes' genuine two-rose-line title (Love's own content
  choice, TASK-156) rides the ONE component instead of a duplicate inline copy. `src/app/house.css`
  (`.stack-hero`/`.kicker` rules) gains `.sh-rose`/`.kicker-teal` to carry that choice as a named rule,
  not an inline override.
- **classes + community card rules** (#37): `src/components/rooms/PackageRoomsCard.tsx` is the one
  real outlier — its `.card` wears ad hoc inline `padding` (compact vs. not) instead of the shared
  stylesheet; `CommunitySpotlight.tsx` and the home teaser (`sections.tsx`) already wear the plain
  `.card` (T-215 landed that). Moving the padding into `house.css` (`.room-card`/
  `.room-card[data-compact]`) is the "outlier absorbed" fix — the existing literal
  `className="card room-card"` string stays untouched (T-215's `two-card-colors.test.ts` asserts it
  verbatim; a data attribute carries the variant instead of a template-literal class so that test
  keeps passing).
- **dark grounds re-swap** (#12): `src/app/cartridge.css` — `main .keep-dark{…}` (L390-392) pins eight
  tokens but NOT `--band-1/2/3`; two keep-dark surfaces read `var(--band-2)` in their own background
  formula (`house.css`'s `.hero` L251-252, and `.about-story-sky` L603) and leak the dawn lavender
  `--band-2` value at their gradient's last stop. Root-cause fix: add the three `--band-*` night
  values to the `main .keep-dark` pin. Also `cartridge.css` L412's
  `html[data-oc-theme="light"] .hero::after{…}` repaints the home hero's bottom fade cream even though
  `.hero` is ALWAYS `keep-dark` (sections.tsx never uses `.hero` without it) — add the same
  `:not(.keep-dark)` exclusion every other repaint rule already carries. Found in the same sweep:
  `src/components/PopupHost.tsx`'s hand-carried `POPUP_NIGHT_PINS` (needed because the popup portals
  outside `main`, so it can't inherit `main .keep-dark`) still pins `--gold-deep:"#D9B24E"`, the value
  T-121 retired — `main .keep-dark` itself already pins `#E7B2C3`. A real one-generation drift,
  exactly what "pin with a test so it cannot drift a third time" is for. All three fixed + a parity
  test that reads both files so a future edit to one without the other fails loud.
- **/style centering** (#15): NOT a CSS rule — `src/lib/board-sample.ts` L72 sets
  `align: "left" as const` on the sample's Buttons block (the "book a reading" / "learn more" row);
  every other block on the page is deliberately left (the type ladder, the panel) so this is the one
  line that diverges from the ask. One-line data fix, not a specificity hammer — the align renderer
  itself lives in the vendored `@pacsarcade/puck-config` (Seams, not OWNS, per the grounding).
- **the free-meditation pop-up** (#14): `src/lib/puck-popups.ts`, `src/components/PopupHost.tsx`,
  `src/app/page.tsx`. Audited: the mount is unconditional on `/` (`<PopupHost/>` always renders),
  `DEFAULT_POPUP_TRIGGERS["free-guide"].pages` already includes `"/"`, `SEEDS["popup:free-guide"]`
  already has content, and the operator panel (`PopupsPanel.tsx`, read-only) always writes a complete
  4-field trigger object (no partial-merge risk in `mergedPopupTriggers`). No OC-owned code defect
  found. The one concrete, testable improvement: the match condition
  (`enabled && pages.includes(pathname)`) lives inline in a client effect — pulled out to a pure
  `popupShouldFireOn()` in `puck-popups.ts` so "test the trigger condition" is literal, not aspirational.
  If it is still not firing on the live site, the KV override for `free-guide` (edited from the
  Style→Popups panel) is the remaining place to look — flagged here, not silently assumed fixed.
- **seam landed**: `src/components/store/FreeMeditationCard.tsx` — T-215's named one-line diff
  (`flip-card` → `flip-card item-flip`), its `.item-flip` CSS already shipped in T-215's `house.css`.

NOT page content copy (T-211's words), NOT the reading-door layout (T-213), NOT the Community door
check card (`/a/site`, out of scope per the GO header), NOT `@pacsarcade/puck-config` (vendored,
Seams only).

## OWNS exits
- No minimal-forced-edit exits taken. `@pacsarcade/puck-config`'s align renderer (the /style seam) is
  flagged under Seams, untouched.

## Findings — filled in as build proceeds; see SUMMARY.md
