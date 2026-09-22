/**
 * TASK-388 (block 968,088) — ReadingSignUp's pure state, node-testable
 * without jsdom (vitest.config.ts:22 runs environment "node"; the house
 * idiom named in the brief's Tests section: `src/components/me/
 * session-state.ts` + `tests/me-signed-out.test.ts`, "pin the MODEL, not
 * the render"). TWO independent pure pieces:
 *
 *  - `classifySignUpKind` — which control the block shows, derived from
 *    the shared session snapshot (`useMemberSession()`'s own
 *    `checked`/`member`), mirroring `classifyMeState`'s "unchecked ->
 *    loading" rule: a pending session classifies as `"loading"` — never
 *    the signed-out form flashed before the session resolves.
 *  - `reduceSubmit` — the submit machine: a second `submit` while a POST
 *    is already `pending` is a no-op (duplicate-click suppression); a
 *    `failure` lands in an honest `error` state that a further `submit`
 *    always leaves (never a throw, never a spinner stuck forever).
 *
 * Deliberately decoupled from `@/hooks/useMemberSession`'s own
 * `MemberSession` type (only the one field either function reads,
 * `space`) and from `ReadingTagOutcome`'s three shapes, mirroring
 * `session-state.ts`'s own `SessionCheckResult` — a narrow, local shape,
 * not an import of the hook's full surface.
 */

export type SignUpKind = "loading" | "member" | "member-key" | "guest";

export interface SignUpSession {
  checked: boolean;
  member: { space: string } | null;
}

/** `checked: false` -> `"loading"` (ReadingSignUp renders null for this,
 *  same as the "off" notice state — Build step 1) — never the signed-out
 *  form flashed before the session resolves. A key-signed member
 *  (`space !== "email"`) is `"member-key"` (decision B: the email field,
 *  never a silent skip); no member at all is `"guest"`. */
export function classifySignUpKind(session: SignUpSession): SignUpKind {
  if (!session.checked) return "loading";
  if (!session.member) return "guest";
  return session.member.space === "email" ? "member" : "member-key";
}

/** The subscribers rail's three honest outcomes (Ground — `addReadingTag`,
 *  subscribers.ts): a fresh or newly-tagged join, an already-tagged
 *  no-op, or a preserved opt-out that is never silently resubscribed. */
export type ReadingTagOutcome = "joined" | "already" | "unsubscribed";

export type SubmitState =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "done"; outcome: ReadingTagOutcome }
  | { kind: "error"; message: string };

export type SubmitEvent =
  | { type: "submit" }
  | { type: "success"; outcome: ReadingTagOutcome }
  | { type: "failure"; message: string };

export const INITIAL_SUBMIT_STATE: SubmitState = { kind: "idle" };

/** Duplicate-click suppression: a second `submit` while already `pending`
 *  returns the SAME state, unchanged — never a second in-flight request.
 *  A `failure` always lands in `error`, which a further `submit` always
 *  leaves (never stuck) — the same "always allowed to retry" shape
 *  `me-signed-out.test.ts`'s error branch pins for `MeSwitch`. */
export function reduceSubmit(state: SubmitState, event: SubmitEvent): SubmitState {
  switch (event.type) {
    case "submit":
      return state.kind === "pending" ? state : { kind: "pending" };
    case "success":
      return { kind: "done", outcome: event.outcome };
    case "failure":
      return { kind: "error", message: event.message };
  }
}
