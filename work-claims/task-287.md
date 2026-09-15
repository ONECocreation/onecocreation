# work-claim — task-287 (ONE Cocreation: the console rooms' description line unreadable at dawn)

Lane: Ms. Kimi (sub-agent). Base = onecocreation main @ **0b22fa9** (the T-284 merge, per K29).
Branch `feat/task-287`. Worktree cut by Number One, `node_modules` + `node_modules/.bin/vitest`
verified at claim time; shared harness `scripts/shots-fixture.sh` present at base (T-282).
Lane ports **4306–4309**. GO: `~/dev/kimi/inbox/TASK-287-oc-console-description-legibility.md`.

## Ground (from the GO, verified 0018.06.25 by Number One; re-grep at cut)
- `src/app/a/connections/page.tsx:58` — `<p className="… text-white/55">` under
  `<h1 className="mb-3 mgmt-title">`: a NIGHT-only ink on the dawn (`data-oc-theme="light"`)
  console panel. The h1 is fine (T-269).
- Same grep across `src/app/a/**/page.tsx` and `src/components/console/**` at cut; list every hit
  with its surface. A hit in `src/components/console/**` = flag-and-stop (OWNS excludes it).
- Tokens: derive from `var(--muted)` / the site chrome's muted ink (`src/app/cartridge.css`,
  `src/app/house.css` `.mgmt-body` ~:461-470). No invented hex.

## Build (GO verbatim)
1. ONE `.mgmt-lede` rule in `src/app/house.css` → `color: var(--muted)` (minimal-forced-edit,
   say so); use it on every description-line hit from the grep.
2. Contrast gate = script output (`python3 ~/dev/kimi/bin/contrast.py` or the repo's
   `scripts/check-usability.mjs`), pasted; every description line ≥ 4.5:1 in BOTH themes.
3. Shots: `bash scripts/shots-fixture.sh --ports 4306-4309 --routes "/a,/a/connections,/a/status"
   --cookie operator` → both themes × 1440/390; read them.
4. One vitest pin: no `text-white/[0-9]+` className remains on a `<p>` under `.mgmt-title` in
   `src/app/a/**/page.tsx`.

## OWNS (GO verbatim)
`src/app/a/**/page.tsx` (the description `<p>` lines only), the ONE `.mgmt-lede` rule in
`src/app/house.css`, one new test file, `work-claims/task-287.md`. NOT `src/components/console/**`
(flag-and-stop if the grep proves a hit there). NOT the h1s.

## Gates (verbatim, honest exit codes — no `| tail` masking, K29 law)
`npx vitest run` (floor 1321) · `node scripts/calendar-view.test.mjs` ·
`node scripts/cartridge-identity.test.mjs` (179) · `node scripts/square-payments.test.mjs` (58) ·
`npx eslint src tests --max-warnings=0` → 0 · `npx tsc --noEmit` · `npx next build` ·
contrast script output pasted · shots read.

— Ms. Kimi, 0018.06.25 a₿ (block 967,130 at cut)
