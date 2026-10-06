# WORK-CLAIM - TASK-586 - ONE Cocreation: console room menu becomes a side menu on phones

CLAIMED-BY: Number One's builder, on the Admiral's mark (forge set oc-t552-letters-room-r4, phone shot of /a/letters): "this nav on top looks bad. can we make them a side menu".
BRANCH: `feat/task-586-console-side-menu-phone`
WORKTREE: `~/dev/worktrees/task-586`
BASE: origin/main

THE RULE: on phones (<= 760px, the width the rail already stacked at) the /a room menu is hidden, opened by one "Rooms" button, slides in from the left with a scrim, closes on scrim, Escape, Close and after choosing a room; focus trapped and returned; aria-expanded / aria-controls; current room aria-current. Desktop unchanged. Site chrome only.

## OWNS
- `work-claims/task-586.md` (NEW)
- `src/components/console/SiteConsoleShell.tsx` (menu state + two buttons)
- `src/app/house.css` (the 760px rail rule, replaced)
- `tests/console-side-menu-phone.test.ts` (NEW)

READ-ONLY: everything else (SiteHeader, site-chrome.tsx, ConsoleShell/scar.css, console.ts).

## FOUND, NOT IN THIS LANE
- The public SiteHeader menu is a dropdown of public site links, so the rooms were not folded into it; a separate Rooms button matches the console being its own area.
