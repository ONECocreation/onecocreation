"use client";

import { useEffect, useState } from "react";

/**
 * Am I an operator? — the whoami every admin-gated client surface asks
 * (the admin deck row in FrenMenu, Love's Pen toggle). Cookies are
 * httpOnly, so the client can't just read one; it asks /api/admin/session,
 * which treats `ok` (live operator session) or `eligible` (allowlisted key,
 * no session yet — shows the door before the signature ceremony) as true.
 * Extracted from FrenMenu.tsx so every operator-gated surface shares one
 * check instead of re-implementing the fetch.
 */
export default function useIsOperator(): boolean {
  const [isOp, setIsOp] = useState(false);
  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((d) => setIsOp(!!d.ok || !!d.eligible))
      .catch(() => {});
  }, []);
  return isOp;
}
