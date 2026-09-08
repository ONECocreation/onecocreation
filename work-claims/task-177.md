# WORK CLAIM — task-177

- **Lane:** kimi
- **Task:** TASK-177 — the item page wears the ShinePages product layout, and knows you are signed in
- **Base:** 72bf77f (OC main at dispatch, 0018.06.18 a₿ · block 966098 — T-173 merged, its hold lifted)
- **Branch:** feat/task-177-item-page

## OWNS

- `src/app/store/[id]/page.tsx` (the two-column product layout, breadcrumb, struck sale price)
- `src/components/store/BuyPanel.tsx` (the session read + the signed-in words; T-173's guest words kept verbatim)
- NEW `src/components/store/RelatedItems.tsx`
- NEW `src/lib/session-read.ts` (no shared helper module exists — the header's FrenBadge reads
  `/api/frens/session` + `/api/member/profile` inline; this helper wraps that same read)
- `tests/` (new pins)
- `work-claims/task-177.md` (this file)

Forced edits (if any) will be justified one line each in the SUMMARY.
