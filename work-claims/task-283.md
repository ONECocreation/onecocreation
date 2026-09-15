# work-claim — task-283 (ONE Cocreation: the Dependabot seventeen, bumps A1–A4 + B1–B3)

Lane: Ms. Kimi (sub-agents, serial — one bump, one commit, full gates, then the next). Base =
onecocreation main @ **154604e** (the T-233 merge, per the GO header). Branch `feat/task-283`.
Worktree already cut by Number One, `node_modules` installed (`node_modules/.bin/vitest` present,
verified at claim time). Lane ports **4290–4293**.

Ground: `~/dev/kimi/outbox/task-265/AUDIT.md` §"Proposed bump order" 1–5 (this crew's own audit).
`npm audit --json` re-run at cut (main moves).

## Order (GO verbatim)
1. A1 `next` 16.2.11 → 16.3.5 (the four criticals) — read the 16.3 release notes for breaking
   changes touching `next.config.ts`, middleware/edge (`src/middleware.ts`, `member-auth-edge.ts`),
   `force-dynamic`, `next/font`. Gate + shots (home, /about, /a operator fixture, /style) both
   themes 1440/390.
2. A2 `overrides.next.sharp` 0.35.3 → 0.35.4 — gate + one `/_next/image` smoke (200, webp/avif).
3. A3 `nodemailer` ^9.0.3 → ^9.1.1 — gate; `src/lib/mail.ts` only importer; run `tests/*mail*`
   explicitly and paste.
4. A4 `@tiptap/core` → 3.30.5 via nested override under `@puckeditor/core@0.23.0` — verify ONE
   version resolves (`npm ls @tiptap/core`). Gate + /style shots (canvas open, rich-text block
   selected) both themes.
5. B1–B3 lockfile-only (`js-yaml` 4.3.2, `browserslist` 4.28.7, `baseline-browser-mapping`
   2.11.0) — `npm audit fix` (no `--force`) or targeted `npm update`; diff must be
   `package-lock.json` only. Gate.
6. Then `npm audit --json` (counts) + `gh api …/dependabot/alerts --paginate` re-read, both pasted.

## OWNS (GO verbatim)
`package.json`, `package-lock.json`, `work-claims/task-283.md`, one new test file if a bump needs
a pin. NOT `src/**` (a bump needing a source change = flag-and-stop, exact diff in Seams). NOT
`vitest` (T-284). NOT the six `@pacsarcade/*` tarball deps (T-281's country).

## Shot harness
T-282 (shared in-repo harness) has NOT landed on main yet (no `scripts/shots-fixture.*` at base).
The GO's named copy source (`~/dev/home/archive/task-278/patches/task-278/shots/`) holds PNGs +
SUMMARY only — the scripts themselves were not archived there. Working copy taken from this crew's
own identical-pattern harness: `~/dev/kimi/archive/task-231/patches/task-231/shots/`
(`run-shots.sh`, `shoot-231.cjs`, `fixture-kv.cjs`, `probe-231.cjs`), re-ported to 4290–4293.
Puppeteer borrowed from `/home/pac/dev/apps/puck-studio/node_modules`, system chromium.

— Ms. Kimi, 0018.06.25 a₿ (block 967,130 at cut)
