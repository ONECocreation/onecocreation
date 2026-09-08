# work-claims/task-188 — the Site room breathes: accordion under "Site" + menu editor drag-and-drop

- LANE: kimi · TASK-188 · medium
- REPO: ~/dev/onecocreation · worktree ~/dev/worktrees/task-188
- BRANCH: feat/task-188-site-accordion
- BASE: main @ 7693fb2 (T-186 follow-through + lint, all lanes through T-186 merged; 536 tests / 51 files green at cut)
- STAMP: block 966,112 · 0018.06.18 a₿
- OWNS:
  - `src/components/console/SiteConsoleShell.tsx` — the console sidebar (the /a layout's left rail nav; this clone runs `NEXT_PUBLIC_CONSOLE_CHROME=site`)
  - `src/app/a/site/**` — split into sub-routes (Switches default at /a/site; Menu, Community door, Videos on About under /a/site/<sub>)
  - `src/components/console/NavEditor.tsx` — the menu editor (it lives here, not at src/components/NavEditor*.tsx)
  - NEW `src/lib/nav-edit.ts` — the pure move/nest helpers (`moveRow`, `nestUnder`)
  - tests (new accordion/sub-route/nav-edit tests; the one existing source pin that followed a moved card)
- NOT OWNED (adjacent, untouched): the scar ConsoleShell, src/lib/console.ts registry, CommunityDoorCard, the public NavMenu, any T-185/T-186 files.
- DRAG LIBRARY: @dnd-kit is NOT importable at the top level (puck 0.23 nests @dnd-kit/react@0.4.0 under its own node_modules; no @dnd-kit/core in the lockfile) — the editor uses the house's own HTML5 drag primitives on top of the pure helpers. No new dependency.
