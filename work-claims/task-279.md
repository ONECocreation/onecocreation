# TASK-279 claim

Owner: home crew (sonnet)
Base sha: f16cb62
Branch: feat/task-279
Ruling: H105 A, 0018.06.25 a₿ · block 967,125

## OWNS
- `src/lib/member-auth.ts` (new)
- `src/lib/member-auth-edge.ts` (new)
- `src/lib/fren-auth.ts` (becomes compat re-export)
- `src/lib/fren-auth-edge.ts` (becomes compat re-export)
- `src/middleware.ts` (one import line)
- the 26 importer files named in TASK-279 step 4
- `work-claims/task-279.md`

## NOT-OWNS
- the cookie NAME/value `pa-fren` (unchanged, later lane)
- `/api/frens/*` route PATHS (T-280, untouched — only handlers' internal
  imports move here)
- `tests/fren-auth-edge.test.ts` (unowned unless the recommended-but-optional
  addition is taken, and then only additively)
- Ms. Kimi's live lanes (puck-seeds.ts, puck-blocks/**, page-states.ts,
  components/style/**, PuckEditor.tsx, app/packages/**, app/style/**)
