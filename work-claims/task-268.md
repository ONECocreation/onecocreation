# WORK-CLAIM — TASK-268 (ONE Cocreation brand walk · L1 meta)

CLAIMED-BY: Number One (Claude Fable 5.1), solo lane, no parallel runs.
CLAIMED-AT: 0018.06.24 a₿ (block 967,054).
BRANCH: `feat/task-268`
WORKTREE: `~/dev/worktrees/task-268`
BASE: main @ `7b352e1` (T-264 follow-through merged) — re-verified at claim time (`git log -1` on the worktree matched).
BRIEF: `~/dev/home/inbox/TASK-268-oc-brand-walk-meta.md`

## Ground (re-grepped at claim, from the T-263 census)
- OWNS files: `package.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `vercel.json`, one new test.
- `package.json:64` description — census row (bin D, `readme-meta`): "leave — sanctioned: lineage line, description already leads with OC." Already reads "One Cocreation — Love's site, cloned from the frens.earth store framework." — matches house casing (`layout.tsx:83` title "One Cocreation"). No edit.
- `package.json:28-35` — the eight `@pacsarcade/*` dependency names/tarball URLs are bin B (HOLD, HB-cards) — untouched.
- `next.config.ts:6` — comment "@pacsarcade/* packages ship raw TS" (census: C, "reword when @pacsarcade rename ruling lands") — rename hasn't landed (bin B hold) → no edit, noted in Seams.
- `next.config.ts:7,29,39` — transpilePackages array + the two `chat.frens.earth` host-matcher VALUES are bin B (HOLD) — untouched, verbatim.
- `next.config.ts:16-25` — the chat-gate docblock: census rows tag these `api-routes` lane, but the brief explicitly calls them into this lane's scope ("re-voice its comment only ... do NOT delete a live rewrite"). Plan: reword "fren-session" → "member session" (row :18) and "frens" → "members" (row :19) as pure vocabulary; trim the arcade-vs-OC lineage aside at :17 (census: "trim to OC facts"); leave the literal `chat.frens.earth` DNS/Vercel-project facts at :20-21 as-is — census marks those "update with chat-host rename ruling" (no ruling exists yet; whether OC even needs this rewrite is an ops question) → flagged in ## Seams, not deleted.
- `vitest.config.ts:13` — comment "@pacsarcade/puck-config ships RAW tsx" (census: C, "reword with package rename") — same bin-B-pending hold as next.config.ts:6 → no edit, noted in Seams.
- `vitest.config.ts:28` — `inline: ["@pacsarcade/puck-config"]` is bin B (HOLD) — untouched.
- `eslint.config.mjs:15` — census row is tagged `transplant-leave`, not `readme-meta`, and its own fix is "C · keep — still-true WHY for the transplant/** ignore." No edit.
- `vercel.json` — zero census rows (no comments in the file; JSON has none to re-voice). No edit; confirmed clean in dehouse-inventory.

## Plan
1. Reword `next.config.ts`'s chat-gate docblock per the Ground section above (vocabulary only, no identifier/route/host renames).
2. Add one new test pinning package.json's description names ONE Cocreation and that no field except the `:64` lineage line says "frens.earth" or "player tag".
3. Run all gates, dehouse-inventory before/after, write SUMMARY.md.

OWNS (per brief): `package.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `vercel.json`, one new test. NOT README.md (T-263), NOT src/**.

LANE-DONE pending build + gates + commit.
