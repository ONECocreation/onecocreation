# work-claim — task-416 (OC · S · GUARD · chrome matrix ★ — the `/a` route POLICY: hand-declared, gate-riding, no browser)

Lane: the home crew (Ms. Kimi's builder, K107, under Number One's gate). Base =
onecocreation main **269367227dfe6482818eef04e4872dda86f615be** (Merge pull request
#58 — the base the Cut note names, confirmed by `git log -1` in this worktree).
Branch `feat/task-416-guard-chrome-matrix` (the Cut note's name wins over the
body's `feat/task-416-chrome-matrix-policy`). Worktree cut by Number One at
`~/dev/worktrees/task-416`, `npm ci` done before hand-off. Lane ports **4742–4745**
(reserved, unused — a pure-node lane, no server started). Brief:
`~/dev/kimi/inbox/TASK-416-oc-guard-chrome-matrix.md`; its `## Verify note` and
`## Cut note` (both Number One, block 968,175) SUPERSEDE wherever they contradict
the body — their rulings as worked here: the branch name above; **Astra's D2** — a
row carrying `alwaysRedirectTo` OMITS `signedOut`, the policy's own `_doc` block
says so, and the oracle asserts the pair (`alwaysRedirectTo` present ⇔ `signedOut`
absent) in BOTH directions.

What the lane builds: the HAND-DECLARED `/a` route policy
(`scripts/console-matrix.routes.json` — 28 rows, one per `page.tsx` under
`src/app/a`, today's truth written by hand from each page's source at claim time;
`/a/briefs` = `render` with `pending: "Q1 → redirect"`; `/a/live` and the six
folded alias rooms = `alwaysRedirectTo`) plus the gate-riding oracle
(`scripts/console-matrix.test.mjs` — pure node + fs walk, ZERO imports from
`src/`): tree ↔ policy both ways, the FULL T-135 redirect idiom ↔ policy both
ways (never a bare `CONSOLE_CHROME === "site"` grep — `src/app/a/page.tsx:105`
is a render branch, not a carrier), the `alwaysRedirectTo` pair both ways, and
unit coverage of its own parsing on scratch fixture trees (route added, row
orphaned, idiom removed — each a named failure). The policy is the oracle, the
tree is the suspect — never derived from the tree at test time (Astra's HOLD,
answered). This lane touches nothing under `src/` and starts no server.

## OWNS

`work-claims/task-416.md` (this file, first commit),
`scripts/console-matrix.routes.json` (NEW — the hand-declared policy),
`scripts/console-matrix.test.mjs` (NEW — the gate-riding oracle). Exactly three
NEW files — the lane's OWNS list, hit exactly.

READ-ONLY (grounding only, never edited): everything under `src/` (the policy's
evidence — the 28 pages, `src/lib/console.ts`, `src/app/a/layout.tsx`),
`scripts/fixture-kv.cjs`, `scripts/shots-fixture.{sh,cjs}` (418's idiom, named
only), every other script and test.

## What is NOT in this lane

No file under `src/` touched. No browser walk (TASK-418 reads this policy as its
expectations), no puppeteer, no fixture KV, no ports, no server start. No derived
expectations (the policy is committed, hand-edited, and diffs at review). No edit
of any existing script or test; no gate-list change (the new test rides the
existing `for f in scripts/*.test.mjs` gate step). Not the place where Q1 is
implemented — the `pending` note on `/a/briefs` points at the PAGE lane that
carries it. No push, no PR, no merge, no fetch, no rebase, no archive. No
`DESIGN_DRIFT_WRITE` in any mode. Block-height stamps only.

## Cut note

Stamp per the brief's cut note, block 968,175 (cut); claimed at block 968,177
(house beacon `https://time.pacsarcade.org/height`).
