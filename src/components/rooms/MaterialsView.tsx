"use client";

import RoomVideoSlot from "./RoomVideoSlot";
import RoomMaterialsShelf from "./RoomMaterialsShelf";
import RoomPresence from "./RoomPresence";

/**
 * TASK-123 · THE MATERIALS LAYOUT — the shelf leads: the materials list
 * owns the tall main column (a recording library you read top to bottom),
 * while the video slot and the people rail stack in the right rail. The
 * arrangement for a room whose recordings and PDFs ARE the class. Same
 * three shared regions as every layout — only the arrangement differs.
 */
export default function MaterialsView({
  slug, alias, title, live,
}: {
  slug: string;
  alias: string;
  title: string;
  live: boolean;
}) {
  return (
    <div className="cl-grid-materials">
      <div role="region" className="cl-region cl-area-materials" data-region="materials" aria-label="Materials">
        <RoomMaterialsShelf roomSlug={slug} />
      </div>
      <div role="region" className="cl-region cl-area-video" data-region="video" aria-label="Video">
        <RoomVideoSlot live={live} roomTitle={title} />
      </div>
      <div role="region" className="cl-region cl-area-people" data-region="people" aria-label="People">
        <RoomPresence alias={alias} />
      </div>
    </div>
  );
}
