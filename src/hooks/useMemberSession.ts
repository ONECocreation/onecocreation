"use client";

import { useCallback, useSyncExternalStore } from "react";
import { classifySessionResponse, type SessionKind } from "@/components/me/session-state";

/**
 * The member session, shared: one /api/member/session fetch per page load,
 * one source of truth for every header piece (chip, menu, footer) and the
 * profile editor. A module-level external store — sign-out or a door
 * switch in one corner updates every subscriber, no stale "you're in".
 */

export interface MemberSession {
  handle: string;
  space: string;
  /** From the registry — lets the client tune this member's kind-0 signal. */
  npub: string | null;
}

export interface MemberAccount {
  handle: string;
  space: string;
}

/** ADDITIVE (TASK-351, decision 4(a), REVIEW-K83 folded): "unknown" before
 *  the first answer lands, then whatever `classifySessionResponse` (or an
 *  explicit `applyMemberSession` call) resolved to. Tells a normal
 *  signed-out visitor (401) from the check itself failing (network/5xx) —
 *  this hook used to conflate the two (`.catch` below used to set the SAME
 *  `member:null, checked:true` an honest 401 sets). Every existing caller
 *  destructures only the fields it already asks for, so this new field
 *  costs them nothing (SUMMARY confirms each by name). */
export type MemberSessionStatus = "unknown" | SessionKind;

interface SessionState {
  member: MemberSession | null;
  /** Every door signed in on this browser (first = active). */
  accounts: MemberAccount[];
  /** false until the first answer lands — render nothing judgmental before it. */
  checked: boolean;
  /** ADDITIVE (TASK-351) — see MemberSessionStatus above. */
  status: MemberSessionStatus;
}

let state: SessionState = { member: null, accounts: [], checked: false, status: "unknown" };
let fetched = false;
const listeners = new Set<() => void>();

/** TASK-351 decision 2: a session check that hangs forever is the same
 *  class of dishonesty as a silent guess at the answer — bound it, the same
 *  idiom DoorSheet.tsx/SignInCard.tsx already use for the signer's 30s
 *  timeout (`SIGN_TIMEOUT_MS`, signer-doors.ts). A same-origin cookie check
 *  needs far less slack than a human's signer app, so a few seconds is
 *  plenty before this resolves to the error state instead of hanging the
 *  loading beat forever. */
const SESSION_CHECK_TIMEOUT_MS = 8000;

function emit(next: SessionState) {
  state = next;
  listeners.forEach((l) => l());
}

/** LoginPanel (and the door switcher) call this after the server answers so
    the whole header flips without a hard navigation. */
export function applyMemberSession(member: MemberSession | null, accounts?: MemberAccount[]) {
  fetched = true;
  emit({
    member,
    accounts: accounts ?? (member ? [{ handle: member.handle, space: member.space }] : []),
    checked: true,
    status: member ? (member.space === "email" ? "email" : "key") : "signed-out",
  });
}

/** TASK-351 — the one real check, shared by the first subscriber AND
 *  `refresh()`: captures enough of the raw fetch outcome for
 *  `classifySessionResponse` (session-state.ts) to tell "signed out" from
 *  "the check failed" (Ground: today's code only ever asked `r.ok`, so a
 *  401 and a thrown fetch landed in the exact same branch). Bounded by
 *  SESSION_CHECK_TIMEOUT_MS so an unanswered fetch resolves to the error
 *  state rather than hanging forever. */
function runCheck() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SESSION_CHECK_TIMEOUT_MS);
  fetch("/api/member/session", { signal: controller.signal })
    .then(async (r) => {
      const body = r.ok
        ? ((await r.json().catch(() => null)) as
            | { ok?: boolean; handle?: string; space?: string; npub?: string | null; accounts?: MemberAccount[] }
            | null)
        : null;
      const kind = classifySessionResponse({ ok: r.ok, status: r.status, space: body?.space }, false);
      if ((kind === "email" || kind === "key") && body?.handle && body?.space) {
        emit({
          member: { handle: body.handle, space: body.space, npub: body.npub ?? null },
          accounts: body.accounts ?? [{ handle: body.handle, space: body.space }],
          checked: true,
          status: kind,
        });
        return;
      }
      /* a 200 that doesn't parse the way the route promises is a broken
         check, not a guessed member — never fabricate a session from it */
      emit({ member: null, accounts: [], checked: true, status: kind === "signed-out" ? "signed-out" : "error" });
    })
    .catch(() => emit({ member: null, accounts: [], checked: true, status: classifySessionResponse(null, true) }))
    .finally(() => clearTimeout(timer));
}

/** ADDITIVE (TASK-351): the hook's `fetched` flag dedupes the FIRST fetch
 *  forever, by design (one request per page load, Ground) — without an
 *  explicit re-run, a Retry button after a failed check does nothing.
 *  `refresh()` re-runs the SAME check regardless of `fetched`. Plain module
 *  export, same shape as `applyMemberSession` above — no new hook return
 *  field, so `useMemberSession()`'s own pinned return shape
 *  (tests/member-rename.test.ts, TASK-278) stays byte-identical. */
export function refresh() {
  runCheck();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!fetched) {
    fetched = true;
    runCheck();
  }
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;
const SERVER_STATE: SessionState = { member: null, accounts: [], checked: false, status: "unknown" };
const getServerSnapshot = () => SERVER_STATE;

/** ADDITIVE (TASK-351): a second, narrow subscriber to the SAME shared
 *  store, kept separate from `useMemberSession()`'s own return so that
 *  hook's pinned literal return statement (below) stays exactly as it was
 *  before this lane — `MeSwitch` (and anything else that wants the new
 *  field) calls this one alongside `useMemberSession()`; both read the
 *  same module-level state, so they can never drift out of sync. */
export function useSessionStatus(): { status: MemberSessionStatus } {
  const { status } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { status };
}

export default function useMemberSession() {
  const { member, accounts, checked } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const signOut = useCallback(async () => {
    await fetch("/api/member/session", { method: "DELETE" });
    applyMemberSession(null);
  }, []);

  /** Close ONE door; the others stay signed in. Resolves the door left
      active (or null when the last door closed = fully signed out). */
  const signOutOne = useCallback(
    async (handle: string, space: string): Promise<MemberSession | null> => {
      try {
        const res = await fetch("/api/member/session", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle, space }),
        });
        const d = await res.json();
        if (d?.ok && d.handle) {
          const next = { handle: d.handle, space: d.space, npub: d.npub ?? null };
          applyMemberSession(next, d.accounts);
          return next;
        }
      } catch {
        /* fall through — treat as fully signed out */
      }
      applyMemberSession(null);
      return null;
    },
    []
  );

  /** Switch to another signed-in door (or a same-key tag) — no re-signing. */
  const switchTo = useCallback(async (handle: string, space: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/member/session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, space }),
      });
      const d = await res.json();
      if (!d.ok) return false;
      applyMemberSession({ handle: d.handle, space: d.space, npub: d.npub ?? null }, d.accounts);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { member, accounts, checked, signOut, signOutOne, switchTo };
}
