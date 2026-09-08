# WORK CLAIM — task-173

- **Lane:** kimi
- **Task:** TASK-173 — meditation receipt letter + download unlock without a second sign-in ceremony
- **Base:** 1d75896 (OC main at dispatch, 0018.06.17 · block 966094)
- **Branch:** feat/task-173-meditation-receipt

## OWNS

- `src/lib/letters.ts` (one new key `order-receipt` + default words)
- NEW `src/lib/order-receipt.ts` (send + token)
- `src/lib/store.ts` (settle hook, one call)
- `src/app/api/store/checkout/route.ts` (return URL carries the key)
- `src/app/store/order/[id]/page.tsx` + `src/components/store/OrderStatus.tsx` (key + stamps + "email me my key" door)
- `src/components/store/BuyPanel.tsx` (words only)
- `src/app/api/store/download/[orderId]/route.ts` (only if the session helper needs a call there)
- `tests/` (new pins)
- `work-claims/task-173.md` (this file)

Forced edits (if any) will be justified one line each in the SUMMARY.
