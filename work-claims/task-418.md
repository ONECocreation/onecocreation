# work-claim — task-418 (OC · M · GUARD · chrome matrix ★ — the two-build browser walker: every `/a` route, both chromes, both themes, the POLICY as its oracle)

Lane: the home crew (Ms. Kimi's builder, under Number One's gate). Base =
onecocreation main **57196cbdc68078f182314d1fbceb2bc87e923093** (Merge pull
request #60 / T-419 — the Cut note's effective ground truth, confirmed by
`git log -1` in this worktree; it carries PR #59 / T-416, so the policy file
this lane reads is on main — the hold is LIFTED). Branch
`feat/task-418-chrome-matrix-walker`. Worktree cut by Number One at
`~/dev/worktrees/task-418`, `npm ci` done before hand-off. Lane ports
**4750–4753**. Brief:
`~/dev/kimi/inbox/TASK-418-oc-chrome-matrix-walker.md`; its
`## Cut note — Number One, block 968,194` SUPERSEDES the head block and the
`## Verify note` wherever they differ — its rulings as worked here: main =
`57196cb`; the policy's real shape (top keys `_doc` + `routes`; `routes` a
LIST of 28 rows; union of row keys `alwaysRedirectTo · pending · route ·
signedOut · siteChrome · source` — `source` is READ and ignored, never
asserted; `siteChrome ∈ {redirect, render}`, `signedOut ∈ {gate, absent}`).

What the lane builds: the `/a` chrome-matrix browser walker — NEW sibling
scripts riding the shots-fixture idiom (mirror, never edit). Per cell (policy
row × chrome build × theme × {operator cookie, signed out}) it walks a
PRODUCTION `next start` against a throwaway fixture KV and a throwaway
SEAT_SECRET, mints the operator cookie with the REAL
`src/lib/operator-auth.ts` `makeOperatorToken` (never a hand-rolled HMAC),
and asserts what T-416's policy (`scripts/console-matrix.routes.json`, the
ONLY oracle) declares: `redirect` → a redirect to `/a`, never a render;
`render` → HTTP 200, non-empty, no error boundary, no 500;
`alwaysRedirectTo` → the redirect lands on the named target; signed out →
the OperatorGate renders, never a crash; `pending` rows asserted
as-declared-today with the note printed beside the cell. Under the SITE
chrome only: Astra §6 computed-style probes (no `.scar-*` DOM nodes, no
Retronoid / `--font-console` / pixel faces in computed styles) plus ONE
client-navigation step per build. Ports ONLY from argv (the four lane ports,
A..A+3 — app, fixture KV, two reserves verified free before AND after);
missing ports = hard refusal. Puppeteer is borrowed at runtime from
`~/dev/apps/puck-studio/node_modules` — NEVER added to package.json, a clear
error if absent. `--selftest` points the walker at a scratch fixture server
with deliberately wrong responses and proves the run FAILS and names the
cell. Dynamic segments substitute via the walker's own documented config
(`/a/letters/[key]` → the seeded letter key `welcome`;
`/a/studio/room/[room]` → the literal namespace room `onecocreation_studio`)
or emit DASH — never a fabricated green. Surprises beyond the policy are
FINDING lines in the report, never assertions. The walker is NOT
gate-riding; the repo's five gate steps stay exactly as they are.

## OWNS

`work-claims/task-418.md` (this file, first commit),
`scripts/console-matrix.cjs` (NEW — the walker),
`scripts/console-matrix.sh` (NEW — the two-build orchestrator). Exactly
three NEW files — the lane's OWNS list, hit exactly. Nothing under `src/`.

READ-ONLY (grounding only, never edited): `scripts/console-matrix.routes.json`
(T-416's policy — the ONLY oracle), `scripts/console-matrix.test.mjs`,
`scripts/shots-fixture.{sh,cjs}`, `scripts/fixture-kv.cjs` (the idiom's
home), `src/lib/operator-auth.ts` + `src/lib/member-auth.ts` (the real
mints), `src/lib/console.ts`, `src/app/a/**`,
`src/components/DisplayFonts.tsx`, `src/app/kit.css`, `src/app/house.css`,
`src/app/cartridge.css` (the CSS law — computed-style probes name the real
token families only: `--font-console`, the `--scar-*` token block, the
DisplayFonts `--font-retronoid` registration).

## What is NOT in this lane

No file under `src/` touched; no edit of the policy file, the coverage
test, the shots harness, or the fixture KV script (a capability the walker
needs but the fixture lacks = a named Seam in SUMMARY, never a silent
widen). Not gate-riding (K106) — nothing added to the gate. No production
run, ever — fixture KV + throwaway secrets only; the studio room's registry
read is pinned loopback (the fixture seeds `site:config`'s `meeting.vdoHost`
to `127.0.0.1`, so `brand/rooms.json` fails fast on loopback and the room
resolves by its NAMESPACE — no request to the real vdo host). No puppeteer
or browser driver added to package.json. No PNG shots (the shots harness's
job). No source-drift re-count (T-383's/T-415's authority — this lane
asserts what REACHED the DOM). No policy flips (a flip is a 416-file edit
in its own PR). No push, no PR, no merge, no fetch, no rebase, no config —
named `git add` only; Number One merges main into the lane. Block-height
stamps only, no civil dates anywhere, comments included.

## Cut note

Stamp per the brief's cut note, block 968,194 (cut); claimed at block 968,197
(house beacon `https://time.pacsarcade.org/height`).
