# TASK-225 claim — the room word goes out as PUT

Lane: home crew (sonnet) · tiny · cut 0018.06.23 a₿ (block ~966,890)
Worktree: ~/dev/worktrees/task-225 · branch lane/task-225 · base main @ 1db98ef

OWNS (per brief):
- `src/lib/matrix.ts` — `postToRoom()` only
- the new test file `tests/matrix-post-to-room.test.ts`

NOT owned / not touched:
- `src/app/api/admin/live/route.ts` (the live route)
- `src/lib/room-pins.ts` (the pinned welcome)
- `src/components/rooms/RoomView.tsx` (already correct — PUT)

Change: `postToRoom` sends `call("POST", …)` where the Matrix client-server
spec requires `PUT /_matrix/client/v3/rooms/{roomId}/send/{eventType}/{txnId}`.
POST-with-txnId matches no servlet on Synapse → 404 M_UNRECOGNIZED. Fix is a
one-word method change, POST → PUT, txnId stays as the idempotency key.

Baseline at cut: `npx vitest run` → 78 test files passed, 790 tests passed.
