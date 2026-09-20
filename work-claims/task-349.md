# work-claim — task-349 (ONE Cocreation: the OC UI kit, lane 1 — the kit + `/style/kit`, no page changes)

Lane: home crew (Number One sonnet sub-agent). Base = onecocreation main **dda9e14** (the
T-347 law-guard-hooks merge — cut point at claim time). Branch `feat/task-349-oc-ui-kit`.
Worktree cut by Number One, `npm ci` already run there (clean at cut). Lane ports **4518–4521**.
GO: `~/dev/home/inbox/TASK-349-oc-ui-kit-lane-1.md`. Design of record: `briefings/
oc-ui-kit-architect-pass.md` §2 (the kit), §4 (migration order, lane 1), §5 (R-071,
button-no-wrap).

A small token + component kit — one `Button`, one `Card`, one `Tabs`, one `Field`, one type
scale — drawn FROM `src/app/cartridge.css`/`src/app/house.css`, nothing invented. A preview
route, `/style/kit`, mounts every part in both themes (two forced-theme panes via the existing
`.oc-pv-dark`/`.oc-pv-light` scope classes, no toggle needed). One one-line fix rides along: the
canvas serif leak at `src/lib/bb/scene.ts:188`.

## OWNS

`work-claims/task-349.md` (new, first commit), NEW `src/components/kit/**` (Button/Card/Tabs/
Field + the `index.ts` barrel), NEW `src/app/kit.css`, NEW `src/app/style/kit/page.tsx`,
`src/app/layout.tsx` (the one new `import "./kit.css";` line, placed after `house.css`),
`src/lib/bb/scene.ts` (line 188 only — the `serif` → sans fix), `scripts/check-usability.mjs`
(the `CSS_SWEEP_FILES` array only — one new string added), `src/app/style/StyleRoomStrip.tsx`
(the one `if (rest === "kit") return "Kit";` label line — named decision 5, taken), NEW
`tests/kit-components.test.ts`, NEW `tests/style-kit-route.test.ts`.

READ-ONLY (cited, not edited): `src/app/cartridge.css`, `src/app/house.css`,
`src/app/globals.css`, `src/app/cartridges.css`, `src/app/style/layout.tsx`,
`src/app/style/[[...slug]]/page.tsx`, `src/app/style/brand/page.tsx`,
`src/app/style/reference/[slug]/page.tsx`, `src/app/style/preview.css`, `src/middleware.ts`,
`next.config.ts`, `src/lib/operator-auth.ts`, `src/components/OperatorGate.tsx`, everything
under `@frens-earth/puck-config`, `packages/**`, every page/component outside the kit and its
preview route.

Forbidden: any page migration (login/me/DoorSheet/MePanel/ContactForm/memberships/about/
anything else); any token rename or new token in `cartridge.css`; any edit to `.button`
(globals.css:295) or `.btn-pill*` (globals.css:529); any edit to `.btn*` classes in `house.css`
themselves; any new dependency; any change to `@frens-earth/puck-config`; env/KV/deploy steps;
BFT/date math beyond the given stamp; a broad `git checkout --`/`git restore .` mid-lane.

## Gates

`npx vitest run` · `for f in scripts/*.test.mjs; do node "$f"; done` · `npx eslint src tests
--max-warnings=0` · `npx tsc --noEmit` · `npm run check:usability` · `npm run check:leaks` ·
`npx next build`. `package-lock.json` must not change (no new dependency this lane).

## Shots

`scripts/shots-fixture.sh --ports 4518-4521 --out ~/dev/home/outbox/task-349/shots --routes
/style/kit --cookie operator --themes dark,dawn --widths 1440,390`.

## Cut note

Stamp: 0018.07.02 a₿, block 967,889 (house beacon).
