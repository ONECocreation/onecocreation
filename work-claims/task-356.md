# work-claim — task-356 (OC sign-in card: the Admiral's desktop walk fixes)

Lane: the home crew (Sonnet) under Number One's gate. Base = onecocreation main
`5e0afb208863b37ff083de2d8c64c409ff844eba` (T-351 merged, PR #24; mounts `SignInCard`
on `/me`). Branch `feat/task-356-signin-card-walk-fixes`. Worktree cut by Number One;
`npm ci` already done. Lane ports **4538–4541**. Brief:
`~/dev/home/inbox/TASK-356-oc-signin-card-walk-fixes.md`. Stamp 0018.07.02 a₿, block
967,913 (house beacon).

RULED (the Admiral, block 967,912; folded from REVIEW-K87, Ms. Kimi, block 967,913 —
its "OWNS is now:" line is the real OWNS, superseding the brief's own OWNS section):

- **K-a = (a).** `SignerDoors.tsx` gets an ADDITIVE `variant="card"` prop; the default
  path (DoorSheet's header sheet, OperatorGate's console door) stays byte-stable —
  `tests/pink-shimmer-doors.test.ts` and `tests/signer-doors-summary-wrap.test.ts` (both
  WATCH, not OWNS) pass unedited. Only SignInCard's Key tab (no extension) passes
  `variant="card"`.
- **K-b = (a).** Card title + tab list centred; body copy stays left (legibility
  doctrine); the email/code/name `Field`s and the main CTA `Button`s go full card width
  so their edges match.
- **THE ADMIRAL OVERRULES K83's own RULED item 3** ("on the email tab, we shouldnt have
  a button to sign in with a key... that's why we split the tabs"): the Email tab's
  second key `Button`, its quiet line, the local `emailSignerOpen` branch, and the
  now-unused local `keyNoteFor`/`KEY_NOTE_*`/`useIsAndroid` are removed. A real,
  words-only pointer ("Have a key? Use the Key tab.") replaces it — its "Use the Key
  tab." half is a kit `Button variant="quiet"` that selects the Key tab via now-
  controlled `Tabs` (`active`/`onChange`).
- **SECOND CAUSE (REVIEW-K87 item 2), rides both mounts.** NEW
  `src/lib/use-nostr-extension.ts`: one shared hook with a REAL subscribe (re-checks on
  window `load` and a ~250ms poll for ~5s, notifies only on change, cleans up on
  unsubscribe) replaces the old one-shot `useSyncExternalStore(noopSubscribe, …)` local
  to each of `SignInCard.tsx` and `DoorSheet.tsx`. `DoorSheet.tsx` moves from READ-ONLY
  to OWNS for that one swap only — nothing else in it changes.
- `src/components/door/DoorButton.tsx`'s signed-out chip: `color: "inherit"` → the
  pinned always-night ink `#ECE3C9` (REVIEW-K87 item 7, dawn `LOG IN` on the
  always-night header).

## Out of scope by design

A global `.btn-quiet`/`.btn-ghost` dawn fix in `house.css` is explicitly OUT of reach
for this lane (REVIEW-K87 item 9) — contrast for the Key tab's doors is fixed with
INLINE tokens in the `variant="card"` path only (`--ghost-bg`/`--ghost-ink`, the
house's own `.btn-ghost` pairing), never a change to the shared classes or to
`house.css` itself.

## OWNS

`src/components/door/SignInCard.tsx`, `src/components/SignerDoors.tsx` (additive
`variant="card"` prop only), NEW `src/lib/use-nostr-extension.ts`,
`src/components/door/DoorSheet.tsx` (the hook swap ONLY), `src/components/door/DoorButton.tsx`
(the one colour value ONLY), `tests/signin-card.test.ts`, NEW
`tests/nostr-extension-detect.test.ts`, `work-claims/task-356.md` (this file, first
commit).

READ-ONLY: `src/components/door/door-machine.ts`, `src/app/kit.css`,
`src/components/kit/**`, `src/components/me/**`, `src/lib/puck-blocks/login-door.tsx`,
`src/components/OperatorGate.tsx`.

WATCH (must pass unedited): `tests/pink-shimmer-doors.test.ts`,
`tests/signer-doors-summary-wrap.test.ts`.

NOT: a DoorSheet redesign (if `SignerDoors` changes, DoorSheet must look the same or
better — same default-path styles, verified by the two WATCH files staying green), a
kit change, a door-machine change, the pre-existing dawn `.btn-quiet`/`.btn-ghost`
contrast law itself.
