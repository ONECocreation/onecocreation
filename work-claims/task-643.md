# WORK-CLAIM - T-643 - ONE Cocreation: the weekly next-reading letter, item order (CHECK then FIX)

CLAIMED-BY: Number One's builder, block 974,078, on the Admiral's pins in forge set
oc-t601-letter (marked 974,067 on OLD shots), dispatched in K187 item 2:
- `next-reading-390.png` (x 0.594 y 0.263 and x 0.712 y 0.232): "move the item 1
  to item 2 position. item 3 can be bolded to show the date time."
- `next-reading-r2-390.png`: "better up top. make the button centered. i think we
  fixed this already."
BRANCH: `fix/task-643-next-reading-order`
WORKTREE: `~/dev/worktrees/task-643`
PORTS: 6160-6163

Findings at claim time (current main 7bc9487e, rendered through the real
`letterHtml`):
- Pin 2 (date-time bold) - DONE ON MAIN by T-601 round 2 (#162): the reading
  paragraph carries `**${when}**`, rendered `<b>`.
- Pin 3 (button centred, up top) - DONE ON MAIN: the `!pill:` rides inline under
  the first paragraph (#162 r2) and T-633 (#173) centres every pill in its own
  `align="center"` table row.
- Pin 1 (item 1 to item 2 position) - NOT DONE: main still leads with "The next
  reading is ..." and puts "Missed one? Every replay ..." second. His pins sit on
  the two paragraphs (y 0.232 on the reading paragraph, y 0.263 on the replay
  paragraph): the replay block (paragraph + "Watch the replays" link, one unit)
  goes first, the reading block (paragraph + its `!pill:` time button, one unit)
  follows. The button stays "up top" of the letter's body under its own
  paragraph, the r2 arrangement he approved.

## OWNS
- `work-claims/task-643.md` (this file)
- `src/lib/reading-week-drafts.ts` (the nextReadingLetter body order)
- `tests/reading-week-drafts-534.test.ts` (the order pins move with the swap,
  pinned by name inside OWNS per the standing lesson)
