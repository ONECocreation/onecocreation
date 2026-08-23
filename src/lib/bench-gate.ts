/**
 * THE BENCH GATE (S26 lane 3) — the one switch every bench-only affordance
 * hangs off. Both halves must hold: this is NOT a production build, AND the
 * operator explicitly opted in on their own machine (STUDIO_BENCH=1). Two
 * layers enforce it: the studio layout only MOUNTS bench UI when this says
 * yes, and each bench route handler re-checks it and 404s bare when it says
 * no. Auth is never involved — the bench touches storage/seeding only, and
 * the production auth paths change by zero bytes.
 */
export function benchEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.STUDIO_BENCH === "1";
}
