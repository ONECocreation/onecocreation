# work-claims/task-394.md — task-394 (ONE Cocreation: real names, not "Package A")

Lane: the home crew (Sonnet builder, under Number One's gate). Base = onecocreation main
`11ef2f46341eb8d2b403cdd9d3c86bc769260001` (PR #46 on #45 — TASK-393's merge `fa248c4` — on #44
on #43), cut at block 968,138. Branch `feat/task-394-real-package-names`. Worktree
`~/dev/worktrees/task-394` (cut by Number One), `npm ci` already done. Lane ports **4670–4673**.
Brief: `~/dev/kimi/inbox/TASK-394-oc-real-package-names.md`.

Claimed at block 968,140 (house beacon, fresh read at claim time).

## OWNS

- `work-claims/task-394.md` (NEW, this file)
- `src/components/sections.tsx` — the `label()` arrow at `:442` only (the `Package ${min}` arm
  becomes a `TIERS` lookup; the `"all"` arm untouched) — every other line byte-identical
- `src/lib/puck-seeds.ts` — the six seed lines `:382-384,:391-393` only (their "· Package A/B/C"
  tails become the real tier names) — every other line byte-identical
- NEW `tests/package-names.test.ts` (the pins: source-level + a real render of `Classes()` +
  the wide grep as a test)

## READ-ONLY (grounding, never edited)

`src/lib/entitlement.ts` (`TIERS`, the source of truth), `src/lib/matrix-rooms.ts`
(`PACKAGE_FALLBACK`, `ROOMS`), `src/lib/tiers-content.ts` (`TIER_PAGES` — TASK-393's), `src/app/packages/*`,
`src/components/rooms/PackageRoomsCard.tsx`, `src/app/page.tsx`.

FORBIDDEN (per brief): inventing any name not in `TIERS`; renaming a tier; editing the store
catalog or any vault data; a vault migration; any CSS change; any new dependency; touching
`tiers-content.ts`; any civil-date stamp.

Block height at claim: 968,140.
