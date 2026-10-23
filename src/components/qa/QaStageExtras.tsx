"use client";

import Sheet from "@/components/Sheet";
import QuestionsPanel from "./QuestionsPanel";

/**
 * THE Q&A STAGE EXTRAS (TASK-603 phase 2, K182 item 2). His words: "love
 * wants to read these live durign the sessions, how can we also think about
 * making this accessible when in the stage area?" On the Q&A go door (the
 * host page Love keeps open on her phone through the reading day), a
 * "Questions" button on her host controls opens the SAME questions list in
 * a right-side sheet — she reads and answers without leaving the page, and
 * a sent reply archives the row exactly as on the questions room.
 *
 * `QaStageSlot` stands where the call picture goes: the call area stays a
 * PLACEHOLDER until the in-page Jitsi room is built (K182 item 4 — today
 * she hosts from the direct meet link, and no site button can ride that
 * page). The placeholder box is the fleet's mock convention for
 * third-party embeds: vendor scripts stripped, a box in their place.
 *
 * These pieces live OUTSIDE GoRoom.tsx because tests/reading-go-door.test.ts
 * pins that file's source (kit classes only, no inline styles); the styling
 * sits here, token colors only, and Sheet's own scrimStyle/sheetStyle API
 * carries the side-panel shape (right edge, full height, the sheet rung of
 * the z-ladder; the respond window rides "popup" above it from inside
 * QuestionsPanel).
 */

export function QaStageSlot() {
  return (
    <div className="kit-stage-media kit-call-tall kitx-qa-stage">
      <p className="kit-text-quiet kitx-qa-stage-words">
        The live call fills this area. It is the same in-page picture the members' screens carry, joined here as
        the host.
      </p>
    </div>
  );
}

export function QaQuestionsButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" className="kit-btn kit-btn-second" onClick={onOpen}>
      Questions
    </button>
  );
}

export function QaQuestionsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      maxWidth={420}
      scrimStyle={{ justifyContent: "flex-end", alignItems: "stretch", padding: 0 }}
      sheetStyle={{
        maxHeight: "100vh",
        height: "100%",
        borderRadius: 0,
        border: "none",
        borderLeft: "1px solid var(--glass-edge)",
      }}
    >
      <p className="kicker">The Intuitive Q&amp;A</p>
      <h2 className="kit-h2" style={{ marginTop: 4 }}>
        Questions
      </h2>
      <p className="kit-text-quiet" style={{ marginBottom: 14 }}>
        Read and answer right here while you host. Sending archives the row.
      </p>
      <div className="kitx-qa-panel">
        <QuestionsPanel respondZ="popup" />
      </div>
    </Sheet>
  );
}
