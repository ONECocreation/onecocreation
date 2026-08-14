"use client";

import { useEffect, useState } from "react";
import MePanel from "./MePanel";
import EmailMemberPanel from "./EmailMemberPanel";
import MemberQuickCards from "./MemberQuickCards";
import ConstellationCard from "./ConstellationCard";

/**
 * Two kinds of member, one /me (dual-path ruling): key members get the full
 * nostr control room; email members get their own home — no key demanded.
 */
export default function MeSwitch() {
  const [kind, setKind] = useState<"loading" | "email" | "key">("loading");

  useEffect(() => {
    fetch("/api/frens/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { ok?: boolean; space?: string } | null) => {
        setKind(d?.ok && d.space === "email" ? "email" : "key");
      })
      .catch(() => setKind("key"));
  }, []);

  if (kind === "loading") return null;
  if (kind === "email") return <EmailMemberPanel />;
  return (
    <>
      {/* the same gentle stars the email home greets with (Admiral, 0018.05.15) */}
      <ConstellationCard />
      <MemberQuickCards />
      <MePanel />
    </>
  );
}
