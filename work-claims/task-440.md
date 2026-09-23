# work-claim — task-440 (OC · M · the studio-key leak fix — Saturday-critical, LIVE LEAK)

Lane: the home crew (Ms. Kimi's builder, K118 queue position 2, under Number One's gate). Base =
onecocreation main **5828cd088fc267eab1c8a05241346ce9509fae6e** (confirmed by `git rev-parse HEAD`
in this worktree). Branch `feat/task-440-studio-key-leak`. Worktree cut by Number One at
`~/dev/worktrees/task-440`, `npm ci` done before hand-off. Lane ports **4810–4813**. Brief:
`~/dev/kimi/inbox/TASK-440-oc-studio-key-leak.md` (block 968,222); design of record
`~/dev/briefings/reading-flow-968215/DECISION-stage1-968220.md` + FACTS-leak-fix +
VERIFY-astra-one-way (V 1.1, 4.3, 4.5). The brief SUPERSEDES the sheets' earlier rail-and-door
gate: the Admiral ruled at block 968,222 — *"let's make it dark so no one gets the pssword."*

What the lane builds, THREE PARTS IN ONE MERGE (any two without the third leaves the leak open):

1. **The signed invite for Love's studio room.** NEW `src/lib/studio/invite-token.ts` (house
   expiring-HMAC shape, `<exp>.<hex sig>`, MAC payload `studio-invite|<room>|<exp>`, TTL 7 × 24 h,
   trimmed `SEAT_SECRET`, fail-closed). `room-access.ts` gains `standing` + one admission decision
   `studioEntryAllowed` (standing → operator or verified invite; a member session alone NEVER opens
   a standing room; a local protected-room list keeps the standing studio's underscore AND hyphen
   identities protected through a registry outage). The page gates BEFORE the mint: denied → the
   closed card ("This room opens with Love's invitation. If your link has stopped working, ask
   Love for a fresh one."), no frame, no key, no prejoin form. The verified invite survives Join
   via a hidden input; never echoed unverified; never in the VDO frame URL.
2. **`/rooms` carries NO key at all.** The derivation at `rooms/[slug]/page.tsx:122` and the
   client key prop at `:211` are REMOVED; the named-camera branch mints no keyed link; no
   key-producing helper is called. Heart Field's VDO stage goes dark — no replacement unkeyed
   broadcast, no rail/door/live exception. Room admission, Matrix chat and Stage 2 unchanged;
   `meeting.rail` NOT flipped.
3. **The label-bump rotation.** `live.ts:132` derives `studio-room-key:v2:${room}` (12 hex,
   ledger line "v1 retired: minted anonymously through /meet/studio until T-440").
   **`SEAT_SECRET` is never touched.**

Plus: every standing-studio guest door signed (`a/studio/page.tsx:122`, the emailed invite
`invite/route.ts`, and the go-live card's door via a new required `studioGuestDoor` prop plumbed
through `StudioHub.tsx:163-170` — never signed client-side), and the normalized co-create name
`studio` reserved at the builder ("That name is reserved for Love's studio.", no unsigned copy
action). Any touched /a row follows the /a uniformity law (block 968,222): one state per row,
said once, under the words; one control per row on the same right edge; `kit-text-quiet`.

## OWNS

`work-claims/task-440.md` (this file, first commit),
NEW `src/lib/studio/invite-token.ts`,
`src/lib/live.ts:102-133` (room-key function and docblock only),
`src/app/meet/studio/room-access.ts`,
`src/app/meet/studio/[room]/page.tsx`,
`src/app/meet/studio/[room]/pre-join.tsx` (optional invite + hidden input only),
`src/app/rooms/[slug]/page.tsx:114,116-122,162,178-184,211` (key derivation, keyed stage inputs,
prop removal only — widens FL §d for DARK),
`src/app/a/studio/page.tsx:114-122` (guest door, comment, one new import line),
`src/app/api/admin/studio/invite/route.ts:43-52` (signing and docblock),
`src/components/console/StudioHub.tsx:163-170` (prop plumbing only),
`src/app/a/live/go-live-room.tsx:76,155-178,322-326` (imports, props, doors; reservation feedback
beside the co-create input),
`tests/meet-studio.test.ts`, `tests/studio-room-keys.test.ts`, `tests/studio-send-to-user.test.ts`,
`tests/go-live-door.test.ts`, NEW `tests/studio-key-leak.test.ts`.

READ-ONLY (never edited): `live-links.ts`, `RoomVideoSlot.tsx`, `ClassroomView.tsx`,
`StageView.tsx`, `VdoRoom.tsx`, `StudioRoom.tsx`, `a/studio/room/[room]/page.tsx`,
`a/studio/room/mint.ts`, `meet/[bookingId]/page.tsx`, `mail-studio-invite.ts`,
`operator-auth.ts`, `member-auth.ts`, `order-receipt.ts`, `pwyc-letters.ts`, `overlay-token.ts`,
`src/middleware.ts`, `src/lib/room-access.ts`.

FORBIDDEN: env changes (`SEAT_SECRET` above all); middleware / `roomGate` semantics / who reaches
`/rooms/*`; Stage 2, `/reading`, Jitsi components or server config; `sections.tsx`,
`src/app/page.tsx`, store files, the studio fork; global rail changes; new CSS, new colours,
`style={{`, legacy `.btn` in new UI; raising design-drift ceilings or operator-census allowances.

## Consequence the SUMMARY must flag

Three ALREADY-MERGED lanes pin `rooms/[slug]/page.tsx`'s import line byte-for-byte WITH
`studioRoomKey` (`tests/named-guest-camera-door.test.ts:155-157`,
`tests/stage-shows-the-studio.test.ts:206-208`, `tests/classroom-live.test.ts:113-117` — all three
carry T-305's own "the string pin updates, the intent holds" note). The Admiral's DARK ruling
forbids any `studioRoomKey` call on this page, and eslint (`--max-warnings=0`) forbids the unused
import, so the string pins cannot stay byte-identical. They get re-trued — never weakened, never
deleted — to the new true import line, the same re-true T-305 itself performed on these exact
pins. Their stated intent (this page reads its VDO builders from `@/lib/live`) is preserved.

## What is NOT in this lane

Co-create hardening beyond the `studio` reservation (T-442+); per-show key epochs; the keyless
scene links (FL §c-v); Stage 1/Stage 2 Jitsi (T-438 v2 / T-439); the store shelf (T-441); VDO
host probing of any kind (the two-window password test is the Admiral's/Number One's hand test at
rehearsal). No push, no PR, no merge, no fetch, no rebase, no git config. Block-height stamps
only. Deploy outside any live session or confirmed booking is Number One's call, not the
builder's.

## Cut note

Stamped at block **968,228** (house beacon `curl -s https://time.pacsarcade.org/height`).
