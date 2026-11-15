"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * The header's door chip for the operator seat (Lumen's brief A6, block
 * 975,990). In /a the site header said "LOG IN" while an operator worked the
 * rooms: DoorButton only reads the MEMBER seat, and an operator who signed in
 * with their key holds no member seat at all. Inside /a, signed in, the header
 * now shows "Operator" and a menu with "Your rooms" and "Sign out".
 *
 * Two seats open /a (packages/operator-auth):
 *   - the key seat: the `fe-operator` cookie, minted after a signed challenge
 *     at /a (HttpOnly, SameSite=Strict, 30 days). Signing out clears it alone
 *     (DELETE /api/admin/session); a member seat in the same browser stays.
 *   - the email seat: a MEMBER signed in by email whose address is on the
 *     operator email list. There is no operator cookie to clear, so signing
 *     out ends the member session too (DELETE /api/member/session).
 * The layout reads the seat on the server and hands its handle down, so the
 * chip paints signed in on the first frame, never "LOG IN" first.
 */
const KEY_HEX = /^[0-9a-f]{64}$/;

export default function OperatorDoor({ operator }: { operator: string }) {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const byKey = KEY_HEX.test(operator);
  const seatLine = byKey ? `Signed in with your key, ending ${operator.slice(-6)}` : "Signed in by email";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    setLeaving(true);
    try {
      await fetch("/api/admin/session", { method: "DELETE" });
      if (!byKey) await fetch("/api/member/session", { method: "DELETE" });
    } finally {
      window.location.assign("/a");
    }
  }

  return (
    <div ref={ref} className="door-anchor">
      <button
        type="button"
        className="op-door-chip"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={seatLine}
      >
        Operator
      </button>
      {open && (
        <div role="menu" className="door-pop door-pop--menu op-door-menu">
          <p className="op-door-who">
            <b>Operator</b>
            <span>{seatLine}</span>
          </p>
          <Link role="menuitem" href="/a" className="op-door-row" onClick={() => setOpen(false)}>
            Your rooms
          </Link>
          <button type="button" role="menuitem" className="op-door-row op-door-out" onClick={signOut} disabled={leaving}>
            {leaving ? "Signing out" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
