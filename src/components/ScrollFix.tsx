"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Every navigation lands at the TOP of the page (the Admiral's rule, after
 * tier/membership pages kept arriving mid-scroll with titles under the nav).
 * Runs on every route change; hash links (#free) are left to the browser.
 */
export default function ScrollFix() {
  const pathname = usePathname();
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
