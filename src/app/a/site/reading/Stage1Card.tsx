"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "@/components/kit/Card";

/**
 * THE STAGE 1 OPERATOR CARD (TASK-438, block 968,222; HOLD LIFTED block
 * 968,269) — the /a/site/reading card for the reading itself, beside
 * Stage2Card. THE /a LAW: ONE state per row, said once, under the row's
 * words; ONE control per row, on the same right edge in every state
 * (`.kit-rows`' own grid); pending and error text REPLACES the state,
 * never adds to it; no second chip, no legacy `.btn` — kit classes only.
 *
 * Self-contained fetch/save against `/api/admin/stage1` (Stage2Card's
 * shape: GET on mount, PUT `{ action }` on each control, always
 * `cache: "no-store"`). The one difference the lifecycle itself rules: a
 * refused Publish (409 — Stage 1 never publishes from closed) becomes the
 * row's error words, never a silent no-op.
 *
 * TWO components, on purpose: `Stage1Card` (default) owns the fetching;
 * `Stage1CardBody` (named) is the pure presentation over an explicit
 * state, so `tests/stage1-card.test.ts` renders every phase directly
 * (this repo's vitest runs no jsdom — the same split Stage2Door and
 * ReadingSignUp already use).
 */

export interface Stage1AdminState {
  phase: "closed" | "prepared" | "published";
  room: string | null;
  jitsiDomain: string;
}

export interface Stage1CardBodyProps {
  state: Stage1AdminState;
  busy: "prepare" | "publish" | "close" | null;
  error: string | null;
  onAct: (action: "prepare" | "publish" | "close") => void;
}

const BUSY_WORDS = { prepare: "Preparing…", publish: "Publishing…", close: "Closing…" } as const;

const PHASE_WORDS = {
  closed: "Closed — no room exists.",
  prepared: "Prepared — the room exists; only the host link below opens it. Viewers see nothing yet.",
  published: "Published — viewers can watch on /reading.",
} as const;

export function Stage1CardBody({ state, busy, error, onAct }: Stage1CardBodyProps) {
  /* the state line: busy or error REPLACES the phase words, said once */
  const stateLine = busy ? (
    <em>{BUSY_WORDS[busy]}</em>
  ) : error ? (
    <em role="alert">{error}</em>
  ) : (
    <em data-state={state.phase}>{PHASE_WORDS[state.phase]}</em>
  );

  const lifecycleControl =
    state.phase === "closed" ? (
      <button type="button" className="kit-btn kit-btn-main kit-btn-sm" disabled={busy !== null} onClick={() => onAct("prepare")}>
        Prepare
      </button>
    ) : state.phase === "prepared" ? (
      <button type="button" className="kit-btn kit-btn-main kit-btn-sm" disabled={busy !== null} onClick={() => onAct("publish")}>
        Publish
      </button>
    ) : (
      <button type="button" className="kit-btn kit-btn-second kit-btn-sm" disabled={busy !== null} onClick={() => onAct("close")}>
        Close
      </button>
    );

  const hostControl = state.room ? (
    <a
      className="kit-btn kit-btn-second kit-btn-sm"
      href={`https://${state.jitsiDomain}/${state.room}#config.p2p.enabled=false&config.showChatPermissionsModeratorSetting=true`}
      target="_blank"
      rel="noreferrer"
    >
      Open the reading as host →
    </a>
  ) : (
    /* disabled until a room exists: the same anchor in the same place,
       no href, honestly marked — never a dead button that LOOKS live */
    <a className="kit-btn kit-btn-second kit-btn-sm" aria-disabled="true">
      Open the reading as host →
    </a>
  );

  return (
    <Card>
      <ul className="kit-rows">
        <li data-row="lifecycle">
          <span>
            The one-way stage — Prepare mints the room privately, Publish lets viewers in, Close ends it.
            {state.phase === "published" &&
              " New joins stop at midnight Mountain. Close removes our viewers on their next poll. End meeting for all ends the call."}
            {stateLine}
          </span>
          <span className="kit-rows-end">{lifecycleControl}</span>
        </li>
        <li data-row="host">
          <span>
            {state.room
              ? "Log in as love, then in the room's settings block guests' mic, video and screen share, and disable chat for non-moderators — then Publish."
              : "Prepare first — the host link appears once a room exists."}
          </span>
          <span className="kit-rows-end">{hostControl}</span>
        </li>
      </ul>
    </Card>
  );
}

export default function Stage1Card() {
  const [state, setState] = useState<Stage1AdminState | null>(null);
  const [busy, setBusy] = useState<"prepare" | "publish" | "close" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/stage1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.ok) setState({ phase: d.phase, room: d.room, jitsiDomain: d.jitsiDomain });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const act = useCallback(async (action: "prepare" | "publish" | "close") => {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch("/api/admin/stage1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
        cache: "no-store",
      });
      const data = await res.json();
      if (data.ok) {
        setState({ phase: data.phase, room: data.room, jitsiDomain: data.jitsiDomain });
      } else {
        /* a refused Publish (409 — Stage 1 never publishes from closed)
           lands here the same way as any other honest refusal */
        setError(data.reason ?? `the stage refused (${res.status})`);
      }
    } catch {
      setError("the stage didn't answer — try again");
    } finally {
      setBusy(null);
    }
  }, []);

  if (!state) {
    return (
      <Card>
        <div className="kit-stack">
          <div className="kit-text-quiet">reading Stage 1…</div>
        </div>
      </Card>
    );
  }

  return <Stage1CardBody state={state} busy={busy} error={error} onAct={act} />;
}
