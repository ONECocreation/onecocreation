"use client";

import Card from "@/components/kit/Card";
import { jitsiRoomUrl, type DoorBusy, type DoorConfig, type DoorRowState } from "../../rooms-config";
import { useDoorRoom } from "../useDoorRoom";

/**
 * `/a/site/reading/go/[door]` — Love's ONE-TAP EMAIL LINK (TASK-486,
 * block 968,624+). Today she opens `/a/site/reading`, presses Open on a
 * row, then presses Join on camera on a room name that changes every
 * time — no static Jitsi link can ride in an email. This page collapses
 * that into ONE button from a link that never changes: "Open and join"
 * runs the SAME open logic `RoomsCard.tsx` uses (`useDoorRoom`, which
 * calls its exported `openDoor` — never a copy of the publish-then-
 * prepare fallback), then sends THIS tab to the room `window.location.
 * assign` gave it — never `window.open`, since iOS Safari blocks a popup
 * opened after an `await` (the click's own user-activation has expired
 * by the time the PUT answers).
 *
 * TWO components again (`RoomsCard.tsx`'s own split, this repo runs no
 * jsdom): `GoRoomBody` (named) is the pure presentation over explicit
 * props — `tests/reading-go-door.test.ts` renders every phase directly;
 * `GoRoom` (default) is the thin hook wiring.
 *
 * `DoorConfig`/`DoorRowState`/`DoorBusy`/`jitsiRoomUrl` come from
 * `../../rooms-config.ts`, not `RoomsCard.tsx` (block 968,624+ blocker
 * fix — `page.tsx`, the SERVER half of this route, needed the same
 * values out of a module with no `"use client"`; every consumer now
 * reads the one non-client source, this client component included).
 */

export interface GoRoomBodyProps {
  door: DoorConfig;
  state: DoorRowState | null;
  busy: DoorBusy;
  error: string | null;
  onOpenAndJoin: () => void;
  onClose: () => void;
}

export function GoRoomBody({ door, state, busy, error, onOpenAndJoin, onClose }: GoRoomBodyProps) {
  const phase = state?.phase ?? "closed";
  const isOpen = !!state && phase !== "closed";

  /* the ONE status line — busy or error REPLACES it, said once, in plain
     words (never an <em>, which reads as italic outside .kit-rows) */
  const statusWords = busy
    ? busy === "open"
      ? "Opening…"
      : "Closing…"
    : error
      ? error
      : !state
        ? "Reading…"
        : isOpen
          ? "Open. Viewers can come in."
          : "Closed.";

  return (
    <div className="p-6">
      <Card className="kit-go-room">
        <h1 className="kit-h2">{door.label}</h1>
        <p className="kit-text-quiet" role={error ? "alert" : undefined}>
          {statusWords}
        </p>
        {isOpen ? (
          <div className="kit-go-room-actions">
            {state?.room ? (
              <a className="kit-btn kit-btn-main" href={jitsiRoomUrl({ jitsiDomain: state.jitsiDomain, room: state.room })}>
                Join on camera
              </a>
            ) : (
              <a className="kit-btn kit-btn-main" aria-disabled="true">
                Join on camera
              </a>
            )}
            <button type="button" className="kit-btn kit-btn-second" disabled={busy !== null} onClick={onClose}>
              Close this room
            </button>
          </div>
        ) : (
          <div className="kit-go-room-actions">
            <button type="button" className="kit-btn kit-btn-main" disabled={busy !== null || !state} onClick={onOpenAndJoin}>
              Open and join
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function GoRoom({ door }: { door: DoorConfig }) {
  const { state, busy, error, open, close } = useDoorRoom(door);

  /* the ONE click: open, then send THIS TAB to whatever room the PUT
     answered with — assign, never open (the iOS-Safari-after-await
     popup block) */
  async function openAndJoin() {
    const result = await open();
    if (result?.room) {
      window.location.assign(jitsiRoomUrl({ jitsiDomain: result.jitsiDomain, room: result.room }));
    }
  }

  return <GoRoomBody door={door} state={state} busy={busy} error={error} onOpenAndJoin={openAndJoin} onClose={close} />;
}
