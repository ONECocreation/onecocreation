"use client";

import { READING_PAGE_PATH } from "@/lib/reading-room";

/* eslint-disable @next/next/no-img-element -- the habitat's own art, not an
   optimizer candidate (same idiom as sections.tsx's portrait) */

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
  const href = READING_PAGE_PATH;
  const body = (
    <>
      <div className="habitat">
        {/* TASK-228 (0018.06.23 a₿): the habitat art IS Love's own Weekly
            Reading photo now — the book-emoji beast retired. `.habitat-pic` fills
            the ground (object-fit cover, heart centred) and keeps a hover
            scale of its own (cartridge.css `.habitat` rules). */}
        <span className="ground">
          <img
            className="habitat-pic"
            src="/images/reading-book-thumb.webp"
            alt="An open book whose pages curl into a heart"
          />
        </span>
        <span className="sprout sprout--l">🌿</span>
        <span className="sprout sprout--r">💧</span>
      </div>
      <div className="wild-body">
        <h3>Read with Love</h3>
        {/* TASK-211 (0018.06.23 a₿, Love's call #40): dropped "— free for
            every member" from this card's line */}
        <p>Join me weekly for a live book reading in my own room.</p>
        {href && (
          <span className="wild-cta">
            Go to the reading
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
