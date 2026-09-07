"use client";

import RoomVideoSlot from "./RoomVideoSlot";
import RoomMaterialsShelf from "./RoomMaterialsShelf";
import RoomPresence from "./RoomPresence";

/**
 * TASK-123 · THE STAGE LAYOUT — the fourth of the restored four, named per
 * this lane's git archaeology ("circle" is the shipped calendar vantage,
 * "gallery" is the Puck image block; "stage" has no prior classroom use).
 * A spotlight arrangement: the video owns the wide center stage, materials
 * and people flank it as two equal wings. The arrangement for a live-night
 * room where everything orbits the screen. Same three shared regions as
 * every layout — only the arrangement differs.
 */
export default function StageView({
  slug, alias, title, live,
}: {
  slug: string;
  alias: string;
  title: string;
  live: boolean;
}) {
  return (
    <div className="cl-grid-stage">
      <section className="cl-region cl-area-video" data-region="video" aria-label="Video">
        <RoomVideoSlot live={live} roomTitle={title} />
      </section>
      <section className="cl-region cl-area-materials" data-region="materials" aria-label="Materials">
        <RoomMaterialsShelf roomSlug={slug} />
      </section>
      <section className="cl-region cl-area-people" data-region="people" aria-label="People">
        <RoomPresence alias={alias} />
      </section>
    </div>
  );
}
