"use client";

import { anyAccepted, relayLabel, type RelayResult } from "@/lib/kind0-publish";

/** The per-relay publish scoreboard — the honest answer to "did it save?".
    One accept = carried (the network gossips it onward); zero = say so. */
export default function RelayResults({ results }: { results: RelayResult[] }) {
  const carried = anyAccepted(results);
  return (
    <div style={{ borderRadius: 12, border: "1px solid var(--glass-edge)", background: "var(--glass)", padding: "10px 14px" }}>
      <p
        className="mb-1" style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: carried ? "var(--ok, #7fb98f)" : "var(--err, #E7899E)" }}
      >
        {carried
          ? "✓ CARD PUBLISHED — THE RELAYS GOSSIP IT OUT FROM HERE"
          : "✗ NO RELAY TOOK THE CARD — NOTHING SAVED"}
      </p>
      <ul className="space-y-0.5">
        {results.map((r) => (
          <li key={r.relay} className="font-mono text-[10px]">
            <span style={{ color: r.ok ? "var(--ok, #7fb98f)" : "var(--err, #E7899E)" }}>{r.ok ? "✓" : "✗"}</span>{" "}
            <span style={{ color: "var(--ink-body)" }}>{relayLabel(r.relay)}</span>
            {!r.ok && r.note && <span style={{ color: "var(--muted)" }}> — {r.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
