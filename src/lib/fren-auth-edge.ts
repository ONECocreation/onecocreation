/**
 * TASK-279 (0018.06.25 a₿) — compat shim. The real Edge implementation
 * moved to `./member-auth-edge.ts` (HB-1, H105 A): `FREN_COOKIE` renamed
 * to `MEMBER_COOKIE` (value stays `"pa-fren"`, unchanged);
 * `verifySessionTokenEdge`/`hasValidSessionEdge` carried no "Fren" in
 * their names, so they're unchanged. This file re-exports EVERYTHING
 * member-auth-edge.ts exports — including its own re-exported old-name
 * alias — so `tests/fren-auth-edge.test.ts` (unowned by this lane) and any
 * importer still on `@/lib/fren-auth-edge` keep working unchanged.
 * Re-exporting an Edge-safe file from another Edge-safe file introduces no
 * drag-in risk — only importing from the NODE `fren-auth.ts`/
 * `member-auth.ts` would (see member-auth-edge.ts's own docblock).
 * `src/middleware.ts` has been migrated to import `@/lib/member-auth-edge`
 * directly — it no longer uses this shim.
 */
export * from "./member-auth-edge";
