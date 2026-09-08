"use client";

import { useEffect, useState } from "react";
import { Chip } from "@/components/console/glass";
import type { ReadinessRow, ReadinessState } from "@/lib/community-readiness";

/**
 * THE COMMUNITY DOOR CARD (TASK-162, cut 0018.06.17 a₿ · block 966,080) —
 * `features.community` is OFF (H58) and until now nobody could say from the
 * site what was still missing before Love flips it. This card reads the five
 * readiness probes (/api/admin/community-readiness) and paints each in plain
 * words: ok / missing / "the site can't tell" — the state rides IN WORDS on
 * every chip, never color alone (the switches' own legibility doctrine).
 *
 * The community switch itself sits under the rows with the rule AS WORDS:
 * "flip when every row reads ok — your call, always." No hard block: the
 * card says what's missing; the flip stays Love's. The flip rides the same
 * /api/admin/site PUT as the switches list above (a partial features patch),
 * so this card and that list can never disagree — both repaint from the
 * saved doc.
 *
 * Self-contained (own fetch/save), the NavEditor / AboutVideosCard idiom.
 */

const row: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
  background: "var(--glass)", border: "1px solid rgba(139,118,196,.22)",
  borderRadius: 12, padding: "10px 14px", marginBottom: 8,
};

const STATE_CHIP: Record<ReadinessState, { tone: "green" | "rose" | "grey"; label: string }> = {
  ok: { tone: "green", label: "ok" },
  missing: { tone: "rose", label: "missing" },
  unknown: { tone: "grey", label: "— the site can't tell" },
};

export default function CommunityDoorCard() {
  const [rows, setRows] = useState<ReadinessRow[] | null>(null);
  const [communityOn, setCommunityOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/community-readiness", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (data?.ok) {
          setRows(data.rows);
          setCommunityOn(data.communityOn === true);
        }
      } catch {
        /* a dead probe door reads as "still reading" — never an invented ok */
      }
    })();
  }, []);

  async function flip() {
    if (communityOn === null) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/admin/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: { community: !communityOn } }),
      });
      const data = await res.json();
      if (data.ok) {
        setCommunityOn(data.config.features.community === true);
        setNote(
          data.config.features.community
            ? "saved ✓ the Community door is open — the nav, the home section and the rooms follow on their next render"
            : "saved ✓ the Community stays hidden",
        );
      } else setNote(data.reason ?? "save failed");
    } catch {
      setNote("save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!rows || communityOn === null)
    return <p style={{ fontSize: ".82rem", color: "var(--muted)" }}>asking the doors…</p>;

  const okCount = rows.filter((r) => r.state === "ok").length;

  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: ".8rem", color: "var(--muted)", margin: "0 0 10px", maxWidth: 640 }}>
        Five honest checks, asked live each time this room opens — nothing here is remembered or guessed.
        A row the site can&apos;t answer says so, it never pretends.
      </p>

      {rows.map((r) => (
        <div key={r.key} style={row}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <b style={{ fontSize: ".9rem" }}>{r.name}</b>
            <div style={{ fontSize: ".78rem", color: "var(--muted)", marginTop: 3 }}>{r.words}</div>
          </div>
          <Chip tone={STATE_CHIP[r.state].tone}>{STATE_CHIP[r.state].label}</Chip>
        </div>
      ))}

      {/* ── the switch itself + the rule, as words ── */}
      <div style={{ ...row, border: "1px solid rgba(139,118,196,.4)" }}>
        <button
          type="button"
          aria-pressed={communityOn}
          aria-label={`Community — currently ${communityOn ? "on" : "off"}`}
          disabled={busy}
          onClick={flip}
          className={`btn btn-sm ${communityOn ? "btn-on" : "btn-ghost"}`}
          style={busy ? { opacity: 0.5 } : undefined}
        >
          {communityOn ? "ON" : "OFF"}
        </button>
        <div style={{ flex: 1, minWidth: 220 }}>
          <b style={{ fontSize: ".9rem" }}>Community</b>
          <span style={{ fontSize: ".78rem", color: "var(--muted)" }}>
            {" "}— {communityOn ? "showing: the Community door, the home section and the rooms are open" : "hidden: the Community door stays closed"}.
            The rule: flip ON when every row above reads ok — {okCount} of {rows.length}{" "}
            {okCount === 1 ? "reads" : "read"}{" "}ok right now.
            Your call, always; this card only says what&apos;s missing.
          </span>
        </div>
        <Chip tone={communityOn ? "green" : "grey"}>{communityOn ? "ON — showing" : "OFF — hidden"}</Chip>
        {note && (
          <div style={{ width: "100%", fontSize: ".8rem", color: note.startsWith("saved") ? "var(--ok)" : "var(--err)" }}>
            {note}
          </div>
        )}
      </div>
    </div>
  );
}
