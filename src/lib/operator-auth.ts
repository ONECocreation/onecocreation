import { createOperatorAuth } from "@pacsarcade/operator-auth";
import { sessionsFromCookieHeader } from "./fren-auth";

/**
 * Operator auth — the injection shim. The package is brand-neutral; this
 * site's config enters here, from her own repo, and nowhere else: the
 * OPERATOR_NPUBS / OPERATOR_EMAILS allowlist envs, the SEAT_SECRET HMAC
 * source, the `fe-operator` cookie name, and the fren-session reader the
 * email seat rides. Every consumer imports from this file, unchanged.
 */

export const {
  OPERATOR_COOKIE,
  operatorsConfigured,
  isOperatorNpub,
  isOperatorHex,
  verifyOperatorLogin,
  makeOperatorToken,
  verifyOperatorToken,
  operatorFromCookieHeader,
} = createOperatorAuth({
  npubsEnv: "OPERATOR_NPUBS",
  emailsEnv: "OPERATOR_EMAILS",
  secretEnv: "SEAT_SECRET",
  cookieName: "fe-operator",
  frenSessionsFromCookieHeader: sessionsFromCookieHeader,
});
