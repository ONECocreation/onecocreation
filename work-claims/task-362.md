# work-claim — task-362 (OC · one-moon correction, Lane D — words + wall time, not tiers)

Lane: home crew (Number One sonnet sub-agent). Base = onecocreation main
**326dac16e0724b579bd9cba2cdb95d4a5fb739ef** (T-357 merged, PR #28 — cart-merge-cap;
touched no BFT/moon/certs file, anchors re-grepped clean on it). Branch
`feat/task-362-one-moon-oc`. Worktree cut by Number One, `npm ci` already run there.
Lane ports **4550–4553**. Brief: `~/dev/home/inbox/TASK-362-oc-one-moon-lane-d.md`.
RULED by Number One at verify, block 967,918.

The Admiral retired the two-moons doctrine (0018.07.02 a₿): "we only have one moon. and
we can see it outside." The 28-day BFT month is a block count and never wears the moon's
name; the moon is the sky's, from wall time, labeled. OC's cert tiers are DORMANT
(certs unmounted, no live minter) — this lane corrects the false words in `bft.ts` and
`certs.ts` (moon-is-block-timed, new-year-is-always-a-new-moon, CRYSTAL/SILVER prose)
AND threads wall time (`atMs`) through the `moonPhase` calls so the dormant/live code
reads honestly from the same clock its own docblock already promises. `certCase` and
`bftScene` both gain an **additive-optional** trailing `atMs` param, forwarded to
`moonPhase(height, atMs)` — omitted behaves byte-identically to today (native `undefined`
falls through to `moonPhase`'s own default). Per Number One's RULED block, decision 4
(the `scene.ts`/`bftScene` call-site fix) IS in scope and IS built: `scene.ts`'s
`bftScene` is the one **live** caller (via `BuddyDevice.tsx`'s garden backdrop), so this
is a visible-on-production fix — the garden's moon glyph moves to the real sky, matching
the footer label it already agrees with in spirit but not in clock. `BuddyDevice.tsx`'s
own footer-label call site (`moonPhase(currentBlock, nowMs)`) was already correct and is
untouched; only its `bftScene(bgHeight)` call gains a second argument. `nowMs` (React
state) is not usable at that call site — the rAF loop's closure is fixed at mount
(`[buddy.bornBlock]` deps) and never sees later `nowMs` updates, unlike the refs
(`blockRef.current` etc.) that same loop already relies on for freshness — so the fix
uses `Date.now()` there instead, called once per new block (when the scene is
recomputed), not once per frame. The one "two-moons" doctrine phrase inside the OC-owned
copy of `transplant/frens-earth-time/.../orrery-engine.ts` is renamed to "moon-month" —
narrow wording only, no touch to that file's own correctly-named `MOON` ring or its
drawing.

Do NOT build `etchedAtMs`. Do NOT open a tier-design round. Do NOT take it to Love. Cert
tier boundaries are untouched — only the clock the tiers read from and the words
describing them.

## OWNS

`src/lib/bb/bft.ts` (comments/docblocks only — header `:8-9`→one-moon wording, the stale
superseded one-lunation-per-month line above the real sky-anchor docblock deleted,
`yearAnimal`'s docblock; NOT `moonPhase`'s function body/signature, already correct),
`src/lib/certs.ts` (header-comment tier table wording, `certCase`'s docblock + signature
`certCase(height, atMs?)` + its `moonPhase(height, atMs)` call, the CRYSTAL `why` string),
`src/lib/bb/scene.ts` (`bftScene`'s docblock + signature `bftScene(height, atMs?)` + its
`moonPhase(height, atMs)` call), `src/components/bb/BuddyDevice.tsx` (one call-site
argument-list change only — `bftScene(bgHeight)` → `bftScene(bgHeight, Date.now())`, plus
the comment explaining why `Date.now()` and not `nowMs`),
`transplant/frens-earth-time/components/time/orrery/orrery-engine.ts` (the one
"two-moons" → "moon-month" phrase, no other edit), NEW `tests/one-moon-calls.test.ts`,
`work-claims/task-362.md` (this file, first commit).

READ-ONLY (per brief, untouched): `src/components/CertCase.tsx` (single-arg
`certCase(cert.etchedAt)` call stays — it's unmounted, nothing to thread `atMs` from),
`src/components/MemberProfile.tsx` (both hits are no-edit — the empty-shelf legend copy
is not currently false, just inherits the clock bug until a live minter appears),
`src/lib/shiplog.ts` (append-only historical record, never rewritten),
`tests/certcase-brand.test.ts`, `tests/brand-faces.test.ts` — pass unedited.

## Gates

`npx vitest run` · `npx eslint .` (or the repo's lint script) · `npx tsc --noEmit`.
`npx next build` NOT run here — Number One's gate does that.
`~/dev/shortcuts/oc-gate.sh <worktree>` → GATES GREEN, fail-closed, at merge time
(Number One's, not this lane's).

## What is NOT in this lane

No `etchedAtMs`. No tier-design round (SILVER's sliding sky window is a pre-existing
consequence of the 0018.05.18 re-anchor, not touched here). No message to Love. No edit
to `CertCase.tsx`, `MemberProfile.tsx`'s legend copy, or `shiplog.ts`'s historical
entries. No touch to the orrery's `MOON` ring, `moonAt`/`moonFracAt`, or any redraw —
wording only. No UI/visual redesign — the garden backdrop's moon glyph moves to match
reality; nothing is restyled.

## Cut note

Stamp per the brief's trace + Number One's RULED block, block 967,918 (the block the
Admiral's ruling and the scene.ts decision were both confirmed at).
