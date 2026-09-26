# TASK-470 claim

Builder: sonnet sub-agent for Number One
Block: 968,624 (the Admiral ruled a MINIMAL, safe sign-in fix the night before Love's first live reading)
Branch: feat/task-470
Worktree: /home/pac/dev/worktrees/task-470
Base: origin/main a80ada9

Ground truth: briefings/walk-968624/L4-TRACE.md (incl. its Revision),
briefings/walk-968624/ASTRA-REVIEW.md (L4 section), briefings/walk-968624/VERDICT-968624.md.

The walk (0:47-0:59, block 968,624) showed the sign-in door going "stuck"
with no honest feedback, then wall-holding at 3 sends. L4-TRACE's leading
S4 candidate: no SMTP transport timeout (`mail.ts`), so a slow relay hangs
past nodemailer's own ~2-minute default instead of failing fast; no client
fetch timeout either, so the UI can't tell "slow" from "dead"; and the
3-send meter (`code-door-limit.ts`) burns fast when every stuck press looks
like nothing happened. ASTRA-REVIEW's "No false success" + VERDICT-968624's
"client abort does not cancel server-side SMTP" set the honesty bar this
lane keeps: never say "sent" before the server accepts, never say "failed"
on a client timeout (the letter may still land).

This lane is the MINIMAL fix set only:
1. `mail.ts`'s transport: connectionTimeout/greetingTimeout/socketTimeout
   (10s/10s/20s) so a bad relay fails fast for every sign-in surface at
   once (one shared file).
2. `DoorSheet.tsx`, `SignInCard.tsx` (live via `MeSwitch.tsx`, confirmed
   mounted outside the Puck-only branch), and `ReadingSignInBox.tsx`: the
   busy state was already immediate ("Sending your code…", `disabled={busy}`,
   `if (busy) return;` — no double-send regression here); added a client
   25s `AbortController` timeout with an honest, uncertain-outcome note
   (never "failed"), and a "Code sent. Check your inbox." confirmation that
   only ever renders in the post-accept `code`/`code`-step branch (unreachable
   any earlier — the state machine itself proves it, per `door-machine.ts`'s
   `reduce()`).
3. `code-door-limit.ts`: `MAX_SENDS` 3 -> 10 (`SEND_WINDOW_S` unchanged at
   600), the Admiral's number, shipped alongside item 1 per VERDICT-968624's
   §6 safety note (raising the limit alone would let a hung relay burn 10
   real send attempts instead of 3).
4. Tests for all of the above, following the repo's node-env/no-jsdom
   convention (source pins for DoorSheet/SignInCard's non-exported
   `sendCode`; real calls + fake timers for `ReadingSignInBox`'s exported,
   pure `startEmailCode`).

## OWNS
- `src/lib/mail.ts` — EDIT: `transportFor`'s `createTransport` call gains
  `connectionTimeout`/`greetingTimeout`/`socketTimeout`.
- `src/components/door/door-machine.ts` — EDIT (additive only): new pure
  exports `DOOR_SEND_CONFIRMATION`, `DOOR_SEND_TIMEOUT_MS`,
  `DOOR_SEND_TIMEOUT_NOTE`. `reduce`/`DOOR_WALKS`/`DOOR_COPY`/every existing
  export is byte-unchanged.
- `src/components/door/DoorSheet.tsx` — EDIT: `sendCode`'s fetch wrapped in
  an `AbortController` on `DOOR_SEND_TIMEOUT_MS`; the `code` step's copy
  gains the `DOOR_SEND_CONFIRMATION` line.
- `src/components/door/SignInCard.tsx` — EDIT: same two changes, in
  lockstep with `DoorSheet.tsx` (the house's "one submit" law).
- `src/components/rooms/ReadingSignInBox.tsx` — EDIT: `startEmailCode`
  gains the same `AbortController` timeout (its own local
  `SEND_TIMEOUT_MESSAGE`, the box's "own words" convention); the code step
  gains its own `CODE_SENT_CONFIRMATION` line; one doc-comment number
  updated (3 -> 10 sends/10 min) for accuracy.
- `src/app/api/auth/email/code-door-limit.ts` — EDIT: `MAX_SENDS` 3 -> 10,
  `SEND_WINDOW_S` unchanged; docblock note updated.
- `tests/code-door-limit.test.ts` — EDIT: re-true the `MAX_SENDS` pin to 10.
- `tests/sign-in-honesty-968624.test.ts` — NEW: mail-transport source pin,
  DoorSheet/SignInCard send/timeout/no-double-send source pins + a static-
  render "no false success" check, ReadingSignInBox real-call timeout test
  (fake timers, stubbed fetch) + code-step confirmation render check.
- `work-claims/task-470.md` — this file.

## READ-ONLY (not touched)
- `src/app/api/member/profile/route.ts` and `src/lib/registry.ts` — the
  name-claim/registry 409 (L4-TRACE §3/§5 item 5) is explicitly OUT of this
  lane's minimal scope per the Admiral's ruling tonight; a follow-up lane.
- `src/app/api/auth/email/start/route.ts`, `verify/route.ts`,
  `src/lib/email-auth.ts` — server-side verify/minting logic untouched;
  `start/route.ts` already meters-before-mints-before-sends (unchanged,
  still pinned by `code-door-limit.test.ts`'s existing source-grep test).
- `src/components/door/door-machine.ts`'s existing `DoorState`/`reduce`/
  `DOOR_WALKS`/`DOOR_COPY` — no new state, no changed transition; only new
  pure string/number exports were added.
- All CSS files (`src/app/kit.css`, `src/app/house.css`, cartridge tokens)
  and every kit component under `src/components/kit/` — no new CSS, no
  inline styles beyond the pre-existing inline `style={{...}}` idiom these
  two files already use throughout.
- Everything else on `/reading`, `/login`, `/me` and their supporting libs
  not named above.
