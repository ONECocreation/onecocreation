# work-claims/task-400.md — task-400 (ONE Cocreation: the dawn follow-on for the sections.tsx surfaces — 396's held seam, settled by ground)

Lane: the home crew (Sonnet builder, under Number One's gate). Base = onecocreation main
**b12a09d24ebae533fc44ab77dfdfb92222687a61** (`git rev-parse HEAD` on this worktree matched
this sha exactly before any commit — no merge needed, the branch was cut at the tip). Branch
`feat/task-400-dawn-follow-on-sections`. Worktree `~/dev/worktrees/task-400` (cut by Number
One), `npm ci` already done. Lane ports **4686–4689**. Brief:
`~/dev/kimi/inbox/TASK-400-oc-dawn-follow-on-sections.md`. Claimed at block 968,142 (Number
One's cut, hold released — TASK-398 merged as #49, main re-grepped); this claim written at
block 968,146 (house beacon, fresh read).

The ground correction (K98 Ask 2's premise, corrected): none of the three surfaces K98 named
(the affirmation covers, the reading-book image, the services shelf art) is a scrim problem —
`sections.tsx` carries no inline or stylesheet photo background anywhere; every photo there is
`<img>` CONTENT. Two of the three are supply-list-only (no code change — SUMMARY). The third has
a real, different defect: the services `CosmicSky` canvas (`sections.tsx:396`, inside
`#services.sky-veil`, NOT keep-dark) keeps painting `--sky-cream` (`:177`) stars once the dawn
veil (`:468`) replaces the night ground.

**AMENDMENT (block 968,142, after Astra's plan review, `walk-968036/ASTRA-REVIEW-T400.md`) —
four rulings, all folded, all SUPERSEDING the brief lines they contradict:**
- **R1** — `display:none` HIDES the canvas; it does NOT stop the animation. The rule's own
  comment, this claim, and SUMMARY all say so plainly: it hides the services star canvas in
  light mode; the component keeps animating off-screen — stilling it is another lane's (named
  seam), not this one's. Every "ends a useless rAF loop"/"stops running"/"removes an invisible
  cost" line in the original brief is WITHDRAWN.
- **R2** — "invisible" was unverified; the stars are LOW-CONTRAST (the dawn veil is a
  pink/lavender wash, not the star's own cream), not proven gone. Decision B stays RULED (hide,
  no mockup) — only the words change. This builder claims nothing about visibility beyond
  "low-contrast"; the before/after is Number One's walk.
- **R3** — the test pin is narrowed to what `tests/light-mode-photos.test.ts`'s existing
  evaluator can actually prove (it reads only `cartridge.css` and skips at-rule bodies). Two
  additive checks instead: cartridge.css's canvas-targeted `display` declarations are SOLELY
  the one new rule (a brace-balanced text scan, not the cascade evaluator); PLUS a plain-text
  guard on `house.css`/`kit.css`. Ground check on that second half, named here and in SUMMARY:
  `house.css:349` already carries `.hero canvas{pointer-events:none!important}` — a real,
  pre-existing selector that DOES mention canvas (unrelated hero styling, nothing to do with
  dawn/hiding). R3's literal words ("no selector mentioning canvas") are false against this
  ground; the guard actually built asserts the true, still-faithful-to-intent claim instead —
  neither file's canvas-mentioning selector ever sets `display` — and says so in its own name.
- **R4** — the selector's real boundary is named, not chased: it matches EVERY descendant
  canvas of any `#services` (no sky/keep-dark exclusion) and follows the DOCUMENT theme only;
  the studio preview's `.oc-pv-dark`/`.oc-pv-light` pane scopes (`:17-25`,`:245`,`:385-388`) are
  not honoured. Named in the rule's own comment and in SUMMARY's Seams — not widened.

## OWNS

- `work-claims/task-400.md` (NEW, this file, first commit)
- `src/app/cartridge.css` (ONE additive rule beside the dawn skies, after `:470` — every other
  line byte-identical; `:390`, `:456`, `:463`, `:467-470`, `:293-306`, `:509-542` NOT touched)
- `tests/light-mode-photos.test.ts` (additive only, inside the existing `source pins` describe:
  two path constants, one small brace-scan helper — explicitly NOT a second cascade evaluator,
  named as a plain-text check — and two new `it()`s; the evaluator and every existing assertion
  untouched)

## READ-ONLY and FORBIDDEN

READ-ONLY: `src/components/sections.tsx` (the ground correction — no surface there needs the
396 recipe; never opened for an edit), `src/components/ServiceCard.tsx`,
`src/components/CosmicSky.tsx` (verified whole: `display:none` on the canvas stops its PAINT,
not its rAF loop — R1), `src/components/rooms/RoomsShelf.tsx` +
`src/components/store/ShelfSection.tsx` (396's), `src/components/rooms/PackageRoomsCard.tsx` +
`src/components/rooms/RoomsShelf.tsx` (401's, live now, PR #52 — never touched), `src/app/
house.css` (398's regions; read this lane only for R3's guard, never edited), `src/app/kit.css`
(read this lane only for R3's guard, never edited), every page file.

FORBIDDEN: the custom-property/class/exemption recipe (`cartridge.css:456`'s blanket; no target
exists in `sections.tsx`); any new `style={{}}` literal; any new stylesheet; any `!important`;
hiding the hero's canvas (the rule is id-scoped precisely so it can't); a second cascade
evaluator; `DESIGN_DRIFT_WRITE` (this lane adds no new `.tsx`/`.css` file); any civil-date stamp
(block heights only).

## Gates

This builder runs, inside this worktree only: `npx vitest run` (whole suite), each live
`scripts/*.test.mjs`, `npx eslint src tests --max-warnings=0`, `npx tsc --noEmit`,
`npx next build`.

## Cut note

Ground truth as of block 968,136 (K98, first cut, drafter Ms. Kimi); HELD moved 394→398 at
block 968,138; cut on main `b12a09d` at block 968,142 (Number One; TASK-398 merged as #49, hold
released; every `cartridge.css`/`sections.tsx` citation past the lions re-pinned — confirmed by
this builder via fresh grep before any edit, all matching the brief's SUPERSEDING banner
exactly). AMENDMENT (R1–R4) landed mid-build, block 968,142, folded before hand-back per its own
instruction. This claim written at block 968,146.
