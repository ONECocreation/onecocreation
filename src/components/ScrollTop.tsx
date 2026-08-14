"use client";

import { useEffect } from "react";

/** Some navigations land these pages mid-scroll (the Admiral's catch on the
 *  tier pages — titles hiding under the nav). Arrival means the top. */
export default function ScrollTop() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return null;
}
