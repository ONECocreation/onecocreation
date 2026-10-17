"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Button from "@/components/kit/Button";
import useMemberSession, { applyMemberSession } from "@/hooks/useMemberSession";
import { ReadingSignInCard } from "@/components/rooms/ReadingSignInBox";

/**
 * T-630 (mockup) - every signed-out "Sign me up" on /reading opens THIS
 * sheet over the page instead of jumping to #sign-up. The Admiral (971,859):
 * "sign me up, then a box pop that would either let them put in their
 * mailbox or it says already have an account / sign in option. we dont want
 * to pop them to another page."
 *
 * One tiny module store holds open/closed so the three triggers (agenda
 * rows, stage card, stage door) need no shared provider; the sheet is
 * mounted once by /reading. The body is ReadingSignInCard itself: same
 * email -> six-digit code -> keep me posted submit path as the bottom box,
 * and the "Already have an account? Sign in" line switches the SAME card to
 * its sign-in view (same /api/auth/email routes, no list sign-up).
 * The bottom #keep-posted section stays for people who scroll there.
 */

let isOpen = false;
const listeners = new Set<() => void>();
function setOpen(next: boolean) {
  isOpen = next;
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export const openSignUpSheet = () => setOpen(true);
export const closeSignUpSheet = () => setOpen(false);

export const SHEET_LABEL = "Sign me up";
export const SHEET_SWITCH_TO_SIGN_IN = "Sign in";
export const SHEET_SWITCH_TO_SIGN_UP = "Sign me up";
export const SHEET_HAVE_ACCOUNT = "Already have an account? ";
export const SHEET_NEW_HERE = "New here? ";

/** The trigger every signed-out Sign me up uses: a button, never a link. */
export function SignUpSheetTrigger({ className = "kit-btn kit-btn-main kit-btn-sm" }: { className?: string }) {
  return (
    <button type="button" className={className} aria-haspopup="dialog" onClick={openSignUpSheet}>
      {SHEET_LABEL}
    </button>
  );
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export default function SignMeUpSheet() {
  const open = useSyncExternalStore(subscribe, () => isOpen, () => false);
  const { member } = useMemberSession();
  const router = useRouter();
  const [mode, setMode] = useState<"sign-up" | "sign-in">("sign-up");
  const panelRef = useRef<HTMLDivElement>(null);
  const returnRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("input")?.focus({ preventScroll: true });
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeSignUpSheet();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      returnRef.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  // a member who signs in (or arrives signed in) never sees the sheet
  useEffect(() => {
    if (member && isOpen) closeSignUpSheet();
  }, [member]);

  if (!open || member || typeof document === "undefined") return null;

  const signIn = mode === "sign-in";
  return createPortal(
    <div className="kit-sheet-backdrop" onClick={closeSignUpSheet}>
      <div
        className="kit-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={signIn ? "Sign in" : "Sign me up"}
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        <Button variant="quiet" sm className="kit-sheet-close" aria-label="Close" onClick={closeSignUpSheet}>
          Close
        </Button>
        <ReadingSignInCard
          key={mode}
          embedded
          mode={mode}
          member={null}
          onVerified={(result) => {
            applyMemberSession({ handle: result.handle, space: result.space, npub: null });
            closeSignUpSheet();
            router.refresh();
          }}
        />
        <p className="kit-text-quiet kit-sheet-switch">
          {signIn ? SHEET_NEW_HERE : SHEET_HAVE_ACCOUNT}
          <a
            href="#sign-up"
            onClick={(e) => {
              e.preventDefault();
              setMode(signIn ? "sign-up" : "sign-in");
            }}
          >
            {signIn ? SHEET_SWITCH_TO_SIGN_UP : SHEET_SWITCH_TO_SIGN_IN}
          </a>
        </p>
      </div>
    </div>,
    document.body,
  );
}
