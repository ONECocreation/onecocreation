# WORK-CLAIM - T-637 - ONE Cocreation: the Collaborations + doTERRA menu tabs (BUILD)

CLAIMED-BY: Number One's builder, block 972,825 (0018.08.08 a₿), on K181 lane 2 and
Love's texts (972653, uid 98): "add a Collaborations tab - sub tab 'Universally Local',
with a drop menu of: Local artist, Local practitioners, Stay Locally, map link here for
these - next to Collaborations, a doTERRA tab - a link to her personal doTERRA set up -
maybe a pop-up with a scan code when they click the link."
BUILD ruled on K185 item 1 (block 973,977), the Admiral's B on the mockup: "there were a
few changes for the placement of the qr. other than that ok to build" — the pop-up and
its scan code centred both ways at 1440 and 390 (his pins on oc-t637-collab-doterra-1);
Number One's note stands: the doTERRA tab label matches the other tabs (size and case).
BRANCH: `feat/task-637-collab-tabs` (rebuilt on origin/main 6d2d8bd2 per LESSONS 971,280)
WORKTREE: `~/dev/worktrees/task-637-collab-tabs`

## OWNS
- `work-claims/task-637.md` (this file)
- `src/lib/collab-tabs.ts` (NEW — Love's seam: the two placeholders she replaces)
- `src/components/NavMenu.tsx` (the two tabs in buildDefaultMenu + the doTERRA click pop-up)
- `tests/nav-config.test.ts` (the T-637 pins; the T-615 pinned menu order gains two tabs)
- `tests/site-config.test.ts` (PIN FIX BY NAME, LESSONS 971,280: its default-menu order
  pin gains the same two tabs — the menu this lane changes is the menu it pins)

READ-ONLY: site-config.ts (KNOWN_NAV_HREFS needs no new entries — isOpenNavHref already
admits the /collaborations/* paths and https rows, T-620's ruling), nav-edit.ts (the
one-level nesting law stands; "Universally Local" rides as the drop's first row),
NavEditor.tsx (the board shows the menu as saved; the new tabs reach it through the
default menu or Love's own rows).
`src/app/house.css` (WIDENED at the design-drift gate: the build lane owns the pop-up's
real classes — `.doterra-*`, prefixed, no collisions — and the phone sheet's scroll cap;
the mockup's inline-style carry-over was mockup-only, the drift law is "use a class from
kit.css or house.css and a token from cartridge.css; never raise the ceiling").
