"use client";

import RoomVideoSlot from "./RoomVideoSlot";
import RoomMaterialsShelf from "./RoomMaterialsShelf";
import RoomPresence from "./RoomPresence";

/**
 * TASK-123 · THE VIDEO LAYOUT — the video stage leads, full-width; the
 * materials list and the people rail sit side by side beneath it. The
 * arrangement for a session whose center of gravity is the screen:
 * watch first, then reach for the shelf and see who's in the room.
 * Regions are the same three shared components every layout reuses —
 * RoomVideoSlot (embed slot), RoomMaterialsShelf, RoomPresence — only the
 * arrangement differs.
 */
export default function VideoView({
  slug, alias, title, live, jitsiDomain, liveRoom, displayName,
}: {
  slug: string;
  alias: string;
  title: string;
  live: boolean;
  /** TASK-146: pass-through only, from the room page's own switches read
   *  down through ClassroomView — see RoomVideoSlot's docblock. */
  jitsiDomain?: string;
  liveRoom?: string;
  displayName?: string;
}) {
  return (
    <div className="cl-grid-video">
      <div role="region" className="cl-region cl-area-video" data-region="video" aria-label="Video">
        <RoomVideoSlot live={live} roomTitle={title} jitsiDomain={jitsiDomain} liveRoom={liveRoom} displayName={displayName} />
      </div>
      <div role="region" className="cl-region cl-area-materials" data-region="materials" aria-label="Materials">
        <RoomMaterialsShelf roomSlug={slug} />
      </div>
      <div role="region" className="cl-region cl-area-people" data-region="people" aria-label="People">
        <RoomPresence alias={alias} />
      </div>
    </div>
  );
}
