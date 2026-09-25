# TASK-457 claim

Builder: Number One
Block: 968,543 (Saturday lanes)
Branch: feat/task-457-reading-watch-heart-field
Worktree: /home/pac/dev/worktrees/task-457
Base: 9db8532a23e01f705b2fb8a53d8d976f49fa1f99 (origin/main)
Brief: /home/pac/dev/briefings/oc-sat-lanes-968543/TASK-457-reading-watch-heart-field.md
Governing ruling: the Admiral, block 968,516, tracker notes w482-where-reading + w482-email-to-watch —
/reading keeps its own page; Love only ever goes live in the Heart Field; /reading's Watch controls
become links that send the visitor to `/rooms/heart-field` (sign-in there does the rest). This REVERSES
the earlier ruling that retired the Heart Field doors from /reading.

Baseline vitest at cut (bare tree, before any lane commit): 229 files / 2884 tests, all green.

## OWNS
- `src/components/reading/ReadingStage.tsx` — the body's control branches only (the published, closed,
  ended-while-published and left-while-published control markup inside `ReadingStageBody`). No change to
  the fetching/polling wiring, the Playground banner, the countdown, or the cover `<img>` lines (PR #81
  edits :150-157 — staying off those lines so #81 still merges clean).
- `src/app/a/site/reading/Stage1Card.tsx` — the `published` line in `PHASE_WORDS` only.
- `tests/reading-watch-heart-field-457.test.ts` (new).
- `tests/reading-stage.test.ts` — only the pins that name the words/behaviour this lane changes.
- Any other pin file found to name the changed words (searched at cut: none besides the two above).
- `work-claims/task-457.md`, `work-claims/task-457-register.md`.

## READ-ONLY
Everything else, named explicitly by the brief: `StageView.tsx`, `StoryTimePill.tsx`, `JitsiViewer.tsx`,
`door-machine.ts`, `DoorSheet.tsx`, `middleware.ts`, every `/api` route, `kit.css`, `house.css`,
`src/app/reading/page.tsx` (no change unless a pin needs the page to carry something — none found),
`tests/reading-page.test.ts`, `tests/reading-look.test.ts`, `tests/door-machine.test.ts` (verified only,
not edited — their `/rooms/` pins are about `page.tsx`'s own source, which this lane does not touch).

First commit is this claim. Then red tests (must fail before the build), then the
`ReadingStage.tsx`/`Stage1Card.tsx` build, then the register. No push/fetch/merge/PR; no `.env*` or
secret reads; no ssh; no new dependencies; no deletions; no new CSS class, no inline `style=`, no colour
literal; kit classes only (`kit-btn kit-btn-main`, `kit-btn-row`, `kit-text-quiet`, `kit-body`); no arrow
or emoji on any label; no idle motion. Any needed change outside OWNS is a seam — stop and report it.
