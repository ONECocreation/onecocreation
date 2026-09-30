# TASK-494 register — members-only letters stay members-only

Branch `feat/task-494-letters-safety`, base
`c8af298242fa97874bde668193ba51c2494f7c3b` (T-491's LANE-DONE tip —
this lane STACKS on T-491; its letters.ts edits, the `!cta:` default
body in LETTER_DEFAULTS and all senders rendering through letterHtml,
are in this base).

## What changed, and why

(Running log — filled as the lane builds.)

- Claim commit first: this register and `work-claims/task-494.md`
  (OWNS verbatim from the brief).
- Red-first: `tests/letters-safety.test.ts` (27 pins at red, 28 after
  the wiring pin was added during the build) — 21 failed / 6 passed on
  the base, the 6 passing being the already-true neighbors
  (audienceOf's fail-closed, T-227's literal-text shapes, the admitted
  directive URL shapes). Committed alone as the red evidence.
- `src/lib/letters.ts` — three additive pieces, the rest of the file
  untouched: (1) `letterAudienceGate({ audience, signedIn, isMember,
  operator })` + `LetterGateVerdict`, the ONE pure truth table, beside
  `audienceOf`; (2) `escHtml` (the house's esc shape + `<`/`>`),
  bodyToHtml's escape pass now rides it so `"` becomes `&quot;` before
  the attribute-writing regexes see it; (3) `admitsDirectiveUrl`
  (single-`/` site path or explicit https:// ONLY, the T-227 rule at
  the directive boundary per T-491's security review) and every
  directive field escaped at the `letterHtml` parse site — a failed URL
  drops the WHOLE directive line into the plain body as literal text.
- `src/app/letters/[key]/page.tsx` — the page-local `letterGate`
  wiring (session + operator from the cookie header, tier read in
  try/catch failing CLOSED, verdict from letterAudienceGate alone),
  applied in the page (`notFound()` on the gated path) AND in
  `generateMetadata` (generic `Letters — One Cocreation` title, the
  subject sealed).
- `src/app/a/letters/page.tsx` — `sandbox=""` on the preview iframe,
  the one-attribute change the claim owns.

## Friction

- Two oc-gate runs went RED before the green one — operator error, not
  the tree: the gate script defaults its target to
  `/home/pac/dev/onecocreation` and the first two invocations passed no
  argument, so they gated the MAIN checkout (its own pre-existing
  reading-letters flake and font-fetch failure), never this worktree.
  Run with the worktree path explicit: GATES GREEN on the first pass.
  Side effect owned: the mis-targeted runs ran `npm ci` in the main
  checkout (its lockfile law) and left `node_modules/.gate-lock.md5`
  there — benign, reported, not cleaned (not this lane's tree).
- Three pins needed re-aiming during the build (an over-strict
  `<img`-absence that collided with the brand shell's logo; two source
  pins that sliced around the page-local `letterGate` wiring instead of
  pinning it). Test-side re-aims, recorded in SLOP; the build itself
  never moved to satisfy a pin.
