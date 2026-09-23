# REGISTER — task-442 (brief block 968,279 · built block 968,282 · 0018.07.05 a₿)

Close the sign-in return-path open redirects behind ONE validator — lane A of
the Jitsi host-pass plan (`PLAN-jwt-login.md` §3 rule 8, §4 row A). Brief:
`~/dev/kimi/inbox/TASK-442-oc-next-path-open-redirect.md`. Base main `1f1acd9`,
branch `feat/task-442-next-path-open-redirect`.

## What landed, file by file

- `work-claims/task-442.md` — the lane claim (first commit), per the brief's
  order.
- `tests/next-path-open-redirect.test.ts` (NEW) — the brief's Tests 1–5:
  the refused set (tab/CR/LF single and doubled, NUL, U+001F, DEL, a backslash
  anywhere, and the four dot-segment paths that normalise to `//host`);
  non-string input (`["/a","/b"]`, `42`, `{}`) returning null with no throw;
  the percent-encoded arrivals through `nextPathFromLocation`; the 14 legit
  paths byte-identical (`toBe(raw)`) through BOTH `safeNextPath` and the
  `encodeURIComponent` query round-trip; the signer-return source pin
  (`safeNextPath(rawNext)` present, `(?!\/)` gone); and the `get("next")`
  census — the set of readers under `src/` is exactly `lib/next-path.ts` and
  `app/login/signer-return/page.tsx`.
- `src/lib/next-path.ts` — `safeNextPath` hardened, both export names, the
  module path and the one-argument call shape kept. `raw: unknown`; non-string
  or empty → null (the repeated-`?next=` array crash closes with no edit to
  `welcome/page.tsx`); C0 controls + DEL + backslash anywhere → null
  (`/[\u0000-\u001f\u007f\\]/`); must start with `/`, not `//`; resolves against
  the fixed `SENTINEL = "https://next-path.invalid"` (never
  `window.location.origin` — vitest runs node; never Host/x-forwarded-host —
  `welcome/page.tsx` is a server component), null if the origin differs or
  `u.pathname` starts with `//`; returns `raw` BYTE-IDENTICAL, never
  `u.pathname + u.search + u.hash` (normalising mints `//host` out of
  `/..//host`). Docblock rewritten short: the rule and why (tab/CR/LF
  stripping, backslash-as-slash, dot-segments).
- `src/app/login/signer-return/page.tsx` — TWO lines moved and nothing else:
  the hand-rolled `const next = rawNext && /^\/(?!\/)/.test(rawNext) ? rawNext : null;`
  became `const next = safeNextPath(rawNext);`, plus the one import.
  `useSearchParams` stays the source, the effect deps stay, every claim-branch
  line byte-identical (diff-verified: 1 insertion, 1 deletion, 1 import line).

## Tests

- Baseline at cut (`1f1acd9`): **212 files, 2559 tests, all passing.**
- Red commit (`e9c402f`): Tests 1, 2 and 4's source pin RED on `1f1acd9`
  (4 failing its); Test 3 (byte-identical legit paths, both its) and the
  census pin green — exactly the brief's prediction.
- Final: **213 files, 2566 tests, all passing** (+1 file, +7 its; the suite
  only grew). Existing pins green UNMODIFIED: free-reading-path, door-machine,
  door-key-handoff, me-signed-out, rooms-door, room-doors.

## Gates (`~/dev/shortcuts/oc-gate.sh /home/pac/dev/worktrees/task-442`)

- `npx vitest run` — 213 passed (213), 2566 passed (2566).
- `scripts/*.test.mjs` — calendar-view 70/0, cartridge-identity 179/0,
  console-matrix 14/0, fixture-kv 45/0, square-payments 58/0 (each 0 failed);
  census 1119 objects, baseline 1119.
- `npx eslint src tests --max-warnings=0` — 0.
- `npx tsc --noEmit` — 0.
- `npx next build` — ok.
- **GATES GREEN.** (The gate ran `npm ci` first — the hand-off node_modules
  was stale against an UNCHANGED lockfile; no lockfile edit in this lane.)

## Deviations

None. Every anchor re-grepped before editing and matched the brief
(`export function safeNextPath` at next-path.ts:10, the regex at
signer-return:39, both `get("next")` sites).

## Owed at runtime (NOT buildable here — flagged for Number One's SUMMARY)

- The behaviour checks on the lane build, ports 4818–4821 (the brief's
  "Shots" section: no new look, so behaviour stands in for shots): signed
  out, `/login/signer-return?door=login&next=%2F%5Cevil.example` must never
  navigate off-site; the served HTML of `/welcome?next=%2F%09%2Fevil.example`
  must carry no Continue link. `shots-fixture.sh` never runs.

## Not in this lane (by design)

- The brief's "Honestly not in this lane" items (login-CSRF through
  signer-return, the NIP-46 `auth_url` scheme check, Host-header checkout
  return URLs, `rooms-door.ts` dropping a room URL's query) were seen and
  left — later lanes (HOLD 1–3), not built, not re-found here.
- No SUMMARY.md / LANE-DONE — the orchestrator writes those.
- All read-only files untouched; `welcome/page.tsx` and `WelcomeFlow.tsx`
  untouched (T-414's draft); no props to `SignInCard`; no rename, no module
  move, no second argument, no normalised return; no UI/CSS/style drift; no
  existing test's assertions edited or deleted.
