# work-claim — task-355 (OC site chrome trio: basket badge, basket icon, the signed-in "Create your account" door)

Lane: home crew (Number One sonnet sub-agent). Base = onecocreation main
**2045d56cadcf55b88611d080a5334a9b44398633** (T-350 merged, OC PR #23, archived). Branch
`feat/task-355-chrome-trio`. Worktree cut by Number One, `npm ci` already run there (clean at
cut). Lane ports **4534–4537**. GO: `~/dev/home/inbox/TASK-355-oc-chrome-trio.md`. Cut from the
Admiral's own walk of the live site (block 967,906). RULED by the Admiral (block 967,907) +
REVIEW-K86 (Ms. Kimi, folded at block 967,911) both SUPERSEDE the brief's own D1/D2 option lists
and its old "Build A step 2 expected shape" — this claim follows the RULED blocks only.

Three small chrome fixes from one walk, one PR:

**A. Basket badge.** The "block" the Admiral saw is a CSS clip, not a neighbor or a stacking
bug: `house.css` clips the basket link's own box (the TASK-258 name-ellipsis rule, desktop; the
phone tail rule) and the badge sits outside that box (`top:-6,right:-8`). Fix: the BasketChip
`<Link>` gets a new class `basket-chip`; ONE carve-out rule per breakpoint in `house.css`
(`.nav-tail a.basket-chip{overflow:visible;max-width:none}`) lets the badge through — nothing
else in `house.css` changes. Display caps at `99+`; the screen-reader line keeps the true count
(the count can be legitimately large — `mergeCarts` in `src/lib/cart.ts` has no cap on lines
absorbed at sign-in; that data layer stays READ-ONLY this lane by design, a follow-up cuts the
cap).

**B. Basket icon — D1 = redraw (RULED).** The bag SVG is replaced with a woven hand-basket, an
arched handle (the Red Riding Hood basket Love envisioned), rose ink `#E7B2C3`, the same 17px
box. Two states: empty (count 0) and filled (count > 0 — a small peeking shape rides over the
rim, under the handle's arch). No emoji — the store buttons' `Add to basket 🧺` text is
untouched, out of this lane's OWNS. The stale T-121 comment is rewritten in the same commit:
Love liked the emoji; the bag swap was the Admiral's own taste, not hers; this redraw is his
ruling.

**C. AccountDoor — D2 = (a) (RULED).** A signed-in member on `/about` no longer meets "Create
your account ✨" — a new session-aware client component, `AccountDoor`, reads
`useMemberSession()`. `!checked` → the WelcomeFlow `—` idiom (no flash of either door); signed
in → `Go to your page →` to `/me`; signed out → the original `Create your account ✨` to
`/welcome`, unchanged. The link keeps `ABOUT_PINK_DOOR`. Registered as a NEW Puck block,
`src/lib/puck-blocks/account-door.tsx`, following the CURRENT `login-door.tsx` factory shape
(`createXxx()` + `BuilderMarker`) — not the pre-T-350 bare `{ id }` shape the brief's own D2
paragraph still cited; AccountDoor carries no Puck fields. Registered in `puck-config.tsx` and
mirrored in `copilot.ts` (the `KEEP IN LOCKSTEP` law). Mounted in `about/page.tsx` (replacing
the one hand-built Link) and swapped into the about SEED's matching `buttons([...])` entry in
`puck-seeds.ts` — that same edit also drops the seed's stale second entry, "ConsciousCuts &
Waxing ✂️" (TASK-128 already retired that door from the hand-built page; the seed had drifted).
A published `/about` doc in KV still needs a re-publish after merge to pick this up (a hand-off,
not a build step — noted in the brief's own item 8).

## OWNS

`src/components/BasketChip.tsx`, NEW `src/components/AccountDoor.tsx`, NEW
`src/lib/puck-blocks/account-door.tsx`, `src/app/about/page.tsx` (the one link), `src/lib/
puck-seeds.ts` (the one about `buttons` entry), `src/lib/puck-config.tsx` (register the block —
a pre-allowed seam, one line), `src/lib/copilot.ts` (mirror the new block, the LOCKSTEP law),
`src/app/house.css` (the two carve-out rules only), NEW `tests/chrome-trio.test.ts`, NEW
`work-claims/task-355.md` (this file, first commit).

READ-ONLY (per brief): `src/app/api/cart/**`, `src/lib/cart.ts`, `src/components/SiteHeader.tsx`,
`src/components/store/**`, `src/hooks/useMemberSession.ts`, the kit, `src/app/welcome/**`,
`scripts/shots-fixture.cjs`.

NOT: the kit migration, a cart rewrite, an edit of any published Puck doc in KV.

## Gates

`npx vitest run` · `node scripts/calendar-view.test.mjs` · `node scripts/
cartridge-identity.test.mjs` · `node scripts/square-payments.test.mjs` · `npx eslint .` ·
`npx tsc --noEmit` · `npx next build`. `package-lock.json` unchanged (no new dependency).

## Shots

Number One walks it in Chrome against the lane's own build + fixture KV: header with 1 / 12 /
120 items at 1440 and 390; `/about` bottom signed out and signed in. The harness script
(`scripts/shots-fixture.cjs`) is not run inside this session — the law guard refuses it; by-hand
steps for the Admiral's own walk are in the lane's `SUMMARY.md`.

## Cut note

Stamp: 0018.07.02 a₿, block 967,911 (REVIEW-K86 folded, the block this claim was lifted at).
