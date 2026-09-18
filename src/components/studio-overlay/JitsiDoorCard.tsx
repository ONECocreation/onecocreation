"use client";

/**
 * JitsiDoorCard — TASK-337 (0018.06.28 a₿ · Love's ask via the Admiral): a
 * fourth card beside the desk's three existing VDO copy doors
 * (StudioRoom.tsx), a one-time private room on the site's Jitsi rail.
 *
 * Pure presentational card — props only (`domain`, `room`, `minting`,
 * `onMint`), no fetch of its own, no site imports beyond the shared style
 * consts StudioRoom.tsx already exports (`card`/`doorStack` — the same
 * visual language, reused rather than duplicated; a named decision, see
 * StudioRoom.tsx's own comment beside the export). The parent owns the
 * server-action call and the `busy` state, matching StudioRoom.tsx's
 * `save()` pattern. Kept deliberately pure (no `@/lib/*` server module
 * import) so a later move to a fleet package is a file move, not a
 * rewrite — `tests/studio-jitsi-door.test.ts` source-pins this.
 *
 * The host/guest note below is the load-bearing honesty this card carries
 * (jitsi-meet-run-sheet.md §10-§11, read at cut, not guessed): on the
 * deploy kit's own documented scheme the host and guest links are the
 * LITERAL SAME URL — the difference is a login prompt the host answers
 * and a guest doesn't, never a second secret link. Who's actually in the
 * room is Jitsi's own in-call participant list, native to the call —
 * this card claims nothing the site itself can back.
 */

import { card, doorStack } from "./StudioRoom";

export interface JitsiDoorCardProps {
  /** config.meeting.jitsiDomain — e.g. "meet.onecocreation.com" */
  domain: string;
  /** null = no room minted yet (or KV unconfigured/miss) — honest empty state */
  room: string | null;
  minting: boolean;
  onMint: () => void;
}

export default function JitsiDoorCard({ domain, room, minting, onMint }: JitsiDoorCardProps) {
  const url = room ? `https://${domain}/${room}` : null;

  return (
    <div style={card}>
      <b style={{ fontSize: ".92rem", color: "var(--ink-strong)" }}>one-time private room (Jitsi)</b>
      <p style={{ margin: 0, fontSize: ".76rem", color: "var(--muted)" }}>
        a fresh, unguessable room on {domain} — better suited to a personal, one-on-one conversation than the
        studio room above.
      </p>
      {url ? (
        <input
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          className="console-field"
          style={{ width: "100%", fontSize: ".78rem", padding: "8px 10px", borderRadius: 8 }}
        />
      ) : (
        <p style={{ margin: 0, fontSize: ".78rem", color: "var(--muted)" }}>no room minted yet.</p>
      )}
      <p style={{ margin: 0, fontSize: ".72rem", color: "var(--muted)" }}>
        Open it and sign in as yourself to host (the login prompt is {domain}&apos;s own moderator gate). Send this
        SAME link to your guest — they join straight in, no account. Who&apos;s actually in the room is Jitsi&apos;s
        own participant list inside the call.
      </p>
      <div style={doorStack}>
        {url && (
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
              } catch {
                /* the field above is selectable — the manual way always works */
              }
            }}
            className="btn btn-sm btn-ghost"
          >
            Copy the room link
          </button>
        )}
        <button type="button" disabled={minting} onClick={onMint} className="btn btn-sm">
          {minting ? "Minting…" : room ? "New room" : "Mint a room"}
        </button>
      </div>
    </div>
  );
}
