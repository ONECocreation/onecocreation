# work-claim — task-332 (the LettersRoom `readable` seam — mailbox rows with no read door render honestly, not as dead links)

Lane: home crew (Number One sonnet sub-agent, H128). Base = onecocreation main @ **1495428 or newer**. Branch `feat/task-332-letters-readable-seam`.
Worktree cut by Number One; `npm ci` already done. Lane ports **4474–4477**. GO: `~/dev/home/inbox/TASK-332-oc-letters-room-readable.md`.

OWNS: `src/app/api/me/letters/route.ts` (the map + import only), `src/components/LettersRoom.tsx` (`Entry` interface + the `:98-114` row block only), new test file `tests/letters-readable-seam.test.ts`, this claim.

READ-ONLY: `src/lib/letters.ts` (`isLetterKey` imported, not modified), `src/lib/mailbox.ts`, `src/lib/mail-studio-invite.ts`, `src/app/letters/[key]/page.tsx`, `src/app/a/letters/**`, `src/components/me/ConstellationCard.tsx`, `src/components/BeInTheKnow.tsx`, `src/lib/puck-blocks/letters-room.tsx`.

Forbidden: env/KV, deploy steps, BFT/date math, any change to `isLetterKey`'s own logic or `EDITABLE_LETTERS`.

cut 0018.06.26 a₿, built 0018.06.27 a₿
