"use client";

import { useSyncExternalStore } from "react";

/**
 * TASK-356 (REVIEW-K87 item 2, "SECOND CAUSE — late add-ons never
 * detected"): `SignInCard.tsx` and `DoorSheet.tsx` each carried their own
 * `useHasNostrExtension` built on `useSyncExternalStore(noopSubscribe, …)`
 * — a subscribe that never fires, so the read happens exactly once, at
 * mount. An extension that injects `window.nostr` AFTER hydration
 * (nos2x-class add-ons commonly do) left the card on the no-add-on pane
 * forever, even though the door would have worked fine a moment later.
 *
 * This module is the ONE real subscribe both files now share: it
 * re-checks on the window `load` event (a late-injecting extension often
 * fires its own content-script injection around there) AND on a short
 * poll — every 250ms for the first ~5s after the first subscriber
 * arrives — then goes quiet; it never polls forever. Listeners are only
 * notified when the boolean actually flips, and every timer/listener is
 * torn down once the last subscriber unsubscribes.
 *
 * The store pieces are exported separately from the hook so
 * `tests/nostr-extension-detect.test.ts` can drive them directly in this
 * repo's `environment: "node"` vitest config (no jsdom, no React renderer
 * needed) — the same "read the source, call the pure function" convention
 * `door-machine.ts`'s `reduce`/`proofFor` already use.
 */

type Listener = () => void;

const POLL_INTERVAL_MS = 250;
const POLL_WINDOW_MS = 5_000;

const listeners = new Set<Listener>();
let pollTimer: ReturnType<typeof setInterval> | null = null;
let pollDeadline = 0;
let lastSeen: boolean | null = null;

/** The raw, uncached read — never lies, never memoizes a torn value. */
export function readHasNostrExtension(): boolean {
  return typeof window !== "undefined" && !!window.nostr;
}

function checkAndNotify(): void {
  const now = readHasNostrExtension();
  if (now === lastSeen) return;
  lastSeen = now;
  listeners.forEach((listener) => listener());
}

function stopWatching(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (typeof window !== "undefined") {
    window.removeEventListener("load", checkAndNotify);
  }
}

/**
 * The real subscribe. Returns an unsubscribe function that tears down the
 * `load` listener and the poll interval once the last subscriber leaves —
 * a fake window stub in a test, or a real one, is left exactly as it
 * found it.
 */
export function subscribeHasNostrExtension(listener: Listener): () => void {
  listeners.add(listener);
  lastSeen = readHasNostrExtension();
  if (typeof window !== "undefined") {
    window.addEventListener("load", checkAndNotify);
  }
  if (pollTimer === null) {
    pollDeadline = Date.now() + POLL_WINDOW_MS;
    pollTimer = setInterval(() => {
      checkAndNotify();
      if (Date.now() >= pollDeadline) stopWatching();
    }, POLL_INTERVAL_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stopWatching();
  };
}

function getServerSnapshot(): boolean | null {
  return null;
}

/** hydration-safe: null on the server/first paint, then the real read —
 *  now kept fresh by `subscribeHasNostrExtension` instead of a one-shot. */
export function useHasNostrExtension(): boolean | null {
  return useSyncExternalStore(subscribeHasNostrExtension, readHasNostrExtension, getServerSnapshot);
}
