"use client";

import { useEffect, useState } from "react";
import SubscribeForm from "./SubscribeForm";

/**
 * The news page's subscribe invitation — for GUESTS only (Love's walk,
 * 0018.05.15): a signed-in member is already on the letters, so the form
 * bows out instead of asking twice.
 */
export default function BeInTheKnow() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/me/letters", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSignedIn(!!d?.signedIn))
      .catch(() => setSignedIn(false));
  }, []);

  if (signedIn !== false) return null;

  return (
    <div className="reveal in" style={{ marginTop: 40 }}>
      <p className="kicker" style={{ marginBottom: 4 }}>Be in the Know</p>
      <p style={{ color: "var(--muted)", fontSize: ".9rem", margin: "0 0 6px" }}>
        join the letters and receive the free meditation —{" "}
        <b style={{ color: "var(--rose)" }}>Unzip Into the New You</b> — with love.
      </p>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <SubscribeForm source="news" />
      </div>
    </div>
  );
}
