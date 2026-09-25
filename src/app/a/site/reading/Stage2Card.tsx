"use client";

import { useEffect, useState } from "react";
import Card from "@/components/kit/Card";
import { Chip } from "@/components/console/glass";

/**
 * THE STAGE 2 OPERATOR CARD (TASK-392, Build 8) — rebuilt around the
 * three-phase order (Astra's review, finding 5): PREPARE → Love starts
 * the conference herself as moderator → PUBLISH → Close. Self-contained
 * fetch/save against `/api/admin/stage2`, the `ReadingScheduleCard.tsx`
 * fetch/save SHAPE only (GET on mount, PUT on each action) — never that
 * file's inline `row`-object styling (Template check): this card's body
 * rides `kit/Card` + `.kit-stack` instead, the same pair
 * `Stage2Door.tsx` uses on the member-facing side.
 *
 * Every fetch/PUT carries `{ cache: "no-store" }` (Astra's review,
 * finding 3 — the operator card must never read a cached phase either).
 */

interface Stage2AdminState {
  phase: "closed" | "prepared" | "published";
  room: string | null;
  jitsiDomain: string;
}

export default function Stage2Card() {
  const [state, setState] = useState<Stage2AdminState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/stage2", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.ok) setState({ phase: d.phase, room: d.room, jitsiDomain: d.jitsiDomain });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function act(action: "prepare" | "publish" | "close") {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/stage2", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
        cache: "no-store",
      });
      /* TASK-460 (block 968,543): a non-JSON body (a 500 that slipped past
         Cache-Control, a proxy error page) used to throw straight past this
         try/finally — read defensively instead, same as the mount effect's
         own `.then((r) => (r.ok ? r.json() : null))` a few lines up; a
         parse failure just leaves the card showing its last-known state,
         nothing changed, never a crash. */
      const data = await res.json().catch(() => null);
      if (data?.ok) setState({ phase: data.phase, room: data.room, jitsiDomain: data.jitsiDomain });
    } finally {
      setBusy(false);
    }
  }

  if (!state) {
    return (
      <Card>
        <div className="kit-stack">
          <div className="kit-text-quiet">reading Stage 2…</div>
        </div>
      </Card>
    );
  }

  const url = state.room ? `https://${state.jitsiDomain}/${state.room}` : null;

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* the field below is selectable — the manual way always works */
    }
  }

  return (
    <Card>
      <div className="kit-stack">
        {state.phase === "closed" && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act("prepare")}>
            {busy ? "Preparing…" : "Prepare Stage 2"}
          </button>
        )}

        {state.phase !== "closed" && url && (
          <>
            <input
              readOnly
              value={url}
              onFocus={(e) => e.target.select()}
              className="kit-field-input"
              aria-label="Stage 2 link"
            />
            <button type="button" className="btn btn-ghost btn-sm" onClick={copyLink}>
              Copy the Stage 2 link
            </button>
            <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noreferrer">
              Open Stage 2 as moderator →
            </a>
            <div className="kit-text-quiet">
              log in as yourself to become the moderator — the same link a member gets, minus the login prompt.
            </div>
          </>
        )}

        {state.phase === "prepared" && (
          <>
            <div className="kit-text-quiet">members can&apos;t see this yet — start the call above first, then Publish.</div>
            <Chip tone="gold">PREPARED — not visible to members</Chip>
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act("publish")}>
              {busy ? "Publishing…" : "Publish — let paid members in"}
            </button>
          </>
        )}

        {state.phase === "published" && (
          <>
            <Chip tone="green">PUBLISHED — the door is live</Chip>
            {/* TASK-439 (block 968,218, rulings 1 & 4): the admin GET
                carries no package name, so the words name no tier letter
                and no price — the door itself speaks the package. */}
            <div className="kit-text-quiet">
              Weekly Intuitive and above can come in. New joins stop at midnight Mountain. When you finish: press Close first, then End meeting for all in the call.
            </div>
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act("close")}>
              {busy ? "Closing…" : "Close Stage 2"}
            </button>
          </>
        )}
      </div>
    </Card>
  );
}
