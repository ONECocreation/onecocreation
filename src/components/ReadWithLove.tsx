"use client";

import useFrenSession from "@/hooks/useFrenSession";
import { readingDoorHref } from "@/lib/reading-room";

/**
 * READ WITH LOVE — THE FREE READING DOOR (TASK-156, 0018.06.17 a₿, Love's
 * meeting: "click → they log in → a link takes them to the reading area").
 * Born TASK-120 as an email form that posted the room link by letter; the
 * door now walks the soul INTO the room — a guest clicks through to the
 * sign-in card with `?next=/rooms/<reading-room>` carried along (after the
 * code matches they land in the room's Stage), a signed-in member's card
 * leads straight into the room. No form anymore, so the card IS its anchor
 * like its WildDoors siblings.
 */

/* TASK-210 (0018.06.23 a₿): the derivation moved to src/lib/reading-room.ts
   so the member menu and the nav's Heart Field row read the SAME room as
   this card. Re-exported here for tests/free-reading-path.test.ts. */
export { READING_ROOM_SLUG, READING_ROOM_PATH, readingDoorHref } from "@/lib/reading-room";

export default function ReadWithLove() {
  const { fren } = useFrenSession();
  const href = readingDoorHref(!!fren);
  const body = (
    <>
      <div className="habitat">
        <span className="ground">
          <i style={{ background: "linear-gradient(180deg,#ece4f4 0%,#cdbfdf 55%,#a493c0 100%)" }} />
        </span>
        <span className="sprout sprout--l">🌿</span>
        <span className="beast">📖</span>
        <span className="sprout sprout--r">💧</span>
      </div>
      <div className="wild-body">
        <h3>Read with Love</h3>
        <p>Join me weekly for a live book reading in my own room — free for every member.</p>
        {href && (
          <span className="wild-cta">
            {fren ? "Enter the reading room" : "Sign in — the reading is free"}
          </span>
        )}
      </div>
    </>
  );
  /* derive-or-dash: with no free room in the registry the card keeps its
     words but carries no door (never a fake link) */
  if (!href) return <div className="wild-card">{body}</div>;
  return (
    <a className="wild-card" href={href}>
      {body}
    </a>
  );
}
