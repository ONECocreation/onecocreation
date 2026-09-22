# WORK-CLAIM — TASK-399 (ONE Cocreation · HOUSE — the fixture KV learns the hash commands)

CLAIMED-BY: the home crew (Sonnet), solo lane, no parallel runs.
CLAIMED-AT: block 968,140 (house beacon at claim; cut by Number One at block 968,138 on main `11ef2f46341eb8d2b403cdd9d3c86bc769260001`).
BRANCH: `feat/task-399-fixture-kv-hash-commands`
WORKTREE: `~/dev/worktrees/task-399`
BASE: main @ `11ef2f46341eb8d2b403cdd9d3c86bc769260001` (SUPERSEDING — re-pinned at cut, PR #44/#45/#46 merged; `git rev-parse HEAD` verified against this at claim).
BRIEF: `~/dev/kimi/inbox/TASK-399-house-fixture-kv-hash-commands.md` (K98 Ask 1, drafter Ms. Kimi; the CLAIMED banner + italic "Cut by Number One" line carry the superseding base + the SREM-caller move).
LANE PORTS: none — house lane; the new test probes a free port itself, never a fixed one.

## OWNS
- `work-claims/task-399.md` (NEW, this file — first commit)
- `scripts/fixture-kv.cjs` (additive branches for HGET/HSET/HSETNX/HDEL/HGETALL/KEYS/EXISTS/EXPIRE/PEXPIRE, the `hashes` map, DEL's two added deletes, the docblock command list caught up — every other branch byte-identical)
- `scripts/fixture-kv.test.mjs` (NEW — the house node shape, boots the fixture on a probed free port, kills the child before exit)

## Ground (re-grepped at claim, on `11ef2f4`)
- `scripts/fixture-kv.cjs` confirmed untouched by PR #44–#46: docblock at `:9-10`, port law at `:22-26`, the two stores at `:28-29`, the switch at `:37-57` all held before this lane's edits.
- `src/lib/booking-orders.ts` `claimSlot`'s HSETNX/HGET/HSET path (`:209/:211/:220`) read this session — read-only, untouched.
- SUPERSEDING fact verified this session: the `SREM` caller is `src/lib/subscribers.ts:162` (was `:140` before PR #46 grew that file).
- READ-ONLY, not touched by this lane: `scripts/shots-fixture.sh`, `scripts/shots-fixture.cjs`, `src/lib/booking-orders.ts` and every other `src/` file, everything under `tests/` (including `tests/shots-fixture-harness.test.ts`, whose port-literal pins must keep passing unmodified).

## Named decisions taken (brief's lean, all taken per the CLAIMED banner)
- A — EXPIRE/PEXPIRE are acknowledged stubs returning `1` (the pre-existing `INCR` stub is the house precedent for shaped-truth stubs; no TTL state is kept).
- B — KEYS ignores its pattern argument (no caller in `src/lib` sends one; named in the docblock and in SUMMARY).
- C — no port fallback ever; `FIXTURE_KV_PORT` stays required; the test probes a free port with a throwaway `net` server first, then spawns.
- D — DEL clears all three stores (`store`, `sets`, `hashes`) — real KV drops a key whatever its type.

## AMENDMENT (Astra plan review, Number One) — SUPERSEDING, folded in before build
Landed mid-build, before any commit; incorporated directly rather than built-then-corrected:
- R1 — HSET returns the count of NEW fields: `1` when the field is created, `0` when an existing field is overwritten (value updates either way). The original brief's "sets, returns 1" is withdrawn. Callers at `booking-orders.ts:220`/`:265` overwrite claims and never read HSET's result, so this is safe to be exact about.
- R2 — no ghost keys: HDEL removing a hash's LAST field removes the hash entry itself (EXISTS then 0, KEYS omits it) — `releaseSlot` sends HDEL (`booking-orders.ts:249-253`).
- R3 — test hygiene: bounded readiness poll (≤5s), every request bounded (≤2s), the child's `error`/`exit` handled so a lost probe-to-spawn race fails with a plain message, never a hang; child killed in a `finally`.
- R4 — the test checklist covers the OLD branches too: SREM, INCR (pinned as a stub), DEL clearing a SET (not just a hash/value).
- R5 — the docblock now says, in words, what this fixture cannot validate: SET's `EX`/`PX`/`NX PX` options are accepted and ignored (`email-auth.ts:49-52`, `mail.ts:109-113`), INCR is stateless, EXPIRE/PEXPIRE are stubs.
- R6 — the docblock's command list is the contract; the test drives every command on it, not just the `src/lib` grep's subset.
- Kept unchanged: HSETNX's no-overwrite `1`/`0`; HGETALL's flat shape (content asserted, not order); the `{ result: … }` envelope; the loopback bind; the mandatory explicit port; KEYS ignoring its pattern.

## Standing clauses acknowledged
Claim file first (this file, named add only) · one commit per logical step · named `git add` only, never `-A`/`.`/a glob · commits authored `git -c user.name="Pac" -c user.email="pac@pacsarcade.org" commit` · never `git config`/`merge`/`pull`/`fetch`/`push`/`gh pr`/`rebase` · block-height stamps only, no civil dates anywhere · gates run in the worktree, all five green before hand-back · SUMMARY filed to `~/dev/kimi/outbox/task-399/SUMMARY.md` (or inlined in the final report if the Write tool refuses it) · never widen scope beyond OWNS above.
