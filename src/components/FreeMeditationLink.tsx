"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** The free-meditation runner exists to get souls on the list — a signed-in
 *  member is already home, so the door hides for them (Admiral, 0018.05.12). */
export default function FreeMeditationLink() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    fetch("/api/frens/session")
      .then((r) => setSignedIn(r.ok))
      .catch(() => {});
  }, []);
  if (signedIn) return null;
  return <Link href="/#free">Free Meditation</Link>;
}
