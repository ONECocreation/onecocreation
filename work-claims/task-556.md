# WORK-CLAIM - TASK-556 - ONE Cocreation: a "Coming soon" membership stays closed when the Monthly memberships switch goes on

CLAIMED-BY: builder lane for Number One (Number One's finding at block 969,740 while answering the Admiral's question "should i turn on the Monthly Memberships (square) to on?": the store item page and the member API let people pay for a Coming soon membership once the switch is ON)
BRANCH: `feat/task-556-coming-soon-stays-closed`
WORKTREE: `~/dev/worktrees/task-556`
BASE: origin/main `db563fe` (merge of PR #146)

## OWNS
- `work-claims/task-556.md` (NEW)
- `src/lib/tier-open.ts` (NEW)
- `src/lib/subscription-route.ts`
- `src/lib/subscription-ui.ts`
- `src/app/api/member/subscription/route.ts`
- `src/app/api/member/subscription/upgrade/route.ts`
- `src/app/api/member/subscription/cancel/route.ts`
- `src/app/api/member/subscription/undo-cancel/route.ts`
- `src/app/store/[id]/page.tsx`
- `tests/tier-open-556.test.ts` (NEW)
- `tests/subscriptions.test.ts` (mocks tier-open to open)

READ-ONLY: everything else (subscriptions.ts, the webhook, the plan map, JoinWithCard.tsx, MembershipPanel.tsx untouched).
