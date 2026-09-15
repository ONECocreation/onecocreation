# WORK-CLAIM — TASK-301 (ONE Cocreation · operator door — "Verify operator key" tells the truth when no signer is installed)

CLAIMED-BY: Number One's home-crew sub-agent (Sonnet 5), solo lane, no parallel runs.
CLAIMED-AT: 0018.06.25 a₿ · block 967,174.
SOURCE: Love call #4 item 10 [00:25–00:26] — Love pressed "Verify operator key" on the operator door; nothing happened (no NIP-07 signer extension on her iPad); she signed in with email instead.
BRANCH: `feat/task-301`
WORKTREE: `~/dev/worktrees/task-301`
BASE: main @ `57bba3aa2cf067a46fab59c4f7d438a83c6d5252` (worktree cut here; `git merge main` before final gates).
BRIEF: `~/dev/home/inbox/TASK-301-oc-operator-key-button-honesty.md`
RUNS IN PARALLEL WITH: T-285-C (package scope), T-300 (the studio page) — disjoint from this lane.

## Ground (re-grepped at claim)
- The exact component: `src/components/OperatorGate.tsx` — renders the "Verify operator key" button at what was line 112 (now conditional), calls `window.nostr.signEvent(...)` in `verify()`. On a browser without `window.nostr`, `verify()` already set an `error` string on click, but the button itself gave no advance warning — it looked identical whether a signer was present or not, so Love's tap on her signer-less iPad read as "nothing happened."
- `src/lib/signer-doors.ts` (the signer-doors list) and `src/components/door/**` were read for ground truth only — not touched; the copy lives in the one component that renders the button, per the brief's OWNS/NOT split.
- The email path (`/api/auth/email/*`, `OPERATOR_EMAILS`) is untouched and still the obvious fallback (`tests/operator-gate-email-seat.test.ts` re-run green, no changes to that logic).
- Precedent for a hydration-safe "is a signer present" read already exists in this repo: `src/components/Kind0Doors.tsx` and `src/components/SignerDoors.tsx` both define a local `useHasSigner()` via `useSyncExternalStore` (never exported/shared — each file carries its own copy, per those files' own convention). OperatorGate.tsx now carries the same copy rather than inventing a new pattern.

## Build
1. `OperatorGate.tsx`: added the `useHasSigner()` hook (same shape as Kind0Doors/SignerDoors) and `const noSigner = hasSigner === false;` — the pre-hydration `null` snapshot reads as "unchanged" (same treatment the file already gives `emailSeat` before its fetch resolves), so a signer-holding operator never sees a flash of the disabled state.
2. When `noSigner`: button label becomes "Needs a signer extension", `aria-disabled={noSigner}` (NOT the plain `disabled` attribute — `disabled` stays tied only to `busy`, so the button stays in the tab order/focusable per spec), `opacity-60` for the disabled look, `onClick` becomes a no-op (the email door below is the real next step, not a redundant click-error). A new line appears under the button: "Install a Nostr signer (Sidecar, Alby, nos2x) or sign in with email below."
3. When a signer is present (or not yet resolved): unchanged — same "Verify operator key" copy, same `onClick={verify}`.
4. `verify()` itself untouched (still guards `if (!window.nostr)` for the belt-and-suspenders case where the browser's signer disappears between mount and click).

## OWNS
- `src/components/OperatorGate.tsx` — the one component that renders the button.
- `tests/operator-gate-no-signer.test.ts` — new test file (source-assertion convention, matching `tests/operator-gate-email-seat.test.ts`; this repo's vitest config is `environment: "node"`, no jsdom, `include: ["tests/**/*.test.ts"]`, so no React render happens in this suite for OperatorGate).
- `work-claims/task-301.md` (this file).

NOT touched: `src/lib/signer-doors.ts` (the copy did not need to move there — no flag-and-stop needed), `src/components/door/**` (read-only ground truth).
