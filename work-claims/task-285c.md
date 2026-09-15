# work-claim — task-285c (ONE Cocreation consumes the neutral scope: six URLs, six imports, three config lines)

Lane: home crew (sonnet). Base = onecocreation main @ **57bba3a** (the T-293 merge — the GO's cut
point; `git merge main` runs again before final gates). Branch `feat/task-285c`. Worktree cut
by Number One, `node_modules/.bin/vitest` present at claim time. Lane ports **4342–4345**.
GO: `~/dev/home/inbox/TASK-285C-oc-consume-frens-earth.md`.

Ruling: H108 A + `@frens-earth` 0018.06.25 a₿ · block 967,160 — the six PacsArcade releases
(puck-studio: plugin-rails-v0.4.0 · presence-v0.2.0 · puck-changelog-v0.2.0 · puck-config-v0.14.0 ·
variant-engine-v0.4.0; arcade-ui: arcade-ui-v0.5.0; assets `frens-earth-<pkg>-<ver>.tgz`) exist on
GitHub now — this lane moves ONE Cocreation's six `@pacsarcade/*` dependency keys, imports, and
config lines to `@frens-earth/*`. `@onecocreation/operator-auth` and `@onecocreation/page-store`
(T-281) stay untouched in scope, but their `package.json` values must remain intact.

Re-checked `work-claims/` at cut: no `task-295.md` present — T-295 has no worktree cut yet, so no
live claim collides with the Ms. Kimi files (`PuckEditor.tsx`, `components/style/**`,
`puck-seeds.ts`, `puck-blocks/**`) this lane's import-line rename also touches.

## Build (GO verbatim)
1. `package.json`: the six `@pacsarcade/*` dependency keys → `@frens-earth/*` with the NEW
   release-asset URLs. Verify each URL answers 200 with `curl -sIL` before writing it.
   `@onecocreation/operator-auth` + `@onecocreation/page-store` stay.
2. `npm install` regenerates `package-lock.json` (never hand-edit); read the diff: only the six
   entries + their subtrees.
3. `next.config.ts` `transpilePackages`: the six entries → `@frens-earth/*`.
4. `src/app/globals.css:4,7`: `@import`/`@source` → `@frens-earth/arcade-ui` — prove the Tailwind
   v4 `@source` scan still finds the classes in the shots.
5. Every `@pacsarcade/<one of the six>` import under `src/`, `tests/`, `scripts/`, `packages/` →
   `@frens-earth/…`; `grep -rn "@pacsarcade/" src tests scripts packages package.json
   next.config.ts` must end at ZERO — paste it. Comment-only mentions move too.
6. Ms. Kimi's files carry these imports too — import-line-only mechanical rename, sanctioned
   minimal-forced-edit, called out per file in the SUMMARY.
7. Extend `tests/package-scope-onecocreation.test.ts` (T-281's pin) — no `@pacsarcade/` key in
   package.json at all now; every `transpilePackages` entry resolves to an installed package.
8. Shots both themes × 1440/390 — the site must look IDENTICAL.

## OWNS (GO verbatim)
`package.json`, `package-lock.json`, `next.config.ts`, `src/app/globals.css` (lines 4,7), the
import lines named in step 5 (listed per file in the SUMMARY), `tests/package-scope-onecocreation.test.ts`,
`work-claims/task-285c.md`.

## Gates (verbatim)
`npx vitest run` · `node scripts/calendar-view.test.mjs` · `node scripts/cartridge-identity.test.mjs`
· `node scripts/square-payments.test.mjs` · `npx eslint src tests --max-warnings=0` → 0 ·
`npx tsc --noEmit` · `npx next build` · `grep -rn "@pacsarcade/" src tests scripts packages
package.json next.config.ts` → zero · shots read identical.

— home crew (Claude Fable 5.1), 0018.06.25 a₿ (block 967,160 at cut)
