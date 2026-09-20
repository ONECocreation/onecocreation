/**
 * TASK-351 (OC UI kit, lane 3 — REVIEW-K83 folded, RULED item 4) — the pure
 * classifying law pulled out of `useMemberSession`'s fetch handling AND
 * `MeSwitch`'s render decision, so both read the SAME rule once instead of
 * drifting apart. Precedent: `door-machine.ts`'s `reduce`/`proofFor` — pure,
 * directly node-testable, no render needed (this repo's vitest environment
 * is "node", no jsdom: `tests/me-signed-out.test.ts` pins these two
 * functions directly, per the brief's own Build item 5).
 *
 * The real bug this closes (Ground, TASK-351 brief): `/api/member/session`
 * answering 401 (no session — an everyday, honest "signed out") and the
 * SAME fetch throwing, or answering a non-2xx that isn't 401 (a real
 * outage), used to collapse into the exact same branch everywhere in this
 * tree (`MeSwitch.tsx`'s own duplicate fetch, and `useMemberSession.ts:65`'s
 * `.catch`). `classifySessionResponse` is the one place that tells them
 * apart from a raw fetch outcome; `classifyMeState` is the one place `/me`'s
 * own render kind is derived from the shared hook's snapshot
 * (`checked`/`status`) — plain functions, no fetch, no React.
 */

/** What one `/api/member/session` check honestly resolved to. */
export type SessionKind = "signed-out" | "email" | "key" | "error";

export interface SessionCheckResult {
  /** the fetch Response's own `.ok` (a real 2xx) */
  ok: boolean;
  /** the fetch Response's own `.status` */
  status: number;
  /** the parsed body's `space`, only meaningful when `ok` is true and the
   *  body parsed and said `{ ok: true, ... }` — undefined/null otherwise */
  space?: string | null;
}

/** 401 (signed out, normal) is never the same thing as a thrown fetch or a
 *  non-401 non-2xx (the check itself failing, abnormal). `space === "email"`
 *  is the one field that already tells the email door from a key door — an
 *  email sign-in lands a real session through this same route (Ground:
 *  `MeSwitch.tsx`'s own historic `d.space === "email"` check). */
export function classifySessionResponse(res: SessionCheckResult | null, threw: boolean): SessionKind {
  if (threw || !res) return "error";
  if (res.status === 401) return "signed-out";
  if (!res.ok) return "error";
  return res.space === "email" ? "email" : "key";
}

/** What `/me`'s `MeSwitch` renders — derived from the shared hook's own
 *  snapshot (`checked`, the additive `status` field), never a second fetch. */
export type MeKind = "loading" | SessionKind;

export function classifyMeState(snapshot: { checked: boolean; status: "unknown" | SessionKind }): MeKind {
  if (!snapshot.checked || snapshot.status === "unknown") return "loading";
  return snapshot.status;
}
