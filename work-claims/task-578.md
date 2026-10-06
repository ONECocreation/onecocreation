# WORK-CLAIM - TASK-578 - ONE Cocreation: front-page long dash (A13) and clearer switch names

CLAIMED-BY: Number One's builder, on the Admiral's word at block 970,203: A13 front-page long dash, and "ok to rename the switches to be more clear."
BRANCH: `feat/task-578-dash-and-switch-names`
WORKTREE: `~/dev/worktrees/task-578`
BASE: origin/main `61c160a9`

THE RULE: the hero line reads "Every Saturday at 1:11 PM Mountain. Live with Love, free." On /a/site the Square switches read "Card checkout (one-time payments)" (key square) and "Monthly memberships (recurring billing)" (key subscriptions). Keys and stored settings unchanged.

## OWNS
- `work-claims/task-578.md` (NEW)
- `src/components/sections.tsx` (line 125 only)
- `src/app/a/site/SiteRoom.tsx` (two labels)
- `src/components/console/CardsRailCard.tsx` (one label)
- `src/components/console/NavEditor.tsx` (one label)

READ-ONLY: everything else (no tests pinned the old strings).

## FOUND, NOT IN THIS LANE
- Other user-visible long dashes in sections.tsx remain: hero story "solo adventurer for a while now — like most" and "gather together — to bring kindness"; package lead "Three ways into the field — each includes everything before it"; kicker "The Heart Field — Where Heaven and Earth Meet"; "Wire-wrapped pendants, made one at a time — copper..."; "Physical goods — each piece..."; "Pick a time — you're held."; "Matrix-powered — paying..."; "Your own luminous rooms — powered by Matrix — an open protocol"; newsletter lines "— a free guided meditation" and "inbox — on the house"; "Support This Work — Gently"; package feats "4× a month" line; and several story/checkout strings. Not changed.
