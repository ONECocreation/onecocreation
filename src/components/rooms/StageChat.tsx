"use client";

import RoomView from "./RoomView";

/**
 * TASK-149 (0018.06.17 a₿, from Love's meeting) — THE STAGE CHAT. The chat
 * box that sits directly under the live embed on the Stage vantage. This is
 * NOT a second chat: it renders the EXACT component SanctuaryView renders
 * (RoomView — the room's own Matrix timeline + composer, same room alias,
 * same send box, hearts and all). A thin named wrap so the Stage layout
 * reads as what it is and the chat itself has ONE implementation to
 * maintain. If RoomView changes, the Stage chat changes with it — that is
 * the point.
 */
export default function StageChat({
  slug,
  alias,
  title,
  kind,
}: {
  slug: string;
  alias: string;
  title: string;
  kind: "class" | "community";
}) {
  return <RoomView slug={slug} alias={alias} title={title} kind={kind} />;
}
