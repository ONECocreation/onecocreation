/**
 * T-541a: the STRICT Origin check for state-changing routes. The older
 * `sameOrigin()` helpers (e.g. api/admin/booking) accept a MISSING Origin
 * as "a non-browser caller"; for a route that spends or cancels a member's
 * money that is CSRF bait (SECURITY-SCOPE risk 8). Here a missing, opaque
 * ("null"), malformed or foreign Origin is refused; only an Origin whose
 * host equals the request's own host passes.
 */
export function strictSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
