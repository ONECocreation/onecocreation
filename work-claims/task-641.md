# WORK-CLAIM - T-641 - ONE Cocreation: the Q&A respond pop-up picture crop (FIX)

CLAIMED-BY: Number One's builder, block 973,997, on the Admiral's pin in forge set
oc-t603-build-1 (`04-respond-t603b-dawn-1440.png`, x 0.503 y 0.254: "the top and
bottom feel cut off. it's liek the model is not properly sitting in the box"),
dispatched in K185 item 4: the picture in the Read-and-respond pop-up must sit
WHOLE in its box (no crop top or bottom) at 1440 and 390.
BRANCH: `fix/task-641-respond-picture`
WORKTREE: `~/dev/worktrees/task-641`

Finding at claim time: the crop he pinned is the PRE-PORTAL state — T-603's own
follow-up fix `a288c1b6` ("the Read and respond window opens over the page, not
inside the card", merged with #177) already portals the window to document.body,
and a live probe on this lane's tree (current main 6d2d8bd2) measures the sheet
whole at both widths and both themes (23px clearance top and bottom, nothing
scrolled or clipped). The fix set he was never shown (`shots-build-fix`) covered
night only — his pinned shot is dawn. This lane therefore lands the REGRESSION
PIN that keeps the window portaled (a source pin, the repo's own idiom), and the
full before/after proof set at 1440 + 390 in night AND dawn on both surfaces
(the questions room and the stage sheet).

## OWNS
- `work-claims/task-641.md` (this file)
- `tests/qa-respond-window.test.ts` (NEW — the source pin: the respond window
  is portaled to document.body, never rendered inside the room card, and the
  Sheet keeps its viewport cap so the box can never outgrow the screen)
