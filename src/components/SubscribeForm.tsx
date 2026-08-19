"use client";

import { useState } from "react";

/**
 * The list's front door on the page (flow 1). Posts to /api/subscribe; the
 * lead magnet rides the response. Every state speaks honestly — including
 * the 503 when the rail is dark.
 *
 * The button label is the consuming surface's voice (Pac's FREE ruling,
 * 0018.05.26): the default keeps the site's existing wording so nothing
 * regresses; a surface that shouldn't shout FREE passes its own `cta`.
 */
export default function SubscribeForm({ source = "site", cta = "Send My Free Meditation" }: { source?: string; cta?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [note, setNote] = useState("");

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (state === "busy") return;
    setState("busy");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = (await res.json()) as { ok: boolean; reason?: string; mailed?: boolean };
      if (data.ok) {
        setState("done");
        setNote(
          data.mailed === false
            ? "You're on the list — the meditation letter is on its way shortly."
            : "Sent, with love — check your inbox for your meditation.",
        );
      } else {
        setState("error");
        setNote(data.reason ?? "Something went sideways — please try again.");
      }
    } catch {
      setState("error");
      setNote("Something went sideways — please try again.");
    }
  }

  if (state === "done") {
    return <p style={{ color: "var(--rose)", fontWeight: 600 }}>{note}</p>;
  }

  return (
    <form onSubmit={join} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        aria-label="Email address"
        style={{
          flex: "1 1 220px",
          padding: "12px 16px",
          borderRadius: 999,
          border: "1.5px solid rgba(180,134,43,.75)",
          background: "rgba(255,255,255,.94)",
          color: "var(--field-ink)", /* paper ink, both themes — the house input law */
          fontSize: ".95rem",
        }}
      />
      <button className="btn btn-rose" type="submit" disabled={state === "busy"}>
        {state === "busy" ? "Sending…" : cta}
      </button>
      {state === "error" && <p style={{ width: "100%", color: "var(--muted)", fontSize: ".85rem" }}>{note}</p>}
    </form>
  );
}
