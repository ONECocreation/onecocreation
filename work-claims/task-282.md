# TASK-282 claim

Owner: home crew (sonnet)
Base sha: 553f49f
Branch: feat/task-282
Ruling: pickup-feedback tune 2, 0018.06.25 a₿ · block 967,130

## Why
Every lane since T-210 rebuilt the same fixture shot harness from an
archived outbox: production `next start`, throwaway KV, fixture
SEAT_SECRET, operator/member cookie, promo-popup dismissal, both themes x
1440/390. T-232 lost a shot run to a port collision. One reviewable
harness, called with a route list and the lane's ports, ends both.

## OWNS
- `scripts/shots-fixture.sh` (NEW)
- `scripts/shots-fixture.cjs` (NEW)
- `scripts/fixture-kv.cjs` (NEW, lifted from the task-277/280/276 archived
  harnesses — byte-identical across all three — with the one silent
  `|| 3311` port fallback removed; see the file's own header)
- `tests/shots-fixture-harness.test.ts` (NEW — the vitest pin)
- `work-claims/task-282.md`

## NOT-OWNS (explicit)
- `package.json` — T-283 (Ms. Kimi's bump lane) owns it right now. No
  `scripts.shots` entry, no dependency added. Puppeteer stays borrowed at
  runtime from `~/dev/apps/puck-studio/node_modules`, exactly as every
  archived harness before it.
- `src/**` — read-only reference for this lane: `src/lib/member-auth.ts`
  and `src/lib/operator-auth.ts` are IMPORTED at runtime by the mint step
  (never edited) so the fixture cookies are minted with the real
  `makeMemberToken`/`makeOperatorToken`, not a hand-rolled duplicate of
  their HMAC shape. `src/components/PopupHost.tsx`, `src/lib/tenant.ts`,
  `src/lib/identity-config.ts` were read only, to time the popup dismiss
  and wire the TENANT override.
- Every other file under `tests/`.

## Sources unified (read all three before writing)
- `~/dev/home/archive/task-277/patches/task-277/shots/` — fixture KV shape
  + the theme-toggle recipe (`data-oc-theme` / `oc-theme` localStorage).
- `~/dev/home/archive/task-280/patches/task-280/shots/` — the member
  cookie (now minted with the REAL `makeMemberToken`, not task-280's
  hand-rolled HMAC), the PopupHost dismiss timing (wait past its ~2000ms
  fire delay, press Escape once), and the two-browser-context fix so a
  signed-in shot can never leak into a signed-out shot in the same run.
- `~/dev/home/archive/task-276/patches/task-276/shots/` — the fe-operator
  console cookie (now minted with the REAL `makeOperatorToken`) for the
  `/a` routes, and the TENANT-override second server for `/u/*` (its
  `make-fixtures.cjs` is where the operator-token shape and
  `packages/operator-auth`'s config wiring were confirmed).

## Ports
Ports come ONLY from `--ports A-B` (four ports: app, kv, tenant-override,
spare). The script refuses to run without it (exit 2, a usage line).
Every listener it starts is killed on exit (trap EXIT/INT/TERM) and all
four ports are re-verified free afterward.
