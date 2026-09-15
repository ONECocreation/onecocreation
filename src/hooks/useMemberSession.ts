"use client";

import { useCallback, useSyncExternalStore } from "react";

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

interface SessionState {
  member: MemberSession | null;
  /** Every door signed in on this browser (first = active). */
  accounts: MemberAccount[];
  /** false until the first answer lands — render nothing judgmental before it. */
  checked: boolean;
}

let state: SessionState = { member: null, accounts: [], checked: false };
let fetched = false;
const listeners = new Set<() => void>();

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
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!fetched) {
    fetched = true;
    fetch("/api/member/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) =>
        emit({
          member: d?.ok ? { handle: d.handle, space: d.space, npub: d.npub ?? null } : null,
          accounts: d?.ok ? (d.accounts ?? [{ handle: d.handle, space: d.space }]) : [],
          checked: true,
        })
      )
      .catch(() => emit({ member: null, accounts: [], checked: true }));
  }
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;
const SERVER_STATE: SessionState = { member: null, accounts: [], checked: false };
const getServerSnapshot = () => SERVER_STATE;

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
