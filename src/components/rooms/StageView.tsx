"use client";

import RoomVideoSlot from "./RoomVideoSlot";
import RoomMaterialsShelf from "./RoomMaterialsShelf";
import RoomPresence from "./RoomPresence";
import StageChat from "./StageChat";

/**
 * THE STAGE (TASK-149, 0018.06.17 a₿ — from Love's meeting; born TASK-123
 * as the fourth restored layout, now the classroom's OPENING vantage): the
 * live embed (RoomVideoSlot, riding the T-146 jitsiDomain/liveRoom props)
 * owns the top of the main column, the room's own Matrix chat (StageChat →
 * the SAME RoomView SanctuaryView renders — never a second chat) sits
 * directly under it, and who's-here is the right rail on wide screens,
 * dropping below on 390. The materials shelf rides the rail under the
 * people panel, keeping TASK-123's three-region contract
 * (tests/classroom-layouts.test.ts) intact.
 */
export default function StageView({
  slug, alias, title, kind, live, jitsiDomain, liveRoom}: {
  slug: string;
  alias: string;
  title: string;
  kind: "class" | "community";
  live: boolean;
  /** T-146 follow-through: the live stage rides every vantage, not only Video */
  jitsiDomain?: string;
  liveRoom?: string;
}) {
  return (
    <div className="cl-grid-stage">
      <div className="cl-stage-main">
        <div role="region" className="cl-region" data-region="video" aria-label="Video">
          <RoomVideoSlot live={live} roomTitle={title} jitsiDomain={jitsiDomain} liveRoom={liveRoom} />
        </div>
        <div role="region" className="cl-region" data-region="chat" aria-label="Chat">
          <StageChat slug={slug} alias={alias} title={title} kind={kind} />
        </div>
      </div>
      <div className="cl-stage-rail">
        <div role="region" className="cl-region" data-region="people" aria-label="People">
          <RoomPresence alias={alias} />
        </div>
        <div role="region" className="cl-region" data-region="materials" aria-label="Materials">
          <RoomMaterialsShelf roomSlug={slug} />
        </div>
      </div>
    </div>
  );
}
