# work-claims/task-409.md — task-409 (ONE Cocreation: the discovery-call card — "full details" goes)

Lane: Ms. Kimi's crew (K104), under Number One's gate. Base = onecocreation main
`d4caffe7418e87aba03f39917e4f2c89a7fea016` (PR #55 — TASK-404 — merged; none of #55's files
collide with this lane's OWNS). Branch `feat/task-409-discovery-card-buttons`. Worktree
`~/dev/worktrees/task-409` (cut by Number One), `npm ci` already done. Lane ports **4722–4725**.
Brief: `~/dev/kimi/inbox/TASK-409-oc-discovery-card-buttons.md` (K102 Ask 1 / SCOPE §2 W-11;
SUPERSEDING cut note at block 968,170 holds).

Claimed at block **968,170** (house beacon `https://time.pacsarcade.org/height`).

The ask (his verbatim, B9): the "full details" door on the discovery-call card says it goes to
the full details but lands on the booking page Book ⚡ already opens — a duplicate door with a
false label. "More info" flips (already true on main) · "Book" opens the calendar (already true
on main) · "full details" goes (this lane).

## OWNS (nothing else)

- `work-claims/task-409.md` (NEW, this file — first commit)
- `src/components/ServiceCard.tsx` — ONLY the two "full details" doors (front ~:107, back ~:141)
  gated on `svc.inStore`, the surviving store door spelling `/store/${svc.id}` inline, and the
  `detailsHref` const + its comment (~:55-57) retired. Nothing else in the file moves: the flip
  state, both Book ⚡ doors, the inStore-gated basket door, the glass styles, the reveal wrapper
  all byte-identical.
- `tests/sessions-style.test.ts` — ONE additive `it` beside the existing door pin (~:78-85):
  `full details` occurs exactly twice in `ServiceCard.tsx` (front + back, both behind the
  `svc.inStore` gate) and `detailsHref` occurs nowhere. No other test touched.

## READ-ONLY and FORBIDDEN

READ-ONLY: `src/components/sections.tsx`, `src/app/book/page.tsx`,
`src/components/welcome/WelcomeFlow.tsx`, `src/app/book/[serviceId]/page.tsx`,
`src/components/booking/SlotPicker.tsx`, `src/components/store/StoreItemCard.tsx`,
`src/components/store/FreeMeditationCard.tsx`, `tests/pink-shimmer-doors.test.ts`, every stylesheet.

FORBIDDEN: a new visible control or style; touching the flip mechanism or the `.flip-card`
contract classes; touching either Book door's href or classes; a per-id special case
(`svc.id === "discovery-call"`); any civil-date stamp (block heights only);
`DESIGN_DRIFT_WRITE` (this lane adds no `.tsx`/`.css` file — never run here).

## Decisions (the drafter's leans, RULED as the leans — taken)

- **A — TAKEN.** The door goes wherever it duplicates Book, not only on the discovery card:
  both "full details" doors are gated on `svc.inStore` — the structural gate, no per-id special
  case. The door survives exactly where a real store page exists (`/store/<id>`) and goes where
  it was the booking page wearing a false label.
- **B — TAKEN.** The pin lives in `tests/sessions-style.test.ts` beside the existing door/flip
  pins, one additive `it` — the contract stays in one home.
- **C — TAKEN.** "full details goes" means BOTH faces — front and back gated alike; the lie is
  not kept one tap away on the flip side.

## Named consequence (Astra's cut-time trap, carried)

Gating on `svc.inStore` removes the door from EVERY non-store session card, not only the
discovery call. That is the ground's own duplicate-door fact (for a non-store session,
`detailsHref`'s else-branch equals Book's `/book/<id>` exactly) and is the ask's mechanism. The
store catalogue and booking config are live KV/blob/data (`store:catalog`, `booking:config` —
`src/lib/store.ts:261`, `src/lib/booking.ts:33-35`), not greppable at build time; no fixture or
seed in the repo stocks any session id as a store item (the fixture shelves stock meditations,
packages, and wares — `tests/meditations-shelf.test.ts:66-69`). On the current shelf the door
leaves the discovery call and every soul-conversation card alike; SUMMARY states this in one
line.

## Gates

Run in this worktree only: `npx vitest run`, each `scripts/*.test.mjs`,
`npx eslint src tests --max-warnings=0`, `npx tsc --noEmit`, `npx next build`.
Never `~/dev/shortcuts/oc-gate.sh`, never `scripts/shots-fixture.sh` (Number One's).
