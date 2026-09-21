# work-claim — task-358 (OC · the /me constellation: real stars, not decoration)

Lane: home crew (Number One sonnet sub-agent). Base = onecocreation main
**68c227e40820ce8a6ef7889ff0aa4b9c665aea36** (T-362 merged, PR #29 — re-pinned at block
967,926; anchors re-grepped on it at lift). Branch `feat/task-358-me-constellation`.
Worktree cut by Number One, `npm ci` already run there. Lane ports **4546–4549**
(re-grepped against every `work-claims/*.md`'s own ports line at cut). Brief:
`~/dev/home/inbox/TASK-358-oc-me-constellation.md`. RULED by the Admiral, block 967,926:
D5 = (a) sweep-first, atomic `SET … NX` reservation + value-guarded release; D6 = (a)
explainer at `/me/your-key`, key star stays present-but-unlit for email members, `href`
never `/login`. Named decision 1 = (a) (`ConstellationCard.tsx` calls `useNostrProfile`
itself). Named decision 2 = `/welcome` (the recommended path).

Every star on a member's `/me` page now either does something real or isn't shown at
all — "open the school portal" is dropped (arcade residue, Love gives no classes) and
"connect a zap wallet" is hidden (no NWC code exists anywhere in this repo). "Dress your
profile card" now lights from the same live kind-0 signal `MePanel`'s `ProfileEditor`
already reads, instead of a hardcoded `false`. "Hold your own key" stays present and
unlit for email members, per the Admiral's block-967,919 ruling, its link now opening a
new plain-words explainer at `/me/your-key` instead of `/login`'s second-unlinked-session
trap. A new claim form on `/welcome` lets an email member reserve their
`@onecocreation` community name for real — a one-time read-only duplicate sweep runs
first, then an atomic `SET accountname:<want> <holder> NX` reservation (refusing a name
already held by another email member OR a live key handle), with a value-guarded release
of the old name on a rename.

## OWNS

- `src/components/me/ConstellationCard.tsx`
- `src/components/welcome/WelcomeFlow.tsx`
- `src/app/api/member/profile/route.ts` (SET-NX reservation + key-handle refusal + value-guarded release)
- `src/app/me/your-key/page.tsx` (NEW — the explainer route)
- `scripts/account-name-dupe-sweep.mjs` (NEW — one-time, read-only duplicate sweep; committed for reviewability, run BEFORE the enforcement commit ships)
- `tests/me-constellation-stars.test.ts` (NEW — stars + the 409 path with NX-extended KV mock + deliberate registry fixture)
- `work-claims/task-358.md` (NEW)

READ-ONLY (per brief, untouched): `src/app/api/member/session/route.ts`,
`src/app/api/me/letters/route.ts`, `src/hooks/useNostrProfile.ts`, `src/components/me/MeSwitch.tsx`,
`src/components/me/MePanel.tsx`, `src/components/me/EmailMemberPanel.tsx`,
`src/components/me/MemberCalendar.tsx`, `src/components/me/MemberQuickCards.tsx`,
`src/components/kit/Field.tsx`, `src/components/kit/Button.tsx`, `src/app/classes/page.tsx`,
`src/components/door/DoorSheet.tsx`, `src/components/door/SignInCard.tsx`,
`src/lib/registry.ts`, `src/app/api/member/availability/route.ts`,
`src/app/api/member/claim/route.ts`, `tests/welcome-page.test.ts`,
`tests/me-signed-in-tabs.test.ts`, `tests/me-signed-out.test.ts`,
`tests/member-rename.test.ts`, `tests/money-preference.test.ts` — all pass unedited.

## Gates

`npx vitest run` · `npx eslint src tests --max-warnings=0` · `npx tsc --noEmit` ·
`npx next build`.

## What is NOT in this lane

No new community stars (bookings, membership, Heart Field, offerings) — named as a
follow-up lane (ledger id 366). No touch to `/classes` itself. No NWC/wallet-connect code
of any kind. No real email→key linking route or UI — the explainer names it as coming,
does not build it. No change to `/api/member/profile`'s SHAPE validation. No change to
`MeSwitch.tsx`/`MePanel.tsx` (Named decision 1(a) taken). The email→key `claim` reverse
refusal is the linking lane's, not this one's.

## Cut note

Stamp per the brief, block 967,926 (the block D5/D6 were CLOSED at).
