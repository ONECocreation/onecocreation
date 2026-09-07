"use client";

import RoomVideoSlot from "./RoomVideoSlot";
import RoomMaterialsShelf from "./RoomMaterialsShelf";
import RoomPresence from "./RoomPresence";

/**
 * TASK-123 · THE PEOPLE LAYOUT — the people lead: who's here owns the tall
 * main column (the gathering IS the point), while the video slot and the
 * materials list stack in the right rail. The arrangement for a community
 * room where the attendees matter more than the content. Same three shared
 * regions as every layout — only the arrangement differs.
 */
export default function PeopleView({
  slug, alias, title, live, jitsiDomain, liveRoom}: {
  slug: string;
  alias: string;
  title: string;
  live: boolean;
  /** T-146 follow-through: the live stage rides every vantage, not only Video */
  jitsiDomain?: string;
  liveRoom?: string;
}) {
  return (
    <div className="cl-grid-people">
      <div role="region" className="cl-region cl-area-people" data-region="people" aria-label="People">
        <RoomPresence alias={alias} />
      </div>
      <div role="region" className="cl-region cl-area-video" data-region="video" aria-label="Video">
        <RoomVideoSlot live={live} roomTitle={title} jitsiDomain={jitsiDomain} liveRoom={liveRoom} />
      </div>
      <div role="region" className="cl-region cl-area-materials" data-region="materials" aria-label="Materials">
        <RoomMaterialsShelf roomSlug={slug} />
      </div>
    </div>
  );
}
