# TASK-277 claim — ONE Cocreation: reroute template default space key "frens" (HB-3, H107, A)

- Claimant: Number One (home crew, sonnet)
- Base sha: 41c6312dd9737027761c816e79e47d6190432be (main)
- Branch: feat/task-277
- Worktree: /home/pac/dev/worktrees/task-277
- Ruling: H107 A, 0018.06.25 a₿ · block 967,125
- Runs beside T-276 (owns FrenProfile.tsx classNames) — this lane reads FrenProfile.tsx only, never edits it.

## Owns
- src/lib/identity-config.ts — read/verify only unless step 4 of the brief applies
- src/components/FrenProfile.tsx — read/verify only unless step 4 applies
- work-claims/task-277.md

## Not-owns
- SPACE_HOSTS/OC_DEFAULT/SPACE_NAME/spaceForHost() in identity-config.ts (already fixed by T-270)
- SPACE_ROLES table (arcade registry data, untouched per ruling)
- src/lib/console.ts (T-270's voice lane)
- src/app/u/[handle]/page.tsx host-redirect guard (routing, not identity default)
- component renames (FrenChip/FrenMenu/FrenProfile/etc. — T-278)
- Ms. Kimi's live lanes (puck-seeds.ts, puck-blocks/**, page-states.ts, style/**, PuckEditor.tsx, app/packages/**, app/style/**)

Expected outcome: verification-only per brief's re-scope note (T-270 already fixed the default).
