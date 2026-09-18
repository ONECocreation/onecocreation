# work-claim — task-345 (ONE Cocreation: bump `@frens-earth/puck-config` pin 0.14.0 → 0.16.0)

Lane: home crew (Number One sonnet sub-agent, H128). Base = onecocreation main **823dfae**
(the T-333 studioroom-console merge — cut point at claim time). Branch
`feat/task-345-puck-config-pin-0.16`. Worktree cut by Number One, `node_modules/.bin/next`
present at claim time (`npm ci` already run). Lane ports **4506–4509**.
GO: `~/dev/home/inbox/TASK-345-oc-puck-config-pin-0.16.md`.

One dependency pin moves two releases forward on PacsArcade/puck-studio:
- `puck-config-v0.15.0` (T-341): Style Inspector gains Typography and Spacing sections plus a
  `weight` key (400/500/600/700).
- `puck-config-v0.16.0` (T-340 Part A): double-click inline text editing on the /style canvas
  for Heading / Eyebrow / Text / PullQuote, with an anchored size / letter-spacing / line-height
  / colour toolbar; Escape reverts; 390 stays read-only.

This lane repoints `package.json:34` to the 0.16.0 tarball URL, regenerates
`package-lock.json` for that one entry via `npm install`, adds a source-test pin
(`tests/puck-config-pin.test.ts`), and shoots `/style` + `/style/brand` at both themes ×
1440/390 with an operator cookie.

## OWNS

`package.json` (line 34 only), `package-lock.json` (the `@frens-earth/puck-config` entry
only), NEW `tests/puck-config-pin.test.ts`, `work-claims/task-345.md`.

READ-ONLY: everything else. Forbidden: `src/**`, env/KV, deploy steps, BFT/date math, any
other dependency. `work-claims/task-285c.md` is a historical claim file from an earlier era —
read-only, not edited by this lane.

## Build (GO verbatim)

1. `package.json:34` → the 0.16.0 URL. Nothing else in package.json.
2. `npm install` in the worktree (not `--package-lock-only`) so `node_modules` matches the
   lockfile; confirm `node_modules/@frens-earth/puck-config/package.json` says
   `"version": "0.16.0"` and that the installed package ships the InlineTextEditor build.
3. NEW `tests/puck-config-pin.test.ts` — read-the-source style like `tests/style-route.test.ts`:
   pins package.json's URL, the lockfile's resolved URL + integrity, and the installed
   package's version, all to `0.16.0`.
4. This claim file first commit; pin + lockfile + test after.

## Gates

`shortcuts/oc-gate.sh` verbatim against this worktree. LANE-DONE only on `GATES GREEN`.

## Shots

`scripts/shots-fixture.sh --ports 4506-4509 --out ~/dev/home/outbox/task-345/shots
--routes "/style,/style/brand" --cookie operator --themes dark,dawn --widths 1440,390`

## What changes for Love (one line)

The /style page she edits gets the Typography and Spacing panels, a Weight chooser, and
double-click-to-edit on headings and body text, all from one deploy after the Admiral merges.

No env, no KV, no deploy steps of ours. Number One gates, the Admiral pushes and merges the PR.
