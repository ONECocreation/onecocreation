"use client";

import RoomVideoSlot from "./RoomVideoSlot";
import RoomPresence, { type RosterResult } from "./RoomPresence";
import StageChat from "./StageChat";
import type { RoomPin } from "@/lib/room-pins";
import type { RoomGate } from "@/lib/room-access";

/**
 * THE STAGE (TASK-184, 0018.06.18 a₿ — the Admiral's three-rooms ruling:
 * "Video and stage are basically the same — the Video layout wins"; born
 * TASK-123, made the opening vantage TASK-149). The VIDEO layout's shape:
 * the live embed leads FULL-WIDTH (RoomVideoSlot, riding the T-146
 * jitsiDomain/liveRoom props and the T-174 gate), and beneath it the room's
 * own chat (StageChat → the SAME RoomView — never a second chat) sits
 * BESIDE who's-here — People folds in here as the roster (RoomPresence,
 * fed the page's ONE per-open roster read — the 429 hunt, see that
 * component's docblock). The materials shelf no longer rides the Stage —
 * Materials merged into the Lesson Path's resources list (the same ruling).
 *
 * The Sanctuary's pinned welcome folds in here too (the Sanctuary vantage
 * retired; its chat always WAS this chat): "📌 from Love" rides atop the
 * stage when the operator has pinned one.
 */
export default function StageView({
  slug, alias, title, kind, pin, live, jitsiDomain, liveRoom, door, doorPackage, roster,
}: {
  slug: string;
  alias: string;
  title: string;
  kind: "class" | "community";
  /** the room's pinned welcome (the retired Sanctuary's "from Love" card) */
  pin?: RoomPin | null;
  live: boolean;
  /** T-146 follow-through: the live stage rides every vantage, not only Video */
  jitsiDomain?: string;
  liveRoom?: string;
  /** TASK-174 minimal-forced-edit: pass-through only — the room page's gate
   *  decision for this visitor, so the video slot follows the SAME door as
   *  the chat below it (room-access.ts's shared words). */
  door?: RoomGate;
  doorPackage?: string | null;
  /** TASK-184: the page's ONE roster/presence read per open — null when the
   *  gate closed the room for this visitor (no read taken, the soft line). */
  roster?: RosterResult | null;
}) {
  return (
    <div>
      {pin?.text && (
        <div className="card" style={{ padding: "14px 18px", marginBottom: 20, background: "rgba(217,178,78,.1)", border: "1px solid rgba(217,178,78,.45)" }}>
          <p style={{ margin: 0, fontSize: ".62rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--gold-deep)" }}>
            📌 from Love
          </p>
          <p style={{ margin: "6px 0 0", whiteSpace: "pre-line", color: "var(--ink-body)", fontSize: ".9rem" }}>{pin.text}</p>
        </div>
      )}
      <div className="cl-grid-stage">
        <div role="region" className="cl-region cl-area-video" data-region="video" aria-label="Video">
          <RoomVideoSlot live={live} roomTitle={title} jitsiDomain={jitsiDomain} liveRoom={liveRoom} door={door} doorPackage={doorPackage} />
        </div>
        <div role="region" className="cl-region cl-area-chat" data-region="chat" aria-label="Chat">
          <StageChat slug={slug} alias={alias} title={title} kind={kind} />
        </div>
        <div role="region" className="cl-region cl-area-people" data-region="people" aria-label="People">
          <RoomPresence roster={roster ?? null} />
        </div>
      </div>
    </div>
  );
}
