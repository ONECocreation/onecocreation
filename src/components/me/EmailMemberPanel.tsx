"use client";

import { useEffect, useState } from "react";
import ConstellationCard from "@/components/me/ConstellationCard";

/**
 * The email member's home (dual-path ruling, 0018.05.15): no keys demanded —
 * a name of their choosing. Key members keep the full MePanel; adding a key
 * later is the account-link design on Love's checklist.
 *
 * TASK-352 (OC UI kit lane 4): this is now the Profile tab's content ONLY —
 * the purchases and quick-doors cards this file used to render itself moved
 * to the shared Purchases tab (`MeSwitch.tsx` mounts `MemberQuickCards` for
 * BOTH member kinds, RULED, Build item 6); this file keeps only the welcome
 * card.
 */
export default function EmailMemberPanel() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saved, setSaved] = useState(false);
  /* TASK-212 (Love's call #33): bumped on every successful save so the
     constellation below re-derives and lights its name star the same
     moment — no reload needed to see the name you just picked. */
  const [profileVersion, setProfileVersion] = useState(0);

  useEffect(() => {
    fetch("/api/member/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { ok?: boolean; email?: string; displayName?: string } | null) => {
        if (d?.ok) {
          setEmail(d.email ?? "");
          setDisplayName(d.displayName ?? "");
        }
      })
      .catch(() => {});
  }, []);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/member/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    });
    if ((await res.json().catch(() => ({ ok: false }))).ok) {
      setSaved(true);
      setProfileVersion((v) => v + 1);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  const card: React.CSSProperties = {
    padding: "22px 24px",
    borderRadius: 20,
    border: "1.5px solid rgba(139,118,196,.35)",
    background: "rgba(255,255,255,.55)",
    marginTop: 20,
  };

  return (
    <div>
      <div style={card}>
        <h2 style={{ fontFamily: "var(--font-h2)", fontWeight: 400, fontSize: "1.2rem", margin: 0 }}>
          {displayName ? `Welcome, ${displayName}` : "Welcome, beautiful soul"}
        </h2>
        <ConstellationCard refreshKey={profileVersion} />
        <p style={{ color: "var(--muted)", fontSize: ".88rem", margin: "6px 0 14px" }}>
          Signed in with {email || "your email"} · What would you like to be called? — this is
          the name your constellation shows.
        </p>
        <form onSubmit={saveName} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="your name"
            aria-label="Display name"
            maxLength={48}
            style={{
              flex: "1 1 200px",
              padding: "12px 16px",
              borderRadius: 999,
              border: "1.5px solid rgba(180,134,43,.5)",
              background: "transparent",
              color: "inherit",
              fontSize: ".95rem",
            }}
          />
          <button className="btn" type="submit">
            {saved ? "Saved ✓" : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}
