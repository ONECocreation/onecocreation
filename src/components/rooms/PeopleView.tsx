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
  slug, alias, title, live,
}: {
  slug: string;
  alias: string;
  title: string;
  live: boolean;
}) {
  return (
    <div className="cl-grid-people">
      <section className="cl-region cl-area-people" data-region="people" aria-label="People">
        <RoomPresence alias={alias} />
      </section>
      <section className="cl-region cl-area-video" data-region="video" aria-label="Video">
        <RoomVideoSlot live={live} roomTitle={title} />
      </section>
      <section className="cl-region cl-area-materials" data-region="materials" aria-label="Materials">
        <RoomMaterialsShelf roomSlug={slug} />
      </section>
    </div>
  );
}
