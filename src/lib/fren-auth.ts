/**
 * TASK-279 (0018.06.25 a₿) — compat shim. The real implementation moved to
 * `./member-auth.ts` (HB-1, H105 A): the four Fren-named exports renamed
 * (`FREN_COOKIE` → `MEMBER_COOKIE`, `verifyFrenLogin` → `verifyMemberLogin`,
 * `makeFrenToken` → `makeMemberToken`, `frenFromRequest` →
 * `memberFromRequest`); the cookie NAME/VALUE stays `"pa-fren"`,
 * byte-identical, unchanged. This file re-exports EVERYTHING member-auth.ts
 * exports — including its own re-exported old-name aliases — so any
 * importer still on `@/lib/fren-auth` keeps working unchanged, with the
 * real logic living in exactly one place (no drift risk between two
 * implementations). New code should import `@/lib/member-auth` directly.
 */
export * from "./member-auth";
