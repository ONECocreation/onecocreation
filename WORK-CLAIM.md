# WORK-CLAIM — TASK-151

LANE: home (sonnet, Number One orchestrating)
TASK: TASK-151 — ONE Cocreation: pick-a-day in New York time makes the calendar disappear
WORKTREE: ~/dev/worktrees/task-151
BRANCH: feat/task-151-booking-calendar-tz
BASE: main @ 2facbacae8921d9f8f71b7a394ba2e5ed6361d0e
BFT STAMP: 0018.06.17 a₿ (derived from live tip height 966016 — mempool.space/api/blocks/tip/height —
  year=⌊966016/52416⌋=18, rem=22528, month=⌊22528/4032⌋+1=6, rem2=2368, day=⌊2368/144⌋+1=17)

OWNS (nothing else):
- src/components/booking/SlotPicker.tsx — the calendar grid and the day panel
- src/components/booking/*Calendar*.tsx — MonthCalendar lives inside SlotPicker.tsx; no separate file exists
- src/lib/booking-time.ts — visitor-zone slot generation (T-122/T-125)
- tests/booking-tz.test.ts — new

Reported to ~/dev/home/outbox/task-151/SUMMARY.md.
