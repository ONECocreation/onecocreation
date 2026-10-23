"use client";

import { useState } from "react";
import Card from "@/components/kit/Card";
import { QaQuestionsButton, QaQuestionsSheet, QaStageSlot } from "@/components/qa/QaStageExtras";
import { jitsiRoomUrl, doorStateWords, type DoorBusy, type DoorConfig, type DoorRowState } from "../../rooms-config";
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
 *
 * TASK-487 (block 968,624+, the Admiral's ruling, option C) — the OPEN
 * state now carries THREE actions in order: "Join as host" (renamed from
 * "Join on camera" everywhere — it was always just the direct Jitsi
 * link), the camera toggle ("Show my camera" while hidden, "Pause my
 * camera" while shown — the Admiral's own label, never "Show my
 * picture": pressing it puts the waiting picture back for every guest
 * while her mic keeps playing, a short-break control), then "Close this
 * room". The status line is `rooms-config.ts`'s own shared
 * `doorStateWords` — the SAME words `RoomsCard.tsx`'s rows show, never a
 * second copy. `useDoorRoom` now also refreshes every 10s and on window
 * focus (Love keeps this page open on her phone through the day), so
 * these buttons never go stale under her.
 */

export interface GoRoomBodyProps {
  door: DoorConfig;
  state: DoorRowState | null;
  busy: DoorBusy;
  error: string | null;
  onOpenAndJoin: () => void;
  onClose: () => void;
  onShowCamera: () => void;
  onHideCamera: () => void;
  /* TASK-603 phase 2 (K182): optional slots, absent in every pinned test
     render — GoRoomBody's existing output is byte-identical without them.
     stageSlot rides at the top of the open-state actions stack;
     extraActions appends to it after Close this room. */
  stageSlot?: React.ReactNode;
  extraActions?: React.ReactNode;
}

const BUSY_WORDS: Record<Exclude<DoorBusy, null>, string> = {
  open: "Opening…",
  close: "Closing…",
  "show-camera": "Showing your camera…",
  "hide-camera": "Pausing your camera…",
};

export function GoRoomBody({ door, state, busy, error, onOpenAndJoin, onClose, onShowCamera, onHideCamera, stageSlot, extraActions }: GoRoomBodyProps) {
  const phase = state?.phase ?? "closed";
  const isOpen = !!state && phase !== "closed";
  const cameraOn = state?.camera === "shown";

  /* the ONE status line — busy or error REPLACES it, said once, in plain
     words (never an <em>, which reads as italic outside .kit-rows) */
  const statusWords = busy ? BUSY_WORDS[busy] : error ? error : !state ? "Reading…" : doorStateWords(phase, cameraOn);

  return (
    <div className="p-6">
      <Card className="kit-go-room">
        <h1 className="kit-h2">{door.label}</h1>
        <p className="kit-text-quiet" role={error ? "alert" : undefined}>
          {statusWords}
        </p>
        {isOpen ? (
          <div className="kit-go-room-actions">
            {stageSlot}
            {state?.room ? (
              <a className="kit-btn kit-btn-second" href={jitsiRoomUrl({ jitsiDomain: state.jitsiDomain, room: state.room })}>
                Join as host
              </a>
            ) : (
              <a className="kit-btn kit-btn-second" aria-disabled="true">
                Join as host
              </a>
            )}
            {cameraOn ? (
              <button type="button" className="kit-btn kit-btn-second" disabled={busy !== null} onClick={onHideCamera}>
                Pause my camera
              </button>
            ) : (
              <button type="button" className="kit-btn kit-btn-main" disabled={busy !== null} onClick={onShowCamera}>
                Show my camera
              </button>
            )}
            <button type="button" className="kit-btn kit-btn-second" disabled={busy !== null} onClick={onClose}>
              Close this room
            </button>
            {extraActions}
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
  const { state, busy, error, open, close, showCamera, hideCamera } = useDoorRoom(door);
  /* TASK-603 phase 2 (K182, his words: love wants to read these live during
     the sessions, accessible in the stage area): on the Q&A door alone, the
     open page carries the call placeholder and a Questions button on her
     host controls that opens the SAME questions list in a right-side sheet.
     The pieces live in components/qa/QaStageExtras.tsx because this file is
     source-pinned by tests/reading-go-door.test.ts (kit classes only, no
     inline styles); every other door keeps the page byte-for-byte. */
  const [qaPanelOpen, setQaPanelOpen] = useState(false);
  const isQa = door.id === "qa";

  /* the ONE click: open, then send THIS TAB to whatever room the PUT
     answered with — assign, never open (the iOS-Safari-after-await
     popup block) */
  async function openAndJoin() {
    const result = await open();
    if (result?.room) {
      window.location.assign(jitsiRoomUrl({ jitsiDomain: result.jitsiDomain, room: result.room }));
    }
  }

  return (
    <>
      <GoRoomBody
        door={door}
        state={state}
        busy={busy}
        error={error}
        onOpenAndJoin={openAndJoin}
        onClose={close}
        onShowCamera={showCamera}
        onHideCamera={hideCamera}
        stageSlot={isQa ? <QaStageSlot /> : undefined}
        extraActions={isQa ? <QaQuestionsButton onOpen={() => setQaPanelOpen(true)} /> : undefined}
      />
      {isQa && <QaQuestionsSheet open={qaPanelOpen} onClose={() => setQaPanelOpen(false)} />}
    </>
  );
}
